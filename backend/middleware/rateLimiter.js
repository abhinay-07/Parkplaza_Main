const rateLimit = require('express-rate-limit');

// Create different rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health check
      return req.path === '/api/health';
    }
  });
};

// General API rate limiting
const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many API requests, please try again in 15 minutes'
);

// Auth rate limiting (stricter)
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  20, // 20 requests per window
  'Too many authentication attempts, please try again in 15 minutes'
);

// Payment rate limiting (very strict)
const paymentLimiter = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  10, // 10 requests per window
  'Too many payment requests, please try again in 5 minutes'
);

// Booking rate limiting
const bookingLimiter = createRateLimit(
  10 * 60 * 1000, // 10 minutes
  50, // 50 requests per window
  'Too many booking requests, please try again in 10 minutes'
);

module.exports = {
  generalLimiter,
  authLimiter,
  paymentLimiter,
  bookingLimiter
};
