import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Gallery from '../src/models/Gallery.js';
import { setupTestDB, createTestAdminAndToken } from './setup.js';

describe('Gallery API', () => {
  setupTestDB();

  it('GET /api/gallery should filter by category and active status', async () => {
    await Gallery.create({
      title: 'Residential Villa Garden',
      category: 'Residential',
      imageUrl: 'https://example.com/res1.jpg',
      isActive: true,
    });
    await Gallery.create({
      title: 'Commercial Plaza Courtyard',
      category: 'Commercial',
      imageUrl: 'https://example.com/comm1.jpg',
      isActive: true,
    });

    const resAll = await request(app).get('/api/gallery');
    expect(resAll.status).toBe(200);
    expect(resAll.body.count).toBe(2);
    expect(resAll.body.categories).toContain('Residential');

    const resFilter = await request(app).get('/api/gallery?category=Residential');
    expect(resFilter.status).toBe(200);
    expect(resFilter.body.count).toBe(1);
    expect(resFilter.body.data[0].category).toBe('Residential');
  });

  it('POST /api/gallery should create a gallery item without category', async () => {
    const { token } = await createTestAdminAndToken();

    const res = await request(app)
      .post('/api/gallery')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Agricultural Orchard Irrigation',
        imageUrl: 'https://example.com/orchard.jpg',
        description: 'Large scale fruit tree drip network.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Agricultural Orchard Irrigation');
  });

  it('PUT /api/gallery/:id should update gallery item details', async () => {
    const { token } = await createTestAdminAndToken();

    const item = await Gallery.create({
      title: 'Botanical Walkway',
      category: 'Horticulture',
      imageUrl: 'https://example.com/walkway.jpg',
    });

    const res = await request(app)
      .put(`/api/gallery/${item._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Heritage Botanical Walkway' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Heritage Botanical Walkway');
  });

  it('DELETE /api/gallery/:id should delete gallery item', async () => {
    const { token } = await createTestAdminAndToken();

    const item = await Gallery.create({
      title: 'Delete Me',
      category: 'General',
      imageUrl: 'https://example.com/del.jpg',
    });

    const res = await request(app)
      .delete(`/api/gallery/${item._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const check = await Gallery.findById(item._id);
    expect(check).toBeNull();
  });
});
