import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { connectDB } from './utils/db';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { getAuth, ensureAuth } from './config/auth';

import authRoutes from './routes/authRoutes';
import serviceRoutes from './routes/serviceRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import transactionRoutes from './routes/transactionRoutes';
import userRoutes from './routes/userRoutes';

const app = express();
app.set('trust proxy', 1);

/**
 * Better Auth owns these sub-paths under /api/auth (social sign-in, session,
 * OAuth callbacks, password reset, ...). They must be handled by the Better Auth
 * node handler rather than the custom auth controller routes below.
 */
const BETTER_AUTH_PATHS = [
  '/api/auth/sign-in',
  '/api/auth/sign-up',
  '/api/auth/sign-out',
  '/api/auth/get-session',
  '/api/auth/session',
  '/api/auth/callback',
  '/api/auth/oauth2',
  '/api/auth/link-social',
  '/api/auth/account',
  '/api/auth/update-user',
  '/api/auth/change-password',
  '/api/auth/forget-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/delete-user',
  '/api/auth/revoke-session',
  '/api/auth/revoke-sessions',
  '/api/auth/list-sessions',
  '/api/auth/ok',
  '/api/auth/error',
];

// Initialised lazily on first auth request (needs the Mongo connection ready).
// app.use(BETTER_AUTH_PATHS, ...) below resolves the shared initialiser, so a
// restart cannot leave requests hitting an uninitialised Better Auth instance.

app.use(helmet());
const allowedOrigins = config.clientUrl.split(',').map((u: string) => u.trim());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));
app.use('/api/transactions/webhook', express.raw({ type: 'application/json' }));

// Better Auth needs the raw request body, so it is mounted before express.json().
// Static reference for @vercel/nft bundler so better-auth/node is included in the serverless bundle.
if (false as boolean) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('better-auth/node');
}
app.use(BETTER_AUTH_PATHS, (req, res) => {
  Promise.all([
    ensureAuth(),
    Function('s', 'return import(s)')('better-auth/node') as Promise<{ toNodeHandler: (auth: any) => any }>,
  ])
    .then(([auth, { toNodeHandler }]) => toNodeHandler(auth)(req, res))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Better Auth handler failed:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Authentication service unavailable' });
      }
    });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;