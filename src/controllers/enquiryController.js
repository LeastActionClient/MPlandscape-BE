import mongoose from 'mongoose';
import Enquiry, { ENQUIRY_STATUS } from '../models/Enquiry.js';
import Service from '../models/Service.js';

/**
 * @desc    Submit new customer enquiry
 * @route   POST /api/enquiries
 * @access  Public (Rate-limited)
 */
export const createEnquiry = async (req, res, next) => {
  try {
    const { customerName, phone, email, serviceId, location, message, website_hp } = req.body;

    // Bot detection via honeypot field
    if (website_hp && typeof website_hp === 'string' && website_hp.trim().length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Spam submission detected.',
      });
    }

    let validServiceId = null;
    if (serviceId) {
      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid service selected. The service ID format is invalid.',
        });
      }
      const serviceExists = await Service.findOne({ _id: serviceId, isActive: true });
      if (!serviceExists) {
        return res.status(400).json({
          success: false,
          message: 'The selected service was not found or is no longer available.',
        });
      }
      validServiceId = serviceId;
    }

    // HTML sanitization to prevent XSS / raw tags
    const sanitize = (text) => (typeof text === 'string' ? text.replace(/<[^>]*>/g, '').trim() : '');
    const cleanCustomerName = sanitize(customerName);
    const cleanLocation = sanitize(location);
    const cleanMessage = sanitize(message);

    // Edge Case: Check for duplicate enquiry submission within a 5-minute window
    const recentDuplicate = await Enquiry.findOne({
      email: email.toLowerCase(),
      phone: phone.trim(),
      message: cleanMessage,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    });

    if (recentDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'A duplicate enquiry with this message was recently submitted. Our team will contact you shortly.',
      });
    }

    const enquiry = await Enquiry.create({
      customerName: cleanCustomerName,
      phone: phone.trim(),
      email: email.toLowerCase().trim(),
      serviceId: validServiceId,
      location: cleanLocation || '',
      message: cleanMessage,
      status: 'NEW',
      adminNotes: '',
    });

    // Strip internal admin fields before responding to public client
    return res.status(201).json({
      success: true,
      message: 'Thank you for your enquiry. Our team will contact you shortly.',
      data: {
        id: enquiry._id,
        customerName: enquiry.customerName,
        createdAt: enquiry.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Get all enquiries with filtering, search, and pagination
 * @route   GET /api/enquiries
 * @access  Private (Admin)
 */
export const getEnquiries = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status && ENQUIRY_STATUS.includes(req.query.status.toUpperCase())) {
      filter.status = req.query.status.toUpperCase();
    }

    if (req.query.serviceId && mongoose.Types.ObjectId.isValid(req.query.serviceId)) {
      filter.serviceId = req.query.serviceId;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { customerName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { location: searchRegex },
        { message: searchRegex },
      ];
    }

    const total = await Enquiry.countDocuments(filter);
    const enquiries = await Enquiry.find(filter)
      .populate('serviceId', 'title slug imageUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: enquiries.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: enquiries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single enquiry by ID
 * @route   GET /api/enquiries/:id
 * @access  Private (Admin)
 */
export const getEnquiryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const enquiry = await Enquiry.findById(id).populate('serviceId', 'title slug imageUrl');
    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: `Enquiry with ID ${id} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update enquiry status
 * @route   PATCH /api/enquiries/:id/status
 * @access  Private (Admin)
 */
export const updateEnquiryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ENQUIRY_STATUS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${ENQUIRY_STATUS.join(', ')}`,
      });
    }

    const enquiry = await Enquiry.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('serviceId', 'title slug');

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: `Enquiry with ID ${id} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Enquiry status updated to ${status}`,
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update internal admin notes
 * @route   PATCH /api/enquiries/:id/notes
 * @access  Private (Admin)
 */
export const updateEnquiryNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const enquiry = await Enquiry.findByIdAndUpdate(
      id,
      { adminNotes: adminNotes || '' },
      { new: true }
    );

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: `Enquiry with ID ${id} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Admin notes updated successfully',
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an enquiry
 * @route   DELETE /api/enquiries/:id
 * @access  Private (Admin)
 */
export const deleteEnquiry = async (req, res, next) => {
  try {
    const { id } = req.params;

    const enquiry = await Enquiry.findByIdAndDelete(id);
    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: `Enquiry with ID ${id} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Enquiry deleted successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export filtered enquiries as CSV
 * @route   GET /api/enquiries/export
 * @access  Private (Admin)
 */
export const exportEnquiriesCSV = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.status && ENQUIRY_STATUS.includes(req.query.status.toUpperCase())) {
      filter.status = req.query.status.toUpperCase();
    }

    if (req.query.serviceId && req.query.serviceId !== 'All') {
      filter.serviceId = req.query.serviceId;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { customerName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { location: searchRegex },
      ];
    }

    const enquiries = await Enquiry.find(filter)
      .populate('serviceId', 'title')
      .sort({ createdAt: -1 });

    // Build CSV string with escaped values
    const headers = ['ID', 'Customer Name', 'Phone', 'Email', 'Service', 'Location', 'Status', 'Date', 'Message', 'Admin Notes'];
    const escapeCsv = (val) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = enquiries.map((item) => [
      escapeCsv(item._id),
      escapeCsv(item.customerName),
      escapeCsv(item.phone),
      escapeCsv(item.email),
      escapeCsv(item.serviceId ? item.serviceId.title : 'General Enquiry'),
      escapeCsv(item.location),
      escapeCsv(item.status),
      escapeCsv(new Date(item.createdAt).toISOString()),
      escapeCsv(item.message),
      escapeCsv(item.adminNotes),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mp_landscape_enquiries_${new Date().toISOString().slice(0, 10)}.csv"`
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
