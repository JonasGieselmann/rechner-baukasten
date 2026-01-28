import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, schema, trySetFirstUserAsSuperAdmin } from './db.js';

// ============================================
// Security Configuration
// ============================================

const isProduction = process.env.NODE_ENV === 'production';

// Build trusted origins list - only allow necessary origins
const trustedOrigins: string[] = [];

// In development, allow localhost ports
if (!isProduction) {
  trustedOrigins.push(
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:3001'
  );
}

// Add production URL if configured (required in production)
if (process.env.APP_URL) {
  trustedOrigins.push(process.env.APP_URL);
}

// Validate that we have trusted origins in production
if (isProduction && trustedOrigins.length === 0) {
  throw new Error('APP_URL environment variable is required in production');
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disable for MVP - enable in production for better security
    // Password requirements are handled by Better Auth's built-in validation
    // Better Auth uses scrypt for password hashing by default (memory-hard, secure)
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day - auto-extends session on activity
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes - reduces database lookups
    },
  },
  // Security: Only allow requests from trusted origins
  trustedOrigins,
  // Advanced security settings
  advanced: {
    // Use secure cookies in production (requires HTTPS)
    useSecureCookies: isProduction,
    // Cookie settings for better security
    defaultCookieAttributes: {
      httpOnly: true, // Prevent JavaScript access to cookies
      sameSite: 'lax', // CSRF protection
      secure: isProduction, // Only send over HTTPS in production
      path: '/',
    },
  },
  // Rate limiting is built-in to Better Auth
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Atomically try to set this user as super_admin if no super_admin exists
          // This prevents race conditions when multiple users register simultaneously
          const wasPromoted = await trySetFirstUserAsSuperAdmin(user.id);
          if (wasPromoted) {
            console.log(`First user ${user.email} set as super_admin (auto-approved)`);
          }
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
        input: false,
      },
      approved: {
        type: 'boolean',
        defaultValue: false,
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
