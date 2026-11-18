import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import ENV from './config/env.js';
import connectDB from './config/db.js';


// Route imports
import authRoutes from './routes/authRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';

const app = express();

// 1. HTTP Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // API server: CSP is enforced by the frontend SPA origin
  })
);

// 2. MongoDB Query Sanitization against NoSQL injection ($ and . operator attacks)
app.use(
  mongoSanitize({
    replaceWith: '_',
  })
);

// 3. Strict CORS Allowlist
const parseAllowedOrigins = () => {
  const origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ];
  if (ENV.FRONTEND_URL) {
    const urls = ENV.FRONTEND_URL.split(',').map((u) => u.trim().replace(/\/$/, ''));
    origins.push(...urls);
  }
  return [...new Set(origins)];
};

const allowedOrigins = parseAllowedOrigins();

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (server-to-server, automated tests, curl, postman)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(cleanOrigin) || ENV.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Support Vercel preview environments (*.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(cleanOrigin)) {
      return callback(null, true);
    }

    const corsError = new Error('CORS request blocked: Origin is not permitted.');
    corsError.statusCode = 403;
    return callback(corsError);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// 4. Request Body Limits & Utilities
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(compression());

if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 5. Global Database Connection Management for Serverless / Monolith Runtimes
app.use(async (req, res, next) => {
  if (req.path === '/api/health' || ENV.NODE_ENV === 'test') {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection middleware failed:', err.message);
    return res.status(503).json({
      success: false,
      message: 'Database service is currently unavailable. Please retry shortly.',
    });
  }
});

// 6. Global API Rate Limiter
app.use('/api', apiLimiter);

// 7. Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 && ENV.NODE_ENV !== 'test') {
      try {
        await connectDB();
      } catch {
        // Connection error handled below by checking readyState
      }
    }

    const isConnected = mongoose.connection.readyState === 1;

    if (!isConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database is disconnected or unavailable',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'MP Landscape Services API is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: 'Health check failed due to unexpected error',
      database: 'error',
      timestamp: new Date().toISOString(),
    });
  }
});


// 8. Mount Feature API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 9. 404 Handler for Unmatched Endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
});

// 10. Centralized Production-Hardened Error Handler
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle CORS Forbidden Rejection
  if (message.includes('CORS request blocked')) {
    statusCode = 403;
  }

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource ID format: ${err.value}`;
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value entered for ${field}. Please use another value.`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Handle JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired. Please log in again.';
  }

  // Handle Multer Upload Errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size limit exceeded. Maximum allowed file size is 5MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded in a single batch (maximum 10 allowed).';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field submitted in upload request.';
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Handle Custom File Filter Rejection
  if (err.code === 'INVALID_FILE_TYPE') {
    statusCode = 400;
  }

  // Sanitize 500 Errors in Production: never expose stack traces or raw database queries to public users
  const isProduction = ENV.NODE_ENV === 'production';
  const publicMessage =
    statusCode === 500 && isProduction
      ? 'An unexpected server error occurred. Please contact support or try again later.'
      : message;

  res.status(statusCode).json({
    success: false,
    message: publicMessage,
    ...(!isProduction && { stack: err.stack }),
  });
});

export default app;
