import { Request, Response } from 'express';
import { Service } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { ServiceStatus } from '../types';
import { uploadBufferToImgBB } from '../services/imgbb';
import mongoose from 'mongoose';

export const getServices = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status = ServiceStatus.ACTIVE,
  } = req.query;

  const query: any = { status };
  
  if (search) {
    query.$text = { $search: search as string };
  }
  
  if (category) {
    query.category = category;
  }

  const sort: any = {};
  sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

  const skip = (Number(page) - 1) * Number(limit);
  
  const [services, total] = await Promise.all([
    Service.find(query).sort(sort).skip(skip).limit(Number(limit)),
    Service.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: services,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

export const getServiceCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await Service.distinct('category', { status: ServiceStatus.ACTIVE });
  res.json({ success: true, data: categories });
});

export const getServiceById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid service ID');
  }

  const service = await Service.findById(id);
  
  if (!service) {
    throw new AppError(404, 'Service not found');
  }

  res.json({ success: true, data: service });
});

export const createService = asyncHandler(async (req: Request, res: Response) => {
  const { serviceName, category, description, price, duration, image, status } = req.body;

  let imageUrl = image;
  
  if (req.file) {
    imageUrl = await uploadBufferToImgBB(req.file.buffer);
  }

  if (!imageUrl) {
    throw new AppError(400, 'An image file or a valid image URL is required');
  }

  const service = await Service.create({
    serviceName,
    category,
    description,
    price,
    duration,
    image: imageUrl,
    status: status || ServiceStatus.ACTIVE,
  });

  res.status(201).json({
    success: true,
    message: 'Service created successfully',
    data: service,
  });
});

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updates: Record<string, unknown> = { ...req.body };

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid service ID');
  }

  if (req.file) {
    updates.image = await uploadBufferToImgBB(req.file.buffer);
  } else if (!updates.image) {
    // Keep the stored image when the admin edits without supplying a new one.
    delete updates.image;
  }

  const service = await Service.findByIdAndUpdate(
    id,
    updates,
    { new: true, runValidators: true }
  );

  if (!service) {
    throw new AppError(404, 'Service not found');
  }

  res.json({
    success: true,
    message: 'Service updated successfully',
    data: service,
  });
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid service ID');
  }

  const service = await Service.findByIdAndDelete(id);
  
  if (!service) {
    throw new AppError(404, 'Service not found');
  }

  res.json({ success: true, message: 'Service deleted successfully' });
});

export const toggleServiceStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid service ID');
  }

  const service = await Service.findById(id);
  
  if (!service) {
    throw new AppError(404, 'Service not found');
  }

  service.status = service.status === ServiceStatus.ACTIVE ? ServiceStatus.INACTIVE : ServiceStatus.ACTIVE;
  await service.save();

  res.json({
    success: true,
    message: `Service ${service.status}`,
    data: service,
  });
});

export const getFeaturedServices = asyncHandler(async (req: Request, res: Response) => {
  const services = await Service.find({ status: ServiceStatus.ACTIVE })
    .sort({ createdAt: -1 })
    .limit(6);

  res.json({ success: true, data: services });
});