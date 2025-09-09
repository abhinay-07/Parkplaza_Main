import API, { bookingAPI } from './api';

// Booking service abstraction to keep components/slices clean
// Returns already unwrapped data (response.data.data or response.data) for convenience
const bookingService = {
  create: async (payload) => {
    try {
      const res = await bookingAPI.create(payload);
      return res.data.data?.booking || res.data.data || res.data; // backend returns { data: { booking } }
    } catch (err) {
  // Include status and server response body when available for better diagnostics
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.message || err?.response?.data || null;
  const msg = serverMsg ? `${serverMsg}` : (err?.message || 'Failed to create booking');
  const detailed = status ? `(${status}) ${msg}` : msg;
  const e = new Error(detailed);
  e.original = err;
  throw e;
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
  cancelPayment: async (id, reason) => {
    const res = await bookingAPI.cancelPayment(id, reason);
    return res.data.data || res.data;
  },
  getTicket: async (id) => {
  try {
    const res = await bookingAPI.downloadTicket(id);
    return res; // return full axios response so caller can inspect headers/content-type
  } catch (err) {
    // Axios throws for non-2xx; attempt a fetch fallback so we can read the response body (JSON message) if server returned non-PDF
    try {
  // Use axios instance baseURL (if set) to avoid duplicating or omitting the /api prefix
  const base = (API && API.defaults && API.defaults.baseURL) || process.env.REACT_APP_API_URL || 'https://parkplaza-main.onrender.com/api';
  const url = `${base.replace(/\/$/, '')}/booking/${id}/ticket`;
  const resp = await fetch(url, { credentials: 'include' });
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/pdf') || resp.ok) {
        // If it's ok and pdf, return arrayBuffer so caller can make blob
        const buffer = await resp.arrayBuffer();
        return { data: buffer, headers: { 'content-type': contentType }, status: resp.status };
      }
      // Not a PDF or non-OK response; try to parse JSON or text
      const text = await resp.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* ignore parse error, use raw text */ parsed = text; }
      return { data: parsed, headers: { 'content-type': contentType }, status: resp.status };
    } catch {
      // If even the fallback failed, rethrow original axios error
      throw err;
    }
  }
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
  createRazorpayOrder: async (amount, receipt, notes = {}, currency = 'INR') => {
    const res = await bookingAPI.createRazorpayOrder(amount, currency, receipt, notes);
    return res.data.data;
  },
  verifyRazorpayPayment: async (payload) => {
    const res = await bookingAPI.verifyRazorpayPayment(payload);
    return res.data.data;
  }
};

export default bookingService;
