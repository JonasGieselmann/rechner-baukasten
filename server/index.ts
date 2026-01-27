import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth';
import { checkDb, initAuthSchema } from './db';
import customCalculatorsRouter from './custom-calculators';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Build CORS origins list
const corsOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
];

// Add production URL if configured
if (process.env.APP_URL) {
  corsOrigins.push(process.env.APP_URL);
}

// CORS configuration - MUST be before other middleware
app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Better Auth handler - MUST be before express.json()
// Express 5 requires named wildcards
app.all('/api/auth/*splat', toNodeHandler(auth));

// JSON body parser for other routes
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbOk = await checkDb();
  res.json({
    status: dbOk ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    database: dbOk ? 'connected' : 'disconnected',
  });
});

// Get current user session
app.get('/api/me', async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json(session);
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Custom Calculators API
app.use('/api/custom-calculators', customCalculatorsRouter);

// In production, serve static files
if (process.env.NODE_ENV === 'production') {
  // Serve public folder (custom calculators)
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Serve built frontend
  app.use(express.static(path.join(process.cwd(), 'dist')));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Don't serve index.html for custom calculator routes
    if (req.path.startsWith('/custom-calculators/')) {
      res.status(404).send('Not found');
      return;
    }
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
}

// Start server
async function start() {
  try {
    // Initialize database schema
    await initAuthSchema();

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
