import { Router } from 'express';
import {
  initiatePayment,
  paymentSuccess,
  paymentCancel,
  stripeWebhook,
  getTransactions,
  getTransactionById,
  getTransactionStats,
} from '../controllers/transactionController';
import { authenticate, authorize } from '../middleware/auth';
import { validateParams, validateQuery } from '../middleware/validate';
import { querySchema, idParamSchema } from '../utils/validators';
import { UserRole } from '../types';
import express from 'express';

const router = Router();

router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

router.get('/success', paymentSuccess);
router.get('/cancel', paymentCancel);

router.post('/initiate', authenticate, authorize(UserRole.CUSTOMER), initiatePayment);
router.get('/', authenticate, validateQuery(querySchema), getTransactions);
router.get('/stats', authenticate, getTransactionStats);
router.get('/:id', authenticate, validateParams(idParamSchema), getTransactionById);

export default router;