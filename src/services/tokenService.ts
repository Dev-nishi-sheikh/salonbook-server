import { Request, Response, NextFunction } from 'express';
import { RefreshToken } from '../models';

export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    await RefreshToken.deleteMany({ expiresAt: { $lt: new Date() } });
  } catch (error) {
    console.error('Failed to cleanup expired tokens:', error);
  }
};

export const revokeUserTokens = async (userId: string): Promise<void> => {
  try {
    await RefreshToken.deleteMany({ userId });
  } catch (error) {
    console.error('Failed to revoke user tokens:', error);
  }
};

export const revokeToken = async (token: string): Promise<void> => {
  try {
    await RefreshToken.deleteOne({ token });
  } catch (error) {
    console.error('Failed to revoke token:', error);
  }
};

export const isTokenRevoked = async (token: string): Promise<boolean> => {
  try {
    const revoked = await RefreshToken.findOne({ token });
    return !revoked;
  } catch {
    return true;
  }
};