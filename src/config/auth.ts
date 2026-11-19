import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { User, Service, Appointment, Transaction } from '../models';
import { config } from '../config';
import mongoose from 'mongoose';

export const auth = betterAuth({
  database: mongodbAdapter(mongoose.connection.db!),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
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
  },
  secret: config.betterAuth.secret,
  baseURL: config.betterAuth.url,
  trustedOrigins: [config.clientUrl],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;