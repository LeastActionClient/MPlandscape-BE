import app from './app.js';
import connectDB, { disconnectDB } from './config/db.js';
import ENV from './config/env.js';

const PORT = ENV.PORT;

// Establish database connection on startup
connectDB()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((err) => {
    console.error('Failed to initialize database during startup:', err.message);
  });

const server = app.listen(PORT, () => {
  console.log(`🌿 MP Landscape Services API running in ${ENV.NODE_ENV} mode on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('🔌 HTTP server closed.');
    await disconnectDB();
    process.exit(0);
  });

  // Force close if graceful shutdown hangs
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

export default server;
