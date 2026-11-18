import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Enquiry from '../src/models/Enquiry.js';
import Service from '../src/models/Service.js';
import Gallery from '../src/models/Gallery.js';
import { setupTestDB, createTestAdminAndToken } from './setup.js';

describe('Admin Dashboard API', () => {
  setupTestDB();

  it('GET /api/dashboard/stats should aggregate KPI metrics without hardcoded values', async () => {
    const { token } = await createTestAdminAndToken();

    // Create seed records
    await Service.create({
      title: 'Landscape Design',
      slug: 'landscape-design',
      description: 'Design service',
      imageUrl: 'https://example.com/s1.jpg',
      isActive: true,
    });

    await Gallery.create({
      title: 'Project Alpha',
      category: 'Residential',
      imageUrl: 'https://example.com/g1.jpg',
      isActive: true,
    });

    await Enquiry.create({
      customerName: 'User 1',
      phone: '111',
      email: 'u1@example.com',
      message: 'Msg 1',
      status: 'NEW',
    });
    await Enquiry.create({
      customerName: 'User 2',
      phone: '222',
      email: 'u2@example.com',
      message: 'Msg 2',
      status: 'CONVERTED',
    });

    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalEnquiries).toBe(2);
    expect(res.body.data.statusCounts.NEW).toBe(1);
    expect(res.body.data.statusCounts.CONVERTED).toBe(1);
    expect(res.body.data.statusCounts.IN_PROGRESS).toBe(0);
    expect(res.body.data.activeServices).toBe(1);
    expect(res.body.data.activeGallery).toBe(1);
    expect(res.body.data.conversionRate).toBe(50);
  });

  it('GET /api/dashboard/recent-enquiries should return newest customer requests', async () => {
    const { token } = await createTestAdminAndToken();

    await Enquiry.create({
      customerName: 'Recent Customer',
      phone: '333',
      email: 'recent@example.com',
      message: 'Recent enquiry message',
    });

    const res = await request(app)
      .get('/api/dashboard/recent-enquiries?limit=3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].customerName).toBe('Recent Customer');
  });

  it('GET /api/dashboard/enquiry-trends should return aggregation pipeline data', async () => {
    const { token } = await createTestAdminAndToken();

    const service = await Service.create({
      title: 'Irrigation Engineering',
      slug: 'irrigation-engineering',
      description: 'Drip system',
      imageUrl: 'https://example.com/irr.jpg',
    });

    await Enquiry.create({
      customerName: 'Trend User',
      phone: '444',
      email: 'trend@example.com',
      message: 'Trends test message',
      serviceId: service._id,
      status: 'CONVERTED',
    });

    const res = await request(app)
      .get('/api/dashboard/enquiry-trends')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.monthlyTrends).toBeInstanceOf(Array);
    expect(res.body.data.serviceDistribution).toBeInstanceOf(Array);
  });
});
