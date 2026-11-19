import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload, UserRole } from '../types';

export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.betterAuth.secret, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, config.betterAuth.secret) as JWTPayload;
  } catch {
    return null;
  }
};

export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};