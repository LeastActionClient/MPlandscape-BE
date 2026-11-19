import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Service from '../src/models/Service.js';
import * as cloudinaryConfig from '../src/config/cloudinary.js';
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

  it('POST /api/services should create a service with an uploaded image', async () => {
    const { token } = await createTestAdminAndToken();

    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Architectural Stone Paving')
      .field('description', 'Custom stone masonry and landscape borders.')
      .field('subtitle', 'Premium outdoor stonework')
      .field('features', JSON.stringify(['Limestone', 'Granite edging']))
      .attach('image', Buffer.from('fake-image-bytes'), 'paving.png');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('architectural-stone-paving');
    expect(res.body.data.imageUrl).toBeDefined();
    expect(res.body.data.imagePublicId).toBeDefined();
    expect(res.body.data.features).toHaveLength(2);
  });

  it('POST /api/services should reject service creation without an image (image is mandatory)', async () => {
    const { token } = await createTestAdminAndToken();

    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Soil Aeration & Conditioning',
        description: 'Comprehensive deep soil aeration and organic microbiome revival.',
        subtitle: 'Subsurface root nutrition',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Please upload a service image or provide a valid image URL');
  });

  it('POST /api/services should create a service using an image URL', async () => {
    const { token } = await createTestAdminAndToken();

    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Automated Drip Networks',
        description: 'Precision root-zone hydration systems engineered for commercial parks.',
        imageUrl: 'https://images.example.com/irrigation-drip.jpg',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.imageUrl).toBe('https://images.example.com/irrigation-drip.jpg');
    expect(res.body.data.imagePublicId).toBeNull();
  });

  it('POST /api/services should reject invalid image upload (unsupported file format)', async () => {
    const { token } = await createTestAdminAndToken();

    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Invalid Upload Test')
      .field('description', 'Service with invalid file format upload.')
      .attach('image', Buffer.from('malicious-script-content'), 'payload.exe');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid file format');
  });

  it('POST /api/services should handle Cloudinary upload failure without crashing or creating records', async () => {
    const { token } = await createTestAdminAndToken();

    const uploadSpy = vi
      .spyOn(cloudinaryConfig, 'uploadToCloudinary')
      .mockRejectedValueOnce(new Error('Cloudinary gateway connection timeout'));

    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Failing Upload Service')
      .field('description', 'This service should not be created if image upload fails.')
      .attach('image', Buffer.from('dummy-image'), 'banner.png');

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Image upload failed');

    // Confirm no orphaned service was saved in the database
    const found = await Service.findOne({ title: 'Failing Upload Service' });
    expect(found).toBeNull();

    uploadSpy.mockRestore();
  });

  it('POST /api/services should auto-generate unique slug on duplicate titles', async () => {
    const { token } = await createTestAdminAndToken();

    const service1 = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Botanical Tree Sourcing',
        description: 'Mature shade trees and palm specimen delivery.',
        imageUrl: 'https://images.example.com/trees-1.jpg',
      });

    expect(service1.status).toBe(201);
    expect(service1.body.data.slug).toBe('botanical-tree-sourcing');

    const service2 = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Botanical Tree Sourcing',
        description: 'Second division of tree sourcing.',
        imageUrl: 'https://images.example.com/trees-2.jpg',
      });

    expect(service2.status).toBe(201);
    expect(service2.body.data.slug).toBe('botanical-tree-sourcing-1');
  });

  it('POST /api/services should reject invalid service input (missing required fields)', async () => {
    const { token } = await createTestAdminAndToken();

    // Missing title
    const resNoTitle = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Valid description without a title.',
      });
    expect(resNoTitle.status).toBe(400);
    expect(resNoTitle.body.message).toContain('title is required');

    // Missing description
    const resNoDesc = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Valid Title Without Description',
      });
    expect(resNoDesc.status).toBe(400);
    expect(resNoDesc.body.message).toContain('description is required');

    // Invalid image URL format
    const resBadUrl = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Invalid URL Service',
        description: 'Detailed description for testing bad image URL format.',
        imageUrl: 'not-a-valid-http-url',
      });
    expect(resBadUrl.status).toBe(400);
    expect(resBadUrl.body.message).toContain('Invalid image URL format');
  });

  it('POST /api/services should reject unauthorized users', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ title: 'Test Service', description: 'Test' });

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

  it('PUT /api/services/:id should edit service without replacing its image', async () => {
    const { token } = await createTestAdminAndToken();

    const service = await Service.create({
      title: 'Irrigation Setup',
      slug: 'irrigation-setup',
      description: 'Old description',
      imageUrl: 'https://example.com/irrigation.jpg',
      imagePublicId: 'mp_landscape/services/irrig_123',
    });

    const res = await request(app)
      .put(`/api/services/${service._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'State-of-the-art automated drip irrigation.' });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('State-of-the-art automated drip irrigation.');
    expect(res.body.data.imageUrl).toBe('https://example.com/irrigation.jpg');
    expect(res.body.data.imagePublicId).toBe('mp_landscape/services/irrig_123');
  });

  it('PUT /api/services/:id should replace an existing image when a new image file is uploaded', async () => {
    const { token } = await createTestAdminAndToken();

    const service = await Service.create({
      title: 'Specimen Trees',
      slug: 'specimen-trees',
      description: 'Initial tree stock description',
      imageUrl: 'https://example.com/old-tree.jpg',
      imagePublicId: 'mp_landscape/services/old_tree_123',
    });

    const res = await request(app)
      .put(`/api/services/${service._id}`)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('replacement-image-bytes'), 'new-tree.jpg');

    expect(res.status).toBe(200);
    expect(res.body.data.imageUrl).toBeDefined();
    expect(res.body.data.imageUrl).not.toBe('https://example.com/old-tree.jpg');
  });

  it('PUT /api/services/:id should reject removing image without replacement (image is mandatory)', async () => {
    const { token } = await createTestAdminAndToken();

    const service = await Service.create({
      title: 'Mandatory Image Service',
      slug: 'mandatory-image-service',
      description: 'Service with an existing image',
      imageUrl: 'https://example.com/keep-me.jpg',
      imagePublicId: 'mp_landscape/services/keep_me',
    });

    const res = await request(app)
      .put(`/api/services/${service._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ removeImage: true });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Please upload a service image or provide a valid image URL');
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
