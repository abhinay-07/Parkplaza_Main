const mongoose = require('mongoose');

const parkingLotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Parking lot name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    },
    address: {
      street: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: String,
      country: { type: String, default: 'India' }
    },
    landmarks: [String]
  },
  capacity: {
    total: {
      type: Number,
      required: [true, 'Total capacity is required'],
      min: [1, 'Capacity must be at least 1']
    },
    available: {
      type: Number,
      required: true
    },
    reserved: {
      type: Number,
      default: 0
    }
  },
  vehicleTypes: [{
    type: String,
    enum: ['car', 'bike', 'truck', 'van', 'bicycle'],
    default: ['car']
  }],
  pricing: {
    hourly: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      min: [0, 'Price cannot be negative']
    },
    daily: Number,
    monthly: Number,
    currency: {
      type: String,
      default: 'INR'
    }
  },
  amenities: [{
    type: String,
    enum: [
      'covered', 'security', 'cctv', 'lighting', 'washroom', 
      'food-court', 'ev-charging', 'wheelchair-accessible',
      'car-wash', 'valet-service', 'wifi'
    ]
  }],
  operatingHours: {
    monday: { open: String, close: String, is24Hours: Boolean },
    tuesday: { open: String, close: String, is24Hours: Boolean },
    wednesday: { open: String, close: String, is24Hours: Boolean },
    thursday: { open: String, close: String, is24Hours: Boolean },
    friday: { open: String, close: String, is24Hours: Boolean },
    saturday: { open: String, close: String, is24Hours: Boolean },
    sunday: { open: String, close: String, is24Hours: Boolean }
  },
  images: [{
    url: String,
    caption: String,
    isPrimary: Boolean
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'full'],
    default: 'active'
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
  },
  // Real-time tracking
  liveStatus: {
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    occupancyRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  // Analytics
  totalBookings: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: String,
    url: String
  }],
  // Physical slot layout (optional for 3D selection)
  slots: [{
    code: { type: String }, // e.g., L1-A-01
    type: { type: String, enum: ['car','bike','truck','van','bicycle'], default: 'car' },
    level: { type: Number, default: 1 },
    status: { type: String, enum: ['available','reserved','occupied','maintenance'], default: 'available' },
    position: { // For 3D rendering (arbitrary units)
      x: Number,
      y: Number, // height (level offset)
      z: Number
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
parkingLotSchema.index({ 'location.coordinates': '2dsphere' });
parkingLotSchema.index({ status: 1 });
parkingLotSchema.index({ 'capacity.available': 1 });
parkingLotSchema.index({ owner: 1 });
parkingLotSchema.index({ 'slots.status': 1 });

// Update availability when booking is made
parkingLotSchema.methods.updateAvailability = function(change) {
  this.capacity.available += change;
  this.capacity.reserved -= change;
  this.liveStatus.lastUpdated = new Date();
  this.liveStatus.occupancyRate = 
    ((this.capacity.total - this.capacity.available) / this.capacity.total) * 100;
  return this.save();
};

// Check if lot is open at given time
parkingLotSchema.methods.isOpenAt = function(day, time) {
  const daySchedule = this.operatingHours[day.toLowerCase()];
  if (!daySchedule) return false;
  if (daySchedule.is24Hours) return true;
  
  // Convert time strings to comparable format
  const currentTime = new Date(`1970/01/01 ${time}`);
  const openTime = new Date(`1970/01/01 ${daySchedule.open}`);
  const closeTime = new Date(`1970/01/01 ${daySchedule.close}`);
  
  return currentTime >= openTime && currentTime <= closeTime;
};

// Generate a simple grid of slots (utility, not auto-run)
parkingLotSchema.methods.generateSlots = function({ levels = 1, rows = 5, cols = 10, type = 'car' } = {}) {
  const slots = [];
  const pad = (n) => String(n).padStart(2,'0');
  for (let l = 1; l <= levels; l++) {
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        slots.push({
          code: `L${l}-R${pad(r)}-C${pad(c)}`,
          type,
          level: l,
          status: 'available',
          position: {
            x: c * 2,
            y: (l - 1) * 5,
            z: r * 4
          }
        });
      }
    }
  }
  this.slots = slots;
  return this.save();
};

module.exports = mongoose.model('ParkingLot', parkingLotSchema);
