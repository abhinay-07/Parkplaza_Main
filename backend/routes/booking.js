const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const ParkingLot = require('../models/ParkingLot');
const Service = require('../models/Service');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { sendBookingConfirmation } = require('../services/emailService');
const { createPaymentIntent, confirmPayment } = require('../services/stripeService');
const { createOrder, verifyPaymentSignature } = require('../services/razorpayService');

const router = express.Router();

// @desc    Calculate booking price (estimation)
// @route   POST /api/booking/calculate-price
// @access  Private
router.post('/calculate-price', protect, [
  body('parkingLot').notEmpty().withMessage('Parking lot ID is required'),
  body('startTime').isISO8601().withMessage('Valid start time required'),
  body('endTime').isISO8601().withMessage('Valid end time required'),
  body('services').optional().isArray().withMessage('Services must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { parkingLot: parkingLotId, startTime, endTime, services = [] } = req.body;
    const lot = await ParkingLot.findById(parkingLotId);
    if (!lot) return res.status(404).json({ success: false, message: 'Parking lot not found' });
    const sTime = new Date(startTime); const eTime = new Date(endTime);
    if (eTime <= sTime) return res.status(400).json({ success: false, message: 'End time must be after start time' });
    const durationMs = eTime - sTime; const hours = Math.ceil(durationMs / (1000*60*60));
    const basePrice = hours * (lot.pricing?.hourly || 0);
    let serviceFees = 0; const serviceBreakdown = [];
    for (const id of services) {
      const svc = await Service.findById(id);
      if (svc) {
        // Always add the service's basePrice to the total if selected
        const svcPrice = svc.pricing.basePrice;
        serviceFees += svcPrice;
        serviceBreakdown.push({ serviceId: svc._id, name: svc.name, price: svcPrice });
      }
    }
    const taxes = (basePrice + serviceFees) * 0.18;
    const totalAmount = basePrice + serviceFees + taxes;
    return res.status(200).json({ success: true, data: { pricing: { basePrice, serviceFees, taxes, totalAmount }, duration: { hours, minutes: Math.floor((durationMs % (1000*60*60)) / (1000*60)) }, services: serviceBreakdown } });
  } catch (err) {
    console.error('Calculate price error:', err);
    res.status(500).json({ success: false, message: 'Error calculating price' });
  }
});

// @desc    Create Stripe payment intent
// @route   POST /api/booking/create-payment-intent
// @access  Private
router.post('/create-payment-intent', protect, [
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
  body('currency').optional().isIn(['inr', 'usd']).withMessage('Invalid currency')
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

    const { amount, currency = 'inr', metadata = {} } = req.body;

    const paymentIntent = await createPaymentIntent({
      amount,
      currency,
      metadata: {
        userId: req.user._id.toString(),
        ...metadata
      }
    });

    res.status(200).json({
      success: true,
      message: 'Payment intent created successfully',
      data: paymentIntent
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment intent'
    });
  }
});

// @desc    Create Razorpay order
// @route   POST /api/booking/create-razorpay-order
// @access  Private
router.post('/create-razorpay-order', protect, [
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
  body('currency').optional().isIn(['INR', 'USD']).withMessage('Invalid currency')
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

    const { amount, currency = 'INR', receipt, notes = {} } = req.body;

    const order = await createOrder({
      amount,
      currency,
      receipt: receipt || `booking_${Date.now()}_${req.user._id}`,
      notes: {
        userId: req.user._id.toString(),
        ...notes
      }
    });

    res.status(200).json({
      success: true,
      message: 'Razorpay order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating Razorpay order'
    });
  }
});

// @desc    Verify Razorpay payment
// @route   POST /api/booking/verify-razorpay-payment
// @access  Private
router.post('/verify-razorpay-payment', protect, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('signature').notEmpty().withMessage('Signature is required')
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

    const { orderId, paymentId, signature } = req.body;

    const isValidSignature = verifyPaymentSignature(orderId, paymentId, signature);

    if (isValidSignature) {
      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: { verified: true }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment'
    });
  }
});

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

    // Accept either ObjectId or unique name for parkingLot
    let parkingLot;
    if (parkingLotId && parkingLotId.match(/^[a-fA-F0-9]{24}$/)) {
      parkingLot = await ParkingLot.findById(parkingLotId);
    } else if (parkingLotId && typeof parkingLotId === 'string') {
      parkingLot = await ParkingLot.findOne({ name: parkingLotId });
    }
    if (!parkingLot) {
      return res.status(404).json({
        success: false,
        message: 'Parking lot not found'
      });
    }

    // Check overall lot availability
    if (parkingLot.capacity.available <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No parking spots available'
      });
    }

    // If a specific slot is requested, validate and reserve it
    let reservedSlot = null;
    if (bookingDetails.spotNumber) {
      reservedSlot = parkingLot.slots.find(
        slot => slot.code === bookingDetails.spotNumber && slot.status === 'available'
      );
      if (!reservedSlot) {
        return res.status(400).json({
          success: false,
          message: 'Requested slot not found or not available'
        });
      }
      // Mark slot as reserved in DB
      await ParkingLot.updateOne(
        { _id: parkingLot._id, 'slots.code': bookingDetails.spotNumber },
        { $set: { 'slots.$.status': 'reserved' } }
      );
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

    // Determine payment/booking status (dev simulate support)
    const devAutoPay = (
      String(process.env.ALLOW_DEV_AUTO_PAYMENT || '').toLowerCase() === 'true' ||
      (payment && (payment.simulate === true || payment.devSimulate === true))
    );
    const paymentStatus = devAutoPay ? 'completed' : 'pending';
    const bookingStatus = devAutoPay ? 'confirmed' : 'pending';

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
        status: paymentStatus,
        paidAt: devAutoPay ? new Date() : undefined
      },
      status: bookingStatus
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

    // Send booking confirmation email (don't await to avoid blocking response)
    try {
      await sendBookingConfirmation(req.user.email, populatedBooking);
    } catch (emailError) {
      console.error('Booking confirmation email error:', emailError);
      // Don't fail booking if email fails
    }

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
        message: error?.message || 'Server error creating booking',
        error: (typeof error === 'object' && error !== null) ? (error.stack || error) : error
      });
  }
});

// @desc    Get current user's bookings (simplified for UI)
// @route   GET /api/booking/my
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('parkingLot', 'name location pricing')
      .sort({ createdAt: -1 })
      .limit(100);

    const mapped = bookings.map(b => ({
      id: b._id.toString(),
      lotId: b.parkingLot?._id?.toString(),
      lotName: b.parkingLot?.name,
      address: b.parkingLot?.location?.address?.city || '',
      slotType: b.vehicle?.type || 'car',
      slotNumber: b.bookingDetails?.spotNumber || '—',
      startTime: b.bookingDetails?.startTime,
      endTime: b.bookingDetails?.endTime,
      createdAt: b.createdAt,
      status: b.status,
      paymentStatus: b.payment?.status || 'pending',
      totalAmount: b.pricing?.totalAmount || 0,
      qrCode: b.qrCode?.data || '',
      services: (b.services || []).map(s => s.name || s.serviceId?.toString())
    }));

    return res.status(200).json({ success:true, data: mapped });
  } catch (err) {
    console.error('Get my bookings error:', err);
    res.status(500).json({ success:false, message:'Error fetching bookings' });
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
