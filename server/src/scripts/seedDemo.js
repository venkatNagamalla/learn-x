import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import Course from '../models/Course.js';
import Section from '../models/Section.js';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Enrollment from '../models/Enrollment.js';

const DEMO_PASSWORD = 'Demo@12345';
const DEMO_COURSE_TITLE = 'Learn-X Demo: Full-Stack Web Development';

async function seedDemo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Create or update the three demo accounts.
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const accounts = [
      {
        name: 'Learn-X Admin',
        email: 'admin@lms.com',
        role: 'admin',
      },
      {
        name: 'Demo Instructor',
        email: 'instructor@lms.com',
        role: 'instructor',
      },
      {
        name: 'Demo Student',
        email: 'student@lms.com',
        role: 'student',
      },
    ];

    const users = {};

    for (const account of accounts) {
      users[account.role] = await User.findOneAndUpdate(
        { email: account.email },
        {
          $set: {
            ...account,
            passwordHash,
            isBlocked: false,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    console.log('Demo accounts created/updated');

    // Create or update the demo course.
    const course = await Course.findOneAndUpdate(
      {
        title: DEMO_COURSE_TITLE,
        seeded: true,
      },
      {
        $set: {
          title: DEMO_COURSE_TITLE,
          description:
            'A demonstration course covering HTML, CSS, JavaScript and full-stack development.',
          category: 'Web Development',
          level: 'beginner',
          price: 0,
          instructor: users.instructor._id,
          status: 'published',
          seeded: true,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    // Remove only the old demo course's related records.
    const oldQuizzes = await Quiz.find({
      course: course._id,
    }).select('_id');

    const oldQuizIds = oldQuizzes.map((quiz) => quiz._id);

    if (oldQuizIds.length > 0) {
      await QuizAttempt.deleteMany({
        quiz: { $in: oldQuizIds },
      });
    }

    await Quiz.deleteMany({ course: course._id });
    await Lesson.deleteMany({ course: course._id });
    await Section.deleteMany({ course: course._id });

    // Create course sections.
    const section1 = await Section.create({
      course: course._id,
      title: 'Introduction to Web Development',
      order: 1,
    });

    const section2 = await Section.create({
      course: course._id,
      title: 'JavaScript Fundamentals',
      order: 2,
    });

    // Create two demo lessons with the expected HLS path.
    const lesson1 = new Lesson({
      course: course._id,
      section: section1._id,
      title: 'Introduction to HTML and CSS',
      description: 'Learn the foundations of building web pages.',
      order: 1,
      duration: 600,
      processingStatus: 'ready',
      isPreview: true,
    });

    lesson1.hlsPath = `lessons/${lesson1._id}/master.m3u8`;
    lesson1.rawKey = `demo/lessons/${lesson1._id}/source.mp4`;
    await lesson1.save();

    const lesson2 = new Lesson({
      course: course._id,
      section: section2._id,
      title: 'JavaScript Basics',
      description: 'Understand variables, functions and basic programming.',
      order: 1,
      duration: 900,
      processingStatus: 'ready',
      isPreview: false,
    });

    lesson2.hlsPath = `lessons/${lesson2._id}/master.m3u8`;
    lesson2.rawKey = `demo/lessons/${lesson2._id}/source.mp4`;
    await lesson2.save();

    // Create a demo quiz.
    const quiz = await Quiz.create({
      course: course._id,
      section: section2._id,
      title: 'JavaScript Fundamentals Quiz',
      passPercent: 60,
      maxAttempts: 3,
      questions: [
        {
          text: 'Which keyword declares a block-scoped variable?',
          options: ['var', 'let', 'static', 'define'],
          correctIndex: 1,
          explanation: 'The let keyword declares a block-scoped variable.',
        },
        {
          text: 'Which method converts JSON text into a JavaScript object?',
          options: [
            'JSON.stringify()',
            'JSON.parse()',
            'Object.toJSON()',
            'JSON.convert()',
          ],
          correctIndex: 1,
          explanation: 'JSON.parse() parses JSON text into a JavaScript value.',
        },
        {
          text: 'Which symbol is used for strict equality?',
          options: ['=', '==', '===', '!='],
          correctIndex: 2,
          explanation: 'The === operator compares values without type coercion.',
        },
      ],
    });

    // Enroll the demo student directly (no payment or fake quiz attempt).
    await Enrollment.findOneAndUpdate(
      {
        user: users.student._id,
        course: course._id,
      },
      {
        $set: {
          payment: null,
          lessonProgress: 0,
          quizProgress: 0,
          completedAt: null,
        },
        $setOnInsert: {
          enrolledAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log('\nDemo data seeded successfully!');
    console.log(`Course: ${course.title}`);
    console.log(`Sections: 2`);
    console.log(`Lessons: 2`);
    console.log(`Quiz: ${quiz.title}`);
    console.log('Student enrollment: created');
    console.log('\nDemo login credentials:');
    console.log('Admin:      admin@lms.com');
    console.log('Instructor: instructor@lms.com');
    console.log('Student:    student@lms.com');
    console.log(`Password:   ${DEMO_PASSWORD}`);
    console.log(
      '\nNote: Lesson HLS paths are placeholders until real videos are uploaded and processed.'
    );
  } catch (error) {
    console.error('Demo seed failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDemo();
