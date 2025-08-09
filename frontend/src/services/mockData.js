// Mock data for development and testing

export const mockParkingLots = [
  {
    id: '1',
    name: 'Downtown Plaza Parking',
    address: '123 Main Street, Downtown',
    lat: 28.6139,
    lng: 77.2090,
    rating: 4.5,
    totalSlots: 150,
    availableSlots: 45,
    pricePerHour: {
      day: 30,
      night: 20,
    },
    features: ['CCTV', '24/7 Security', 'EV Charging', 'Covered'],
    operatingHours: '24/7',
    contact: '+91-9876543210',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500',
    slotTypes: [
      { type: 'car', available: 35, total: 100, price: 30 },
      { type: 'bike', available: 10, total: 50, price: 15 }
    ]
  },
  {
    id: '2',
    name: 'Metro Station Parking',
    address: '456 Station Road, Central Delhi',
    lat: 28.6304,
    lng: 77.2177,
    rating: 4.2,
    totalSlots: 200,
    availableSlots: 80,
    pricePerHour: {
      day: 25,
      night: 15,
    },
    features: ['Metro Connected', 'CCTV', 'Washroom'],
    operatingHours: '5:00 AM - 12:00 AM',
    contact: '+91-9876543211',
    image: 'https://images.unsplash.com/photo-1520637836862-4d197d17c90a?w=500',
    slotTypes: [
      { type: 'car', available: 60, total: 120, price: 25 },
      { type: 'bike', available: 20, total: 80, price: 12 }
    ]
  },
  {
    id: '3',
    name: 'Shopping Mall Parking',
    address: '789 Mall Avenue, South Delhi',
    lat: 28.5355,
    lng: 77.3910,
    rating: 4.7,
    totalSlots: 300,
    availableSlots: 120,
    pricePerHour: {
      day: 40,
      night: 25,
    },
    features: ['Shopping Mall', 'Food Court', 'EV Charging', 'Valet Service'],
    operatingHours: '10:00 AM - 11:00 PM',
    contact: '+91-9876543212',
    image: 'https://images.unsplash.com/photo-1555636222-cae831e670b3?w=500',
    slotTypes: [
      { type: 'car', available: 100, total: 250, price: 40 },
      { type: 'bike', available: 20, total: 50, price: 20 }
    ]
  },
  {
    id: '4',
    name: 'Airport Express Parking',
    address: '101 Airport Road, Terminal 3',
    lat: 28.5562,
    lng: 77.0999,
    rating: 4.3,
    totalSlots: 400,
    availableSlots: 180,
    pricePerHour: {
      day: 50,
      night: 35,
    },
    features: ['Airport Shuttle', 'CCTV', '24/7 Security', 'Covered'],
    operatingHours: '24/7',
    contact: '+91-9876543213',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500',
    slotTypes: [
      { type: 'car', available: 150, total: 350, price: 50 },
      { type: 'bike', available: 30, total: 50, price: 25 }
    ]
  },
  {
    id: '5',
    name: 'Business District Parking',
    address: '234 Corporate Avenue, Gurgaon',
    lat: 28.4595,
    lng: 77.0266,
    rating: 4.1,
    totalSlots: 180,
    availableSlots: 55,
    pricePerHour: {
      day: 35,
      night: 22,
    },
    features: ['Business Center', 'WiFi', 'CCTV', 'Restaurant'],
    operatingHours: '6:00 AM - 11:00 PM',
    contact: '+91-9876543214',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
    slotTypes: [
      { type: 'car', available: 45, total: 140, price: 35 },
      { type: 'bike', available: 10, total: 40, price: 18 }
    ]
  }
];

export const mockServices = [
  {
    id: 'cleaning-basic',
    name: 'Basic Car Wash',
    description: 'Exterior wash with soap and water',
    price: 150,
    duration: 30,
    category: 'cleaning',
    icon: '🚿',
    popular: true
  },
  {
    id: 'cleaning-premium',
    name: 'Premium Car Wash',
    description: 'Complete interior and exterior cleaning with wax',
    price: 300,
    duration: 60,
    category: 'cleaning',
    icon: '✨',
    popular: false
  },
  {
    id: 'oil-change',
    name: 'Oil Change Service',
    description: 'Complete engine oil change with filter replacement',
    price: 800,
    duration: 45,
    category: 'mechanical',
    icon: '🔧',
    popular: false
  },
  {
    id: 'tire-check',
    name: 'Tire Pressure Check',
    description: 'Check and adjust tire pressure for all wheels',
    price: 100,
    duration: 15,
    category: 'mechanical',
    icon: '🛞',
    popular: true
  },
  {
    id: 'security-premium',
    name: 'Premium Security Monitoring',
    description: '24/7 dedicated security monitoring with alerts',
    price: 200,
    duration: 0,
    category: 'security',
    icon: '🛡️',
    popular: false,
    features: ['Real-time alerts', 'HD camera monitoring', 'Security guard patrol'],
    availability: '24/7'
  },
  {
    id: 'valet-parking',
    name: 'Valet Parking Service',
    description: 'Professional valet will park and retrieve your vehicle',
    price: 500,
    duration: 10,
    category: 'convenience',
    icon: '🎩',
    popular: true,
    features: ['Professional valet', 'Vehicle inspection', 'Key security'],
    availability: '8 AM - 10 PM'
  },
  {
    id: 'fuel-service',
    name: 'Mobile Fuel Service',
    description: 'Fuel delivery service while your vehicle is parked',
    price: 50,
    duration: 15,
    category: 'convenience',
    icon: '⛽',
    popular: false,
    features: ['Petrol/Diesel delivery', 'Fuel quality guarantee', 'Digital receipt'],
    availability: '9 AM - 8 PM'
  },
  {
    id: 'detailing-premium',
    name: 'Premium Car Detailing',
    description: 'Complete vehicle detailing with paint protection',
    price: 1200,
    duration: 120,
    category: 'cleaning',
    icon: '💎',
    popular: false,
    features: ['Paint correction', 'Interior deep clean', 'Ceramic coating'],
    availability: '8 AM - 6 PM'
  }
];

export const mockBookings = [
  {
    id: 'booking-1',
    lotId: '1',
    lotName: 'Downtown Plaza Parking',
    address: '123 Main Street, Downtown',
    startTime: '2025-08-08T10:00:00Z',
    endTime: '2025-08-08T14:00:00Z',
    slotType: 'car',
    slotNumber: 'A-15',
    services: ['cleaning-basic'],
    totalAmount: 270,
    status: 'active',
    paymentStatus: 'paid',
    qrCode: 'PARKABCD1234',
    createdAt: '2025-08-07T08:00:00Z'
  },
  {
    id: 'booking-2',
    lotId: '2',
    lotName: 'Metro Station Parking',
    address: '456 Station Road, Central Delhi',
    startTime: '2025-08-06T09:00:00Z',
    endTime: '2025-08-06T18:00:00Z',
    slotType: 'car',
    slotNumber: 'B-23',
    services: [],
    totalAmount: 225,
    status: 'completed',
    paymentStatus: 'paid',
    qrCode: 'PARKEFGH5678',
    createdAt: '2025-08-05T20:00:00Z'
  },
  {
    id: 'booking-3',
    lotId: '3',
    lotName: 'Shopping Mall Parking',
    address: '789 Mall Avenue, South Delhi',
    startTime: '2025-08-10T15:00:00Z',
    endTime: '2025-08-10T19:00:00Z',
    slotType: 'car',
    slotNumber: 'C-42',
    services: ['cleaning-premium', 'oil-change'],
    totalAmount: 1320,
    status: 'upcoming',
    paymentStatus: 'paid',
    qrCode: 'PARKIJKL9012',
    createdAt: '2025-08-07T12:00:00Z'
  }
];

export const mockServiceCategories = [
  {
    id: 'cleaning',
    name: 'Cleaning Services',
    icon: '🧽',
    description: 'Professional car cleaning and detailing'
  },
  {
    id: 'mechanical',
    name: 'Mechanical Services',
    icon: '🔧',
    description: 'Basic vehicle maintenance and repairs'
  },
  {
    id: 'security',
    name: 'Security Services',
    icon: '🛡️',
    description: 'Enhanced security and monitoring services'
  },
  {
    id: 'convenience',
    name: 'Convenience Services',
    icon: '🎯',
    description: 'Time-saving convenience services'
  }
];

// Mock API with realistic delays
export const mockAPI = {
  // Simulate network delay
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Get nearby parking lots
  getNearbyParkingLots: async (lat, lng, radius = 5000) => {
    await mockAPI.delay(800);
    return {
      data: {
        success: true,
        data: mockParkingLots
      }
    };
  },

  // Get parking lot details
  getParkingLotDetails: async (lotId) => {
    await mockAPI.delay(600);
    const lot = mockParkingLots.find(l => l.id === lotId);
    if (!lot) {
      throw new Error('Parking lot not found');
    }
    return {
      data: {
        success: true,
        data: lot
      }
    };
  },

  // Get services for a parking lot
  getServicesForLot: async (lotId) => {
    await mockAPI.delay(500);
    return {
      data: {
        success: true,
        data: mockServices
      }
    };
  },

  // Get all services
  getAllServices: async () => {
    await mockAPI.delay(500);
    return {
      data: {
        success: true,
        data: mockServices,
        categories: mockServiceCategories
      }
    };
  },

  // Calculate booking price
  calculateBookingPrice: async (lotId, startTime, endTime, services = []) => {
    await mockAPI.delay(400);
    
    const lot = mockParkingLots.find(l => l.id === lotId);
    if (!lot) {
      throw new Error('Parking lot not found');
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    
    // Determine if it's day or night pricing
    const hour = start.getHours();
    const isNight = hour < 6 || hour >= 22;
    const parkingCost = hours * (isNight ? lot.pricePerHour.night : lot.pricePerHour.day);
    
    const servicesCost = services.reduce((total, serviceId) => {
      const service = mockServices.find(s => s.id === serviceId);
      return total + (service ? service.price : 0);
    }, 0);

    const total = parkingCost + servicesCost;
    const tax = total * 0.18; // 18% GST
    const grandTotal = total + tax;

    return {
      data: {
        success: true,
        data: {
          parkingCost,
          servicesCost,
          subtotal: total,
          tax,
          total: grandTotal,
          breakdown: {
            hours,
            pricePerHour: isNight ? lot.pricePerHour.night : lot.pricePerHour.day,
            isNightPricing: isNight
          }
        }
      }
    };
  },

  // Create booking
  createBooking: async (bookingData) => {
    await mockAPI.delay(1200);
    
    const newBooking = {
      id: `booking-${Date.now()}`,
      ...bookingData,
      status: 'active',
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
      qrCode: `PARK${Math.random().toString(36).substring(2, 15).toUpperCase()}`
    };

    return {
      data: {
        success: true,
        data: newBooking,
        message: 'Booking created successfully'
      }
    };
  },

  // Get user bookings
  getUserBookings: async () => {
    await mockAPI.delay(700);
    return {
      data: {
        success: true,
        data: mockBookings
      }
    };
  }
};

export default mockAPI;
