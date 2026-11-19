import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/salonbook',
  },
  
  betterAuth: {
    secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-key-change-in-production',
    url: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
  },
  
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },
  
  imgbb: {
    apiKey: process.env.IMGBB_API_KEY || '',
  },
  
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
};