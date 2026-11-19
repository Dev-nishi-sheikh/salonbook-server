import { Request, Response } from 'express';
import { User, Appointment, Transaction } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../types';
import mongoose from 'mongoose';

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search, role, isBlocked } = req.query;

  const query: any = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (role) query.role = role;
  if (isBlocked !== undefined) query.isBlocked = isBlocked === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid user ID');
  }

  const user = await User.findById(id).select('-password');
  
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  res.json({ success: true, data: user });
});

export const blockUnblockUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { isBlocked } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid user ID');
  }

  const user = await User.findById(id);
  
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (user.role === UserRole.ADMIN) {
    throw new AppError(400, 'Cannot block admin users');
  }

  user.isBlocked = isBlocked;
  await user.save();

  res.json({
    success: true,
    message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
    data: { _id: user._id, name: user.name, email: user.email, isBlocked: user.isBlocked },
  });
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { role } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid user ID');
  }

  const user = await User.findById(id);
  
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  user.role = role;
  await user.save();

  res.json({
    success: true,
    message: `User role updated to ${role}`,
    data: { _id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const user = authReq.user;

  if (user.role === UserRole.CUSTOMER) {
    const [totalAppointments, pending, confirmed, cancelled, totalPayments] = await Promise.all([
      Appointment.countDocuments({ customerId: user._id } as any),
      Appointment.countDocuments({ customerId: user._id, status: 'pending' } as any),
      Appointment.countDocuments({ customerId: user._id, status: 'confirmed' } as any),
      Appointment.countDocuments({ customerId: user._id, status: 'cancelled' } as any),
      Transaction.countDocuments({ customerId: user._id, status: 'paid' } as any),
    ]);

    return res.json({
      success: true,
      data: {
        totalAppointments,
        pending,
        confirmed,
        cancelled,
        totalPayments,
      },
    });
  }

  const [totalCustomers, totalServices, totalAppointments, pendingAppointments, confirmedAppointments, successfulPayments] = await Promise.all([
    User.countDocuments({ role: UserRole.CUSTOMER }),
    User.countDocuments({ role: UserRole.ADMIN }),
    Appointment.countDocuments(),
    Appointment.countDocuments({ status: 'pending' } as any),
    Appointment.countDocuments({ status: 'confirmed' } as any),
    Transaction.countDocuments({ status: 'paid' } as any),
  ]);

  res.json({
    success: true,
    data: {
      totalCustomers,
      totalServices,
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      successfulPayments,
    },
  });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid user ID');
  }

  const user = await User.findById(id);
  
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (user.role === UserRole.ADMIN) {
    throw new AppError(400, 'Cannot delete admin users');
  }

  await Appointment.deleteMany({ customerId: id });
  await Transaction.deleteMany({ customerId: id });
  await User.findByIdAndDelete(id);

  res.json({ success: true, message: 'User deleted successfully' });
});