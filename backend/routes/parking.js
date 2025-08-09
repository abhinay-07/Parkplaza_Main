const express = require('express');
const multer = require('multer');
const { body, query, validationResult } = require('express-validator');
const ParkingLot = require('../models/ParkingLot');
const Booking = require('../models/Booking');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');
const { uploadImage, deleteImage } = require('../config/cloudinary');

const router = express.Router();

// Multer configuration for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// @desc    Upload parking lot images
// @route   POST /api/parking/upload-images/:lotId
// @access  Private (Landowners only)
router.post('/upload-images/:lotId', protect, authorize('landowner', 'admin'), upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }

    const parkingLot = await ParkingLot.findById(req.params.lotId);
    if (!parkingLot) {
      return res.status(404).json({
        success: false,
        message: 'Parking lot not found'
      });
    }

    // Check if user owns this parking lot
    if (parkingLot.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Upload images to Cloudinary
    const uploadPromises = req.files.map(file => 
      uploadImage(file.buffer, {
        folder: `parkplaza/parking-lots/${req.params.lotId}`,
        transformation: [
          { width: 800, height: 600, crop: 'fill' },
          { quality: 'auto' }
        ]
      })
    );

    const uploadResults = await Promise.all(uploadPromises);
    
    // Add images to parking lot
    const newImages = uploadResults.map((result, index) => ({
      url: result.secure_url,
      publicId: result.public_id,
      caption: req.body.captions ? req.body.captions[index] : '',
      isPrimary: index === 0 && parkingLot.images.length === 0 // First image is primary if no existing images
    }));

    parkingLot.images.push(...newImages);
    await parkingLot.save();

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: {
        images: newImages,
        totalImages: parkingLot.images.length
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading images'
    });
  }
});

// @desc    Delete parking lot image
// @route   DELETE /api/parking/delete-image/:lotId/:imageId
// @access  Private (Landowners only)
router.delete('/delete-image/:lotId/:imageId', protect, authorize('landowner', 'admin'), async (req, res) => {
  try {
    const parkingLot = await ParkingLot.findById(req.params.lotId);
    if (!parkingLot) {
      return res.status(404).json({
        success: false,
        message: 'Parking lot not found'
      });
    }

    // Check if user owns this parking lot
    if (parkingLot.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Find the image
    const imageIndex = parkingLot.images.findIndex(img => img._id.toString() === req.params.imageId);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const image = parkingLot.images[imageIndex];

    // Delete from Cloudinary
    try {
      await deleteImage(image.publicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue even if Cloudinary deletion fails
    }

    // Remove from parking lot
    parkingLot.images.splice(imageIndex, 1);

    // If deleted image was primary and there are other images, make the first one primary
    if (image.isPrimary && parkingLot.images.length > 0) {
      parkingLot.images[0].isPrimary = true;
    }

    await parkingLot.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        remainingImages: parkingLot.images.length
      }
    });
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image'
    });
  }
});

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

// @desc    Get nearby parking lots (lightweight for maps)
// @route   GET /api/parking/nearby
// @access  Public
// Params: lat,lng (required), radius (km, default 5)
router.get('/nearby', [
  query('lat').isFloat().withMessage('Latitude required'),
  query('lng').isFloat().withMessage('Longitude required'),
  query('radius').optional().isInt({ min:1, max:50 }).withMessage('Radius 1-50km')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success:false, message:'Validation failed', errors: errors.array() });
    }
    const { lat, lng, radius = 5 } = req.query;
    const lots = await ParkingLot.aggregate([
      { $geoNear: {
          near: { type:'Point', coordinates:[parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distance',
          maxDistance: parseInt(radius) * 1000,
          spherical: true,
          query: { status:'active', 'capacity.available': { $gt: 0 } }
      }},
      { $project: {
          name:1,
          'location.coordinates':1,
          'location.address.city':1,
          'capacity.available':1,
          'capacity.total': '$capacity.total',
          'pricing.hourly':1,
          'rating.average':1,
          distance:1
      }},
      { $limit: 200 }
    ]);

    const simplified = lots.map(l => ({
      id: l._id,
      name: l.name,
      address: l.location?.address?.city || '',
      lat: l.location?.coordinates?.[1],
      lng: l.location?.coordinates?.[0],
      availableSlots: l.capacity?.available ?? 0,
      totalSlots: l.capacity?.total ?? 0,
      pricePerHour: { day: l.pricing?.hourly ?? 0 },
      rating: l.rating?.average ?? 0,
      distanceMeters: l.distance
    }));

    res.status(200).json({ success:true, data: simplified });
  } catch (error) {
    console.error('Nearby lots error:', error);
    res.status(500).json({ success:false, message:'Server error fetching nearby lots' });
  }
});

// @desc    Get single parking lot details
// @route   GET /api/parking/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // If id is not a valid Mongo ObjectId, return 404 (helps when demo-* ids get passed accidentally)
    if (!id || !id.match(/^[a-fA-F0-9]{24}$/)) {
      return res.status(404).json({ success: false, message: 'Parking lot not found' });
    }

    const lot = await ParkingLot.findById(id)
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

// --- Slot Management (basic) ---
// Get slots for a lot (public - filtered to available unless query.all=true)
router.get('/:id/slots', async (req, res) => {
  try {
    const { id } = req.params;
    const lot = await ParkingLot.findById(id).select('slots capacity');
    if (!lot) return res.status(404).json({ success:false, message:'Parking lot not found' });
    let slots = lot.slots || [];
    if (!req.query.all) {
      slots = slots.filter(s => s.status === 'available');
    }
    res.json({ success:true, data: { slots, total: slots.length, available: slots.filter(s=>s.status==='available').length } });
  } catch (err) {
    console.error('Fetch slots error', err);
    res.status(500).json({ success:false, message:'Failed to fetch slots' });
  }
});

// Reserve a slot (optimistic lock via manual status check)
router.post('/:id/slots/reserve', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { slotCode } = req.body;
    if (!slotCode) return res.status(400).json({ success:false, message:'slotCode required' });

    const lot = await ParkingLot.findById(id).select('slots capacity');
    if (!lot) return res.status(404).json({ success:false, message:'Parking lot not found' });
    const slot = lot.slots.find(s => s.code === slotCode);
    if (!slot) return res.status(404).json({ success:false, message:'Slot not found' });
    if (slot.status !== 'available') return res.status(409).json({ success:false, message:'Slot not available' });

    slot.status = 'reserved';
    lot.capacity.available = Math.max(0, lot.capacity.available - 1);
    await lot.save();

    // Emit update
    req.io.emit('availability-update', { lotId: id, available: lot.capacity.available });
    res.json({ success:true, data: { slotCode, status:'reserved' } });
  } catch (err) {
    console.error('Reserve slot error', err);
    res.status(500).json({ success:false, message:'Failed to reserve slot' });
  }
});
