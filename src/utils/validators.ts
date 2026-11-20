import { z } from 'zod';
import { UserRole, ServiceStatus, AppointmentStatus, PaymentStatus } from '../types';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter'),
  image: z.string().url('Invalid image URL').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  image: z.string().url('Invalid image URL').optional().or(z.literal('')),
  phone: z.string().optional(),
});

export const serviceSchema = z.object({
  serviceName: z.string().min(2, 'Service name must be at least 2 characters').max(100),
  category: z.string().min(2, 'Category must be at least 2 characters').max(50),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  // Coerced because multipart form fields always arrive as strings; the controller
  // supplies the ImgBB URL when a file is uploaded instead of a URL field.
  price: z.coerce.number().positive('Price must be a positive number'),
  duration: z.coerce.number().int().positive('Duration must be a positive integer'),
  image: z.string().url('Invalid image URL').optional().or(z.literal('')),
  status: z.nativeEnum(ServiceStatus).default(ServiceStatus.ACTIVE),
});

export const updateServiceSchema = serviceSchema.partial();

export const appointmentSchema = z.object({
  serviceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid service ID'),
  appointmentDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format'),
  timeSlot: z.string().min(1, 'Time slot is required'),
  message: z.string().max(500, 'Message too long').optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

export const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  category: z.string().optional(),
  sortBy: z.enum(['price', 'createdAt', 'serviceName']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
});

export const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});

export const blockUserSchema = z.object({
  isBlocked: z.boolean(),
});

export const roleUpdateSchema = z.object({
  role: z.nativeEnum(UserRole),
});