
import 'dotenv/config';

import fs from 'fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';

import User from '../models/User.js';
import Course from '../models/Course.js';

// Convert Udemy dataset levels to our Course model enum
const normalizeLevel = (level) => {
  const value = String(level || '').trim().toLowerCase();

  if (value.includes('intermediate')) return 'intermediate';
  if (value.includes('expert')) return 'advanced';

  return 'beginner';
};

const seedCourses = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Read and parse CSV
    const rows = parse(
      fs.readFileSync('data/courses.csv'),
      {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }
    );

    console.log(`Found ${rows.length} courses in CSV`);

    // Create five demo instructors
    const passwordHash = await bcrypt.hash('Password@123', 10);
    const instructors = [];

    for (let n = 1; n <= 5; n++) {
      const instructor = await User.findOneAndUpdate(
        { email: `instructor${n}@demo.com` },
        {
          $set: {
            name: `Instructor ${n}`,
            role: 'instructor',
            passwordHash,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      instructors.push(instructor);
    }

    // Remove only previously seeded courses
    await Course.deleteMany({ seeded: true });

    // Prepare and insert 80 courses
    const courses = rows.slice(0, 80).map((row, index) => {
      const numericPrice = Number(row.price);

      return {
        title: row.course_title,
        description: `${row.course_title}. A hands-on course.`,
        category: row.subject || 'General',
        level: normalizeLevel(row.level),
        price:
          row.is_paid === 'True' && Number.isFinite(numericPrice)
            ? numericPrice * 10
            : 0,
        thumbnail: `https://picsum.photos/seed/${index}/640/360`,
        instructor: instructors[index % 5]._id,
        status: 'published',
        seeded: true,
      };
    });

    await Course.insertMany(courses);

    console.log(`Successfully seeded ${courses.length} courses`);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedCourses();
