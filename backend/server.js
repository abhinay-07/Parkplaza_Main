const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const logger = require('./config/logger');
// Load .env explicitly from backend directory to avoid cwd ambiguity
try {
  const envPath = path.join(__dirname, '.env');
  require('dotenv').config({ path: envPath });
  console.log('[startup] Loaded environment file:', envPath);
} catch (e) {
  console.log('[startup] Failed to load .env:', e?.message);
}
// Sanitize environment variables (common pitfalls)
if (process.env.MONGODB_URI) {
  const original = process.env.MONGODB_URI;
  const trimmed = original.trim();
  if (original !== trimmed) {
    console.log('[startup] Notice: trimmed leading/trailing whitespace from MONGODB_URI');
    process.env.MONGODB_URI = trimmed;
  }
  if (/[<>]/.test(trimmed)) {
    console.warn('[startup] Warning: MONGODB_URI still contains placeholder angle brackets < >. Replace with real credentials.');
  }
}
console.log('[startup] Beginning server initialization...');
process.stdin.resume();
console.log('[trace] stdin resumed');

// Import routes (instrumented)
let authRoutes, parkingRoutes, bookingRoutes, servicesRoutes, placesRoutes, contactRoutes;
try { authRoutes = require('./routes/auth'); console.log('[trace] authRoutes loaded'); } catch (e) { console.error('[trace][err] authRoutes', e); }
try { contactRoutes = require('./routes/contact'); console.log('[trace] contactRoutes loaded'); } catch (e) { console.error('[trace][err] contactRoutes', e); }
try { parkingRoutes = require('./routes/parking'); console.log('[trace] parkingRoutes loaded'); } catch (e) { console.error('[trace][err] parkingRoutes', e); }
try { bookingRoutes = require('./routes/booking'); console.log('[trace] bookingRoutes loaded'); } catch (e) { console.error('[trace][err] bookingRoutes', e); }
try { servicesRoutes = require('./routes/services'); console.log('[trace] servicesRoutes loaded'); } catch (e) { console.error('[trace][err] servicesRoutes', e); }
try { placesRoutes = require('./routes/places'); console.log('[trace] placesRoutes loaded'); } catch (e) { console.error('[trace][err] placesRoutes', e); }

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');
const performanceMonitor = require('./middleware/performanceMonitor');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');

const app = express();
console.log('[trace] Express app created');
const server = http.createServer(app);
console.log('[trace] HTTP server created');
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
console.log('[trace] PORT resolved:', PORT);

// Middleware (CORS must be first so preflight gets headers)
const allowAllCors = String(process.env.CORS_ALLOW_ALL || '').toLowerCase() === 'true';
const corsOptions = {
  origin: allowAllCors ? true : (process.env.FRONTEND_URL || "http://localhost:3000"),
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
// Explicitly handle preflight for all routes
app.options('*', cors(corsOptions));

app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow embedding for Maps
}));
app.use(performanceMonitor);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: logger.stream }));
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('[trace] Core middleware mounted');

// --- MongoDB Connection (with retry, diagnostics, and optional fallback) ---
const primaryMongoURI = process.env.MONGODB_URI || '';
const localFallbackURI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/parkplaza';
const allowLocalFallback = String(process.env.MONGO_ENABLE_LOCAL_FALLBACK || 'true').toLowerCase() !== 'false';
const effectiveURI = primaryMongoURI || localFallbackURI; // if no cloud URI provided, use local directly
const redact = (uri) => (uri || '').replace(/\/\/.*@/, '//****:****@');
logger.info(`Connecting to MongoDB: ${redact(effectiveURI)}`);

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL || '10', 10),
  serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '5000', 10),
  socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000', 10),
  bufferCommands: false,
};

// Optional DEV override for TLS-intercepted networks (NOT for production)
if (String(process.env.MONGO_ALLOW_INVALID_CERTS || '').toLowerCase() === 'true') {
  mongoOptions.tlsAllowInvalidCertificates = true;
  logger.warn('[mongo] tlsAllowInvalidCertificates enabled by env MONGO_ALLOW_INVALID_CERTS=true (dev only)');
}

let mongoConnected = false;
let firstConnectAttemptAt = Date.now();
let attempts = 0;
const MAX_RETRIES = parseInt(process.env.MONGO_MAX_RETRIES || '8', 10); // exponential backoff ceiling

function connectivityHints(err) {
  const msgs = [];
  if (/IP whitelist/i.test(err.message) || /not authorized/i.test(err.message)) {
    msgs.push('➡ Verify your current public IP is added in Atlas Network Access (or temporarily use 0.0.0.0/0 for dev).');
  }
  if (/ENOTFOUND|dns/i.test(err.message)) {
    msgs.push('➡ DNS issue: ensure network allows DNS SRV lookups (try pinging your cluster domain).');
  }
  if (/SSL|TLS|certificate/i.test(err.message)) {
    msgs.push('➡ TLS issue: make sure Node version supports TLS 1.2+, and local firewall / proxy is not intercepting.');
  }
  if (/handshake|server selection timeout/i.test(err.message)) {
    msgs.push('➡ Cluster may be paused or unreachable; confirm cluster state in Atlas UI.');
  }
  if (effectiveURI.includes('mongodb+srv://') && !/retryWrites=true/.test(effectiveURI)) {
    msgs.push('➡ Consider adding retryWrites=true&w=majority for better reliability.');
  }
  return msgs;
}

async function connectWithRetry(uri, isFallback = false) {
  attempts += 1;
  const attemptTag = `MongoAttempt#${attempts}`;
  if (attempts === 1) {
    logger.info('🟡 Initiating MongoDB connection...');
  } else {
    logger.warn(`🔄 Retrying MongoDB connection (${attempts})...`);
  }
  try {
    await mongoose.connect(uri, mongoOptions);
    mongoConnected = true;
    const ms = Date.now() - firstConnectAttemptAt;
    logger.info(`✅ MongoDB connected after ${attempts} attempt(s) in ${ms}ms`);
    logger.info(`📊 Database: ${mongoose.connection.db.databaseName}`);
  } catch (err) {
    mongoConnected = false;
    logger.error(`❌ ${attemptTag} failed: ${err.message}`);
    logger.error(`Connection string used: ${redact(uri)}`);
    const hints = connectivityHints(err);
    if (hints.length) {
      hints.forEach(h => logger.warn(h));
    }
    if (attempts < MAX_RETRIES) {
      const backoffMs = Math.min(30000, 500 * Math.pow(2, attempts - 1));
      logger.warn(`⏲ Next retry in ${backoffMs}ms (max ${MAX_RETRIES} attempts).`);
      setTimeout(() => connectWithRetry(uri, isFallback), backoffMs).unref();
    } else {
      // Primary attempts exhausted
      const canFallback = !isFallback && allowLocalFallback && uri !== localFallbackURI;
      if (canFallback) {
        logger.error('🛑 Max MongoDB retry attempts reached for primary. Attempting local fallback...');
        attempts = 0; // reset attempts for fallback
        firstConnectAttemptAt = Date.now();
        logger.info(`Connecting to local MongoDB: ${redact(localFallbackURI)}`);
        setTimeout(() => connectWithRetry(localFallbackURI, true), 200).unref();
      } else {
        logger.error('🛑 Max MongoDB retry attempts reached. Running in degraded (no-DB) mode.');
      }
    }
  }
}

connectWithRetry(effectiveURI);

// Periodic status log (every 60s) until connected
const statusInterval = setInterval(() => {
  if (mongoConnected) {
    clearInterval(statusInterval);
    return;
  }
  logger.warn('⌛ MongoDB still not connected (degraded mode active).');
}, 60000).unref();

// Fallback watchdog: explicit degraded-mode notice if still disconnected after 10s
setTimeout(() => {
  if (!mongoConnected) {
    logger.warn('⚠️ MongoDB not connected after 10s. Continuing in degraded (no-DB) mode.');
  }
}, 10000).unref();

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('✅ MongoDB reconnected');
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  // Join parking lot room for real-time updates
  socket.on('join-lot', (lotId) => {
    socket.join(`lot-${lotId}`);
    logger.info(`Socket ${socket.id} joined room lot-${lotId}`);
  });
  
  // Leave parking lot room
  socket.on('leave-lot', (lotId) => {
    socket.leave(`lot-${lotId}`);
    logger.info(`Socket ${socket.id} left room lot-${lotId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/services', servicesRoutes);
if (placesRoutes) {
  app.use('/api/places', placesRoutes);
}
console.log('[trace] Routes registered');

// Optionally serve built frontend for quick sharing (set SERVE_FRONTEND=true)
if (String(process.env.SERVE_FRONTEND || '').toLowerCase() === 'true') {
  const staticPath = path.resolve(__dirname, '../frontend/build');
  app.use(express.static(staticPath));
  // Serve index.html for all non-API routes (SPA fallback)
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
  logger.info(`📦 Serving frontend from ${staticPath}`);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'ParkPlaza API is running',
  mongoConnected,
    timestamp: new Date().toISOString()
  });
});

// CORS diagnostics
app.get('/api/diagnostics/cors', (req, res) => {
  res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.json({
    originReceived: req.headers.origin,
    allowedOrigin: process.env.FRONTEND_URL || 'http://localhost:3000'
  });
});

// Maps status endpoint (diagnostics only; does not expose keys)
app.get('/api/maps/status', (req, res) => {
  res.status(200).json({
    success: true,
    hasBackendKey: Boolean(process.env.GOOGLE_MAPS_API_KEY),
    hasFrontendKey: Boolean(process.env.REACT_APP_GOOGLE_MAPS_API_KEY),
    frontendOrigin: process.env.FRONTEND_URL || 'http://localhost:3000',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Lightweight diagnostics (enabled only if DEBUG_STATUS_TOKEN set)
app.get('/api/debug/status', (req, res) => {
  const token = process.env.DEBUG_STATUS_TOKEN;
  if (token) {
    const provided = req.headers['x-debug-token'];
    if (provided !== token) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
  } else {
    // If no token configured, disable endpoint in production
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) return res.status(404).json({ success: false, message: 'Not found' });
  }
  const conn = mongoose.connection;
  res.status(200).json({
    success: true,
    env: {
      node: process.version,
      environment: process.env.NODE_ENV || 'development'
    },
    database: {
      readyState: conn.readyState, // 0=disconnected,1=connected,2=connecting,3=disconnecting
      name: conn.db?.databaseName,
      host: conn.host,
      user: conn.user
    },
    frontendOrigin: process.env.FRONTEND_URL,
    hasMapsKey: Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    status: err.status || 500,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

console.log('[trace] About to call server.listen');
server.listen(PORT, HOST, (err) => {
  if (err) {
    logger.error(`Server listen error: ${err.message}`);
    console.log('[trace] server.listen error callback');
    return;
  }
  logger.info(`🚀 ParkPlaza server running on http://${HOST}:${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('[trace] server.listen success callback');
});

server.on('error', (err) => {
  logger.error('HTTP server error:', err);
});

// Heartbeat to keep process alive & show it's running
setInterval(() => {
  logger.debug('Heartbeat: process alive');
}, 30000).unref();

// Global process diagnostics
process.on('exit', (code) => {
  console.log(`[process] Exiting with code ${code}`);
});
process.on('uncaughtException', (err) => {
  console.error('[process] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled Rejection:', reason);
});

module.exports = { app, io };
