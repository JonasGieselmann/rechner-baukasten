import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, schema } from './db';

// Build trusted origins list
const trustedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:3001',
];

// Add production URL if configured
if (process.env.APP_URL) {
  trustedOrigins.push(process.env.APP_URL);
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disable for MVP
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins,
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
