import mongoose, { Document, Schema } from 'mongoose';
import { AppointmentStatus, PaymentStatus } from '../types';

export interface IAppointment extends Document {
  serviceId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  appointmentDate: Date;
  timeSlot: string;
  message?: string;
  servicePrice: number;
  paymentStatus: PaymentStatus;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>({
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  appointmentDate: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  message: { type: String, trim: true },
  servicePrice: { type: Number, required: true, min: 0 },
  paymentStatus: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.UNPAID },
  status: { type: String, enum: Object.values(AppointmentStatus), default: AppointmentStatus.PENDING },
}, {
  timestamps: true,
});

appointmentSchema.index({ customerId: 1, status: 1 });
appointmentSchema.index({ serviceId: 1 });
appointmentSchema.index({ appointmentDate: 1, timeSlot: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ createdAt: -1 });

appointmentSchema.index(
  { customerId: 1, appointmentDate: 1, timeSlot: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: AppointmentStatus.CANCELLED } } }
);

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);