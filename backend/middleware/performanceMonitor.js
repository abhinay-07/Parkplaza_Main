// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  // Add request ID for tracking
  req.requestId = Math.random().toString(36).substring(2, 15);
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - start;
    
    // Log performance data
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${responseTime}ms - ${req.requestId}`);
    
    // Log slow requests (> 2 seconds)
    if (responseTime > 2000) {
      console.warn(`🐌 SLOW REQUEST: ${req.method} ${req.path} took ${responseTime}ms`);
    }
    
    // Add performance headers
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.setHeader('X-Request-Id', req.requestId);
    
    originalEnd.apply(this, args);
  };
  
  next();
};

module.exports = performanceMonitor;
