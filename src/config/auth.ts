import { config } from '../config';
import mongoose from 'mongoose';

let authInstance: any = null;

export const initAuth = async () => {
  const { betterAuth } = await import('better-auth');
  const { mongodbAdapter } = await import('better-auth/adapters/mongodb');
  
  const isProduction = config.nodeEnv === 'production';
  
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
      crossSubDomainCookies: {
        enabled: true,
      },
      cookies: {
        session_token: {
          name: 'session_token',
          attributes: {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/',
            domain: isProduction ? undefined : undefined,
          },
        },
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