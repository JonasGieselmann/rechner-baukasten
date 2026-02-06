import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';
import { checkDb, initAuthSchema } from './db.js';
import customCalculatorsRouter, { seedCustomCalculators } from './custom-calculators.js';
import adminRouter from './admin.js';
import { getFromS3, isS3Configured } from './s3.js';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';

// ============================================
// App Configuration
// ============================================

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// Security Middleware
// ============================================

// Helmet - Sets various HTTP security headers
// See: https://helmetjs.github.io/
app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'blob:'],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'self'"],
            frameAncestors: ["'self'", '*'], // Allow embedding in iframes
          },
        }
      : false, // Disable CSP in development for easier debugging
    crossOriginEmbedderPolicy: false, // Allow embedding
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resources
  })
);

// Remove X-Powered-By header to hide Express
app.disable('x-powered-by');

// Rate limiting - General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 auth requests per window per IP
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// ============================================
// CORS Configuration
// ============================================

const corsOrigins: string[] = [];

// In development, allow localhost ports
if (!isProduction) {
  corsOrigins.push(
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177'
  );
}

// Add production URL if configured
if (process.env.APP_URL) {
  corsOrigins.push(process.env.APP_URL);
}

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // Cache preflight for 24 hours
  })
);

// ============================================
// Body Parsing with Size Limits
// ============================================

// Better Auth handler - MUST be before express.json()
// Apply stricter rate limiting to auth endpoints
app.use('/api/auth', authLimiter);
app.all('/api/auth/{*splat}', toNodeHandler(auth));

// JSON body parser with size limit to prevent DoS
app.use(express.json({ limit: '1mb' }));

// URL-encoded body parser with size limit
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================
// API Routes
// ============================================

// Health check endpoint with build version for deploy verification
app.get('/api/health', async (req, res) => {
  try {
    const dbOk = await checkDb();
    res.json({
      status: dbOk ? 'ok' : 'error',
      build: process.env.BUILD_SHA?.slice(0, 7) || 'unknown',
    });
  } catch {
    res.status(500).json({ status: 'error' });
  }
});

// Get current user session with extended user data
app.get('/api/me', async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get extended user data with role and approved status
    const { getUserById } = await import('./db.js');
    const extendedUser = await getUserById(session.user.id);

    // Return only necessary user data (don't expose internal fields)
    res.json({
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt,
      },
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: extendedUser?.role || 'user',
        approved: extendedUser?.approved ?? false,
      },
    });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

// Custom Calculators API
app.use('/api/custom-calculators', customCalculatorsRouter);

// Admin API
app.use('/api/admin', adminRouter);

// ============================================
// Static File Serving (Production Only)
// ============================================

if (isProduction) {
  // Security options for static files
  const staticOptions = {
    dotfiles: 'deny' as const, // Don't serve hidden files
    index: false, // Don't serve directory indexes
    maxAge: '1d', // Cache for 1 day
    setHeaders: (res: express.Response, filePath: string) => {
      // HTML files: no-cache (always revalidate so new deploys take effect)
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  };

  // Serve custom calculator files: local dist/ first (bundled), S3 fallback (dynamic uploads)
  app.get('/custom-calculators/:slug/{*filePath}', async (req, res, next) => {
    const { slug } = req.params;
    const rawFilePath = (req.params as Record<string, unknown>).filePath;
    const filePath = Array.isArray(rawFilePath) ? rawFilePath.join('/') : String(rawFilePath || 'index.html');

    // Validate slug
    if (!/^[a-z0-9-]+$/.test(slug) || slug.length > 100) {
      return next();
    }

    // Prevent path traversal
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return next();
    }

    // Priority 1: Serve from dist/ (bundled calculators - always up-to-date from Docker build)
    const localPath = path.join(process.cwd(), 'dist', 'custom-calculators', slug, filePath);
    if (fs.existsSync(localPath)) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      return res.sendFile(localPath);
    }

    // Priority 2: Serve from S3 (dynamically uploaded calculators)
    if (isS3Configured()) {
      try {
        const s3Key = `calculators/${slug}/${filePath}`;
        const { body, contentType } = await getFromS3(s3Key);

        if (body) {
          res.setHeader('Content-Type', contentType);
          if (filePath.endsWith('.html') || filePath === 'index.html') {
            res.setHeader('Cache-Control', 'no-cache');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
          const readable = body as unknown as Readable;
          readable.pipe(res);
          return;
        }
      } catch (error: unknown) {
        const s3Error = error as { name?: string };
        if (s3Error.name !== 'NoSuchKey') {
          console.error('S3 serve error:', error);
        }
      }
    }

    next();
  });

  // Serve built frontend
  app.use(express.static(path.join(process.cwd(), 'dist'), staticOptions));

  // SPA fallback - serve index.html for all non-API routes
  app.get('/{*splat}', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
}

// ============================================
// Error Handling
// ============================================

// 404 handler for API routes
app.use('/api/{*splat}', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler - must be last
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  // Don't leak error details in production
  if (isProduction) {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack,
    });
  }
});

// Start server
async function start() {
  try {
    // Initialize database schema
    await initAuthSchema();

    // Seed custom calculators to S3 (non-fatal - server starts even if S3 fails)
    try {
      await seedCustomCalculators();
    } catch (seedError) {
      console.error('S3 seeding failed (non-fatal, server continues):', seedError);
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Server running at http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth endpoint: http://localhost:${PORT}/api/auth`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`📁 Serving static files from ./dist`);
      }
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
