import { config } from '../config';
import mongoose from 'mongoose';
import { getAuth } from '../config/auth';
import { User } from '../models';
import { UserRole } from '../types';

const seedAdmin = async () => {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');

    const auth = getAuth();
    
    const adminEmail = config.adminEmail;
    const adminPassword = config.adminPassword;

    if (!adminEmail || !adminPassword) {
      console.log('ADMIN_EMAIL or ADMIN_PASSWORD not set in .env, skipping admin seed');
      return;
    }

    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      if (existingAdmin.role !== UserRole.ADMIN) {
        existingAdmin.role = UserRole.ADMIN;
        await existingAdmin.save();
        console.log(`Updated existing user ${adminEmail} to admin role`);
      } else {
        console.log(`Admin user ${adminEmail} already exists`);
      }
      return;
    }

    const result = await auth.api.signUpEmail({
      body: {
        name: 'Admin',
        email: adminEmail,
        password: adminPassword,
      },
    });

    if (!result.user) {
      console.error('Failed to create admin user');
      return;
    }

    const adminUser = await User.findById(result.user.id);
    if (adminUser) {
      adminUser.role = UserRole.ADMIN;
      adminUser.emailVerified = true;
      await adminUser.save();
      console.log(`Admin user created successfully: ${adminEmail}`);
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedAdmin();