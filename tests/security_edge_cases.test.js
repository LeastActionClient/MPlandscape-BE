import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import Admin from '../src/models/Admin.js';
import Service from '../src/models/Service.js';
import Gallery from '../src/models/Gallery.js';
import Enquiry from '../src/models/Enquiry.js';
import ENV from '../src/config/env.js';
import { setupTestDB, createTestAdminAndToken } from './setup.js';

describe('Phase 6 – Security & Edge Cases Suite', () => {
  setupTestDB();

  describe('Security Middleware & Headers (Task 6.1 & 6.2)', () => {
    it('should include secure HTTP headers via Helmet', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('should sanitize MongoDB operator injections in query/body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $gt: '' },
          password: 'Password123!',
        });

      // Zod validation or mongoSanitize should reject non-string/malformed object
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should respond to OPTIONS preflight requests cleanly', async () => {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST');

      expect([200, 204]).toContain(res.status);
    });
  });

  describe('Authentication Edge Cases (Task 6.3)', () => {
    it('should reject login with wrong password', async () => {
      await createTestAdminAndToken();

      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@mplandscape.com',
        password: 'CompletelyWrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'ghost_admin@mplandscape.com',
        password: 'SomePassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject protected route requests with missing JWT', async () => {
      const res = await request(app).get('/api/dashboard/stats');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Not authorized');
    });

    it('should reject expired JWT tokens with 401', async () => {
      const expiredToken = jwt.sign(
        { id: '507f1f77bcf86cd799439011', role: 'admin' },
        ENV.JWT_SECRET,
        { expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('expired');
    });

    it('should reject access for inactive administrator accounts', async () => {
      const inactiveAdmin = await Admin.create({
        name: 'Suspended Admin',
        email: 'suspended@mplandscape.com',
        password: 'ValidPassword123!',
        isActive: false,
      });

      const token = jwt.sign({ id: inactiveAdmin._id, role: 'admin' }, ENV.JWT_SECRET, {
        expiresIn: '1h',
      });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('deactivated');
    });
  });

  describe('Services Edge Cases (Task 6.3)', () => {
    it('should return 400 for malformed/invalid service ID', async () => {
      const { token } = await createTestAdminAndToken();

      const res = await request(app)
        .put('/api/services/invalid-mongo-id-123')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Updated' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid');
    });

    it('should return 404 for deleted/non-existent service ID', async () => {
      const { token } = await createTestAdminAndToken();

      const res = await request(app)
        .put('/api/services/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('should return 404 when public user attempts to fetch an inactive service', async () => {
      const inactive = await Service.create({
        title: 'Secret Experimental Lawn Service',
        slug: 'secret-experimental-lawn',
        description: 'Under development.',
        imageUrl: 'https://example.com/secret.jpg',
        isActive: false,
      });

      const res = await request(app).get(`/api/services/${inactive.slug}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toContain('inactive');
    });

    it('should reject duplicate slugs on service update', async () => {
      const { token } = await createTestAdminAndToken();

      await Service.create({
        title: 'Service One',
        slug: 'service-one',
        description: 'Description 1',
        imageUrl: 'https://example.com/1.jpg',
      });

      const service2 = await Service.create({
        title: 'Service Two',
        slug: 'service-two',
        description: 'Description 2',
        imageUrl: 'https://example.com/2.jpg',
      });

      const res = await request(app)
        .put(`/api/services/${service2._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: 'service-one' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already in use');
    });
  });

  describe('Gallery Edge Cases (Task 6.3)', () => {
    it('should return 400 when creating gallery item without image or URL', async () => {
      const { token } = await createTestAdminAndToken();

      const res = await request(app)
        .post('/api/gallery')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Missing Image Project',
          category: 'Commercial',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Please provide at least one image');
    });

    it('should return 400 when uploading an invalid file format (e.g. text file)', async () => {
      const { token } = await createTestAdminAndToken();

      const res = await request(app)
        .post('/api/gallery')
        .set('Authorization', `Bearer ${token}`)
        .attach('images', Buffer.from('console.log("bad");'), 'malicious.js');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid file format');
    });

    it('should return 200 with empty array when gallery has no items in category', async () => {
      const res = await request(app).get('/api/gallery?category=NonExistentCategory');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    it('should return 400 for malformed gallery item ID', async () => {
      const res = await request(app).get('/api/gallery/not-a-valid-id');
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid gallery item ID');
    });
  });

  describe('Enquiries Edge Cases (Task 6.3)', () => {
    it('should reject enquiry with missing customer name', async () => {
      const res = await request(app).post('/api/enquiries').send({
        customerName: '',
        phone: '8838548402',
        email: 'client@example.com',
        message: 'Looking for lawn care services.',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject enquiry with invalid email format', async () => {
      const res = await request(app).post('/api/enquiries').send({
        customerName: 'Kishore',
        phone: '8838548402',
        email: 'not-an-email',
        message: 'Inquiry details here.',
      });

      expect(res.status).toBe(400);
    });

    it('should reject enquiry with message shorter than 5 characters', async () => {
      const res = await request(app).post('/api/enquiries').send({
        customerName: 'Kishore',
        phone: '8838548402',
        email: 'client@example.com',
        message: 'Hi',
      });

      expect(res.status).toBe(400);
    });

    it('should reject enquiry with non-existent service ID', async () => {
      const res = await request(app).post('/api/enquiries').send({
        customerName: 'Valid Client',
        phone: '8838548402',
        email: 'client@example.com',
        serviceId: '507f1f77bcf86cd799439011',
        message: 'Looking for specific service consultation.',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('selected service was not found');
    });

    it('should prevent duplicate enquiry submissions within 5 minutes', async () => {
      const enquiryPayload = {
        customerName: 'Double Clicker',
        phone: '8838548402',
        email: 'duplicate@example.com',
        message: 'Identical enquiry message for duplicate testing.',
      };

      const firstRes = await request(app).post('/api/enquiries').send(enquiryPayload);
      expect(firstRes.status).toBe(201);

      // Immediate second submission with identical payload
      const secondRes = await request(app).post('/api/enquiries').send(enquiryPayload);
      expect(secondRes.status).toBe(409);
      expect(secondRes.body.message).toContain('duplicate enquiry');
    });

    it('should reject invalid enquiry status updates', async () => {
      const { token } = await createTestAdminAndToken();

      const enquiry = await Enquiry.create({
        customerName: 'Test Customer',
        phone: '+91 8838548402',
        email: 'test@example.com',
        message: 'Test message for status',
      });

      const res = await request(app)
        .patch(`/api/enquiries/${enquiry._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INVALID_STAGE_NAME' });

      expect(res.status).toBe(400);
    });
  });
});
