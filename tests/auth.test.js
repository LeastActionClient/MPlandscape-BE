import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Admin from '../src/models/Admin.js';
import { setupTestDB } from './setup.js';

describe('Auth APIs', () => {
  setupTestDB();

  it('should authenticate admin with valid credentials and return JWT token', async () => {
    await Admin.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'StrongPass123!',
      role: 'admin',
      isActive: true,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'StrongPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.admin.email).toBe('admin@test.com');
  });

  it('should reject login with incorrect password', async () => {
    await Admin.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'StrongPass123!',
      role: 'admin',
      isActive: true,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject login for inactive admin accounts', async () => {
    await Admin.create({
      name: 'Inactive Admin',
      email: 'inactive@test.com',
      password: 'StrongPass123!',
      role: 'admin',
      isActive: false,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactive@test.com', password: 'StrongPass123!' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return current admin profile for authenticated user on GET /api/auth/me', async () => {
    const admin = await Admin.create({
      name: 'Logged Admin',
      email: 'logged@test.com',
      password: 'StrongPass123!',
      role: 'admin',
      isActive: true,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'logged@test.com', password: 'StrongPass123!' });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.admin.email).toBe('logged@test.com');
  });

  it('should clear token and return success on logout', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
