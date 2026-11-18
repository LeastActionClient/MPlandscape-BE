import Admin from '../models/Admin.js';
import { generateToken, clearToken } from '../utils/token.js';

/**
 * @desc    Authenticate admin and set token
 * @route   POST /api/auth/login
 * @access  Public (rate-limited)
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This administrator account has been deactivated.',
      });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    // Update lastLogin timestamp
    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    // Generate JWT and set HttpOnly cookie
    const token = generateToken(res, admin._id, admin.role);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout admin and clear cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = (req, res) => {
  clearToken(res);
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * @desc    Get currently logged in admin profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = (req, res) => {
  return res.status(200).json({
    success: true,
    admin: req.admin,
  });
};
