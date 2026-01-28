import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth';
import { getUserById } from './db';

const router = Router();

// ============================================
// Security: Authentication & Authorization
// ============================================

interface AuthenticatedRequest<P = Record<string, string>> extends Request<P> {
  user?: {
    id: string;
    role: string;
  };
}

// Middleware: Require authenticated user with super_admin role
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

// Validate slug format (only alphanumeric and hyphens)
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && slug.length <= 100;
}

// Sanitize string input
function sanitizeString(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength).trim();
}

// Validate dimension format (e.g., "100%", "800px", "50vh")
function isValidDimension(dim: string): boolean {
  return /^(\d+(\.\d+)?(px|%|vh|vw|em|rem)?|auto)$/.test(dim);
}

// ============================================
// Security: Path Traversal Protection
// ============================================

// Ensure path is within allowed directory
function isPathSafe(basePath: string, targetPath: string): boolean {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

// ============================================
// File Upload Configuration
// ============================================

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'custom-calculators');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max

// Configure multer for ZIP uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o755 });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Use random filename to prevent path traversal via filename
    const safeFilename = `${Date.now()}-${nanoid(10)}.zip`;
    cb(null, safeFilename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only allow one file
  },
  fileFilter: (req, file, cb) => {
    // Check both MIME type and extension
    const allowedMimes = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) && ext === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  },
});

// Registry file path
const REGISTRY_PATH = path.join(process.cwd(), 'public', 'custom-calculators', 'registry.json');

interface CustomCalculator {
  id: string;
  name: string;
  description: string;
  slug: string;
  path: string;
  thumbnail: string | null;
  width: string;
  height: string;
  active: boolean;
}

interface Registry {
  calculators: CustomCalculator[];
}

// Read registry
function readRegistry(): Registry {
  try {
    const data = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { calculators: [] };
  }
}

// Write registry
function writeRegistry(registry: Registry): void {
  // Ensure directory exists
  const registryDir = path.dirname(REGISTRY_PATH);
  if (!fs.existsSync(registryDir)) {
    fs.mkdirSync(registryDir, { recursive: true });
  }
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

// Generate URL-safe slug with security constraints
function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[äöü]/g, (char) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[char] || char)
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-{2,}/g, '-') // Replace multiple hyphens with single
    .slice(0, 50); // Limit length

  // Ensure slug is not empty and doesn't start with a dot (hidden file)
  if (!slug || slug.startsWith('.')) {
    return `calculator-${nanoid(6)}`;
  }

  return slug;
}

// GET /api/custom-calculators - List all calculators
router.get('/', (req, res) => {
  const registry = readRegistry();
  res.json(registry.calculators);
});

// POST /api/custom-calculators/upload - Upload a new calculator (Admin only)
router.post('/upload', requireAdmin, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  const uploadedFile = req.file;

  // Helper to clean up uploaded file
  const cleanupUpload = () => {
    if (uploadedFile && fs.existsSync(uploadedFile.path)) {
      try {
        fs.unlinkSync(uploadedFile.path);
      } catch { /* ignore cleanup errors */ }
    }
  };

  try {
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate and sanitize inputs
    const name = sanitizeString(req.body.name, 100);
    const description = sanitizeString(req.body.description, 500);
    const width = sanitizeString(req.body.width, 20) || '100%';
    const height = sanitizeString(req.body.height, 20) || '800px';

    if (!name || name.length < 1) {
      cleanupUpload();
      return res.status(400).json({ error: 'Name is required' });
    }

    // Validate dimensions
    if (!isValidDimension(width) || !isValidDimension(height)) {
      cleanupUpload();
      return res.status(400).json({ error: 'Invalid dimension format' });
    }

    // Generate slug and check for duplicates
    let slug = generateSlug(name);
    const registry = readRegistry();

    // Ensure unique slug
    let counter = 1;
    const baseSlug = slug;
    while (registry.calculators.some((c) => c.slug === slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      if (counter > 100) {
        cleanupUpload();
        return res.status(400).json({ error: 'Unable to generate unique slug' });
      }
    }

    const targetDir = path.join(PUBLIC_DIR, slug);

    // Security: Verify target directory is within allowed path
    if (!isPathSafe(PUBLIC_DIR, targetDir)) {
      cleanupUpload();
      return res.status(400).json({ error: 'Invalid calculator path' });
    }

    // Extract ZIP with security checks
    try {
      const zip = new AdmZip(uploadedFile.path);
      const zipEntries = zip.getEntries();

      // Security: Check for Zip Slip vulnerability
      for (const entry of zipEntries) {
        const entryPath = path.join(targetDir, entry.entryName);
        if (!isPathSafe(targetDir, entryPath)) {
          cleanupUpload();
          console.error(`Zip Slip attempt detected: ${entry.entryName}`);
          return res.status(400).json({ error: 'Invalid ZIP file structure' });
        }

        // Security: Block potentially dangerous file types
        const ext = path.extname(entry.entryName).toLowerCase();
        const dangerousExtensions = ['.php', '.jsp', '.asp', '.aspx', '.exe', '.sh', '.bat', '.cmd', '.ps1'];
        if (dangerousExtensions.includes(ext)) {
          cleanupUpload();
          return res.status(400).json({ error: 'ZIP contains forbidden file types' });
        }
      }

      // Check if ZIP has a single root folder or files directly
      const hasRootFolder = zipEntries.length > 0 &&
        zipEntries.filter(e => !e.isDirectory).length > 0 &&
        zipEntries.every((entry) => {
          const parts = entry.entryName.split('/');
          return parts.length > 1 && parts[0] === zipEntries[0].entryName.split('/')[0];
        });

      // Create target directory
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true, mode: 0o755 });
      }

      if (hasRootFolder) {
        // Extract and move contents out of root folder
        const tempDir = path.join(UPLOAD_DIR, `temp-${nanoid(10)}`);
        zip.extractAllTo(tempDir, true);

        // Find the root folder
        const entries = fs.readdirSync(tempDir);
        const rootFolder = entries.find(e => fs.statSync(path.join(tempDir, e)).isDirectory());

        if (rootFolder) {
          const rootPath = path.join(tempDir, rootFolder);

          // Move contents to target
          const contents = fs.readdirSync(rootPath);
          for (const item of contents) {
            const sourcePath = path.join(rootPath, item);
            const destPath = path.join(targetDir, item);

            // Security check for each item
            if (!isPathSafe(targetDir, destPath)) {
              fs.rmSync(tempDir, { recursive: true, force: true });
              fs.rmSync(targetDir, { recursive: true, force: true });
              cleanupUpload();
              return res.status(400).json({ error: 'Invalid file path in ZIP' });
            }

            fs.renameSync(sourcePath, destPath);
          }
        }

        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
      } else {
        // Extract directly to target
        zip.extractAllTo(targetDir, true);
      }

      // Verify index.html exists (non-recursive search for security)
      const indexPath = path.join(targetDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        cleanupUpload();
        return res.status(400).json({ error: 'ZIP must contain an index.html file in the root' });
      }

    } catch (extractError) {
      console.error('ZIP extraction error:', extractError);
      // Clean up target directory if it was created
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
      cleanupUpload();
      return res.status(400).json({ error: 'Failed to extract ZIP file' });
    }

    // Clean up uploaded ZIP
    cleanupUpload();

    // Create new calculator entry
    const newCalculator: CustomCalculator = {
      id: nanoid(10),
      name,
      description,
      slug,
      path: `/custom-calculators/${slug}/index.html`,
      thumbnail: null,
      width,
      height,
      active: true,
    };

    // Add to registry
    registry.calculators.push(newCalculator);
    writeRegistry(registry);

    // Audit log
    console.log(`[AUDIT] Calculator uploaded: ${slug} by admin ${req.user?.id}`);

    res.json({
      success: true,
      calculator: newCalculator,
    });
  } catch (error) {
    console.error('Upload error:', error);
    cleanupUpload();
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE /api/custom-calculators/:slug - Delete a calculator (Admin only)
router.delete('/:slug', requireAdmin, (req: AuthenticatedRequest<{ slug: string }>, res) => {
  try {
    const { slug } = req.params;

    // Security: Validate slug format
    if (!isValidSlug(slug)) {
      return res.status(400).json({ error: 'Invalid slug format' });
    }

    const registry = readRegistry();

    const calcIndex = registry.calculators.findIndex((c) => c.slug === slug);
    if (calcIndex === -1) {
      return res.status(404).json({ error: 'Calculator not found' });
    }

    // Security: Verify path is safe before deletion
    const calcDir = path.join(PUBLIC_DIR, slug);
    if (!isPathSafe(PUBLIC_DIR, calcDir)) {
      return res.status(400).json({ error: 'Invalid calculator path' });
    }

    // Remove directory
    if (fs.existsSync(calcDir)) {
      fs.rmSync(calcDir, { recursive: true, force: true });
    }

    // Remove from registry
    registry.calculators.splice(calcIndex, 1);
    writeRegistry(registry);

    // Audit log
    console.log(`[AUDIT] Calculator deleted: ${slug} by admin ${req.user?.id}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// PATCH /api/custom-calculators/:slug - Update calculator metadata (Admin only)
router.patch('/:slug', requireAdmin, (req: AuthenticatedRequest<{ slug: string }>, res) => {
  try {
    const { slug } = req.params;

    // Security: Validate slug format
    if (!isValidSlug(slug)) {
      return res.status(400).json({ error: 'Invalid slug format' });
    }

    const registry = readRegistry();
    const calc = registry.calculators.find((c) => c.slug === slug);

    if (!calc) {
      return res.status(404).json({ error: 'Calculator not found' });
    }

    // Sanitize and validate inputs
    const { name, description, width, height, active } = req.body;

    // Update fields if provided with validation
    if (name !== undefined) {
      const sanitizedName = sanitizeString(name, 100);
      if (sanitizedName.length < 1) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      calc.name = sanitizedName;
    }

    if (description !== undefined) {
      calc.description = sanitizeString(description, 500);
    }

    if (width !== undefined) {
      const sanitizedWidth = sanitizeString(width, 20);
      if (!isValidDimension(sanitizedWidth)) {
        return res.status(400).json({ error: 'Invalid width format' });
      }
      calc.width = sanitizedWidth;
    }

    if (height !== undefined) {
      const sanitizedHeight = sanitizeString(height, 20);
      if (!isValidDimension(sanitizedHeight)) {
        return res.status(400).json({ error: 'Invalid height format' });
      }
      calc.height = sanitizedHeight;
    }

    if (active !== undefined) {
      if (typeof active !== 'boolean') {
        return res.status(400).json({ error: 'Active must be a boolean' });
      }
      calc.active = active;
    }

    writeRegistry(registry);

    // Audit log
    console.log(`[AUDIT] Calculator updated: ${slug} by admin ${req.user?.id}`);

    res.json({ success: true, calculator: calc });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
