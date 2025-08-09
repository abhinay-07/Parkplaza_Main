import { useState, useEffect } from 'react';

// Shared normalizer for service objects (UI shape)
const normalizeServiceShared = (svc) => {
  if (!svc) return null;
  let availability;
  const op = svc.availability?.operatingHours;
  if (op?.is24Hours) availability = '24/7';
  else if (op?.start && op?.end) availability = `${op.start}-${op.end}`;
  return {
    id: svc._id || svc.id,
    name: svc.name,
    description: svc.description || '',
    category: svc.category,
    price: (svc.customPricing != null ? svc.customPricing : svc.pricing?.basePrice) ?? svc.price ?? 0,
    priceType: svc.pricing?.unit || svc.priceType || 'per-service',
    duration: svc.details?.duration?.estimated || svc.duration || 0,
    availability,
    features: svc.details?.includes || svc.features || [],
    popular: (svc.stats?.totalBookings || 0) > 25 || svc.popular || false,
    icon: '🛠️'
  };
};
import { parkingAPI, servicesAPI, bookingAPI } from '../services/api';
import { DEMO_LOTS, isDemoLotId } from '../services/demoLots';
import { mockAPI } from '../services/mockData';

// Environment variable to toggle between real API and mock data
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true' || !process.env.REACT_APP_API_URL;

export const useParkingLots = (userLocation) => {
  const [parkingLots, setParkingLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Normalize backend lot to map-friendly shape
  const normalizeLot = (lot) => {
    if (!lot) return null;
    // If already flattened (nearby endpoint) just ensure required fields
    if (typeof lot.lat === 'number' && typeof lot.lng === 'number') {
      return {
        id: lot.id || lot._id,
        name: lot.name,
        address: lot.address || lot.location?.address?.city || '',
        lat: lot.lat,
        lng: lot.lng,
        availableSlots: lot.availableSlots ?? lot.capacity?.available ?? 0,
        totalSlots: lot.totalSlots ?? lot.capacity?.total ?? 0,
        pricePerHour: lot.pricePerHour || { day: lot.pricing?.hourly ?? 0 },
        rating: lot.rating ?? lot.rating?.average ?? 0,
        distanceMeters: lot.distanceMeters || lot.distance
      };
    }
    // Transform from full ParkingLot document
    return {
      id: lot._id,
      name: lot.name,
      address: lot.location?.address?.city || '',
      lat: lot.location?.coordinates?.[1],
      lng: lot.location?.coordinates?.[0],
      availableSlots: lot.capacity?.available ?? 0,
      totalSlots: lot.capacity?.total ?? 0,
      pricePerHour: { day: lot.pricing?.hourly ?? 0 },
      rating: lot.rating?.average ?? 0,
      distanceMeters: lot.distance
    };
  };

  const fetchNearbyLots = async (lat, lng) => {
    try {
      setLoading(true);
      let response;
      
      if (USE_MOCK_DATA) {
        response = await mockAPI.getNearbyParkingLots(lat, lng);
      } else {
        // First try the backend API, fallback to mock if it fails
        try {
          response = await parkingAPI.getNearby(lat, lng);
        } catch (backendError) {
          console.warn('Backend API failed, falling back to mock data:', backendError);
          response = await mockAPI.getNearbyParkingLots(lat, lng);
        }
      }
      
      const raw = response.data?.data || response.data || [];
      const normalized = Array.isArray(raw) ? raw.map(normalizeLot).filter(Boolean) : [];
      setParkingLots(normalized);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch parking lots:', err);
      setError('Failed to load parking lots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLocation?.lat && userLocation?.lng) {
      fetchNearbyLots(userLocation.lat, userLocation.lng);
    }
  }, [userLocation]);

  // Real-time availability updates (via window event dispatched by socket slice)
  useEffect(() => {
    function handleAvailabilityUpdate(event) {
      const { lotId, available } = event.detail || {};
      if (!lotId || typeof available !== 'number') return;
      setParkingLots(prev => prev.map(lot => {
        const match = lot.id === lotId || lot._id === lotId;
        return (match && lot.availableSlots !== available)
          ? { ...lot, availableSlots: available }
          : lot;
      }));
    }
    window.addEventListener('parking-availability-update', handleAvailabilityUpdate);
    return () => window.removeEventListener('parking-availability-update', handleAvailabilityUpdate);
  }, []);

  const refetch = () => {
    if (userLocation?.lat && userLocation?.lng) {
      return fetchNearbyLots(userLocation.lat, userLocation.lng);
    }
    return Promise.resolve();
  };

  return { parkingLots, loading, error, refetch };
};

export const useParkingLotDetails = (lotId) => {
  const [parkingLot, setParkingLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizeLotDetails = (data) => {
    if (!data) return null;
    // Backend shape: { lot, recentActivity } or mock flat object
    const lot = data.lot || data;
    if (!lot) return null;
    const coords = lot.location?.coordinates || [lot.lng, lot.lat];
    // Build operating hours summary (simple: show today's hours or 24h indicator)
    let operatingSummary = '';
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const today = days[new Date().getDay()];
    const todayHours = lot.operatingHours?.[today];
    if (todayHours) {
      if (todayHours.is24Hours) operatingSummary = 'Open 24 hours';
      else if (todayHours.open && todayHours.close) operatingSummary = `Open today ${todayHours.open} – ${todayHours.close}`;
    }
    // Fallback if no today summary
    if (!operatingSummary) operatingSummary = 'Hours not available';
    return {
      id: lot._id || lot.id,
      name: lot.name,
      description: lot.description,
      address: lot.location?.address?.street || lot.address || lot.location?.address?.city || '',
      city: lot.location?.address?.city,
      state: lot.location?.address?.state,
      country: lot.location?.address?.country,
      lat: coords?.[1],
      lng: coords?.[0],
      availableSlots: lot.capacity?.available ?? lot.availableSlots ?? 0,
      totalSlots: lot.capacity?.total ?? lot.totalSlots ?? 0,
      pricePerHour: {
        day: lot.pricing?.hourly ?? lot.pricePerHour?.day ?? 0,
        night: lot.pricing?.hourly ?? lot.pricePerHour?.night ?? lot.pricing?.hourly ?? 0
      },
      rating: lot.rating?.average ?? lot.rating ?? 0,
      operatingHours: operatingSummary,
      rawOperatingHours: lot.operatingHours,
      amenities: lot.amenities || lot.features || [],
      features: lot.amenities || lot.features || [],
      slotTypes: lot.slotTypes || [],
      contact: lot.owner?.phone || lot.contact,
      image: lot.images?.find(i=>i.isPrimary)?.url || lot.images?.[0]?.url,
      recentActivity: data.recentActivity
    };
  };

  useEffect(() => {
    const fetchLotDetails = async () => {
      if (!lotId) return;

      try {
        setLoading(true);
        // If demo lot id, short-circuit to DEMO_LOTS
        if (isDemoLotId(lotId)) {
          setParkingLot(normalizeLotDetails(DEMO_LOTS[lotId]));
          setError(null);
          return;
        }

        const response = USE_MOCK_DATA
          ? await mockAPI.getParkingLotDetails(lotId)
          : await parkingAPI.getDetails(lotId);
        const payload = response.data?.data || response.data;
        setParkingLot(normalizeLotDetails(payload));
        setError(null);
      } catch (err) {
        console.error('Failed to fetch parking lot details:', err);
        setError(err.message);
        setParkingLot(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLotDetails();
  }, [lotId]);

  return { parkingLot, loading, error };
};

export const useServices = (lotId = null) => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const normalizeService = normalizeServiceShared;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      const apply = (list, cats, errMsg) => {
        if (cancelled) return;
        setServices(list);
        if (cats) setCategories(cats);
        if (errMsg) setError(errMsg);
      };
      try {
        // Demo or mock: return mock services directly
        if (USE_MOCK_DATA || isDemoLotId(lotId)) {
          const r = lotId ? await mockAPI.getServicesForLot(lotId) : await mockAPI.getAllServices();
          const data = r.data?.data || r.data || [];
          apply(Array.isArray(data) ? data.map(normalizeService).filter(Boolean) : [], [...new Set(data.map(s=>s.category))]);
          return;
        }

        // Real API
        const resp = lotId ? await servicesAPI.getByLot(lotId) : await servicesAPI.getAll();
        const payload = resp.data?.data || {};
        const list = payload.services || payload || [];
        apply(Array.isArray(list) ? list.map(normalizeService).filter(Boolean) : [], payload.categories);
      } catch (err) {
        console.error('Service fetch failed, attempting mock fallback:', err?.message || err);
        // Fallback to mock if real API failed
        try {
          const fb = lotId ? await mockAPI.getServicesForLot(lotId) : await mockAPI.getAllServices();
          const data = fb.data?.data || fb.data || [];
          apply(Array.isArray(data) ? data.map(normalizeService).filter(Boolean) : [], [...new Set(data.map(s=>s.category))], 'Showing mock services (API unavailable)');
        } catch (fbErr) {
          apply([], null, fbErr?.message || err?.message || 'Failed to load services');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [lotId]);

  return { services, categories, loading, error };
};

export const useBookingPrice = () => {
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculatePrice = async (lotId, startTime, endTime, services = []) => {
    try {
      setLoading(true);
      // Demo lots: compute locally using DEMO_LOTS pricing
      if (isDemoLotId(lotId)) {
        const lot = DEMO_LOTS[lotId];
        if (!lot) throw new Error('Demo lot not found');
        const s = new Date(startTime);
        const e = new Date(endTime);
        const hours = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60)));
        const parkingCost = hours * (lot.pricePerHour?.day ?? 0);
        const servicesCost = 0; // keeping services at 0 for demo lots
        const subtotal = parkingCost + servicesCost;
        const tax = Math.round(subtotal * 0.18);
        const total = subtotal + tax;
        const data = { parkingCost, servicesCost, subtotal, tax, total, breakdown: { hours, pricePerHour: lot.pricePerHour?.day ?? 0 } };
        setPriceData(data);
        setError(null);
        return data;
      }
      // Mock path
      if (USE_MOCK_DATA) {
        const response = await mockAPI.calculateBookingPrice(lotId, startTime, endTime, services);
        const data = response.data?.data || response.data;
        setPriceData(data);
        setError(null);
        return data;
      }
      // Backend expects keys: parkingLot, startTime, endTime, services
      const response = await bookingAPI.calculatePrice({ parkingLot: lotId, startTime, endTime, services });
      const data = response.data?.data || response.data;
      setPriceData(data);
      setError(null);
      return data;
    } catch (err) {
      console.error('Failed to calculate price:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPrice = () => {
    setPriceData(null);
    setError(null);
  };

  return { priceData, loading, error, calculatePrice, resetPrice };
};

export const useBookings = (isAuthenticated = false) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookings = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to view your bookings');
      setBookings([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      if (USE_MOCK_DATA) {
        const response = await mockAPI.getUserBookings();
        setBookings(response.data.data || response.data || []);
      } else {
  const response = await bookingAPI.myBookings(); // corrected method name
        const data = response.data?.data || response.data || [];
        setBookings(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError('Failed to load bookings. Please try again.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      // Not authenticated: clear state but stop loading spinner quickly
      setBookings([]);
      setLoading(false);
      return;
    }
    fetchBookings();
  }, [isAuthenticated]);

  const createBooking = async (bookingData) => {
    try {
      const response = USE_MOCK_DATA
        ? await mockAPI.createBooking(bookingData)
        : await bookingAPI.create(bookingData);
      setBookings(prev => [response.data.data, ...prev]);
      return response.data.data;
    } catch (err) {
      console.error('Failed to create booking:', err);
      throw err;
    }
  };

  return { bookings, loading, error, createBooking, refetch: fetchBookings };
};

export const useAllServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const normalizeServiceAll = normalizeServiceShared;

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true); setError(null);
      const apply = (list, msg) => { if (!cancelled) { setServices(list); if (msg) setError(msg); } };
      try {
        if (USE_MOCK_DATA) {
          const r = await mockAPI.getAllServices();
          const data = r.data.data || r.data || [];
            apply(Array.isArray(data) ? data.map(normalizeServiceAll).filter(Boolean) : []);
          return;
        }
        const resp = await servicesAPI.getAll();
        const payload = resp.data?.data || {};
        const list = payload.services || payload || [];
        apply(Array.isArray(list) ? list.map(normalizeServiceAll).filter(Boolean) : []);
      } catch (err) {
        console.error('All services fetch failed, mock fallback attempt:', err?.message || err);
        if (!USE_MOCK_DATA) {
          try {
            const fb = await mockAPI.getAllServices();
            const data = fb.data.data || fb.data || [];
            apply(Array.isArray(data) ? data.map(normalizeServiceAll).filter(Boolean) : [], 'Showing mock services (API unavailable)');
          } catch (fbErr) {
            apply([], err.message || 'Failed to load services');
          }
        } else {
          apply([], err.message || 'Failed to load services');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, []);

  return { services, loading, error };
};
