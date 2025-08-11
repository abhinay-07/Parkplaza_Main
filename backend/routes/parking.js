const express = require('express');
const multer = require('multer');
const { body, query, validationResult } = require('express-validator');
const ParkingLot = require('../models/ParkingLot');
const Booking = require('../models/Booking');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');
const { uploadImage, deleteImage } = require('../config/cloudinary');

const router = express.Router();

// In-memory cache to speed up repeated OSM (Overpass) queries
const OSM_CACHE = new Map();
const OSM_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

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

// --- Development seeding: create random lots near a location ---
// Helpers for seeding
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomSubset(arr, minCount = 1, maxCount = arr.length) {
  const count = randomInt(minCount, Math.min(maxCount, arr.length));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
// Displace lat/lng by distance (meters) and bearing (radians)
function displaceLatLng(lat, lng, distanceMeters, bearingRad) {
  const R = 6378137; // Earth radius (m)
  const dByR = distanceMeters / R;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearingRad)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(dByR) * Math.cos(lat1),
    Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2)
  );
  return { lat: (lat2 * 180) / Math.PI, lng: ((lng2 * 180) / Math.PI) };
}

// @desc    Seed N random parking lots near a coordinate with default services (DEV ONLY)
// @route   POST /api/parking/seed/random
// @access  Private (Admin/Landowner)
router.post('/seed/random', protect, authorize('admin', 'landowner'), async (req, res) => {
  try {
    const {
      lat, lng,
      count = 10,
      radiusMeters = 2000,
      ownerEmail
    } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const User = require('../models/User');
    const Service = require('../models/Service');

    // Resolve owner
    let ownerId = req.user._id;
    if (ownerEmail && req.user.role === 'admin') {
      const ownerUser = await User.findOne({ email: ownerEmail.toLowerCase() });
      if (ownerUser) ownerId = ownerUser._id;
    }

    // Name parts for randomization
    const prefixes = ['Dev', 'Prime', 'Metro', 'Central', 'City', 'Skyline', 'Urban', 'Easy', 'Smart', 'Nova'];
    const suffixes = ['Parking', 'Park & Ride', 'Auto Park', 'Plaza Parking', 'Secure Park', 'Hub Parking', 'Garage', 'Lot'];
    const descriptors = ['North', 'South', 'East', 'West', 'Heights', 'Square', 'Center', 'Garden', 'Point', 'Vista'];

    const amenitiesList = ['covered', 'security', 'cctv', 'lighting', 'washroom', 'ev-charging', 'car-wash', 'valet-service', 'wifi'];
    const vehicleTypeOptions = ['car', 'bike', 'van'];

    const createdLots = [];

    for (let i = 0; i < parseInt(count); i++) {
      const distance = Math.random() * parseInt(radiusMeters);
      const bearing = Math.random() * Math.PI * 2;
      const { lat: nlat, lng: nlng } = displaceLatLng(parseFloat(lat), parseFloat(lng), distance, bearing);

      const totalCapacity = randomInt(60, 220);
      const hourly = randomInt(20, 120);

      const name = `${randomChoice(prefixes)} ${randomChoice(descriptors)} ${randomChoice(suffixes)}`;

      const lot = await ParkingLot.create({
        name,
        description: 'Development sample parking location with generated data.',
        owner: ownerId,
        location: {
          type: 'Point',
          coordinates: [nlng, nlat],
          address: {
            street: `${randomInt(1, 150)} ${randomChoice(['Main Rd', '2nd Ave', 'Tech Park Rd', 'Market St'])}`,
            city: 'Dev City',
            state: 'Dev State',
            country: 'India'
          },
          landmarks: [randomChoice(['Mall', 'Metro', 'Hospital', 'IT Park', 'Stadium'])]
        },
        capacity: { total: totalCapacity, available: totalCapacity, reserved: 0 },
        vehicleTypes: randomSubset(vehicleTypeOptions, 1, vehicleTypeOptions.length),
        pricing: { hourly, daily: hourly * 6, currency: 'INR' },
        amenities: randomSubset(amenitiesList, 3, 7),
        operatingHours: {
          monday: { open: '06:00', close: '23:00', is24Hours: false },
          tuesday: { open: '06:00', close: '23:00', is24Hours: false },
          wednesday: { open: '06:00', close: '23:00', is24Hours: false },
          thursday: { open: '06:00', close: '23:00', is24Hours: false },
          friday: { open: '06:00', close: '23:00', is24Hours: false },
          saturday: { open: '08:00', close: '23:00', is24Hours: false },
          sunday: { open: '08:00', close: '22:00', is24Hours: false }
        },
        images: []
      });

      // Generate a rough slot grid near capacity
      try {
        const levels = randomInt(1, 2);
        const approxPerLevel = Math.max(10, Math.floor(totalCapacity / levels));
        const cols = Math.max(8, Math.min(16, Math.floor(Math.sqrt(approxPerLevel)) + randomInt(0, 2)));
        const rows = Math.max(5, Math.floor(approxPerLevel / cols) + randomInt(0, 2));
        await lot.generateSlots({ levels, rows, cols, type: 'car' });
      } catch (e) {
        // non-fatal for seeding
      }

      // Create 3-4 default services per lot
      const serviceDefs = [
        {
          name: 'Premium Car Wash', category: 'car-wash', unit: 'per-service', base: randomInt(299, 599),
          provider: { name: 'ShinePro', phone: '+9111000001' }, details: { includes: ['Exterior', 'Interior'] }
        },
        {
          name: 'EV Fast Charging', category: 'charging', unit: 'per-hour', base: randomInt(20, 40),
          provider: { name: 'ChargeNet', phone: '+9111000002' }, details: { } 
        },
        {
          name: 'Valet Parking', category: 'valet', unit: 'per-hour', base: randomInt(99, 199),
          provider: { name: 'Prestige Valet', phone: '+9111000003' }, details: { }
        },
        {
          name: 'Basic Maintenance', category: 'maintenance', unit: 'per-service', base: randomInt(199, 399),
          provider: { name: 'AutoCare', phone: '+9111000004' }, details: { includes: ['Oil top-up', 'Tire air'] }
        }
      ];

      const useServices = randomSubset(serviceDefs, 3, 4);
      for (const s of useServices) {
        await Service.create({
          name: s.name,
          description: `${s.name} available at this location`,
          category: s.category,
          pricing: { basePrice: s.base, currency: 'INR', unit: s.unit },
          provider: { name: s.provider.name, contact: { phone: s.provider.phone }, rating: { average: randomInt(35, 48) / 10, count: randomInt(10, 200) } },
          availability: { isActive: true, operatingHours: { start: '07:00', end: '22:00', is24Hours: false }, daysAvailable: ['monday','tuesday','wednesday','thursday','friday','saturday'] },
          details: { vehicleTypes: ['car'], includes: s.details.includes || [] },
          availableAt: [{ parkingLot: lot._id, customPricing: undefined, isActive: true }]
        });
      }

      createdLots.push(lot);
    }

    res.status(201).json({
      success: true,
      message: `Seeded ${createdLots.length} development parking lots`,
      data: {
        lots: createdLots.map(l => ({
          id: l._id,
          name: l.name,
          lat: l.location.coordinates[1],
          lng: l.location.coordinates[0],
          capacity: l.capacity,
          pricing: l.pricing
        }))
      }
    });
  } catch (error) {
    console.error('Seed random lots error:', error);
    res.status(500).json({ success: false, message: 'Server error seeding random lots' });
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

// @desc    Import nearby parking from OpenStreetMap (Overpass API) into ParkingLot collection
// @route   POST /api/parking/import/osm
// @access  Private (admin or landowner)
// Query: lat,lng (required), radiusMeters (optional, default 2000), limit (1-50, default 10), ownerEmail (admin only), mirror (de|kumi|ru), mode (nodes|all)
router.post('/import/osm', protect, authorize('admin', 'landowner'), [
  query('lat').isFloat().withMessage('Latitude required'),
  query('lng').isFloat().withMessage('Longitude required'),
  query('radiusMeters').optional().isInt({ min: 100, max: 50000 }).withMessage('radiusMeters 100-50000'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit 1-50'),
  query('ownerEmail').optional().isString(),
  query('mirror').optional().isString(),
  query('mode').optional().isIn(['nodes','all']).withMessage('mode must be nodes or all')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusMeters = parseInt(req.query.radiusMeters || '2000', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const ownerEmail = req.query.ownerEmail ? String(req.query.ownerEmail).toLowerCase() : undefined;
    const mirror = String(req.query.mirror || 'kumi');
    const mode = String(req.query.mode || 'nodes');

    // Resolve owner: landowner uses self; admin can specify ownerEmail or fallback to any landowner
    let owner = null;
    if (req.user.role === 'landowner') {
      owner = req.user;
    } else if (req.user.role === 'admin') {
      if (ownerEmail) {
        owner = await require('../models/User').findOne({ email: ownerEmail });
        if (!owner) return res.status(404).json({ success: false, message: `Owner not found: ${ownerEmail}` });
      } else {
        owner = await require('../models/User').findOne({ role: 'landowner' });
        if (!owner) owner = req.user; // fallback to admin
      }
    }

    // Build Overpass QL query (limit at source)
    const qCore = mode === 'all'
      ? `nwr(around:${radiusMeters},${lat},${lng})["amenity"="parking"];`
      : `node(around:${radiusMeters},${lat},${lng})["amenity"="parking"];`;
    const queryQL = `
      [out:json][timeout:25];
      ${qCore}
      out center ${Math.min(limit, 50)};
    `;

    // Overpass POST with timeout and mirror fallback
    const https = require('https');
    const { URL } = require('url');
    const mirrorMap = {
      de: 'https://overpass-api.de/api/interpreter',
      kumi: 'https://overpass.kumi.systems/api/interpreter',
      ru: 'https://overpass.openstreetmap.ru/api/interpreter',
    };
    const overpassUrlPrimary = mirrorMap[mirror] || mirrorMap.kumi;
    const overpassUrlAlt = overpassUrlPrimary === mirrorMap.kumi ? mirrorMap.de : mirrorMap.kumi;

    const postFormWithTimeout = (url, formData, timeoutMs = 7000) => new Promise((resolve, reject) => {
      const u = new URL(url);
      const opts = { method: 'POST', hostname: u.hostname, path: u.pathname + (u.search || ''), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };
      const reqp = https.request(opts, (resp) => {
        let data = '';
        resp.on('data', (c) => (data += c));
        resp.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Invalid JSON from Overpass: ${e?.message || e}`)); }
        });
      });
      reqp.on('error', (err) => reject(new Error(err?.message || String(err))));
      reqp.setTimeout(timeoutMs, () => { reqp.destroy(new Error('Overpass request timeout')); });
      reqp.write('data=' + encodeURIComponent(formData));
      reqp.end();
    });

    // Simple cache to avoid repeated Overpass hits for same area
    const cacheKey = `${mode}|${Math.round(lat*10000)},${Math.round(lng*10000)}|${radiusMeters}|${Math.min(limit,50)}`;
    let elements;
    const cached = OSM_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < OSM_CACHE_TTL_MS) {
      elements = cached.data;
    } else {
      let overpass;
      try {
        overpass = await postFormWithTimeout(overpassUrlPrimary, queryQL, 7000);
      } catch (e1) {
        console.warn('Overpass primary mirror failed or timed out:', e1?.message || e1);
        try {
          overpass = await postFormWithTimeout(overpassUrlAlt, queryQL, 7000);
        } catch (e2) {
          console.error('Overpass alt mirror failed:', e2?.message || e2);
          return res.status(504).json({ success: false, message: 'OSM import timed out', details: e2?.message || String(e2) });
        }
      }
      elements = Array.isArray(overpass?.elements) ? overpass.elements : [];
      OSM_CACHE.set(cacheKey, { ts: Date.now(), data: elements });
    }

    if (!elements.length) {
      return res.status(200).json({ success: true, message: 'No OSM parking found in area', data: { createdCount: 0, updatedCount: 0, skippedCount: 0 } });
    }

    // Persist to DB
    const ParkingLot = require('../models/ParkingLot');
    const toProcess = elements.slice(0, limit);
    const created = []; const updated = []; const skipped = [];
    for (const el of toProcess) {
      try {
        const tags = el.tags || {};
        const center = el.center || (el.type === 'node' ? { lat: el.lat, lon: el.lon } : null);
        if (!center || typeof center.lat !== 'number' || typeof center.lon !== 'number') { skipped.push({ id: el.id, reason: 'no-center' }); continue; }

        const name = tags.name || 'Parking (OSM)';
        const totalCap = Math.max(20, parseInt(tags.capacity || '0', 10) || (tags.parking === 'multi-storey' ? 120 : tags.parking === 'underground' ? 100 : 60));
        const available = Math.max(0, Math.round(totalCap * 0.85));

        const amenityFlags = {
          covered: tags.covered === 'yes' || tags.parking === 'multi-storey' || tags.parking === 'underground',
          security: tags.surveillance === 'yes',
          cctv: tags.surveillance === 'yes',
          lighting: tags.lit === 'yes',
          washroom: tags.toilets === 'yes',
          'ev-charging': tags.charging === 'yes' || tags['charging_station'] === 'yes'
        };
        const amenities = Object.entries(amenityFlags).filter(([k,v]) => v).map(([k]) => k);

        const hourly = 20 + (amenityFlags.covered ? 10 : 0) + (amenityFlags.security ? 10 : 0) + (amenityFlags['ev-charging'] ? 10 : 0);

        const existing = await ParkingLot.findOne({ name, 'location.coordinates': { $near: { $geometry: { type: 'Point', coordinates: [center.lon, center.lat] }, $maxDistance: 25 } } });
        const doc = {
          name,
          description: tags.operator ? `Operated by ${tags.operator}` : 'Imported from OpenStreetMap',
          owner: owner._id,
          location: { type: 'Point', coordinates: [center.lon, center.lat], address: { street: '', city: 'Unknown', state: 'Unknown', zipCode: '', country: 'Unknown' }, landmarks: [] },
          capacity: { total: totalCap, available, reserved: totalCap - available },
          vehicleTypes: ['car'],
          pricing: { hourly, daily: hourly * 8, currency: 'INR' },
          amenities,
          operatingHours: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].reduce((a,d)=>{a[d]={open:'06:00',close:'23:00',is24Hours:false};return a;},{}),
          rating: { average: 0, count: 0 },
          status: 'active'
        };

        if (existing) { existing.description = doc.description; existing.capacity = doc.capacity; existing.pricing = doc.pricing; existing.amenities = doc.amenities; await existing.save(); updated.push(existing._id.toString()); }
        else { const createdLot = await ParkingLot.create(doc); try { await createdLot.generateSlots({ levels: 1, rows: 5, cols: 10, type: 'car' }); } catch {} created.push(createdLot._id.toString()); }
      } catch (e) { skipped.push({ id: el.id, error: e.message || String(e) }); }
    }

    return res.status(200).json({ success: true, message: 'OSM import complete', data: { createdCount: created.length, updatedCount: updated.length, skippedCount: skipped.length, created, updated, skipped } });
  } catch (error) {
    console.error('OSM import error:', error);
    return res.status(500).json({ success: false, message: 'OSM import failed', details: error.message || String(error) });
  }
});
// @desc    Get nearby parking lots
// @route   GET /api/parking/nearby
// @access  Public (auth optional)
router.get('/nearby', [
  query('lat').isFloat().withMessage('Latitude required'),
  query('lng').isFloat().withMessage('Longitude required'),
  query('radius').optional().isInt({ min: 1, max: 100 }).withMessage('radius (km) must be 1-100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success:false, message:'Validation failed', errors: errors.array() });
    }

    const { lat, lng } = req.query;
    const radius = parseInt(req.query.radius || '5', 10); // km

    const lots = await ParkingLot.aggregate([
      { $geoNear: {
          near: { type:'Point', coordinates:[parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distance',
          maxDistance: radius * 1000,
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

// --- Import nearby parking places from Google Places and persist to DB ---
// @desc    Import Google Places (type=parking) into ParkingLot collection
// @route   POST /api/parking/import/places
// @access  Private (admin or landowner)
// Query: lat,lng (required), radiusMeters (optional, default 2000), limit (1-20, default 10), ownerEmail (admin only)
router.post('/import/places', protect, authorize('admin', 'landowner'), [
  query('lat').isFloat().withMessage('Latitude required'),
  query('lng').isFloat().withMessage('Longitude required'),
  query('radiusMeters').optional().isInt({ min: 100, max: 50000 }).withMessage('radiusMeters 100-50000'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('limit 1-20'),
  query('ownerEmail').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success:false, message:'Validation failed', errors: errors.array() });
    }

    const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_KEY) {
      return res.status(500).json({ success:false, message:'Server is missing GOOGLE_MAPS_API_KEY' });
    }

    const { lat, lng } = req.query;
    const radiusMeters = parseInt(req.query.radiusMeters || '2000', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const ownerEmail = req.query.ownerEmail;

    // Resolve owner: admin can assign by email; landowner defaults to self
    let ownerId = req.user._id;
    if (req.user.role === 'admin' && ownerEmail) {
      const User = require('../models/User');
      const ownerDoc = await User.findOne({ email: ownerEmail.toLowerCase() });
      if (!ownerDoc) return res.status(404).json({ success:false, message:`Owner with email ${ownerEmail} not found` });
      if (!['landowner','admin'].includes(ownerDoc.role)) return res.status(400).json({ success:false, message:'Owner must be landowner/admin role' });
      ownerId = ownerDoc._id;
    }

    // Minimal HTTPS helpers without extra deps
    const https = require('https');
    function postJson(url, headers, bodyObj) {
      return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
          method: 'POST',
          hostname: u.hostname,
          path: u.pathname + (u.search || ''),
          headers: { 'Content-Type': 'application/json', ...headers },
        };
        const req = https.request(options, (resp) => {
          let data = '';
          resp.on('data', (chunk) => { data += chunk; });
          resp.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Invalid JSON from ${url}: ${e?.message || e}`)); }
          });
        });
        req.on('error', (err) => reject(new Error(err?.message || String(err))));
        req.write(JSON.stringify(bodyObj || {}));
        req.end();
      });
    }

    // Places API (New) v1: searchNearby
    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.rating',
      'places.userRatingCount'
    ].join(',');
    const headers = { 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': fieldMask };
    const body = {
      includedTypes: ['parking'],
      maxResultCount: Math.min(20, limit),
      locationRestriction: {
        circle: {
          center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
          radius: parseFloat(radiusMeters)
        }
      }
    };
    const nearby = await postJson('https://places.googleapis.com/v1/places:searchNearby', headers, body);
    if (nearby.error) {
      return res.status(502).json({ success:false, message:`Places Nearby error: ${nearby.error.status}`, details: nearby.error.message });
    }
    let results = Array.isArray(nearby.places) ? nearby.places : [];

    // Fallback: if Nearby returns 0, try Text Search with location bias
    if (!results.length) {
      try {
        const textBody = {
          textQuery: 'parking',
          pageSize: Math.min(20, limit),
          locationBias: {
            circle: {
              center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
              radius: parseFloat(radiusMeters)
            }
          }
        };
        const textRes = await postJson('https://places.googleapis.com/v1/places:searchText', headers, textBody);
        if (!textRes.error) {
          const textPlaces = Array.isArray(textRes.places) ? textRes.places : [];
          if (textPlaces.length) {
            results = textPlaces;
          }
        }
      } catch (e) {
        // Silent fallback failure; keep results empty
        console.warn('Places Text Search fallback failed:', e?.message || e);
      }
    }
    const created = []; const updated = []; const skipped = [];

    // Helper to extract city/state from address_components
    function extractAddressComponents(components = []) {
      const get = (type) => {
        const comp = components.find(c => (c.types || []).includes(type));
        return comp ? comp.long_name : undefined;
      };
      const city = get('locality') || get('sublocality_level_1') || get('administrative_area_level_2') || 'Unknown';
      const state = get('administrative_area_level_1') || 'Unknown';
      const country = get('country') || 'India';
      const postal = get('postal_code');
      return { city, state, country, zipCode: postal };
    }

  // We already requested needed fields; if more needed, we could call v1 details.

  for (const r of results) {
      try {
        const placeId = r.id;
        const name = r?.displayName?.text || 'Unnamed Parking';
        const loc = r?.location || null;
        if (!loc) { skipped.push({ placeId, reason: 'no-geometry' }); continue; }
        const existing = await ParkingLot.findOne({ 'location.coordinates': { $near: { $geometry: { type: 'Point', coordinates: [loc.longitude, loc.latitude] }, $maxDistance: 15 } }, name });
        const addr = extractAddressComponents([]); // fallback until details needed
        const totalCap = Math.max(20, Math.round((r.userRatingCount || 50) / 2));
        const available = Math.max(0, Math.round(totalCap * 0.85));
        const amenitiesPool = ['covered','security','cctv','lighting','washroom','ev-charging','car-wash','valet-service'];
        const amenities = amenitiesPool.filter(() => Math.random() > 0.5).slice(0, 5);
        const hourly = 30 + Math.round((r.rating || 3.5) * 10); // simplistic pricing heuristic
        const operatingHours = (() => {
          const oh = {};
          const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
          for (const d of days) oh[d] = { open: '06:00', close: '23:00', is24Hours: false };
          return oh;
        })();

        const doc = {
          name,
          description: r?.formattedAddress || 'Imported from Google Places',
          owner: ownerId,
          location: {
            type: 'Point',
            coordinates: [loc.longitude, loc.latitude],
            address: {
              street: '',
              city: addr.city,
              state: addr.state,
              zipCode: addr.zipCode,
              country: addr.country
            },
            landmarks: []
          },
          capacity: { total: totalCap, available, reserved: totalCap - available },
          vehicleTypes: ['car'],
          pricing: { hourly, daily: hourly * 8, currency: 'INR' },
          amenities,
          operatingHours,
          rating: { average: r.rating || 0, count: r.userRatingCount || 0 },
          status: 'active'
        };

        if (existing) {
          // Update selected mutable fields
          existing.description = doc.description;
          existing.capacity = doc.capacity;
          existing.pricing = doc.pricing;
          existing.amenities = doc.amenities;
          existing.rating = doc.rating;
          await existing.save();
          updated.push({ id: existing._id, name });
        } else {
          const createdLot = await ParkingLot.create(doc);
          // Optionally generate a simple slot layout
          try { await createdLot.generateSlots({ levels: 1, rows: 5, cols: 10, type: 'car' }); } catch (e) { console.warn('generateSlots failed:', e?.message || e); }
          created.push({ id: createdLot._id, name });
        }
      } catch (e) {
        skipped.push({ error: e.message || String(e), name: r?.name });
      }
    }

    return res.status(200).json({ success:true, message:'Import complete', data: { createdCount: created.length, updatedCount: updated.length, skippedCount: skipped.length, created, updated, skipped } });
  } catch (error) {
    console.error('Import places error:', error);
    res.status(500).json({ success:false, message:'Server error importing places' });
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
