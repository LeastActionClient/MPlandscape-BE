import Enquiry from '../models/Enquiry.js';
import Service from '../models/Service.js';
import Gallery from '../models/Gallery.js';

/**
 * @desc    Get dashboard summary statistics using MongoDB aggregation
 * @route   GET /api/dashboard/stats
 * @access  Private (Admin)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Aggregation pipeline for enquiry counts grouped by status
    const statusCountsPromise = Enquiry.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // 2. Active services count
    const activeServicesPromise = Service.countDocuments({ isActive: true });

    // 3. Active gallery images count
    const activeGalleryPromise = Gallery.countDocuments({ isActive: true });

    // 4. Total enquiries count
    const totalEnquiriesPromise = Enquiry.countDocuments();

    const [statusCounts, activeServices, activeGallery, totalEnquiries] = await Promise.all([
      statusCountsPromise,
      activeServicesPromise,
      activeGalleryPromise,
      totalEnquiriesPromise,
    ]);

    // Format status counts object
    const statusMap = {
      NEW: 0,
      CONTACTED: 0,
      IN_PROGRESS: 0,
      CONVERTED: 0,
      CLOSED: 0,
    };

    statusCounts.forEach((item) => {
      if (item._id && statusMap[item._id] !== undefined) {
        statusMap[item._id] = item.count;
      }
    });

    const conversionRate = totalEnquiries > 0
      ? Number(((statusMap.CONVERTED / totalEnquiries) * 100).toFixed(1))
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalEnquiries,
        statusCounts: statusMap,
        activeServices,
        activeGallery,
        conversionRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recent enquiries
 * @route   GET /api/dashboard/recent-enquiries
 * @access  Private (Admin)
 */
export const getRecentEnquiries = async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 5));

    const recent = await Enquiry.find()
      .populate('serviceId', 'title slug imageUrl')
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: recent.length,
      data: recent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly enquiry trends and service distribution via aggregation pipelines
 * @route   GET /api/dashboard/enquiry-trends
 * @access  Private (Admin)
 */
export const getEnquiryTrends = async (req, res, next) => {
  try {
    const monthsBack = 6;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Pipeline 1: Monthly trend aggregation
    const monthlyTrends = await Enquiry.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          converted: {
            $sum: {
              $cond: [{ $eq: ['$status', 'CONVERTED'] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          count: 1,
          converted: 1,
        },
      },
    ]);

    // Pipeline 2: Enquiry distribution by service
    const serviceDistribution = await Enquiry.aggregate([
      {
        $group: {
          _id: '$serviceId',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'service',
        },
      },
      {
        $unwind: {
          path: '$service',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          serviceId: '$_id',
          serviceTitle: { $ifNull: ['$service.title', 'General Consultation'] },
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        monthlyTrends,
        serviceDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};
