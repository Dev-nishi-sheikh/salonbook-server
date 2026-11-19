import { Request, Response } from 'express';
import { Appointment, Transaction, User } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { AppointmentStatus, PaymentStatus, TransactionStatus } from '../types';
import { createCheckoutSession, verifyWebhookSignature, retrieveSession } from '../services/stripe';
import { config } from '../config';
import mongoose from 'mongoose';

export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const user = authReq.user;
  const { appointmentId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw new AppError(400, 'Invalid appointment ID');
  }

  const appointment = await Appointment.findById(appointmentId)
    .populate('serviceId', 'serviceName');

  if (!appointment) {
    throw new AppError(404, 'Appointment not found');
  }

  if (appointment.customerId.toString() !== user._id) {
    throw new AppError(403, 'Not authorized to pay for this appointment');
  }

  if (appointment.status !== AppointmentStatus.CONFIRMED) {
    throw new AppError(400, 'Can only pay for confirmed appointments');
  }

  if (appointment.paymentStatus === PaymentStatus.PAID) {
    throw new AppError(400, 'Appointment already paid');
  }

  const serviceName = (appointment.serviceId as any)?.serviceName || 'Salon Appointment';
  const successUrl = `${config.clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${config.clientUrl}/payment/cancel`;

  const session = await createCheckoutSession(
    appointment.servicePrice,
    'usd',
    successUrl,
    cancelUrl,
    {
      appointmentId: appointment._id.toString(),
      customerId: user._id.toString(),
      serviceName,
    }
  );

  res.json({
    success: true,
    data: { sessionId: session.id, url: session.url },
  });
});

export const paymentSuccess = asyncHandler(async (req: Request, res: Response) => {
  const { session_id } = req.query;

  if (!session_id) {
    throw new AppError(400, 'Session ID is required');
  }

  const session = await retrieveSession(session_id as string);

  if (session.payment_status !== 'paid') {
    throw new AppError(400, 'Payment not completed');
  }

  const appointmentId = session.metadata?.appointmentId;
  const customerId = session.metadata?.customerId;

  if (!appointmentId || !customerId) {
    throw new AppError(400, 'Invalid session metadata');
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new AppError(404, 'Appointment not found');
  }

  res.json({
    success: true,
    message: 'Payment successful',
    data: {
      appointmentId,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency,
    },
  });
});

export const paymentCancel = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Payment cancelled',
  });
});

export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    throw new AppError(400, 'Missing stripe signature');
  }

  let event;
  try {
    event = verifyWebhookSignature(req.body, signature);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    throw new AppError(400, 'Webhook signature verification failed');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    
    if (session.payment_status === 'paid') {
      const appointmentId = session.metadata?.appointmentId;
      const customerId = session.metadata?.customerId;
      const stripeSessionId = session.id;
      const amount = session.amount_total ? session.amount_total / 100 : 0;
      const currency = session.currency;

      if (appointmentId && customerId) {
        const appointment = await Appointment.findById(appointmentId);
        
        if (appointment && appointment.paymentStatus !== PaymentStatus.PAID) {
          appointment.paymentStatus = PaymentStatus.PAID;
          appointment.status = AppointmentStatus.CONFIRMED;
          await appointment.save();

          await Transaction.create({
            appointmentId,
            customerId,
            amount,
            currency,
            stripeSessionId,
            status: TransactionStatus.PAID,
          });
        }
      }
    }
  }

  res.json({ received: true });
});

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const user = authReq.user;
  const { page = 1, limit = 10 } = req.query;

  const query: any = user.role === 'admin' ? {} : { customerId: user._id };

  const skip = (Number(page) - 1) * Number(limit);
  
  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('appointmentId', 'appointmentDate timeSlot')
      .populate('customerId', 'name email')
      .populate({
        path: 'appointmentId',
        populate: { path: 'serviceId', select: 'serviceName category' }
      }),
    Transaction.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: transactions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

export const getTransactionById = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const user = authReq.user;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid transaction ID');
  }

  const transaction = await Transaction.findById(id)
    .populate('appointmentId', 'appointmentDate timeSlot')
    .populate('customerId', 'name email')
    .populate({
      path: 'appointmentId',
      populate: { path: 'serviceId', select: 'serviceName category price duration' }
    });

  if (!transaction) {
    throw new AppError(404, 'Transaction not found');
  }

  if (transaction.customerId.toString() !== user._id && user.role !== 'admin') {
    throw new AppError(403, 'Not authorized to view this transaction');
  }

  res.json({ success: true, data: transaction });
});

export const getTransactionStats = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.role === 'admin' ? {} : { customerId: (req as any).user._id };

  const [total, paid, failed, totalAmount] = await Promise.all([
    Transaction.countDocuments(query),
    Transaction.countDocuments({ ...query, status: TransactionStatus.PAID }),
    Transaction.countDocuments({ ...query, status: TransactionStatus.FAILED }),
    Transaction.aggregate([
      { $match: { ...query, status: TransactionStatus.PAID } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      total,
      paid,
      failed,
      totalAmount: totalAmount[0]?.total || 0,
    },
  });
});