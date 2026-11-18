import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { setupTestDB } from './setup.js';

describe('API Health Check (Task 7.1 & 8.1.G)', () => {
  setupTestDB();

  it('GET /api/health should return HTTP 200 and healthy status when database is connected', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('MP Landscape Services API is running');
    expect(res.body.database).toBe('connected');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);

    // Verify zero credentials or sensitive strings leaked
    expect(res.body.MONGODB_URI).toBeUndefined();
    expect(res.body.JWT_SECRET).toBeUndefined();
    expect(res.body.CLOUDINARY_API_SECRET).toBeUndefined();
  });

  it('GET /api/health should return HTTP 503 when database is disconnected', async () => {
    // Spy on readyState getter safely using Vitest spy
    const readyStateSpy = vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

    try {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.database).toBe('disconnected');
      expect(res.body.message).toContain('disconnected');
    } finally {
      readyStateSpy.mockRestore();
    }
  });

  it('GET /unknown-route should return 404 with structured error', async () => {
    const res = await request(app).get('/api/unknown-endpoint-test');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Resource not found');
  });
});
