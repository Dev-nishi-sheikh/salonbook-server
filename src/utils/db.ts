import mongoose from 'mongoose';
import { config } from '../config';

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    console.log('Using existing MongoDB connection');
    return;
  }

  if (mongoose.connection.readyState === 2) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
      mongoose.connection.once('open', () => { clearTimeout(timeout); resolve(); });
      mongoose.connection.once('error', (err) => { clearTimeout(timeout); reject(err); });
    });
    return;
  }

  try {
    const conn = await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      bufferCommands: false,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));
    mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
};