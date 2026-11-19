import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.resolve(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
process.env.TEMP = tempDir;
process.env.TMP = tempDir;
process.env.TMPDIR = tempDir;

const systemMongod = 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';
if (fs.existsSync(systemMongod)) {
  process.env.MONGOMS_SYSTEM_BINARY = systemMongod;
}
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '../../mongodb-binaries');

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';
import Admin from '../src/models/Admin.js';
import { generateToken } from '../src/utils/token.js';

let mongoServer;

export const setupTestDB = () => {
  // Before all tests in the file
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }, 120000);

  // After all tests in the file
  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // Clear collections after each test to ensure test isolation
  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });
};

/**
 * Helper to create an active test admin and valid JWT token
 */
export const createTestAdminAndToken = async (role = 'admin') => {
  const admin = await Admin.create({
    name: 'Test Administrator',
    email: `admin_${Date.now()}@mplandscape.com`,
    password: 'Password123!',
    role,
    isActive: true,
  });

  const token = generateToken(null, admin._id, admin.role);
  return { admin, token };
};
