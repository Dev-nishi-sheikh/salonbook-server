import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { toNodeHandler } from 'better-auth/node';
import { config } from './config';
import { connectDB } from './utils/db';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { getAuth, initAuth } from './config/auth';

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
let authInitPromise: Promise<void> | null = null;
const ensureAuth = (): Promise<void> => {
  if (!authInitPromise) {
    authInitPromise = initAuth().then(() => undefined);
  }
  return authInitPromise;
};

app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));
app.use('/api/transactions/webhook', express.raw({ type: 'application/json' }));

// Better Auth needs the raw request body, so it is mounted before express.json().
app.use(BETTER_AUTH_PATHS, (req, res) => {
  ensureAuth()
    .then(() => toNodeHandler(getAuth())(req, res))
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

export const startServer = async (): Promise<void> => {
  await connectDB();
  
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
};

if (require.main === module) {
  startServer().catch(console.error);
}

export default app;