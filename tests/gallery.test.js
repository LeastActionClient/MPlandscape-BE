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

  it('GET /api/gallery?category=Outdoor Landscaping should match mapped categories like Residential', async () => {
    await Gallery.create({
      title: 'Residential Villa Lawn',
      category: 'Residential',
      imageUrl: 'https://example.com/res_mapped.jpg',
      isActive: true,
    });
    await Gallery.create({
      title: 'Indoor Office Atrium',
      category: 'Indoor',
      imageUrl: 'https://example.com/indoor_mapped.jpg',
      isActive: true,
    });

    const res = await request(app).get('/api/gallery?category=Outdoor Landscaping');
    expect(res.status).toBe(200);
    const titles = res.body.data.map((i) => i.title);
    expect(titles).toContain('Residential Villa Lawn');
    expect(titles).not.toContain('Indoor Office Atrium');
  });

  it('POST /api/gallery should succeed without title, description, or category (simplified admin upload)', async () => {
    const { token } = await createTestAdminAndToken();

    const res = await request(app)
      .post('/api/gallery')
      .set('Authorization', `Bearer ${token}`)
      .send({
        imageUrl: 'https://example.com/simple_upload.jpg',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Landscape Project');
    expect(res.body.data.category).toBe('Outdoor Landscaping');
  });

  it('POST /api/gallery should save title, displayOrder, description, and isActive', async () => {
    const { token } = await createTestAdminAndToken();

    const res = await request(app)
      .post('/api/gallery')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Indoor Office Landscape Installation',
        displayOrder: 5,
        description: 'Bespoke biophilic interior greenery installation.',
        isActive: true,
        imageUrl: 'https://example.com/indoor_office.jpg',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Indoor Office Landscape Installation');
    expect(res.body.data.displayOrder).toBe(5);
    expect(res.body.data.description).toBe('Bespoke biophilic interior greenery installation.');
    expect(res.body.data.isActive).toBe(true);
  });

  it('POST /api/gallery should handle video upload with video mediaType', async () => {
    const { token } = await createTestAdminAndToken();

    const res = await request(app)
      .post('/api/gallery')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Lawn Walkthrough Video Tour',
        displayOrder: 2,
        description: 'Drone and ground video footage.',
        isActive: true,
        mediaType: 'VIDEO',
        imageUrl: 'https://example.com/walkthrough.mp4',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.mediaType).toBe('VIDEO');
    expect(res.body.data.resourceType).toBe('video');
  });
});

