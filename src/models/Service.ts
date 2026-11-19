import mongoose, { Document, Schema } from 'mongoose';
import { ServiceStatus } from '../types';

export interface IService extends Document {
  serviceName: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  image: string;
  status: ServiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>({
  serviceName: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  duration: { type: Number, required: true, min: 1 },
  image: { type: String, required: true },
  status: { type: String, enum: Object.values(ServiceStatus), default: ServiceStatus.ACTIVE },
}, {
  timestamps: true,
});

serviceSchema.index({ serviceName: 'text', category: 'text', description: 'text' });
serviceSchema.index({ status: 1, category: 1 });
serviceSchema.index({ createdAt: -1 });

export const Service = mongoose.model<IService>('Service', serviceSchema);