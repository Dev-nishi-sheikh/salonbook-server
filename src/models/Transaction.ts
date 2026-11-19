import mongoose, { Document, Schema } from 'mongoose';
import { TransactionStatus } from '../types';

export interface ITransaction extends Document {
  appointmentId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  stripeSessionId: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'usd' },
  stripeSessionId: { type: String, required: true, unique: true },
  status: { type: String, enum: Object.values(TransactionStatus), required: true },
}, {
  timestamps: true,
});

transactionSchema.index({ customerId: 1 });
transactionSchema.index({ appointmentId: 1 });
transactionSchema.index({ stripeSessionId: 1 });
transactionSchema.index({ createdAt: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);