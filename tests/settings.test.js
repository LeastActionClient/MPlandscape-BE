import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import SiteSettings from '../src/models/SiteSettings.js';
import { setupTestDB, createTestAdminAndToken } from './setup.js';

describe('Site Settings API', () => {
  setupTestDB();

  it('GET /api/settings should return company settings for public users', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.companyName).toBe('MP Landscape Services');
    expect(res.body.data.phoneNumbers).toBeInstanceOf(Array);
  });

  it('PUT /api/settings should update settings when authenticated as admin', async () => {
    const { token } = await createTestAdminAndToken();

    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tagline: 'Precision Horticultural & Agronomical Solutions',
        whatsappNumber: '+91 99999 88888',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tagline).toBe('Precision Horticultural & Agronomical Solutions');
    expect(res.body.data.whatsappNumber).toBe('+91 99999 88888');
  });

  it('PUT /api/settings should reject unauthorized users', async () => {
    const res = await request(app)
      .put('/api/settings')
      .send({ companyName: 'Hacked Company' });

    expect(res.status).toBe(401);
  });
});
