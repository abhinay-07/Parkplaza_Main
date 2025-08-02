const express = require('express');
const { body, query, validationResult } = require('express-validator');
const ParkingLot = require('../models/ParkingLot');
const Booking = require('../models/Booking');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Get all parking lots with filters and search
// @route   GET /api/parking/all
// @access  Public
router.get('/all', [
  query('lat').optional().isFloat().withMessage('Invalid latitude'),
  query('lng').optional().isFloat().withMessage('Invalid longitude'),
  query('radius').optional().isInt({ min: 1, max: 50 }).withMessage('Radius must be between 1-50 km'),
  query('vehicleType').optional().isIn(['car', 'bike', 'truck', 'van', 'bicycle']),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('amenities').optional(),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
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
      lat, lng, radius = 10, vehicleType, minPrice, maxPrice,
      amenities, page = 1, limit = 10, search
    } = req.query;

    // Build aggregation pipeline for geospatial queries
    let pipeline = [];

    // Start with match stage for basic filters
    let matchStage = { status: 'active', 'capacity.available': { $gt: 0 } };

    // Vehicle type filter
    if (vehicleType) {
      matchStage.vehicleTypes = vehicleType;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      matchStage['pricing.hourly'] = {};
      if (minPrice) matchStage['pricing.hourly'].$gte = parseFloat(minPrice);
      if (maxPrice) matchStage['pricing.hourly'].$lte = parseFloat(maxPrice);
    }

    // Amenities filter
    if (amenities) {
      const amenityList = amenities.split(',');
      matchStage.amenities = { $in: amenityList };
    }

    // Text search
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.address.city': { $regex: search, $options: 'i' } },
        { 'location.address.state': { $regex: search, $options: 'i' } }
      ];
    }

    // Add location-based search using $geoNear if lat/lng provided
    if (lat && lng) {
      // Use $geoNear as the first stage for location-based queries
      pipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          distanceField: 'distance',
          maxDistance: radius * 1000, // Convert km to meters
          spherical: true,
          query: matchStage // Apply other filters in the query
        }
      });
    } else {
      // Regular match if no location search
      pipeline.push({ $match: matchStage });
    }

    // Add population and projection stages
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'owner',
          pipeline: [{ $project: { name: 1, phone: 1 } }]
        }
      },
      {
        $unwind: '$owner'
      },
      {
        $project: {
          verificationDocuments: 0
        }
      }
    );

    // Add sorting - distance first if location search, then rating
    if (lat && lng) {
      pipeline.push({ $sort: { distance: 1, 'rating.average': -1, createdAt: -1 } });
    } else {
      pipeline.push({ $sort: { 'rating.average': -1, createdAt: -1 } });
    }

    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

    // Execute aggregation pipeline and count
    const [lots, totalResult] = await Promise.all([
      ParkingLot.aggregate(pipeline),
      ParkingLot.aggregate([
        ...(lat && lng ? 
          [{
            $geoNear: {
              near: {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)]
              },
              distanceField: 'distance',
              maxDistance: radius * 1000,
              spherical: true,
              query: matchStage
            }
          }] : 
          [{ $match: matchStage }]
        ),
        { $count: 'total' }
      ])
    ]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.status(200).json({
      success: true,
      message: 'Parking lots fetched successfully',
      data: {
        lots,
        pagination: {
          current: parseInt(page),
          total: totalPages,
          hasNext,
          hasPrev,
          totalLots: total
        }
      }
    });
  } catch (error) {
    console.error('Get parking lots error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching parking lots'
    });
  }
});

// @desc    Get single parking lot details
// @route   GET /api/parking/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const lot = await ParkingLot.findById(req.params.id)
      .populate('owner', 'name phone email');

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: 'Parking lot not found'
      });
    }

    // Get recent bookings for occupancy info (without sensitive data)
    const recentBookings = await Booking.find({
      parkingLot: lot._id,
      status: { $in: ['confirmed', 'active'] }
    })
    .select('bookingDetails.startTime bookingDetails.endTime status')
    .limit(10);

    res.status(200).json({
      success: true,
      data: {
        lot,
        recentActivity: {
          bookingCount: recentBookings.length,
          occupancyTrend: lot.liveStatus.occupancyRate
        }
      }
    });
  } catch (error) {
    console.error('Get parking lot error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching parking lot'
    });
  }
});

// @desc    Create new parking lot (Landowner only)
// @route   POST /api/parking/create
// @access  Private (Landowner)
router.post('/create', protect, authorize('landowner', 'admin'), [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
  body('location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Invalid coordinates'),
  body('location.address.city').notEmpty().withMessage('City is required'),
  body('location.address.state').notEmpty().withMessage('State is required'),
  body('capacity.total').isInt({ min: 1 }).withMessage('Total capacity must be at least 1'),
  body('pricing.hourly').isFloat({ min: 0 }).withMessage('Hourly rate must be positive'),
  body('vehicleTypes').isArray({ min: 1 }).withMessage('At least one vehicle type required')
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

    const lotData = {
      ...req.body,
      owner: req.user.id,
      capacity: {
        ...req.body.capacity,
        available: req.body.capacity.total
      }
    };

    const lot = await ParkingLot.create(lotData);

    res.status(201).json({
      success: true,
      message: 'Parking lot created successfully',
      data: { lot }
    });
  } catch (error) {
    console.error('Create parking lot error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating parking lot'
    });
  }
});

// @desc    Update parking lot
// @route   PUT /api/parking/:id
// @access  Private (Owner/Admin)
router.put('/:id', protect, async (req, res) => {
  try {
    const lot = await ParkingLot.findById(req.params.id);

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: 'Parking lot not found'
      });
    }

    // Check if user owns the lot or is admin
    if (lot.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this parking lot'
      });
    }

    const updatedLot = await ParkingLot.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Parking lot updated successfully',
      data: { lot: updatedLot }
    });
  } catch (error) {
    console.error('Update parking lot error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating parking lot'
    });
  }
});

// @desc    Get parking lots owned by current user
// @route   GET /api/parking/my-lots
// @access  Private (Landowner)
router.get('/owner/my-lots', protect, authorize('landowner', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [lots, total] = await Promise.all([
      ParkingLot.find({ owner: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ParkingLot.countDocuments({ owner: req.user.id })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        lots,
        pagination: {
          current: parseInt(page),
          total: totalPages,
          totalLots: total
        }
      }
    });
  } catch (error) {
    console.error('Get my lots error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching your parking lots'
    });
  }
});

// @desc    Update lot availability in real-time
// @route   PUT /api/parking/:id/availability
// @access  Private (Owner/Admin)
router.put('/:id/availability', protect, [
  body('available').isInt({ min: 0 }).withMessage('Available spots must be non-negative'),
  body('status').optional().isIn(['active', 'inactive', 'maintenance', 'full'])
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

    const lot = await ParkingLot.findById(req.params.id);

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: 'Parking lot not found'
      });
    }

    // Check authorization
    if (lot.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { available, status } = req.body;

    // Update availability
    if (available !== undefined) {
      lot.capacity.available = available;
      lot.liveStatus.lastUpdated = new Date();
      lot.liveStatus.occupancyRate = 
        ((lot.capacity.total - available) / lot.capacity.total) * 100;
    }

    if (status) {
      lot.status = status;
    }

    await lot.save();

    // Emit real-time update
    req.io.to(`lot-${lot._id}`).emit('availability-update', {
      lotId: lot._id,
      available: lot.capacity.available,
      occupancyRate: lot.liveStatus.occupancyRate,
      status: lot.status
    });

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: {
        available: lot.capacity.available,
        occupancyRate: lot.liveStatus.occupancyRate,
        status: lot.status
      }
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating availability'
    });
  }
});

module.exports = router;
