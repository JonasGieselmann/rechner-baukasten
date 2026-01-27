import { Router } from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

const router = Router();

// Configure multer for ZIP uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
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

// Generate URL-safe slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöü]/g, (char) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[char] || char)
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// GET /api/custom-calculators - List all calculators
router.get('/', (req, res) => {
  const registry = readRegistry();
  res.json(registry.calculators);
});

// POST /api/custom-calculators/upload - Upload a new calculator
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, description, width, height } = req.body;

    if (!name) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Name is required' });
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
    }

    const targetDir = path.join(process.cwd(), 'public', 'custom-calculators', slug);

    // Extract ZIP
    try {
      const zip = new AdmZip(req.file.path);
      const zipEntries = zip.getEntries();

      // Check if ZIP has a single root folder or files directly
      const hasRootFolder = zipEntries.length > 0 &&
        zipEntries.every((entry) => entry.entryName.startsWith(zipEntries[0].entryName.split('/')[0] + '/'));

      // Create target directory
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      if (hasRootFolder) {
        // Extract and move contents out of root folder
        const tempDir = path.join(process.cwd(), 'uploads', `temp-${Date.now()}`);
        zip.extractAllTo(tempDir, true);

        // Find the root folder
        const rootFolder = fs.readdirSync(tempDir)[0];
        const rootPath = path.join(tempDir, rootFolder);

        // Move contents to target
        const contents = fs.readdirSync(rootPath);
        for (const item of contents) {
          fs.renameSync(path.join(rootPath, item), path.join(targetDir, item));
        }

        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
      } else {
        // Extract directly to target
        zip.extractAllTo(targetDir, true);
      }

      // Verify index.html exists
      const indexPath = path.join(targetDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        // Try to find index.html in subdirectories
        const findIndexHtml = (dir: string): string | null => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            if (file === 'index.html') return fullPath;
            if (fs.statSync(fullPath).isDirectory()) {
              const found = findIndexHtml(fullPath);
              if (found) return found;
            }
          }
          return null;
        };

        const foundIndex = findIndexHtml(targetDir);
        if (!foundIndex) {
          // Clean up
          fs.rmSync(targetDir, { recursive: true, force: true });
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: 'ZIP must contain an index.html file' });
        }
      }

    } catch (extractError) {
      console.error('ZIP extraction error:', extractError);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Failed to extract ZIP file' });
    }

    // Clean up uploaded ZIP
    fs.unlinkSync(req.file.path);

    // Create new calculator entry
    const newCalculator: CustomCalculator = {
      id: nanoid(10),
      name,
      description: description || '',
      slug,
      path: `/custom-calculators/${slug}/index.html`,
      thumbnail: null,
      width: width || '100%',
      height: height || '800px',
      active: true,
    };

    // Add to registry
    registry.calculators.push(newCalculator);
    writeRegistry(registry);

    res.json({
      success: true,
      calculator: newCalculator,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE /api/custom-calculators/:slug - Delete a calculator
router.delete('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const registry = readRegistry();

    const calcIndex = registry.calculators.findIndex((c) => c.slug === slug);
    if (calcIndex === -1) {
      return res.status(404).json({ error: 'Calculator not found' });
    }

    // Remove directory
    const calcDir = path.join(process.cwd(), 'public', 'custom-calculators', slug);
    if (fs.existsSync(calcDir)) {
      fs.rmSync(calcDir, { recursive: true, force: true });
    }

    // Remove from registry
    registry.calculators.splice(calcIndex, 1);
    writeRegistry(registry);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// PATCH /api/custom-calculators/:slug - Update calculator metadata
router.patch('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const { name, description, width, height, active } = req.body;

    const registry = readRegistry();
    const calc = registry.calculators.find((c) => c.slug === slug);

    if (!calc) {
      return res.status(404).json({ error: 'Calculator not found' });
    }

    // Update fields if provided
    if (name !== undefined) calc.name = name;
    if (description !== undefined) calc.description = description;
    if (width !== undefined) calc.width = width;
    if (height !== undefined) calc.height = height;
    if (active !== undefined) calc.active = active;

    writeRegistry(registry);

    res.json({ success: true, calculator: calc });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
