/*
CLI: Import nearby parking places from Google Places into ParkingLot collection.

Usage (PowerShell on Windows):
  $env:GOOGLE_MAPS_API_KEY="<YOUR_KEY>"; $env:MONGODB_URI="mongodb://127.0.0.1:27017/parkplaza"; node scripts/importPlaces.js --lat 17.385 --lng 78.4867 --radius 2500 --limit 10 --owner owner@example.com

Notes:
- Requires GOOGLE_MAPS_API_KEY and MONGODB_URI env vars.
- Owner resolution: if --owner provided, must exist with role landowner/admin; else defaults to first landowner found or creates one.
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const minimist = require('minimist');
const https = require('https');
const { URL } = require('url');

const User = require('../models/User');
const ParkingLot = require('../models/ParkingLot');

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (resp) => {
  let data = ''; 
      resp.on('data', (c) => (data += c));
      resp.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Invalid JSON: ${e?.message || e}`)); }
      });
    });
    req.on('error', (err) => reject(new Error(err?.message || String(err))));
    req.end();
  });
}

// POST JSON helper used for Places API v1 calls
function postJson(url, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      method: 'POST',
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    };
    const req = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (c) => (data += c));
      resp.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Invalid JSON: ${e?.message || e}`)); }
      });
    });
    req.on('error', (err) => reject(new Error(err?.message || String(err))));
    req.write(JSON.stringify(bodyObj || {}));
    req.end();
  });
}

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

// For Places API v1, we can rely on searchNearby fields; details fetch is optional and not used here.

(async function main() {
  const argv = minimist(process.argv.slice(2));
  const lat = parseFloat(argv.lat);
  const lng = parseFloat(argv.lng);
  const radius = parseInt(argv.radius || '2000', 10); 
  const limit = parseInt(argv.limit || '10', 10);
  const ownerEmail = argv.owner;

  const key = process.env.GOOGLE_MAPS_API_KEY;
  const mongoUri = process.env.MONGODB_URI;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY env not set');
  if (!mongoUri) throw new Error('MONGODB_URI env not set');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('--lat and --lng are required');

  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[import] Connected to MongoDB');

  let owner;
  if (ownerEmail) {
    owner = await User.findOne({ email: String(ownerEmail).toLowerCase() });
    if (!owner) throw new Error(`Owner not found: ${ownerEmail}`);
    if (!['landowner','admin'].includes(owner.role)) throw new Error('Owner must have landowner/admin role');
  } else {
    owner = await User.findOne({ role: 'landowner' });
    if (!owner) {
      owner = await User.create({ name: 'Default Owner', email: 'owner@example.com', password: 'Password123', phone: '+910000000002', role: 'landowner', isVerified: true });
      console.log('[import] Created default landowner owner@example.com / Password123');
    }
  }

  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.rating',
    'places.userRatingCount'
  ].join(',');
  const headers = { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fieldMask };
  const body = {
    includedTypes: ['parking'],
    maxResultCount: Math.min(20, limit),
    locationRestriction: {
      circle: { center: { latitude: lat, longitude: lng }, radius }
    }
  };
  const nearby = await postJson('https://places.googleapis.com/v1/places:searchNearby', headers, body);
  if (nearby?.error) {
    throw new Error(`Places Nearby error: ${nearby.error.status} ${nearby.error.message || ''}`);
  }
  const results = Array.isArray(nearby?.places) ? nearby.places : [];

  const created = []; const updated = []; const skipped = [];
  for (const r of results) {
    try {
      const loc = r?.location || null;
      if (!loc) { skipped.push({ name: r?.displayName?.text || 'Unnamed', reason: 'no-geometry' }); continue; }
      const addr = { city: 'Unknown', state: 'Unknown', country: 'India' };
      const totalCap = Math.max(20, Math.round((r.userRatingCount || 50) / 2));
      const available = Math.max(0, Math.round(totalCap * 0.85));
      const amenitiesPool = ['covered','security','cctv','lighting','washroom','ev-charging','car-wash','valet-service'];
      const amenities = amenitiesPool.filter(() => Math.random() > 0.5).slice(0, 5);
      const hourly = 30 + Math.round((r.rating || 3.5) * 10);

      const existing = await ParkingLot.findOne({ name: (r?.displayName?.text || 'Unnamed Parking'), 'location.coordinates': { $near: { $geometry: { type: 'Point', coordinates: [loc.longitude, loc.latitude] }, $maxDistance: 25 } } });
      const doc = {
        name: r?.displayName?.text || 'Unnamed Parking', 
        description: r?.formattedAddress || 'Imported from Google Places',
        owner: owner._id,
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
        operatingHours: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].reduce((a,d)=>{a[d]={open:'06:00',close:'23:00',is24Hours:false};return a;},{}),
        rating: { average: r.rating || 0, count: r.userRatingCount || 0 },
        status: 'active'
      };

      if (existing) {
        existing.description = doc.description;
        existing.capacity = doc.capacity;
        existing.pricing = doc.pricing;
        existing.amenities = doc.amenities;
        existing.rating = doc.rating;
        await existing.save();
        updated.push(existing._id.toString());
      } else {
        const createdLot = await ParkingLot.create(doc);
        try { await createdLot.generateSlots({ levels: 1, rows: 5, cols: 10, type: 'car' }); } catch {}
        created.push(createdLot._id.toString());
      }
    } catch (e) {
      skipped.push({ name: r?.displayName?.text || 'Unknown', error: e.message || String(e) });
    }
  }

  console.log('[import] Done', { created: created.length, updated: updated.length, skipped: skipped.length });
  await mongoose.disconnect();
  process.exit(0);
})().catch(async (e) => { console.error('[import] Error', e); try { await mongoose.disconnect(); } catch {} process.exit(1); });
