import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';
import { getAuth } from '../config/auth';
import { config } from '../config';
import { UserRole, AuthenticatedRequest, JWTPayload } from '../types';

const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

const extractSessionToken = (req: Request): string | null => {
  const cookies = req.headers.cookie;
  if (cookies) {
    // Better Auth writes the session cookie as `__Secure-better-auth.session_token`
    // over HTTPS (plain `better-auth.session_token` on localhost).
    const tokenMatch = cookies.match(/(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }
  return null;
};

const verifyJWT = (token: string): JWTPayload => {
  return jwt.verify(token, config.betterAuth.secret, {
    issuer: config.betterAuth.url,
    algorithms: ['HS256'],
  }) as JWTPayload;
};

const validateUserFromPayload = async (payload: JWTPayload) => {
  const user = await User.findById(payload.userId).select('-password');
  if (!user) {
    throw new Error('User not found');
  }
  if (user.isBlocked) {
    throw new Error('Account is blocked');
  }
  if (user.role !== payload.role) {
    throw new Error('Invalid token: role mismatch');
  }
  return user;
};

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // First, try to verify JWT from Authorization header (for API access)
    const bearerToken = extractBearerToken(req);
    
    if (bearerToken) {
      let payload: JWTPayload;
      try {
        payload = verifyJWT(bearerToken);
      } catch (jwtError) {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
        return;
      }

      // JWT verified - validate user against database
      let user;
      try {
        user = await validateUserFromPayload(payload);
      } catch (err) {
        res.status(401).json({ success: false, message: err instanceof Error ? err.message : 'Authentication failed' });
        return;
      }

      req.user = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        isBlocked: user.isBlocked,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      next();
      return;
    }

    // No Bearer token - fall back to Better Auth session cookie validation
    const sessionToken = extractSessionToken(req);
    if (!sessionToken) {
      res.status(401).json({ success: false, message: 'Authentication required: No session' });
      return;
    }

    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });
    
    if (!session?.user) {
      res.status(401).json({ success: false, message: 'Invalid or expired session' });
      return;
    }

    const user = await User.findById(session.user.id).select('-password');
    
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({ success: false, message: 'Account is blocked' });
      return;
    }

    req.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      isBlocked: user.isBlocked,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bearerToken = extractBearerToken(req);
    
    if (bearerToken) {
      let payload: JWTPayload;
      try {
        payload = verifyJWT(bearerToken);
      } catch {
        next();
        return;
      }

      const user = await User.findById(payload.userId).select('-password');
      if (user && !user.isBlocked && user.role === payload.role) {
        req.user = {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          isBlocked: user.isBlocked,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }
      next();
      return;
    }

    // Fall back to Better Auth session validation
    const sessionToken = extractSessionToken(req);
    if (!sessionToken) {
      next();
      return;
    }

    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });
    
    if (session?.user) {
      const user = await User.findById(session.user.id).select('-password');
      if (user && !user.isBlocked) {
        req.user = {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          isBlocked: user.isBlocked,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }
    }
    next();
  } catch {
    next();
  }
};