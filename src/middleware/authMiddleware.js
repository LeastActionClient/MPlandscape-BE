import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import ENV from '../config/env.js';

/**
 * Protect routes - Authenticate JWT token from Cookie or Bearer header
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Check cookies first (preferred for web clients)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization header (for APIs / mobile / testing)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource. Please log in.',
    });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'The administrator account associated with this token no longer exists.',
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your administrator account has been deactivated. Please contact support.',
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please log in again.',
    });
  }
};

/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles e.g. 'superadmin', 'admin'
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles [${roles.join(', ')}]`,
      });
    }
    next();
  };
};
