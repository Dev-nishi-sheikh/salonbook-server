export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
}

export enum ServiceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
}

export enum TransactionStatus {
  PAID = 'paid',
  FAILED = 'failed',
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  isBlocked: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IService {
  _id: string;
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

export interface IAppointment {
  _id: string;
  serviceId: string;
  customerId: string;
  appointmentDate: Date;
  timeSlot: string;
  message?: string;
  servicePrice: number;
  paymentStatus: PaymentStatus;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction {
  _id: string;
  appointmentId: string;
  customerId: string;
  amount: number;
  currency: string;
  stripeSessionId: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

import { Request } from 'express';