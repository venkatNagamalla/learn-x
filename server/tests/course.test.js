
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest';

import request from 'supertest';

import app from '../src/app.js';

import Course from '../src/models/Course.js';
import Section from '../src/models/Section.js';
import Lesson from '../src/models/Lesson.js';

import {
  startDb,
  stopDb,
  clearDb,
} from './setup.js';

// Database setup
beforeAll(async () => {
  await startDb();
});

afterAll(async () => {
  await stopDb();
});

beforeEach(async () => {
  await clearDb();
});

// Helper: Register a user and return their token and ID
const registerUser = async (role, email) => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: `Test ${role}`,
      email,
      password: 'Test@123456',
      role,
    });

  return {
    token: res.body.accessToken,
    userId: res.body.user.id,
  };
};

// Reusable course data
const courseData = {
  title: 'Complete React Course',
  description: 'Learn React with practical projects.',
  category: 'Web Development',
  level: 'beginner',
  price: 999,
  thumbnail: 'https://example.com/react.jpg',
};

describe('Course API Tests', () => {

  // Test 1: Student cannot create a course
  it('student creating a course returns 403', async () => {
    const student = await registerUser(
      'student',
      'student@test.com'
    );

    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${student.token}`)
      .send(courseData);

    expect(res.status).toBe(403);
  });

  // Test 2: Instructor can create a course
  it('instructor can create a course', async () => {
    const instructor = await registerUser(
      'instructor',
      'instructor@test.com'
    );

    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${instructor.token}`)
      .send(courseData);

    expect(res.status).toBe(201);
    expect(res.body.course).toBeDefined();
    expect(res.body.course.title).toBe(courseData.title);
    expect(res.body.course.status).toBe('draft');
  });

  // Test 3: Instructor B cannot edit Instructor A's course
  it('instructor B cannot edit instructor A course', async () => {
    const instructorA = await registerUser(
      'instructor',
      'instructorA@test.com'
    );

    const instructorB = await registerUser(
      'instructor',
      'instructorB@test.com'
    );

    // Instructor A creates a course
    const createRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${instructorA.token}`)
      .send(courseData);

    const courseId = createRes.body.course._id;

    // Instructor B attempts to edit it
    const updateRes = await request(app)
      .put(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${instructorB.token}`)
      .send({
        title: 'Unauthorized Course Update',
      });

    expect(updateRes.status).toBe(403);
  });

  // Test 4: Public catalog must not show draft courses
  it('public catalog does not show draft courses', async () => {
    const instructor = await registerUser(
      'instructor',
      'draftInstructor@test.com'
    );

    const createRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${instructor.token}`)
      .send(courseData);

    expect(createRes.status).toBe(201);

    const draftCourseId = createRes.body.course._id;

    // Public catalog request without authentication
    const catalogRes = await request(app)
      .get('/api/courses');

    expect(catalogRes.status).toBe(200);
    expect(catalogRes.body.items).toBeDefined();

    const courseIds = catalogRes.body.items.map(
      (course) => course._id
    );

    expect(courseIds).not.toContain(draftCourseId);
  });

  // Test 5: Public course details must not expose video storage paths
  it('course details do not expose rawKey or hlsPath', async () => {
    const instructor = await registerUser(
      'instructor',
      'videoInstructor@test.com'
    );

    // Create a published course directly in the test database
    const course = await Course.create({
      ...courseData,
      instructor: instructor.userId,
      status: 'published',
    });

    const section = await Section.create({
      course: course._id,
      title: 'Introduction',
      order: 1,
    });

    // Store sensitive video fields in the lesson
    await Lesson.create({
      course: course._id,
      section: section._id,
      title: 'Introduction Lesson',
      order: 1,
      description: 'First lesson',
      duration: 600,
      isPreview: false,
      rawKey: 'private/raw/video.mp4',
      hlsPath: 'private/processed/video/master.m3u8',
    });

    // Public course detail request
    const res = await request(app)
      .get(`/api/courses/${course._id}`);

    expect(res.status).toBe(200);

    const lesson = res.body.sections[0].lessons[0];

    expect(lesson).toBeDefined();
    expect(lesson).not.toHaveProperty('rawKey');
    expect(lesson).not.toHaveProperty('hlsPath');

    expect(JSON.stringify(res.body)).not.toContain('private/raw/video.mp4');
    expect(JSON.stringify(res.body)).not.toContain(
      'private/processed/video/master.m3u8'
    );
  });

});
