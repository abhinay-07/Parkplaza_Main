const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const ParkingLot = require('../models/ParkingLot');
const Service = require('../models/Service');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Create new booking
// @route   POST /api/booking/new
// @access  Private
router.post('/new', protect, [
  body('parkingLot').notEmpty().withMessage('Parking lot ID is required'),
  body('vehicle.type').isIn(['car', 'bike', 'truck', 'van', 'bicycle']).withMessage('Invalid vehicle type'),
  body('vehicle.licensePlate').notEmpty().withMessage('License plate is required'),
  body('bookingDetails.startTime').isISO8601().withMessage('Valid start time is required'),
  body('bookingDetails.endTime').isISO8601().withMessage('Valid end time is required'),
  body('payment.method').isIn(['card', 'upi', 'wallet', 'cash', 'razorpay', 'stripe']).withMessage('Invalid payment method')
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
      parkingLot: parkingLotId,
      vehicle,
      bookingDetails,
      services = [],
      payment
    } = req.body;

    // Validate parking lot
    const parkingLot = await ParkingLot.findById(parkingLotId);
    if (!parkingLot) {
      return res.status(404).json({
        success: false,
        message: 'Parking lot not found'
      });
    }

    // Check availability
    if (parkingLot.capacity.available <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No parking spots available'
      });
    }

    // Check if lot supports vehicle type
    if (!parkingLot.vehicleTypes.includes(vehicle.type)) {
      return res.status(400).json({
        success: false,
        message: `Vehicle type ${vehicle.type} not supported at this location`
      });
    }

    // Validate booking times
    const startTime = new Date(bookingDetails.startTime);
    const endTime = new Date(bookingDetails.endTime);
    const now = new Date();

    if (startTime < now) {
      return res.status(400).json({
        success: false,
        message: 'Start time cannot be in the past'
      });
    }

    if (endTime <= startTime) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    // Calculate duration and pricing
    const duration = endTime - startTime;
    const hours = Math.ceil(duration / (1000 * 60 * 60));
    const basePrice = hours * parkingLot.pricing.hourly;

    // Calculate service costs
    let serviceFees = 0;
    const serviceDetails = [];

    if (services.length > 0) {
      for (const serviceId of services) {
        const service = await Service.findById(serviceId);
        if (service && service.isAvailableAt(parkingLotId)) {
          const servicePrice = service.getPriceFor(parkingLotId);
          serviceFees += servicePrice;
          serviceDetails.push({
            serviceId: service._id,
            name: service.name,
            price: servicePrice,
            quantity: 1
          });
        }
      }
    }

    // Calculate taxes and total
    const taxes = (basePrice + serviceFees) * 0.18; // 18% GST
    const totalAmount = basePrice + serviceFees + taxes;

    // Create booking
    const booking = await Booking.create({
      user: req.user.id,
      parkingLot: parkingLotId,
      vehicle,
      bookingDetails: {
        ...bookingDetails,
        duration: {
          hours: Math.floor(hours),
          minutes: Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
        }
      },
      pricing: {
        basePrice,
        serviceFees,
        taxes,
        totalAmount
      },
      services: serviceDetails,
      payment: {
        ...payment,
        status: 'pending'
      },
      status: 'pending'
    });

    // Reserve the spot
    await ParkingLot.findByIdAndUpdate(parkingLotId, {
      $inc: { 
        'capacity.available': -1,
        'capacity.reserved': 1
      },
      'liveStatus.lastUpdated': new Date()
    });

    // Populate booking for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate('parkingLot', 'name location pricing')
      .populate('user', 'name email phone');

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { totalBookings: 1, totalSpent: totalAmount }
    });

    // Emit real-time update
    req.io.to(`lot-${parkingLotId}`).emit('booking-created', {
      lotId: parkingLotId,
      availableSpots: parkingLot.capacity.available - 1
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking: populatedBooking }
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating booking'
    });
  }
});

// @desc    Get user's bookings
// @route   GET /api/booking/my-bookings
// @access  Private
router.get('/my-bookings', protect, [
  query('status').optional().isIn(['pending', 'confirmed', 'active', 'completed', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { user: req.user.id };
    if (status) {
      query.status = status;
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('parkingLot', 'name location images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          current: parseInt(page),
          total: totalPages,
          totalBookings: total
        }
      }
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching bookings'
    });
  }
});

// @desc    Get booking details
// @route   GET /api/booking/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('parkingLot')
      .populate('user', 'name email phone')
      .populate('services.serviceId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns the booking or is the lot owner
    const isOwner = booking.user._id.toString() === req.user.id;
    const isLotOwner = booking.parkingLot.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isLotOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching booking'
    });
  }
});

// @desc    Update booking status
// @route   PUT /api/booking/:id/status
// @access  Private
router.put('/:id/status', protect, [
  body('status').isIn(['confirmed', 'active', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long')
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

    const { status, reason } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('parkingLot');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    const isOwner = booking.user.toString() === req.user.id;
    const isLotOwner = booking.parkingLot.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isLotOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Validate status transitions
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['active', 'cancelled'],
      'active': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[booking.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${booking.status} to ${status}`
      });
    }

    // Handle cancellation
    if (status === 'cancelled') {
      const refundAmount = booking.calculateRefund();
      booking.cancellation = {
        reason: reason || 'Cancelled by user',
        cancelledAt: new Date(),
        cancelledBy: req.user.id,
        refundEligible: refundAmount > 0,
        refundAmount
      };

      // Release the spot
      await ParkingLot.findByIdAndUpdate(booking.parkingLot._id, {
        $inc: { 
          'capacity.available': 1,
          'capacity.reserved': -1
        },
        'liveStatus.lastUpdated': new Date()
      });
    }

    // Handle completion
    if (status === 'completed') {
      booking.exitLog = {
        time: new Date(),
        verifiedBy: req.user.id
      };
    }

    booking.status = status;
    await booking.save();

    // Emit real-time update
    req.io.to(`booking-${booking._id}`).emit('status-update', {
      bookingId: booking._id,
      status,
      timestamp: new Date()
    });

    res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
      data: { booking }
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating booking status'
    });
  }
});

// @desc    Cancel booking
// @route   DELETE /api/booking/:id
// @access  Private
router.delete('/:id', protect, [
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long')
], async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('parkingLot');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns the booking
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    // Check if booking can be cancelled
    if (!booking.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled at this time'
      });
    }

    // Calculate refund
    const refundAmount = booking.calculateRefund();

    // Update booking
    booking.status = 'cancelled';
    booking.cancellation = {
      reason: req.body.reason || 'Cancelled by user',
      cancelledAt: new Date(),
      cancelledBy: req.user.id,
      refundEligible: refundAmount > 0,
      refundAmount
    };

    await booking.save();

    // Release the spot
    await ParkingLot.findByIdAndUpdate(booking.parkingLot._id, {
      $inc: { 
        'capacity.available': 1,
        'capacity.reserved': -1
      },
      'liveStatus.lastUpdated': new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        refundAmount,
        booking
      }
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling booking'
    });
  }
});

// @desc    Extend booking
// @route   PUT /api/booking/:id/extend
// @access  Private
router.put('/:id/extend', protect, [
  body('additionalHours').isInt({ min: 1, max: 12 }).withMessage('Additional hours must be 1-12')
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

    const { additionalHours } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('parkingLot');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to extend this booking'
      });
    }

    // Check if booking can be extended
    if (!['confirmed', 'active'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be extended'
      });
    }

    // Calculate additional cost
    const additionalCost = additionalHours * booking.parkingLot.pricing.hourly;
    const taxes = additionalCost * 0.18;
    const totalAdditionalCost = additionalCost + taxes;

    // Update booking
    const currentEndTime = new Date(booking.bookingDetails.endTime);
    const newEndTime = new Date(currentEndTime.getTime() + (additionalHours * 60 * 60 * 1000));

    booking.bookingDetails.endTime = newEndTime;
    booking.bookingDetails.duration.hours += additionalHours;
    booking.pricing.basePrice += additionalCost;
    booking.pricing.taxes += taxes;
    booking.pricing.totalAmount += totalAdditionalCost;
    booking.status = 'extended';

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking extended successfully',
      data: {
        booking,
        additionalCost: totalAdditionalCost,
        newEndTime
      }
    });

  } catch (error) {
    console.error('Extend booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error extending booking'
    });
  }
});

module.exports = router;
