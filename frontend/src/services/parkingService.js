import API from './api';

const parkingService = {
  // Get all parking lots with filters
  getAllParkingLots: async (filters = {}) => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await API.get(`/parking/all?${params}`);
    return response.data;
  },

  // Get parking lot details
  getParkingLotDetails: async (id) => {
    const response = await API.get(`/parking/${id}`);
    return response.data;
  },

  // Create new parking lot (landowner)
  createParkingLot: async (lotData) => {
    const response = await API.post('/parking/create', lotData);
    return response.data;
  },

  // Update parking lot
  updateParkingLot: async (id, data) => {
    const response = await API.put(`/parking/${id}`, data);
    return response.data;
  },

  // Get my parking lots (landowner)
  getMyParkingLots: async (pagination = {}) => {
    const params = new URLSearchParams(pagination);
    const response = await API.get(`/parking/owner/my-lots?${params}`);
    return response.data;
  },

  // Update availability
  updateAvailability: async (id, availabilityData) => {
    const response = await API.put(`/parking/${id}/availability`, availabilityData);
    return response.data;
  },

  // Search parking lots by location
  searchByLocation: async (lat, lng, radius = 5) => {
    const response = await API.get(`/parking/all?lat=${lat}&lng=${lng}&radius=${radius}`);
    return response.data;
  },

  // Get nearby parking lots
  getNearbyLots: async (coordinates, radius = 5) => {
    const { lat, lng } = coordinates;
    return await parkingService.searchByLocation(lat, lng, radius);
  },
};

export default parkingService;
