const express = require('express');
const { query, validationResult } = require('express-validator');
const Service = require('../models/Service');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Get all available services with options
// @route   GET /api/services/options
// @access  Public
router.get('/options', [
  query('parkingLot').optional().isMongoId().withMessage('Invalid parking lot ID'),
  query('category').optional().isIn([
    'car-wash', 'maintenance', 'fuel', 'food-beverage', 
    'valet', 'charging', 'insurance', 'emergency'
  ]).withMessage('Invalid service category'),
  query('vehicleType').optional().isIn(['car', 'bike', 'truck', 'van', 'bicycle']),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      parkingLot,
      category,
      vehicleType,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    let query = { 'availability.isActive': true };

    if (category) {
      query.category = category;
    }

    if (vehicleType) {
      query['details.vehicleTypes'] = vehicleType;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query['pricing.basePrice'] = {};
      if (minPrice) query['pricing.basePrice'].$gte = parseFloat(minPrice);
      if (maxPrice) query['pricing.basePrice'].$lte = parseFloat(maxPrice);
    }

    // Pagination
    const skip = (page - 1) * limit;

    let services = await Service.find(query)
      .sort({ 'provider.rating.average': -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by parking lot availability if specified
    if (parkingLot) {
      services = services.filter(service => 
        service.isAvailableAt(parkingLot)
      );

      // Add custom pricing for the specific lot
      services = services.map(service => {
        const customPrice = service.getPriceFor(parkingLot);
        return {
          ...service.toObject(),
          customPricing: customPrice !== service.pricing.basePrice ? customPrice : null
        };
      });
    }

    const total = await Service.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Group services by category for better UX
    const groupedServices = services.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: 'Services fetched successfully',
      data: {
        services,
        groupedServices,
        categories: Object.keys(groupedServices),
        pagination: {
          current: parseInt(page),
          total: totalPages,
          totalServices: total
        }
      }
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching services'
    });
  }
});

// @desc    Get service details
// @route   GET /api/services/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('availableAt.parkingLot', 'name location');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { service }
    });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching service'
    });
  }
});

// @desc    Get services by category
// @route   GET /api/services/category/:category
// @access  Public
router.get('/category/:category', [
  query('parkingLot').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { category } = req.params;
    const { parkingLot, page = 1, limit = 20 } = req.query;

    const validCategories = [
      'car-wash', 'maintenance', 'fuel', 'food-beverage', 
      'valet', 'charging', 'insurance', 'emergency'
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service category'
      });
    }

    const skip = (page - 1) * limit;

    let query = {
      category,
      'availability.isActive': true
    };

    let services = await Service.find(query)
      .sort({ 'provider.rating.average': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by parking lot if specified
    if (parkingLot) {
      services = services.filter(service => 
        service.isAvailableAt(parkingLot)
      );
    }

    const total = await Service.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        services,
        category,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          totalServices: total
        }
      }
    });

  } catch (error) {
    console.error('Get services by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching services'
    });
  }
});

// @desc    Get popular services
// @route   GET /api/services/popular
// @access  Public
router.get('/featured/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popularServices = await Service.find({
      'availability.isActive': true
    })
    .sort({ 
      'stats.totalBookings': -1, 
      'provider.rating.average': -1 
    })
    .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: { services: popularServices }
    });

  } catch (error) {
    console.error('Get popular services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching popular services'
    });
  }
});

// @desc    Search services
// @route   GET /api/services/search
// @access  Public
router.get('/search/query', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('parkingLot').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { q: searchQuery, parkingLot, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Text search query
    const query = {
      'availability.isActive': true,
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { category: { $regex: searchQuery, $options: 'i' } },
        { 'provider.name': { $regex: searchQuery, $options: 'i' } }
      ]
    };

    let services = await Service.find(query)
      .sort({ 'provider.rating.average': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by parking lot if specified
    if (parkingLot) {
      services = services.filter(service => 
        service.isAvailableAt(parkingLot)
      );
    }

    const total = await Service.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        services,
        searchQuery,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          totalResults: total
        }
      }
    });

  } catch (error) {
    console.error('Search services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching services'
    });
  }
});

// @desc    Get service pricing for specific parking lot
// @route   GET /api/services/:id/pricing/:lotId
// @access  Public
router.get('/:id/pricing/:lotId', async (req, res) => {
  try {
    const { id: serviceId, lotId } = req.params;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (!service.isAvailableAt(lotId)) {
      return res.status(404).json({
        success: false,
        message: 'Service not available at this parking lot'
      });
    }

    const price = service.getPriceFor(lotId);
    const isCustomPricing = price !== service.pricing.basePrice;

    res.status(200).json({
      success: true,
      data: {
        serviceId,
        lotId,
        price,
        basePrice: service.pricing.basePrice,
        isCustomPricing,
        currency: service.pricing.currency,
        unit: service.pricing.unit
      }
    });

  } catch (error) {
    console.error('Get service pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching service pricing'
    });
  }
});

module.exports = router;
