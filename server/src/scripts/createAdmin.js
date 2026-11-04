import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const email = 'admin@lms.com';
    const password = 'Admin@123456';

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name: 'LMS Admin',
          email,
          passwordHash,
          role: 'admin',
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log('Admin user created/updated successfully');
    console.log(`Admin email: ${admin.email}`);
  } catch (error) {
    console.error('Admin creation failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();