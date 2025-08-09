// Centralized demo lots used when a user selects a sample lot (id starts with "demo-")

export const DEMO_LOTS = {
  'demo-central-mall': {
    id: 'demo-central-mall',
    name: 'Demo Central Mall Parking',
    address: 'Connaught Place, New Delhi',
    lat: 28.6239,
    lng: 77.219,
    availableSlots: 35,
    totalSlots: 120,
    pricePerHour: { day: 40, night: 40 },
    rating: 4.3,
    features: ['covered', 'security', 'cctv'],
    slotTypes: [
      { type: 'car', available: 30, total: 100, price: 40 },
      { type: 'bike', available: 5, total: 20, price: 20 }
    ],
  },
  'demo-riverfront': {
    id: 'demo-riverfront',
    name: 'Demo Riverfront Parking',
    address: 'Near Riverwalk, City Center',
    lat: 28.6059,
    lng: 77.203,
    availableSlots: 12,
    totalSlots: 60,
    pricePerHour: { day: 30, night: 30 },
    rating: 4.0,
    features: ['open-air', 'lighting'],
    slotTypes: [
      { type: 'car', available: 10, total: 50, price: 30 },
      { type: 'bike', available: 2, total: 10, price: 15 }
    ],
  },
};

export const isDemoLotId = (id) => typeof id === 'string' && id.startsWith('demo-');
