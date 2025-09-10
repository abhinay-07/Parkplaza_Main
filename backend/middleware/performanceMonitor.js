// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  // Add request ID for tracking
  req.requestId = Math.random().toString(36).substring(2, 15);
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    // Prevent running the instrumentation twice
    if (res.__perfMonEnded) return originalEnd.apply(this, args);
    res.__perfMonEnded = true;

    const responseTime = Date.now() - start;

    // Log performance data
    try {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${responseTime}ms - ${req.requestId}`);
    } catch (e) {
      // Logging should never break the response
      // swallow
    }

    // Log slow requests (> 2 seconds)
    try {
      if (responseTime > 2000) {
        console.warn(`🐌 SLOW REQUEST: ${req.method} ${req.path} took ${responseTime}ms`);
      }
    } catch (e) {}

    // Add performance headers only if headers not already sent
    try {
      if (!res.headersSent) {
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        res.setHeader('X-Request-Id', req.requestId);
      } else {
        // headers already sent, skip setting headers
        console.warn('[performanceMonitor] Headers already sent; skipping perf headers');
      }
    } catch (e) {
      // Some environments may throw when setting headers; ignore to avoid crashing
      console.warn('[performanceMonitor] Failed to set headers:', e?.message || e);
    }

    return originalEnd.apply(this, args);
  };
  
  next();
};

module.exports = performanceMonitor;
