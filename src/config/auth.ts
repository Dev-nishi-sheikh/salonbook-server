import { config } from '../config';
import mongoose from 'mongoose';

let authInstance: any = null;
let authInitPromise: Promise<void> | null = null;

/**
 * Resolves the Better Auth instance, initialising it on first use. Safe to call
 * from request handlers: concurrent callers share a single initialisation, and a
 * failed initialisation is not cached so the next request can retry once the
 * Mongo connection is ready.
 */
export const ensureAuth = async () => {
  if (!authInitPromise) {
    authInitPromise = initAuth().catch(error => {
      authInitPromise = null;
      throw error;
    });
  }
  await authInitPromise;
  return authInstance;
};

export const initAuth = async () => {
  // Static references for @vercel/nft bundler so better-auth and its dependencies are bundled.
  if (false as boolean) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('better-auth');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('better-auth/adapters/mongodb');
  }
  const dynamicImport = (s: string) => Function('specifier', 'return import(specifier)')(s);
  const { betterAuth } = await dynamicImport('better-auth');
  const { mongodbAdapter } = await dynamicImport('better-auth/adapters/mongodb');

  // Validate required production environment variables
  if (!config.google.clientId || !config.google.clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
  }
  if (!config.betterAuth.secret || config.betterAuth.secret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be at least 32 characters');
  }
  if (!config.mongodb.uri) {
    throw new Error('MONGODB_URI is required');
  }
  if (!config.betterAuth.url) {
    throw new Error('BETTER_AUTH_URL is required');
  }

  // Parse trusted origins from CLIENT_URL (comma-separated)
  const trustedOrigins = config.clientUrl
    .split(',')
    .map((u: string) => u.trim())
    .filter(Boolean);

  authInstance = betterAuth({
    database: mongodbAdapter(mongoose.connection.db!),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      maxPasswordLength: 128,
      requireEmailVerification: false,
      autoSignIn: true,
    },
    socialProviders: {
      google: {
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
      },
    },
    user: {
      additionalFields: {
        role: {
          type: 'string',
          defaultValue: 'customer',
          input: false,
        },
        isBlocked: {
          type: 'boolean',
          defaultValue: false,
          input: false,
        },
        // Stored by the profile endpoint; exposed here so the session payload
        // (and therefore the client) can read it back after a reload.
        phone: {
          type: 'string',
          required: false,
          input: false,
        },
      },
      deleteUser: {
        enabled: true,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      // The cookie cache is disabled so the session always reflects the stored
      // user record; a cached session would keep returning stale profile fields
      // (e.g. phone) for the cache lifetime after an update.
      cookieCache: {
        enabled: false,
      },
    },
    secret: config.betterAuth.secret,
    baseURL: config.betterAuth.url,
    trustedOrigins,
    advanced: {
      defaultCookieAttributes: {
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
        secure: config.nodeEnv === 'production',
      },
    },
  });
  
  return authInstance;
};

export const getAuth = () => {
  if (!authInstance) {
    throw new Error('Auth not initialized. Call initAuth() first.');
  }
  return authInstance;
};

export type Session = any;
export type User = any;