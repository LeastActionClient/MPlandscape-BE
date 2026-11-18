import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Service from '../src/models/Service.js';
import { setupTestDB, createTestAdminAndToken } from './setup.js';

describe('Services API', () => {
  setupTestDB();

  it('GET /api/services should return active services for public users', async () => {
    await Service.create({
      title: 'Horticultural Development',
      slug: 'horticultural-development',
      description: 'Comprehensive soil enrichment and botanical planting.',
      imageUrl: 'https://example.com/img1.jpg',
      isActive: true,
      displayOrder: 1,
    });
    await Service.create({
      title: 'Draft Service',
      slug: 'draft-service',
      description: 'Under construction.',
      imageUrl: 'https://example.com/draft.jpg',
      isActive: false,
    });

    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].slug).toBe('horticultural-development');
  });

  it('POST /api/services should create a new service when authenticated as admin', async () => {
    const { token } = await createTestAdminAndToken();

    const newService = {
      title: 'Architectural Stone Paving',
      description: 'Custom stone masonry and landscape borders.',
      subtitle: 'Premium outdoor stonework',
      features: ['Limestone', 'Granite edging', 'Dry-stack walls'],
      imageUrl: 'https://example.com/paving.jpg',
      displayOrder: 2,
    };

    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send(newService);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('architectural-stone-paving');
    expect(res.body.data.features).toHaveLength(3);
  });

  it('POST /api/services should reject unauthorized users', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ title: 'Test Service', description: 'Test', imageUrl: 'https://example.com/1.jpg' });

    expect(res.status).toBe(401);
  });

  it('GET /api/services/:slug should return single service details', async () => {
    await Service.create({
      title: 'Commercial Landscape Maintenance',
      slug: 'commercial-landscape-maintenance',
      description: 'Groundskeeping for corporate parks and estates.',
      imageUrl: 'https://example.com/commercial.jpg',
      isActive: true,
    });

    const res = await request(app).get('/api/services/commercial-landscape-maintenance');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Commercial Landscape Maintenance');
  });

  it('PUT /api/services/:id should update service details', async () => {
    const { token } = await createTestAdminAndToken();

    const service = await Service.create({
      title: 'Irrigation Setup',
      slug: 'irrigation-setup',
      description: 'Old description',
      imageUrl: 'https://example.com/irrigation.jpg',
    });

    const res = await request(app)
      .put(`/api/services/${service._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'State-of-the-art automated drip irrigation.' });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('State-of-the-art automated drip irrigation.');
  });

  it('DELETE /api/services/:id should delete service when admin', async () => {
    const { token } = await createTestAdminAndToken();

    const service = await Service.create({
      title: 'Temporary Service',
      slug: 'temp-service',
      description: 'To be deleted',
      imageUrl: 'https://example.com/temp.jpg',
    });

    const res = await request(app)
      .delete(`/api/services/${service._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const check = await Service.findById(service._id);
    expect(check).toBeNull();
  });
});
