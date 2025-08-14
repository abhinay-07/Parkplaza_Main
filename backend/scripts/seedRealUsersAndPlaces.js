/*
Creates real users (admin, 3 landowners, 3 users with @gmail.com) and optionally imports ~10 nearby parking places
using Google Places around a provided lat/lng. Safe for dev usage.

Usage (PowerShell):
  $env:MONGODB_URI="mongodb://127.0.0.1:27017/parkplaza"; $env:GOOGLE_MAPS_API_KEY="<KEY>"; node scripts/seedRealUsersAndPlaces.js --lat 17.385 --lng 78.4867 --import 1
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const minimist = require('minimist');
const https = require('https');

const User = require('../models/User');
const ParkingLot = require('../models/ParkingLot');

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (resp) => {
      let data = '';
      resp.on('data', (c) => (data += c));
      resp.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Invalid JSON: ${e?.message || e}`)); } });
    });
    req.on('error', (err) => reject(new Error(err?.message || String(err))));
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

async function upsertUsers(resetPasswords = false) {
  const plainPassword = 'Password123';
  const users = [
    { name:'Admin', email:'admin@gmail.com', role:'admin', phone:'+910000000010' },
    { name:'Owner One', email:'owner1@gmail.com', role:'landowner', phone:'+910000000011' },
    { name:'Owner Two', email:'owner2@gmail.com', role:'landowner', phone:'+910000000012' },
    { name:'Owner Three', email:'owner3@gmail.com', role:'landowner', phone:'+910000000013' },
    { name:'User One', email:'user1@gmail.com', role:'user', phone:'+910000000021' },
    { name:'User Two', email:'user2@gmail.com', role:'user', phone:'+910000000022' },
    { name:'User Three', email:'user3@gmail.com', role:'user', phone:'+910000000023' }
  ];
  const results = [];
  for (const u of users) {
    const found = await User.findOne({ email: u.email }).select('+password');
    if (found) {
      if (resetPasswords) {
        found.password = plainPassword; // will trigger hashing via pre-save
        found.isVerified = true;
        await found.save();
        results.push({ email: u.email, id: found._id, action:'reset' });
      } else {
        results.push({ email: u.email, id: found._id, action:'exists' });
      }
      continue;
    }
    const created = await User.create({ ...u, isVerified:true, password: plainPassword });
    results.push({ email: u.email, id: created._id, action:'created' });
  }
  return results;
}

async function importPlacesAround(lat, lng, ownerEmail, limit = 10, radius = 2000) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY not set');
  const owner = await User.findOne({ email: ownerEmail });
  if (!owner) throw new Error(`Owner not found: ${ownerEmail}`);
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=parking&type=parking&location=${lat},${lng}&radius=${radius}&key=${encodeURIComponent(key)}`;
  const nearby = await getJson(url);
  if (nearby.status && nearby.status !== 'OK') throw new Error(`Places Nearby error: ${nearby.status}`);
  const results = (nearby.results || []).slice(0, limit);

  const detailsUrl = (placeId) => `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${encodeURIComponent('address_component,formatted_address,name,geometry')}&key=${encodeURIComponent(key)}`;
  const created = []; const updated = []; const skipped = [];
  for (const r of results) {
    try {
      const loc = r?.geometry?.location || null;
      if (!loc) { skipped.push({ name: r?.name, reason: 'no-geometry' }); continue; }
      const det = await getJson(detailsUrl(r.place_id));
      const addr = det?.result ? extractAddressComponents(det.result.address_components || []) : { city:'Unknown', state:'Unknown', country:'India' };
      const totalCap = Math.max(20, Math.round((r.user_ratings_total || 50) / 2));
      const available = Math.max(0, Math.round(totalCap * 0.85));
      const hourly = 30 + Math.round((r.rating || 3.5) * 10);
      const existing = await ParkingLot.findOne({ name: r.name, 'location.coordinates': { $near: { $geometry: { type:'Point', coordinates: [loc.lng, loc.lat] }, $maxDistance: 25 } } });
      const doc = {
        name: r.name,
        description: det?.result?.formatted_address || r?.vicinity || 'Imported from Google Places',
        owner: owner._id,
        location: { type:'Point', coordinates:[loc.lng, loc.lat], address: { street:(r?.vicinity||'').split(',')[0]||'', city:addr.city, state:addr.state, zipCode:addr.zipCode, country:addr.country }, landmarks: [] },
        capacity: { total: totalCap, available, reserved: totalCap - available },
        vehicleTypes: ['car'],
        pricing: { hourly, daily: hourly*8, currency:'INR' },
        amenities: ['covered','security','cctv','lighting','washroom','ev-charging'].filter(()=>Math.random()>0.5),
        operatingHours: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].reduce((a,d)=>{a[d]={open:'06:00',close:'23:00',is24Hours:false};return a;},{}),
        rating: { average: r.rating || 0, count: r.user_ratings_total || 0 },
        status: 'active'
      };
      if (existing) {
        existing.description = doc.description; existing.capacity = doc.capacity; existing.pricing = doc.pricing; existing.amenities = doc.amenities; existing.rating = doc.rating; await existing.save();
        updated.push(existing._id.toString());
      } else {
        const createdLot = await ParkingLot.create(doc);
        try { await createdLot.generateSlots({ levels:1, rows:5, cols:10, type:'car' }); } catch {}
        created.push(createdLot._id.toString());
      }
    } catch (e) {
      skipped.push({ name: r?.name, error: e?.message || String(e) });
    }
  }
  return { created, updated, skipped };
}

(async function run() {
  const argv = minimist(process.argv.slice(2));
  const lat = argv.lat ? parseFloat(argv.lat) : null;
  const lng = argv.lng ? parseFloat(argv.lng) : null;
  const reset = String(argv.reset || '0') === '1';
  const doImport = String(argv.import || '0') === '1';
  const mongo = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parkplaza';
  await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[seed-real] Connected to MongoDB');

  const users = await upsertUsers(reset);
  console.log('[seed-real] Users:', users);

  if (doImport && Number.isFinite(lat) && Number.isFinite(lng)) {
    const res = await importPlacesAround(lat, lng, 'owner1@gmail.com', 10, 2000);
    console.log('[seed-real] Places imported:', { created: res.created.length, updated: res.updated.length, skipped: res.skipped.length });
  } else {
    console.log('[seed-real] Skipping Places import (pass --import 1 --lat <v> --lng <v>)');
  }

  await mongoose.disconnect();
  console.log('[seed-real] Done');
  process.exit(0);
})().catch(async (e) => { console.error('[seed-real] Error', e); try { await mongoose.disconnect(); } catch {} process.exit(1); });
