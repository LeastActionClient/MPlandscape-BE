import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Enquiry from '../src/models/Enquiry.js';
import { setupTestDB, createTestAdminAndToken } from './setup.js';

describe('Enquiry Management API', () => {
  setupTestDB();

  it('POST /api/enquiries should allow public customer submission and strip adminNotes', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .send({
        customerName: 'Ananya Sharma',
        phone: '+91 98450 12345',
        email: 'ananya@example.com',
        location: 'Coimbatore, TN',
        message: 'Interested in a comprehensive terrace garden design with drip irrigation.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customerName).toBe('Ananya Sharma');
    expect(res.body.data.adminNotes).toBeUndefined(); // Never expose admin notes!

    const saved = await Enquiry.findOne({ email: 'ananya@example.com' });
    expect(saved).toBeDefined();
    expect(saved.status).toBe('NEW');
  });

  it('POST /api/enquiries should validate mandatory customer info', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .send({ customerName: 'A' }); // Invalid short name, missing phone, email, message

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('GET /api/enquiries should require admin authentication', async () => {
    const res = await request(app).get('/api/enquiries');
    expect(res.status).toBe(401);
  });

  it('GET /api/enquiries should return enquiries with status filtering for admin', async () => {
    const { token } = await createTestAdminAndToken();

    await Enquiry.create({
      customerName: 'Ramesh Kumar',
      phone: '9845000001',
      email: 'ramesh@example.com',
      message: 'Farmhouse landscape proposal.',
      status: 'NEW',
    });
    await Enquiry.create({
      customerName: 'Kavitha S',
      phone: '9845000002',
      email: 'kavitha@example.com',
      message: 'Commercial lawn maintenance.',
      status: 'CONTACTED',
    });

    const res = await request(app)
      .get('/api/enquiries?status=NEW')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].customerName).toBe('Ramesh Kumar');
  });

  it('PATCH /api/enquiries/:id/status should update status to valid enum', async () => {
    const { token } = await createTestAdminAndToken();

    const enquiry = await Enquiry.create({
      customerName: 'Karthik Raja',
      phone: '9845000003',
      email: 'karthik@example.com',
      message: 'Agricultural irrigation setup.',
      status: 'NEW',
    });

    const res = await request(app)
      .patch(`/api/enquiries/${enquiry._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_PROGRESS');
  });

  it('PATCH /api/enquiries/:id/notes should update internal admin notes', async () => {
    const { token } = await createTestAdminAndToken();

    const enquiry = await Enquiry.create({
      customerName: 'Deepa M',
      phone: '9845000004',
      email: 'deepa@example.com',
      message: 'Roof garden consultation.',
    });

    const res = await request(app)
      .patch(`/api/enquiries/${enquiry._id}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ adminNotes: 'Called on 17 Nov. Site visit scheduled for Tuesday 10 AM.' });

    expect(res.status).toBe(200);
    expect(res.body.data.adminNotes).toContain('Site visit scheduled');
  });

  it('GET /api/enquiries/export should generate and stream CSV file for admin', async () => {
    const { token } = await createTestAdminAndToken();

    await Enquiry.create({
      customerName: 'Export User',
      phone: '9845000005',
      email: 'export@example.com',
      message: 'Export test message',
    });

    const res = await request(app)
      .get('/api/enquiries/export')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Export User');
    expect(res.text).toContain('Customer Name');
  });
});
