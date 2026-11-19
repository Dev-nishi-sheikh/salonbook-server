import { Request, Response } from 'express';
import { Appointment, Service } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { AppointmentStatus, PaymentStatus } from '../types';
import mongoose from 'mongoose';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

export const getTimeSlots = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: TIME_SLOTS });
});

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const user = authReq.user;
  const { serviceId, appointmentDate, timeSlot, message } = req.body;

  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    throw new AppError(400, 'Invalid service ID');
  }

  const service = await Service.findById(serviceId);
  if (!service) {
    throw new AppError(404, 'Service not found');
  }

  if (service.status !== 'active') {
    throw new AppError(400, 'Service is not available for booking');
  }

  const appointmentDateObj = new Date(appointmentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (appointmentDateObj < today) {
    throw new AppError(400, 'Cannot book appointments for past dates');
  }

  try {
    const appointment = await Appointment.create({
      serviceId,
      customerId: user._id,
      appointmentDate: appointmentDateObj,
      timeSlot,
      message,
      servicePrice: service.price,
      paymentStatus: PaymentStatus.UNPAID,
      status: AppointmentStatus.PENDING,
    });

    await appointment.populate('serviceId', 'serviceName category image price duration');

    res.status(201).json({
      success: true,
      message: 'Appointment request submitted successfully',
      data: appointment,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key error from unique indexes
      const keyPattern = error.keyPattern || {};
      if (keyPattern.serviceId && keyPattern.appointmentDate && keyPattern.timeSlot) {
        throw new AppError(400, 'This time slot is already booked for the selected service');
      }
      if (keyPattern.customerId && keyPattern.appointmentDate && keyPattern.timeSlot) {
        throw new AppError(400, 'You already have an appointment at this time');
      }
      throw new AppError(400, 'Booking conflict: slot already reserved');
    }
    throw error;
  }
});

export const getMyAppointments = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const user = authReq.user;
  const { page = 1, limit = 10, status } = req.query;

  const query: any = { customerId: user._id };
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  
  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('serviceId', 'serviceName category image price duration'),
    Appointment.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: appointments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

export const getAppointmentById = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const user = authReq.user;
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid appointment ID');
  }

  const appointment = await Appointment.findById(id)
    .populate('serviceId', 'serviceName category image price duration')
    .populate('customerId', 'name email image');

  if (!appointment) {
    throw new AppError(404, 'Appointment not found');
  }

  if (appointment.customerId.toString() !== user._id && user.role !== 'admin') {
    throw new AppError(403, 'Not authorized to view this appointment');
  }

  res.json({ success: true, data: appointment });
});

export const cancelAppointment = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const user = authReq.user;
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid appointment ID');
  }

  const appointment = await Appointment.findById(id);
  
  if (!appointment) {
    throw new AppError(404, 'Appointment not found');
  }

  if (appointment.customerId.toString() !== user._id) {
    throw new AppError(403, 'Not authorized to cancel this appointment');
  }

  if (appointment.status !== AppointmentStatus.PENDING) {
    throw new AppError(400, 'Can only cancel pending appointments');
  }

  appointment.status = AppointmentStatus.CANCELLED;
  await appointment.save();

  res.json({ success: true, message: 'Appointment cancelled successfully' });
});

export const getAllAppointments = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, status, paymentStatus, search } = req.query;

  const query: any = {};
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  const skip = (Number(page) - 1) * Number(limit);
  
  let appointmentsQuery = Appointment.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('serviceId', 'serviceName category image price duration')
    .populate('customerId', 'name email image');

  if (search) {
    const services = await Service.find({ 
      $text: { $search: search as string } 
    }).select('_id');
    const serviceIds = services.map(s => s._id);
    query.serviceId = { $in: serviceIds };
    appointmentsQuery = Appointment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('serviceId', 'serviceName category image price duration')
      .populate('customerId', 'name email image');
  }

  const [appointments, total] = await Promise.all([
    appointmentsQuery,
    Appointment.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: appointments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

export const updateAppointmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid appointment ID');
  }

  const appointment = await Appointment.findById(id);
  
  if (!appointment) {
    throw new AppError(404, 'Appointment not found');
  }

  if (status === AppointmentStatus.CONFIRMED && appointment.status !== AppointmentStatus.PENDING) {
    throw new AppError(400, 'Only pending appointments can be confirmed');
  }

  if (status === AppointmentStatus.CANCELLED && 
      ![AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appointment.status)) {
    throw new AppError(400, 'Can only cancel pending or confirmed appointments');
  }

  appointment.status = status;
  await appointment.save();

  await appointment.populate('serviceId', 'serviceName category image price duration');
  await appointment.populate('customerId', 'name email image');

  res.json({
    success: true,
    message: `Appointment ${status}`,
    data: appointment,
  });
});

export const getAppointmentStats = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const user = authReq.user;

  const query: any = {};
  if (user.role === 'customer') {
    query.customerId = user._id;
  }

  const [total, pending, confirmed, cancelled] = await Promise.all([
    Appointment.countDocuments(query),
    Appointment.countDocuments({ ...query, status: AppointmentStatus.PENDING }),
    Appointment.countDocuments({ ...query, status: AppointmentStatus.CONFIRMED }),
    Appointment.countDocuments({ ...query, status: AppointmentStatus.CANCELLED }),
  ]);

  res.json({
    success: true,
    data: { total, pending, confirmed, cancelled },
  });
});