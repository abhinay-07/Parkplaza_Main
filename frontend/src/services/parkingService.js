import { parkingAPI } from './api';

const parkingService = {
  // Get all parking lots with filters
  getAllParkingLots: async (filters = {}) => {
  const { data } = await parkingAPI.getAll(filters);
  return data;
  },

  // Get parking lot details
  getParkingLotDetails: async (id) => {
  const { data } = await parkingAPI.getDetails(id);
  return data;
  },

  // Create new parking lot (landowner)
  createParkingLot: async (lotData) => {
  const { data } = await parkingAPI.create(lotData);
  return data;
  },

  // Update parking lot
  updateParkingLot: async (id, data) => {
  const { data: resp } = await parkingAPI.update(id, data);
  return resp;
  },

  // Get my parking lots (landowner)
  getMyParkingLots: async (pagination = {}) => {
  const { data } = await parkingAPI.myLots(pagination);
  return data;
  },

  // Update availability
  updateAvailability: async (id, availabilityData) => {
  const { data } = await parkingAPI.updateAvailability(id, availabilityData);
  return data;
  },

  // Search parking lots by location
  searchByLocation: async (lat, lng, radius = 5) => {
  const { data } = await parkingAPI.getAll({ lat, lng, radius });
  return data;
  },

  // Get nearby parking lots
  getNearbyLots: async (coordinates, radius = 5) => {
    const { lat, lng } = coordinates;
    return await parkingService.searchByLocation(lat, lng, radius);
  },
  // Slots
  getSlots: async (lotId, all=false) => {
    const { data } = await parkingAPI.getSlots(lotId, all);
    return data;
  },
  reserveSlot: async (lotId, slotCode) => {
    const { data } = await parkingAPI.reserveSlot(lotId, slotCode);
    return data;
  },
  // Admin/Landowner: import places into DB
  importPlaces: async ({ lat, lng, radiusMeters = 2000, limit = 10, ownerEmail }) => {
    const { data } = await parkingAPI.importPlaces({ lat, lng, radiusMeters, limit, ownerEmail });
    return data;
  },
  // Admin/Landowner: import OSM parking into DB (free)
  importOSM: async ({ lat, lng, radiusMeters = 2000, limit = 10, ownerEmail }) => {
    const { data } = await parkingAPI.importOSM({ lat, lng, radiusMeters, limit, ownerEmail });
    return data;
  },
  // Dev: seed random lots near a location
  seedRandomLots: async ({ lat, lng, count = 10, radiusMeters = 2000, ownerEmail }) => {
    const { data } = await parkingAPI.seedRandom({ lat, lng, count, radiusMeters, ownerEmail });
    return data;
  }
};

export default parkingService;
