const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parkingLot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingLot',
    required: true
  },
  vehicle: {
    type: {
      type: String,
      enum: ['car', 'bike', 'truck', 'van', 'bicycle'],
      required: true
    },
    licensePlate: {
      type: String,
      required: true,
      uppercase: true
    },
    model: String,
    color: String
  },
  bookingDetails: {
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    duration: {
      hours: Number,
      minutes: Number
    },
    spotNumber: String,
    floor: String
  },
  pricing: {
    basePrice: {
      type: Number,
      required: true
    },
    serviceFees: {
      type: Number,
      default: 0
    },
    taxes: {
      type: Number,
      default: 0
    },
    discounts: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  services: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    name: String,
    price: Number,
    quantity: {
      type: Number,
      default: 1
    }
  }],
  status: {
    type: String,
    enum: [
      'pending', 'confirmed', 'active', 'completed', 
      'cancelled', 'no-show', 'extended'
    ],
    default: 'pending'
  },
  payment: {
    method: {
      type: String,
      enum: ['card', 'upi', 'wallet', 'cash', 'razorpay', 'stripe'],
      required: true
    },
    transactionId: String,
    paymentId: String,
    orderId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: Date,
    refundAmount: Number,
    refundedAt: Date
  },
  // QR Code for entry/exit
  qrCode: {
    data: String,
    url: String,
    expiresAt: Date
  },
  // Entry/Exit tracking
  entryLog: {
    time: Date,
    gate: String,
    verifiedBy: String
  },
  exitLog: {
    time: Date,
    gate: String,
    verifiedBy: String,
    actualDuration: {
      hours: Number,
      minutes: Number
    },
    overtimeCharges: Number
  },
  // Rating and review
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    reviewDate: Date
  },
  // Notifications
  notifications: [{
    type: {
      type: String,
      enum: ['booking-confirmed', 'reminder', 'extension-offer', 'checkout-reminder']
    },
    message: String,
    sentAt: Date,
    channel: {
      type: String,
      enum: ['email', 'sms', 'push', 'in-app']
    }
  }],
  // Cancellation
  cancellation: {
    reason: String,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    refundEligible: Boolean,
    refundAmount: Number
  }
}, {
  timestamps: true
});

// Indexes
bookingSchema.index({ user: 1 });
bookingSchema.index({ parkingLot: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'bookingDetails.startTime': 1 });
bookingSchema.index({ 'bookingDetails.endTime': 1 });

// Calculate duration before saving
bookingSchema.pre('save', function(next) {
  if (this.bookingDetails.startTime && this.bookingDetails.endTime) {
    const duration = new Date(this.bookingDetails.endTime) - new Date(this.bookingDetails.startTime);
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    this.bookingDetails.duration = { hours, minutes };
  }
  next();
});

// Generate booking reference number
bookingSchema.methods.generateReference = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `PB${timestamp}${random}`.toUpperCase();
};

// Check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const startTime = new Date(this.bookingDetails.startTime);
  const timeDiff = startTime - now;
  
  // Can cancel if more than 1 hour before start time
  return timeDiff > (60 * 60 * 1000) && 
         ['pending', 'confirmed'].includes(this.status);
};

// Calculate refund amount
bookingSchema.methods.calculateRefund = function() {
  if (!this.canBeCancelled()) return 0;
  
  const now = new Date();
  const startTime = new Date(this.bookingDetails.startTime);
  const timeDiff = startTime - now;
  const hoursUntilStart = timeDiff / (1000 * 60 * 60);
  
  // Full refund if cancelled more than 24 hours before
  if (hoursUntilStart > 24) {
    return this.pricing.totalAmount;
  }
  // 50% refund if cancelled 1-24 hours before
  else if (hoursUntilStart > 1) {
    return this.pricing.totalAmount * 0.5;
  }
  
  return 0;
};

module.exports = mongoose.model('Booking', bookingSchema);
