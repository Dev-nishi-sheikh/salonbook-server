import app from '../src/app';
import { connectDB } from '../src/utils/db';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

const initializeApp = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  return app;
};

export default async function handler(req: any, res: any) {
  const expressApp = await initializeApp();
  return expressApp(req, res);
}