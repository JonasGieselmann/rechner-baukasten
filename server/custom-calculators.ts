import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';
import { nanoid } from 'nanoid';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';
import { getUserById, getRawClient } from './db.js';
import { uploadToS3, getFromS3, deletePrefix, isS3Configured } from './s3.js';
import { Readable } from 'stream';

const router = Router();

// S3 key prefix for all custom calculator files
const S3_PREFIX = 'calculators/';

// ============================================
// Security: Authentication & Authorization
// ============================================

interface AuthenticatedRequest<P = Record<string, string>> extends Request<P> {
  user?: {
    id: string;
    role: string;
  };
}

async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await getUserById(session.user.id);
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// ============================================
// Security: Input Validation
// ============================================

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && slug.length <= 100;
}

function sanitizeString(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength).trim();
}

function isValidDimension(dim: string): boolean {
  return /^(\d+(\.\d+)?(px|%|vh|vw|em|rem)?|auto)$/.test(dim);
}

// ============================================
// Content type mapping
// ============================================

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// ============================================
// Upload Configuration (temp storage only)
// ============================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) && ext === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  },
});

// ============================================
// Slug Generation
// ============================================

function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[äöü]/g, (char) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[char] || char)
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 50);

  if (!slug || slug.startsWith('.')) {
    return `calculator-${nanoid(6)}`;
  }
  return slug;
}

// ============================================
// Database Helpers
// ============================================

const db = () => getRawClient();

async function getAllCalculators() {
  return await db()`
    SELECT id, name, description, slug, s3_prefix, width, height, active, file_count, created_at, updated_at
    FROM custom_calculator
    ORDER BY created_at DESC
  `;
}

async function getCalculatorBySlug(slug: string) {
  const rows = await db()`
    SELECT id, name, description, slug, s3_prefix, width, height, active, file_count, created_at, updated_at
    FROM custom_calculator
    WHERE slug = ${slug}
  `;
  return rows[0] || null;
}

async function insertCalculator(calc: {
  id: string;
  name: string;
  description: string;
  slug: string;
  s3Prefix: string;
  width: string;
  height: string;
  fileCount: number;
}) {
  await db()`
    INSERT INTO custom_calculator (id, name, description, slug, s3_prefix, width, height, file_count)
    VALUES (${calc.id}, ${calc.name}, ${calc.description}, ${calc.slug}, ${calc.s3Prefix}, ${calc.width}, ${calc.height}, ${calc.fileCount})
  `;
}

async function deleteCalculatorBySlug(slug: string) {
  await db()`DELETE FROM custom_calculator WHERE slug = ${slug}`;
}

async function updateCalculatorFields(slug: string, fields: Record<string, unknown>) {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if ('name' in fields) { setClauses.push('name'); values.push(fields.name); }
  if ('description' in fields) { setClauses.push('description'); values.push(fields.description); }
  if ('width' in fields) { setClauses.push('width'); values.push(fields.width); }
  if ('height' in fields) { setClauses.push('height'); values.push(fields.height); }
  if ('active' in fields) { setClauses.push('active'); values.push(fields.active); }

  // Use raw SQL for dynamic updates
  const client = db();
  if ('name' in fields) await client`UPDATE custom_calculator SET name = ${fields.name as string}, updated_at = NOW() WHERE slug = ${slug}`;
  if ('description' in fields) await client`UPDATE custom_calculator SET description = ${fields.description as string}, updated_at = NOW() WHERE slug = ${slug}`;
  if ('width' in fields) await client`UPDATE custom_calculator SET width = ${fields.width as string}, updated_at = NOW() WHERE slug = ${slug}`;
  if ('height' in fields) await client`UPDATE custom_calculator SET height = ${fields.height as string}, updated_at = NOW() WHERE slug = ${slug}`;
  if ('active' in fields) await client`UPDATE custom_calculator SET active = ${fields.active as boolean}, updated_at = NOW() WHERE slug = ${slug}`;
}

// ============================================
// Routes
// ============================================

// GET /api/custom-calculators - List all calculators
router.get('/', async (req, res) => {
  try {
    const rows = await getAllCalculators();
    const calculators = rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      slug: r.slug,
      path: `/custom-calculators/${r.slug}/index.html`,
      width: r.width,
      height: r.height,
      active: r.active,
    }));
    res.json(calculators);
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Failed to list calculators' });
  }
});

// POST /api/custom-calculators/upload - Upload new calculator (Admin only)
router.post('/upload', requireAdmin, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!isS3Configured()) {
      return res.status(500).json({ error: 'S3 storage not configured' });
    }

    const name = sanitizeString(req.body.name, 100);
    const description = sanitizeString(req.body.description, 500);
    const width = sanitizeString(req.body.width, 20) || '100%';
    const height = sanitizeString(req.body.height, 20) || '800px';

    if (!name || name.length < 1) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!isValidDimension(width) || !isValidDimension(height)) {
      return res.status(400).json({ error: 'Invalid dimension format' });
    }

    // Generate unique slug
    let slug = generateSlug(name);
    let existing = await getCalculatorBySlug(slug);
    let counter = 1;
    const baseSlug = slug;
    while (existing) {
      slug = `${baseSlug}-${counter}`;
      existing = await getCalculatorBySlug(slug);
      counter++;
      if (counter > 100) {
        return res.status(400).json({ error: 'Unable to generate unique slug' });
      }
    }

    // Extract ZIP and upload to S3
    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();

    // Security checks
    const dangerousExtensions = ['.php', '.jsp', '.asp', '.aspx', '.exe', '.sh', '.bat', '.cmd', '.ps1'];
    for (const entry of zipEntries) {
      const ext = path.extname(entry.entryName).toLowerCase();
      if (dangerousExtensions.includes(ext)) {
        return res.status(400).json({ error: 'ZIP contains forbidden file types' });
      }
    }

    // Detect root folder in ZIP
    const fileEntries = zipEntries.filter(e => !e.isDirectory);
    const hasRootFolder = fileEntries.length > 0 && fileEntries.every((entry) => {
      const parts = entry.entryName.split('/');
      return parts.length > 1 && parts[0] === zipEntries[0].entryName.split('/')[0];
    });

    // Get root folder name to strip from paths
    const rootFolder = hasRootFolder ? zipEntries[0].entryName.split('/')[0] + '/' : '';

    // Upload each file to S3
    const s3Prefix = `${S3_PREFIX}${slug}/`;
    let fileCount = 0;
    let hasIndex = false;

    for (const entry of fileEntries) {
      let relativePath = entry.entryName;
      if (rootFolder && relativePath.startsWith(rootFolder)) {
        relativePath = relativePath.slice(rootFolder.length);
      }
      if (!relativePath) continue;

      const s3Key = `${s3Prefix}${relativePath}`;
      const contentType = getContentType(relativePath);
      const data = entry.getData();

      await uploadToS3(s3Key, data, contentType);
      fileCount++;

      if (relativePath === 'index.html') hasIndex = true;
    }

    if (!hasIndex) {
      // Clean up uploaded files
      await deletePrefix(s3Prefix);
      return res.status(400).json({ error: 'ZIP must contain an index.html file in the root' });
    }

    // Save metadata to DB
    const id = nanoid(10);
    await insertCalculator({ id, name, description, slug, s3Prefix, width, height, fileCount });

    console.log(`[AUDIT] Calculator uploaded: ${slug} (${fileCount} files) by admin ${req.user?.id}`);

    res.json({
      success: true,
      calculator: { id, name, description, slug, path: `/custom-calculators/${slug}/index.html`, width, height, active: true },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE /api/custom-calculators/:slug - Delete calculator (Admin only)
router.delete('/:slug', requireAdmin, async (req: AuthenticatedRequest<{ slug: string }>, res) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return res.status(400).json({ error: 'Invalid slug format' });
    }

    const calc = await getCalculatorBySlug(slug);
    if (!calc) {
      return res.status(404).json({ error: 'Calculator not found' });
    }

    // Delete files from S3
    await deletePrefix(calc.s3_prefix);

    // Delete from DB
    await deleteCalculatorBySlug(slug);

    console.log(`[AUDIT] Calculator deleted: ${slug} by admin ${req.user?.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// PATCH /api/custom-calculators/:slug - Update metadata (Admin only)
router.patch('/:slug', requireAdmin, async (req: AuthenticatedRequest<{ slug: string }>, res) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return res.status(400).json({ error: 'Invalid slug format' });
    }

    const calc = await getCalculatorBySlug(slug);
    if (!calc) {
      return res.status(404).json({ error: 'Calculator not found' });
    }

    const updates: Record<string, unknown> = {};

    if (req.body.name !== undefined) {
      const sanitized = sanitizeString(req.body.name, 100);
      if (sanitized.length < 1) return res.status(400).json({ error: 'Name cannot be empty' });
      updates.name = sanitized;
    }
    if (req.body.description !== undefined) updates.description = sanitizeString(req.body.description, 500);
    if (req.body.width !== undefined) {
      const w = sanitizeString(req.body.width, 20);
      if (!isValidDimension(w)) return res.status(400).json({ error: 'Invalid width' });
      updates.width = w;
    }
    if (req.body.height !== undefined) {
      const h = sanitizeString(req.body.height, 20);
      if (!isValidDimension(h)) return res.status(400).json({ error: 'Invalid height' });
      updates.height = h;
    }
    if (req.body.active !== undefined) {
      if (typeof req.body.active !== 'boolean') return res.status(400).json({ error: 'Active must be boolean' });
      updates.active = req.body.active;
    }

    if (Object.keys(updates).length > 0) {
      await updateCalculatorFields(slug, updates);
    }

    const updated = await getCalculatorBySlug(slug);
    console.log(`[AUDIT] Calculator updated: ${slug} by admin ${req.user?.id}`);
    res.json({ success: true, calculator: updated });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// GET /api/custom-calculators/serve/:slug/* - Serve files from S3
router.get('/serve/:slug/{*filePath}', async (req, res) => {
  try {
    const { slug } = req.params;
    const rawFilePath = (req.params as Record<string, unknown>).filePath;
    const filePath = Array.isArray(rawFilePath) ? rawFilePath.join('/') : String(rawFilePath || 'index.html');

    if (!isValidSlug(slug)) {
      return res.status(400).json({ error: 'Invalid slug' });
    }

    // Prevent path traversal
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    const s3Key = `${S3_PREFIX}${slug}/${filePath}`;

    const { body, contentType } = await getFromS3(s3Key);
    if (!body) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache

    // Stream the S3 response to the client
    const readable = body as unknown as Readable;
    readable.pipe(res);
  } catch (error: unknown) {
    const s3Error = error as { name?: string };
    if (s3Error.name === 'NoSuchKey') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('Serve error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

export default router;

// ============================================
// Seed: Upload BeautyFlow from public/ to S3
// ============================================

export async function seedCustomCalculators(): Promise<void> {
  if (!isS3Configured()) {
    console.log('[seed] S3 not configured, skipping calculator seeding');
    return;
  }

  const fs = await import('fs');
  const publicDir = path.join(process.cwd(), 'public', 'custom-calculators', 'beautyflow');
  if (!fs.existsSync(publicDir)) {
    console.log('[seed] No beautyflow files in public/, skipping');
    return;
  }

  console.log('[seed] Syncing BeautyFlow calculator to S3...');
  const s3Prefix = `${S3_PREFIX}beautyflow/`;

  // Step 1: Delete old S3 files
  try {
    await deletePrefix(s3Prefix);
    console.log('[seed] Deleted old S3 files');
  } catch (e) {
    console.warn('[seed] Delete old files failed (continuing):', e);
  }

  // Step 2: Upload all files from public/
  let fileCount = 0;
  const uploadedFiles: string[] = [];

  async function uploadDir(dir: string, prefix: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name === 'config.json') continue;
      if (entry.isDirectory()) {
        await uploadDir(fullPath, `${prefix}${entry.name}/`);
      } else {
        const content = fs.readFileSync(fullPath);
        const contentType = getContentType(entry.name);
        const s3Key = `${prefix}${entry.name}`;
        await uploadToS3(s3Key, content, contentType);
        uploadedFiles.push(s3Key);
        fileCount++;
      }
    }
  }

  await uploadDir(publicDir, s3Prefix);
  console.log(`[seed] Uploaded ${fileCount} files:`, uploadedFiles);

  // Step 3: Upsert DB entry
  const existing = await getCalculatorBySlug('beautyflow');
  if (existing) {
    const client = db();
    await client`
      UPDATE custom_calculator
      SET file_count = ${fileCount}, updated_at = NOW()
      WHERE slug = 'beautyflow'
    `;
    console.log(`[seed] BeautyFlow DB updated (${fileCount} files)`);
  } else {
    await insertCalculator({
      id: 'beautyflow',
      name: 'BeautyFlow ROI-Rechner',
      description: 'Berechne deinen Return on Investment mit BeautyFlow - inkl. Wachstumsprognose',
      slug: 'beautyflow',
      s3Prefix,
      width: '100%',
      height: '900px',
      fileCount,
    });
    console.log(`[seed] BeautyFlow DB inserted (${fileCount} files)`);
  }

  console.log('[seed] BeautyFlow sync complete');
}
