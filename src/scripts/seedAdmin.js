import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../config/db.js';
import Admin from '../models/Admin.js';
import SiteSettings from '../models/SiteSettings.js';
import ENV from '../config/env.js';

/**
 * Seed script to safely initialize superadmin and site settings
 */
export const seedAdmin = async () => {
  try {
    await connectDB();

    const email = ENV.ADMIN_EMAIL.toLowerCase().trim();
    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      existingAdmin.name = ENV.ADMIN_NAME;
      existingAdmin.password = ENV.ADMIN_PASSWORD;
      existingAdmin.role = 'superadmin';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log(`✅ Admin account [${email}] updated with credentials from .env.`);
    } else {
      await Admin.create({
        name: ENV.ADMIN_NAME,
        email,
        password: ENV.ADMIN_PASSWORD,
        role: 'superadmin',
        isActive: true,
      });
      console.log(`✅ Superadmin account [${email}] successfully initialized.`);
    }

    // Also ensure initial SiteSettings exist
    await SiteSettings.getSettings();
    console.log(`✅ Default Site Settings verified/initialized.`);
  } catch (error) {
    console.error('❌ Error during admin seeding:', error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

// Execute if run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('seedAdmin.js')) {
  seedAdmin().then(() => {
    process.exit(process.exitCode || 0);
  });
}

export default seedAdmin;
