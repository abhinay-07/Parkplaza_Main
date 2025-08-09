/*
 Seed script to populate development database with sample data:
 - Users (admin, landowner, regular user)
 - Parking lots
 - Services (some attached to parking lots)
 - Bookings (for user)

 Usage:
   MONGODB_URI=... node scripts/seedDatabase.js
 or npm run seed (if MONGODB_URI already in .env)

 Safety:
 - Won't run in production unless FORCE_SEED=1
 - Idempotent-ish: clears only created collections (NOT entire DB) unless CLEAR_ALL=1
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const ParkingLot = require('../models/ParkingLot');
const Service = require('../models/Service');
const Booking = require('../models/Booking');

async function connect() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parkplaza';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[seed] Connected to MongoDB');
}

function rand(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }

async function clearCollections() {
  if (process.env.CLEAR_ALL === '1') {
    await Promise.all([
      User.deleteMany({}),
      ParkingLot.deleteMany({}),
      Service.deleteMany({}),
      Booking.deleteMany({})
    ]);
    console.log('[seed] Cleared all documents');
  }
}

async function createUsers() {
  const existingAdmin = await User.findOne({ email: 'admin@example.com' }).select('+password');
  if (existingAdmin) {
    console.log('[seed] Users already exist; skipping user creation');
    return { admin: existingAdmin, owner: await User.findOne({ role: 'landowner' }), user: await User.findOne({ role: 'user', email: 'user@example.com' }) };
  }
  const passwordHash = await bcrypt.hash('Password123', 10);
  const [admin, owner, user] = await User.insertMany([
    { name:'Admin', email:'admin@example.com', password: passwordHash, phone:'+910000000001', role:'admin', isVerified:true },
    { name:'Lot Owner', email:'owner@example.com', password: passwordHash, phone:'+910000000002', role:'landowner', isVerified:true },
    { name:'Regular User', email:'user@example.com', password: passwordHash, phone:'+910000000003', role:'user', isVerified:true }
  ]);
  console.log('[seed] Created users (admin / owner / user)');
  return { admin, owner, user };
}

function buildOperatingHours(is24=false) {
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  return days.reduce((acc,d) => { acc[d] = is24 ? { is24Hours:true } : { open:'06:00', close:'23:00', is24Hours:false }; return acc; }, {});
}

async function createParkingLots(owner) {
  const existing = await ParkingLot.findOne();
  if (existing) {
    console.log('[seed] Parking lots already exist; skipping');
    return await ParkingLot.find();
  }
  const lotsData = [
    {
      name: 'Central Plaza Parking',
      description: 'Multi-level secure parking in city center',
      owner: owner._id,
      location: {
        coordinates: [77.2090, 28.6139],
        address: { city: 'New Delhi', state: 'Delhi', street: 'Connaught Place', country: 'India' },
        landmarks: ['Metro Station', 'Mall']
      },
      capacity: { total: 200, available: 180, reserved: 10 },
      vehicleTypes: ['car','bike'],
      pricing: { hourly: 40, daily: 300, currency:'INR' },
      amenities: ['covered','security','cctv','ev-charging','car-wash','valet-service'],
      operatingHours: buildOperatingHours(false),
      rating: { average: 4.2, count: 120 },
      status: 'active'
    },
    {
      name: 'Airport Express Parking',
      description: 'Long-term parking near airport',
      owner: owner._id,
      location: {
        coordinates: [72.8777, 19.0760],
        address: { city: 'Mumbai', state: 'Maharashtra', street: 'Terminal Road', country: 'India' },
        landmarks: ['Airport']
      },
      capacity: { total: 500, available: 470, reserved: 15 },
      vehicleTypes: ['car'],
      pricing: { hourly: 60, daily: 450, currency:'INR' },
      amenities: ['covered','security','cctv','lighting','washroom','ev-charging'],
      operatingHours: buildOperatingHours(true),
      rating: { average: 4.5, count: 340 },
      status: 'active'
    }
  ];
  const lots = await ParkingLot.insertMany(lotsData);
  console.log('[seed] Created parking lots:', lots.map(l=>l.name).join(', '));
  return lots;
}

async function createServices(parkingLots) {
  const existing = await Service.findOne();
  if (existing) {
    console.log('[seed] Services already exist; skipping');
    return await Service.find();
  }
  const categories = ['car-wash','maintenance','fuel','food-beverage','valet','charging'];
  const servicesData = [
    {
      name: 'Premium Car Wash',
      description: 'Exterior + interior detailing',
      category: 'car-wash',
      pricing: { basePrice: 499, currency:'INR', unit:'per-service' },
      provider: { name:'ShinePro', contact:{ phone:'+9111000001' }, rating:{ average:4.6, count:220 } },
      availability: { isActive:true, operatingHours:{ start:'07:00', end:'21:00', is24Hours:false }, daysAvailable:['monday','tuesday','wednesday','thursday','friday','saturday'] },
      details: { duration:{ estimated:30 }, includes:['Foam wash','Vacuum','Wax'], vehicleTypes:['car'] },
      availableAt: parkingLots.map(l=>({ parkingLot: l._id, customPricing: randomInt(450,550), isActive:true }))
    },
    {
      name: 'EV Fast Charging',
      description: 'DC fast charging up to 120kW',
      category: 'charging',
      pricing: { basePrice: 25, currency:'INR', unit:'per-hour' },
      provider: { name:'ChargeNet', contact:{ phone:'+9111000002' }, rating:{ average:4.3, count:150 } },
      availability: { isActive:true, operatingHours:{ start:'00:00', end:'23:59', is24Hours:true }, daysAvailable:['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] },
      details: { duration:{ estimated:60 }, vehicleTypes:['car'] },
      availableAt: parkingLots.map(l=>({ parkingLot: l._id, isActive:true }))
    },
    {
      name: 'Valet Parking Service',
      description: 'Professional valet attendants',
      category: 'valet',
      pricing: { basePrice: 150, currency:'INR', unit:'per-hour' },
      provider: { name:'Prestige Valet', contact:{ phone:'+9111000003' }, rating:{ average:4.1, count:90 } },
      availability: { isActive:true, operatingHours:{ start:'08:00', end:'22:00', is24Hours:false }, daysAvailable:['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] },
      details: { vehicleTypes:['car'] },
      availableAt: parkingLots.map(l=>({ parkingLot: l._id, isActive:true }))
    }
  ];
  const services = await Service.insertMany(servicesData);
  console.log('[seed] Created services:', services.map(s=>s.name).join(', '));
  return services;
}

async function createBookingsForUsers(users, parkingLots, services) {
  const statuses = ['pending','confirmed','active','completed','cancelled','no-show','extended'];
  const payments = ['completed','pending','failed','refunded'];
  const created = [];
  for (const u of users) {
    const exists = await Booking.findOne({ user: u._id });
    if (exists) { console.log(`[seed] Bookings already exist for ${u.email}; skipping`); continue; }
    const count = randomInt(2,4);
    for (let i=0;i<count;i++) {
      const lot = rand(parkingLots);
      const svc = rand(services);
      const now = new Date();
      const offsetHrs = randomInt(-72, 72); // some past, some future
      const start = new Date(now.getTime() + offsetHrs*60*60*1000);
      const end = new Date(start.getTime() + randomInt(1,4)*60*60*1000);
      const hours = Math.max(1, Math.ceil((end-start)/(1000*60*60)));
      const basePrice = lot.pricing.hourly * hours;
      const svcPrice = svc.pricing.basePrice;
      const total = basePrice + svcPrice;
      const status = rand(statuses);
      const payStatus = rand(payments);
      const b = await Booking.create({
        user: u._id,
        parkingLot: lot._id,
        vehicle: { type:'car', licensePlate:`DL${randomInt(10,99)}AB${randomInt(1000,9999)}`, model:'Sedan', color:'Blue' },
        bookingDetails: { startTime:start, endTime:end, spotNumber:`L${randomInt(1,3)}-R${randomInt(1,20)}-C${randomInt(1,10)}`, floor:String(randomInt(0,3)) },
        pricing: { basePrice, serviceFees: svcPrice, taxes: 0, discounts:0, totalAmount: total, currency:'INR' },
        services: [{ serviceId: svc._id, name: svc.name, price: svc.pricing.basePrice, quantity:1 }],
        status,
        payment: { method:'card', status: payStatus, paidAt: payStatus==='completed'? new Date(): null, transactionId:`TXN${Date.now()}${i}` }
      });
      created.push(b);
    }
  }
  console.log(`[seed] Created ${created.length} bookings across users`);
  return created;
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED !== '1') {
    console.error('Refusing to seed in production without FORCE_SEED=1');
    process.exit(1);
  }
  await connect();
  await clearCollections();
  const { admin, owner, user } = await createUsers();
  const parkingLots = await createParkingLots(owner);
  const services = await createServices(parkingLots);
  await createBookingsForUsers([admin, owner, user], parkingLots, services);
  console.log('\n[seed] Done. Test accounts:');
  console.log(' Admin: admin@example.com / Password123');
  console.log(' Owner: owner@example.com / Password123');
  console.log(' User : user@example.com / Password123');
  await mongoose.disconnect();
  console.log('[seed] Disconnected');
}

main().catch(e => { console.error('[seed] Error', e); process.exit(1); });
