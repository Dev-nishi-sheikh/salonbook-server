import { config } from '../config';
import mongoose from 'mongoose';

let authInstance: any = null;

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
      },
      deleteUser: {
        enabled: true,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
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