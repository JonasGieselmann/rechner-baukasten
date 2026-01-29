import { createAuthClient } from 'better-auth/react';

// In production, frontend and API are served from the same origin, so use relative URLs
// In development, VITE_API_URL can point to the dev server (e.g., http://localhost:3001)
const API_URL = import.meta.env.VITE_API_URL || '';

export const authClient = createAuthClient({
  baseURL: API_URL,
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
