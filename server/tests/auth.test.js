
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest';

import express from 'express';
import request from 'supertest';

import app from '../src/app.js';
import {
  protect,
  requireRole,
} from '../src/middleware/auth.js';

import {
  startDb,
  stopDb,
  clearDb,
} from './setup.js';

// Temporary Express app for authorization testing
const roleTestApp = express();

roleTestApp.get(
  '/instructor-only',
  protect,
  requireRole('instructor'),
  (req, res) => {
    res.json({
      message: 'Instructor access granted',
    });
  }
);

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

describe('Authentication API', () => {
  const user = {
    name: 'Test Student',
    email: 'student@test.com',
    password: 'Student@123',
    role: 'student',
  };

  // Test 1: Registration
  it('register returns an access token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(user);

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(user.email);
  });

  // Test 2: Duplicate email
  it('duplicate email returns 409', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(user);

    const res = await request(app)
      .post('/api/auth/register')
      .send(user);

    expect(res.status).toBe(409);
  });

  // Test 3: Wrong password
  it('login with wrong password returns 401', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(user);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'WrongPassword123',
      });

    expect(res.status).toBe(401);
  });

  // Test 4: Missing token
  it('/me without a token returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  // Test 5: Valid token
  it('/me with a valid token returns the user', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(user);

    const token = registerRes.body.accessToken;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.role).toBe('student');
  });

  // Test 6: Admin registration rejected
  it('registering with admin role returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...user,
        email: 'admin-test@test.com',
        role: 'admin',
      });

    expect(res.status).toBe(400);
  });

  // Test 7: Invalid token
  it('invalid token returns 401', async () => {
    const res = await request(roleTestApp)
      .get('/instructor-only')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });

  // Test 8: Student cannot access instructor route
  it('student accessing instructor route returns 403', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(user);

    const token = registerRes.body.accessToken;

    const res = await request(roleTestApp)
      .get('/instructor-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  // Test 9: Instructor can access instructor route
  it('instructor accessing instructor route returns 200', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        ...user,
        email: 'instructor@test.com',
        role: 'instructor',
      });

    const token = registerRes.body.accessToken;

    const res = await request(roleTestApp)
      .get('/instructor-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Instructor access granted');
  });
});
