import { bookingAPI } from './api';

// Booking service abstraction to keep components/slices clean
// Returns already unwrapped data (response.data.data or response.data) for convenience
const bookingService = {
  create: async (payload) => {
    try {
      const res = await bookingAPI.create(payload);
      return res.data.data?.booking || res.data.data || res.data; // backend returns { data: { booking } }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create booking';
      throw new Error(msg);
    }
  },
  myBookings: async (params = {}) => {
    const res = await bookingAPI.myBookings(params);
    // shape: { data: { bookings, pagination } }
    return res.data.data;
  },
  getDetails: async (id) => {
    const res = await bookingAPI.getDetails(id);
    return res.data.data?.booking || res.data.data;
  },
  updateStatus: async (id, status, reason) => {
    const res = await bookingAPI.updateStatus(id, status, reason);
    return res.data.data?.booking || res.data.data;
  },
  cancel: async (id, reason) => {
    const res = await bookingAPI.cancel(id, reason);
    return res.data.data?.booking || res.data.data;
  },
  extend: async (id, additionalHours) => {
    const res = await bookingAPI.extend(id, additionalHours);
    return res.data.data?.booking || res.data.data;
  },
  // Payments helpers
  createStripeIntent: async (amount, currency = 'inr', metadata = {}) => {
    const res = await bookingAPI.createStripeIntent(amount, currency, metadata);
    return res.data.data;
  },
  createRazorpayOrder: async (amount, currency = 'INR', receipt, notes = {}) => {
    const res = await bookingAPI.createRazorpayOrder(amount, currency, receipt, notes);
    return res.data.data;
  },
  verifyRazorpayPayment: async (payload) => {
    const res = await bookingAPI.verifyRazorpayPayment(payload);
    return res.data.data;
  }
};

export default bookingService;
