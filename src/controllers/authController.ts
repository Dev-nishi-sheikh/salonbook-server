import { Request, Response } from 'express';
import { auth } from '../config/auth';
import { User, IUser } from '../models';
import { UserRole } from '../types';
import { generateToken } from '../utils/jwt';
import { asyncHandler } from '../middleware/errorHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, image } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const result = await auth.api.signUpEmail({
    body: { name, email, password, image },
  });

  if (!result.user) {
    return res.status(400).json({ success: false, message: 'Registration failed' });
  }

  const user = await User.findById(result.user.id);
  if (!user) {
    return res.status(500).json({ success: false, message: 'User creation failed' });
  }

  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        isBlocked: user.isBlocked,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await auth.api.signInEmail({
    body: { email, password },
  });

  if (!result.user || !result.session) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const user = await User.findById(result.user.id);
  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  if (user.isBlocked) {
    return res.status(403).json({ success: false, message: 'Account is blocked' });
  }

  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        isBlocked: user.isBlocked,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    },
  });
});

export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body;

  const result = await auth.api.signInSocial({
    body: { provider: 'google', idToken },
  });

  if (!result.user || !result.session) {
    return res.status(401).json({ success: false, message: 'Google authentication failed' });
  }

  let user = await User.findById(result.user.id);
  
  if (!user) {
    user = await User.findOne({ email: result.user.email });
    if (user) {
      user.googleId = result.user.id;
      await user.save();
    }
  }

  if (!user) {
    return res.status(500).json({ success: false, message: 'User creation failed' });
  }

  if (user.isBlocked) {
    return res.status(403).json({ success: false, message: 'Account is blocked' });
  }

  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  res.json({
    success: true,
    message: 'Google login successful',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        isBlocked: user.isBlocked,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    },
  });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const user = authReq.user;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  const dbUser = await User.findById(user._id).select('-password');
  
  if (!dbUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({
    success: true,
    data: {
      _id: dbUser._id,
      name: dbUser.name,
      email: dbUser.email,
      image: dbUser.image,
      role: dbUser.role,
      isBlocked: dbUser.isBlocked,
      emailVerified: dbUser.emailVerified,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const sessionToken = authReq.headers.authorization?.replace('Bearer ', '');
  
  if (sessionToken) {
    await auth.api.signOut({ headers: { authorization: `Bearer ${sessionToken}` } });
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  const user = authReq.user;
  const { name, image, phone } = req.body;

  const dbUser = await User.findById(user._id);
  if (!dbUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (name) dbUser.name = name;
  if (image) dbUser.image = image;
  if (phone !== undefined) (dbUser as any).phone = phone;

  await dbUser.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      _id: dbUser._id,
      name: dbUser.name,
      email: dbUser.email,
      image: dbUser.image,
      role: dbUser.role,
      isBlocked: dbUser.isBlocked,
      emailVerified: dbUser.emailVerified,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    },
  });
});