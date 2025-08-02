const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: [
      'car-wash', 'maintenance', 'fuel', 'food-beverage', 
      'valet', 'charging', 'insurance', 'emergency'
    ],
    required: true
  },
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR'
    },
    unit: {
      type: String,
      enum: ['per-service', 'per-hour', 'per-item'],
      default: 'per-service'
    }
  },
  provider: {
    name: String,
    contact: {
      phone: String,
      email: String
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      count: {
        type: Number,
        default: 0
      }
    }
  },
  availability: {
    isActive: {
      type: Boolean,
      default: true
    },
    operatingHours: {
      start: String,
      end: String,
      is24Hours: Boolean
    },
    daysAvailable: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  // Service-specific details
  details: {
    duration: {
      estimated: Number, // in minutes
      maximum: Number
    },
    requirements: [String],
    includes: [String],
    excludes: [String],
    vehicleTypes: [{
      type: String,
      enum: ['car', 'bike', 'truck', 'van', 'bicycle']
    }]
  },
  images: [{
    url: String,
    caption: String
  }],
  // Location-specific availability
  availableAt: [{
    parkingLot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLot'
    },
    customPricing: Number,
    isActive: Boolean
  }],
  // Booking statistics
  stats: {
    totalBookings: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
serviceSchema.index({ category: 1 });
serviceSchema.index({ 'availability.isActive': 1 });
serviceSchema.index({ 'provider.rating.average': -1 });

// Calculate average rating
serviceSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.provider.rating.average * this.provider.rating.count;
  this.provider.rating.count += 1;
  this.provider.rating.average = (currentTotal + newRating) / this.provider.rating.count;
  return this.save();
};

// Check availability at specific parking lot
serviceSchema.methods.isAvailableAt = function(parkingLotId) {
  if (!this.availability.isActive) return false;
  
  const lotAvailability = this.availableAt.find(
    loc => loc.parkingLot.toString() === parkingLotId.toString()
  );
  
  return lotAvailability ? lotAvailability.isActive : false;
};

// Get price for specific parking lot
serviceSchema.methods.getPriceFor = function(parkingLotId) {
  const lotAvailability = this.availableAt.find(
    loc => loc.parkingLot.toString() === parkingLotId.toString()
  );
  
  return lotAvailability && lotAvailability.customPricing 
    ? lotAvailability.customPricing 
    : this.pricing.basePrice;
};

module.exports = mongoose.model('Service', serviceSchema);
