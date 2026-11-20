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
        phone: '9845012345',
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

  describe('Field-Level Validation & Security Rules', () => {
    const validBaseEnquiry = {
      customerName: 'Karthik Raja',
      phone: '9845012345',
      email: 'karthik@example.com',
      location: 'Coimbatore, Tamil Nadu',
      message: 'Need complete drip irrigation and lawn maintenance consultation.',
    };

    it('accepts valid multi-word names: Sneha Balaji and Ramesh Kumar', async () => {
      const resSneha = await request(app)
        .post('/api/enquiries')
        .send({ ...validBaseEnquiry, customerName: 'Sneha Balaji', email: 'sneha.test@example.com' });
      expect(resSneha.status).toBe(201);
      expect(resSneha.body.data.customerName).toBe('Sneha Balaji');

      const resRamesh = await request(app)
        .post('/api/enquiries')
        .send({ ...validBaseEnquiry, customerName: 'Ramesh Kumar', email: 'ramesh.test@example.com' });
      expect(resRamesh.status).toBe(201);
      expect(resRamesh.body.data.customerName).toBe('Ramesh Kumar');
    });

    it('rejects names with numbers or special characters (Sneha123, 12345, Sneha@)', async () => {
      // Sneha123 – Reject
      const res1 = await request(app)
        .post('/api/enquiries')
        .send({ ...validBaseEnquiry, customerName: 'Sneha123' });
      expect(res1.status).toBe(400);
      expect(res1.body.errors.some((e) => e.message === 'Please enter a valid name using letters only.')).toBe(true);

      // 12345 – Reject
      const res2 = await request(app)
        .post('/api/enquiries')
        .send({ ...validBaseEnquiry, customerName: '12345' });
      expect(res2.status).toBe(400);
      expect(res2.body.errors.some((e) => e.message === 'Please enter a valid name using letters only.')).toBe(true);

      // Sneha@ – Reject
      const res3 = await request(app)
        .post('/api/enquiries')
        .send({ ...validBaseEnquiry, customerName: 'Sneha@' });
      expect(res3.status).toBe(400);
      expect(res3.body.errors.some((e) => e.message === 'Please enter a valid name using letters only.')).toBe(true);
    });

    it('accepts exactly 10-digit phone number (9876543210)', async () => {
      const res = await request(app)
        .post('/api/enquiries')
        .send({ ...validBaseEnquiry, phone: '9876543210', email: 'validphone@example.com' });
      expect(res.status).toBe(201);
      expect(res.body.data.customerName).toBe(validBaseEnquiry.customerName);

      const saved = await Enquiry.findOne({ email: 'validphone@example.com' });
      expect(saved).toBeDefined();
      expect(saved.phone).toBe('9876543210');
    });

    it('rejects invalid phone numbers: 987654321, 98765432100, abcdefghij, 98765abc10', async () => {
      const invalidPhones = ['987654321', '98765432100', 'abcdefghij', '98765abc10'];
      for (const phone of invalidPhones) {
        const res = await request(app)
          .post('/api/enquiries')
          .send({ ...validBaseEnquiry, phone, email: `test_${Date.now()}_${phone}@example.com` });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((e) => e.message === 'Please enter a valid 10-digit mobile number.')).toBe(true);
      }
    });

    it('rejects dummy, repeated phone numbers', async () => {
      const dummyPhones = ['0000000000', '1111111111'];
      for (const phone of dummyPhones) {
        const res = await request(app)
          .post('/api/enquiries')
          .send({ ...validBaseEnquiry, phone, email: `test_${Date.now()}_${phone}@example.com` });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((e) => e.message === 'Please enter a valid 10-digit mobile number.')).toBe(true);
      }
    });

    it('rejects malformed email addresses', async () => {
      const res = await request(app)
        .post('/api/enquiries')
        .send({ ...validBaseEnquiry, email: 'invalid-email-no-domain' });
      expect(res.status).toBe(400);
    });

    it('rejects meaningless or repeated-character spam messages', async () => {
      const resSpam = await request(app)
        .post('/api/enquiries')
        .send({ ...validBaseEnquiry, message: 'mmmmmmmmmmmmmmmm' });
      expect(resSpam.status).toBe(400);

      const resShort = await request(app)
        .post('/api/enquiries')
        .send({ ...validBaseEnquiry, message: 'Too short' });
      expect(resShort.status).toBe(400);
    });

    it('rejects honeypot bot submissions silently or with 400', async () => {
      const resBot = await request(app)
        .post('/api/enquiries')
        .send({ ...validBaseEnquiry, website_hp: 'https://spam-bot.site' });
      expect(resBot.status).toBe(400);
      expect(resBot.body.message).toContain('Spam submission detected');
    });
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
