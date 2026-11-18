import jwt from 'jsonwebtoken';
import ENV from '../config/env.js';

/**
 * Generate JWT and optionally set secure HttpOnly cookie
 * @param {import('express').Response} res - Express response
 * @param {string} adminId - Admin ID
 * @param {string} role - Admin role
 * @returns {string} token
 */
export const generateToken = (res, adminId, role = 'admin') => {
  const token = jwt.sign({ id: adminId, role }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN,
  });

  if (res && typeof res.cookie === 'function') {
    res.cookie('token', token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
  }

  return token;
};

/**
 * Clear authentication cookie upon logout
 * @param {import('express').Response} res - Express response
 */
export const clearToken = (res) => {
  if (res && typeof res.cookie === 'function') {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
      secure: ENV.NODE_ENV === 'production',
      sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
    });
  }
};
