import mongoose, { Document, Schema } from 'mongoose';
import { UserRole, ServiceStatus } from '../types';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: UserRole;
  isBlocked: boolean;
  emailVerified: boolean;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  image: { type: String },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.CUSTOMER },
  isBlocked: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  googleId: { type: String, sparse: true },
}, {
  timestamps: true,
});

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Better Auth's MongoDB adapter stores users in the `user` collection. The app
// previously read a separate `users` collection, so session lookups and
// populate() calls could never resolve an authenticated user. Pin the model to
// the same collection Better Auth writes to.
export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema, 'user');