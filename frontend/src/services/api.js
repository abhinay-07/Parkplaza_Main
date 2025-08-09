import axios from 'axios';

// Create axios instance
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
  return Promise.reject(error instanceof Error ? error : new Error(error?.message || 'Request error'));
  }
);

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid: remove token and navigate to auth while preserving current path
      try { localStorage.removeItem('token'); } catch {}
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      let redirectUrl = '/auth';
      if (currentPath && currentPath !== '/') {
        redirectUrl += `?from=${encodeURIComponent(currentPath)}`;
      }
      window.location.href = redirectUrl;
    }
    return Promise.reject(error instanceof Error ? error : new Error(error?.message || 'Response error'));
  }
);

// API endpoints (aligned with backend routes)
export const parkingAPI = {
  // Get parking lots with filters (/api/parking/all)
  getAll: (params) => API.get('/parking/all', { params }),
  // Get nearby lots (lightweight) (/api/parking/nearby)
  getNearby: (lat, lng, radius = 5) => API.get('/parking/nearby', { params: { lat, lng, radius } }),
  // Get single lot
  getDetails: (lotId) => API.get(`/parking/${lotId}`),
  // Create lot
  create: (data) => API.post('/parking/create', data),
  // Update lot
  update: (id, data) => API.put(`/parking/${id}`, data),
  // My lots
  myLots: (params) => API.get('/parking/owner/my-lots', { params }),
  // Update availability
  updateAvailability: (id, data) => API.put(`/parking/${id}/availability`, data),
  // Upload images
  uploadImages: (lotId, files, captions = []) => {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    captions.forEach(c => formData.append('captions', c));
    return API.post(`/parking/upload-images/${lotId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  // Delete image
  deleteImage: (lotId, imageId) => API.delete(`/parking/delete-image/${lotId}/${imageId}`),
  // Slots
  getSlots: (lotId, all=false) => API.get(`/parking/${lotId}/slots`, { params: { all } }),
  reserveSlot: (lotId, slotCode) => API.post(`/parking/${lotId}/slots/reserve`, { slotCode }),
};

export const servicesAPI = {
  // Generic list (alias of /services/options without filters)
  getAll: (params) => API.get('/services/options', { params }),
  // List services available at specific parking lot (passes parkingLot param)
  getByLot: (lotId, params = {}) => API.get('/services/options', { params: { ...params, parkingLot: lotId } }),
  getOptions: (params) => API.get('/services/options', { params }),
  getService: (id) => API.get(`/services/${id}`),
  getByCategory: (category, params) => API.get(`/services/category/${category}`, { params }),
  getPopular: (params) => API.get('/services/featured/popular', { params }),
  search: (params) => API.get('/services/search/query', { params }),
  getPricingForLot: (serviceId, lotId) => API.get(`/services/${serviceId}/pricing/${lotId}`),
};

export const bookingAPI = {
  create: (data) => API.post('/booking/new', data),
  calculatePrice: (payload) => API.post('/booking/calculate-price', payload),
  myBookings: (params) => API.get('/booking/my', { params }),
  getDetails: (id) => API.get(`/booking/${id}`),
  updateStatus: (id, status, reason) => API.put(`/booking/${id}/status`, { status, reason }),
  cancel: (id, reason) => API.delete(`/booking/${id}`, { data: { reason } }),
  extend: (id, additionalHours) => API.put(`/booking/${id}/extend`, { additionalHours }),
  // Payments
  createStripeIntent: (amount, currency = 'inr', metadata = {}) => API.post('/booking/create-payment-intent', { amount, currency, metadata }),
  createRazorpayOrder: (amount, receipt, notes = {}, currency = 'INR') => API.post('/booking/create-razorpay-order', { amount, currency, receipt, notes }),
  verifyRazorpayPayment: (payload) => API.post('/booking/verify-razorpay-payment', payload),
};

export const authAPI = {
  login: (credentials) => API.post('/auth/login', credentials),
  register: (userData) => API.post('/auth/register', userData),
  me: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
  changePassword: (data) => API.put('/auth/change-password', data),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => API.post(`/auth/reset-password/${token}`, { password }),
  logout: () => API.post('/auth/logout'),
};

export default API;
