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
  const { betterAuth } = await import('better-auth');
  const { mongodbAdapter } = await import('better-auth/adapters/mongodb');

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
    trustedOrigins: [config.clientUrl],
    advanced: {
      // NOTE: do not override `advanced.cookies.*.name`. Renaming the session
      // cookie replaces the default `better-auth.session_token` name entirely,
      // while the session reader only looks for `better-auth.session_token`
      // (or its `__Secure-` prefixed form). A custom name makes every
      // `get-session` call resolve to null and logs the user out immediately.
      // Better Auth derives `secure`/`sameSite`/`path` from baseURL, which is
      // HTTPS in production and HTTP on localhost.
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