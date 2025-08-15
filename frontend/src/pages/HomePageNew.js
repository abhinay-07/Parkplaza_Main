import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ParkingLotCard from '../components/parking/ParkingLotCardNew';
import SearchFilters from '../components/parking/SearchFiltersNew';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useGeolocation } from '../hooks/useGeolocation';
import { useParkingLots } from '../hooks/useAPI';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [searchParams] = useSearchParams();
  const [selectedLot, setSelectedLot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    priceRange: [0, 100],
    rating: 0,
    features: [],
    availabilityOnly: true
  });
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'

  // Ensure Leaflet default icons work across bundlers
  try {
    // eslint-disable-next-line no-underscore-dangle
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  } catch (_) {}

  // Get user location
  const { location: userLocation, loading: locationLoading, error: locationError } = useGeolocation();
  
  // Get parking lots
  const { parkingLots, loading: lotsLoading, error: lotsError, refetch } = useParkingLots(userLocation);

  // Sample/demo lots to always show alongside nearby results
  const sampleLots = React.useMemo(() => {
    const base = userLocation?.lat && userLocation?.lng ? { lat: userLocation.lat, lng: userLocation.lng } : { lat: 28.6139, lng: 77.2090 };
    return [
      {
        id: 'demo-central-mall',
        name: 'Demo Central Mall Parking',
        address: 'Connaught Place, New Delhi',
        lat: base.lat + 0.01,
        lng: base.lng + 0.01,
        availableSlots: 35,
        totalSlots: 120,
        pricePerHour: { day: 40, night: 40 },
        rating: 4.3,
        features: ['covered','security','cctv']
      },
      {
        id: 'demo-riverfront',
        name: 'Demo Riverfront Parking',
        address: 'Near Riverwalk, City Center',
        lat: base.lat - 0.008,
        lng: base.lng - 0.006,
        availableSlots: 12,
        totalSlots: 60,
        pricePerHour: { day: 30, night: 30 },
        rating: 4.0,
        features: ['open-air','lighting']
      }
    ];
  }, [userLocation]);

  // Handle search from URL params
  useEffect(() => {
    const query = searchParams.get('search');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  // Merge API lots with demo samples
  const lotsWithSamples = React.useMemo(() => {
    // Avoid duplicates if API returns same IDs
    const ids = new Set((parkingLots || []).map(l => String(l.id)));
    const extras = sampleLots.filter(l => !ids.has(String(l.id)));
    return [...parkingLots, ...extras];
  }, [parkingLots, sampleLots]);

  // Filter parking lots based on search and filters
  const filteredLots = lotsWithSamples.filter(lot => {
    // Search query filter
    if (searchQuery && !lot.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !lot.address.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Price filter
    const maxPrice = Math.max(lot.pricePerHour.day, lot.pricePerHour.night);
    if (maxPrice < filters.priceRange[0] || maxPrice > filters.priceRange[1]) {
      return false;
    }

    // Rating filter
    if (lot.rating < filters.rating) {
      return false;
    }

    // Availability filter
    if (filters.availabilityOnly && lot.availableSlots === 0) {
      return false;
    }

    // Features filter
    if (filters.features.length > 0) {
      const hasRequiredFeatures = filters.features.every(feature => 
        lot.features.includes(feature)
      );
      if (!hasRequiredFeatures) {
        return false;
      }
    }

    return true;
  });

  const handleLotSelect = (lot) => {
    setSelectedLot(lot);
  };

  const handleBookNow = (lotId) => {
    const target = `/booking?lotId=${lotId}`;
    if (!isAuthenticated) {
      try { sessionStorage.setItem('postLoginRedirect', target); } catch {}
      navigate('/auth', { state: { from: target } });
      return;
    }
    navigate(target);
  };

  const handleViewDetails = (lotId) => {
    navigate(`/parking/${lotId}`);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleRefresh = () => {
    refetch();
  };

  if (locationLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <LoadingSpinner message="Getting your location..." />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Cars Animation */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-20 left-10 opacity-20"
        >
          <div className="text-6xl">🚗</div>
        </motion.div>
        
        <motion.div
          animate={{
            x: [0, -150, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
            delay: 5
          }}
          className="absolute top-40 right-20 opacity-20"
        >
          <div className="text-5xl">🚙</div>
        </motion.div>

        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
            delay: 10
          }}
          className="absolute bottom-32 left-32 opacity-20"
        >
          <div className="text-4xl">🚕</div>
        </motion.div>

        {/* Parking Building Silhouettes */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent">
          <div className="flex justify-around items-end h-full">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "80px" }}
              transition={{ duration: 2, delay: 0.5 }}
              className="w-16 bg-gradient-to-t from-blue-600/30 to-blue-400/30 rounded-t-lg"
            />
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "100px" }}
              transition={{ duration: 2, delay: 1 }}
              className="w-16 bg-gradient-to-t from-purple-600/30 to-purple-400/30 rounded-t-lg"
            />
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "120px" }}
              transition={{ duration: 2, delay: 1.5 }}
              className="w-16 bg-gradient-to-t from-indigo-600/30 to-indigo-400/30 rounded-t-lg"
            />
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "90px" }}
              transition={{ duration: 2, delay: 2 }}
              className="w-16 bg-gradient-to-t from-blue-600/30 to-blue-400/30 rounded-t-lg"
            />
          </div>
        </div>

        {/* Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
          }}
          className="absolute top-20 right-32 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"
        />
        
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            delay: 2,
          }}
          className="absolute bottom-32 left-20 w-80 h-80 bg-gradient-to-r from-indigo-400/20 to-blue-600/20 rounded-full blur-3xl"
        />
      </div>

      {/* Main Hero Content */}
      <div className="relative z-10">
        {/* Navigation/Header Space */}
        <div className="pt-20">
          
          {/* Hero Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              
              {/* Main Headline with Typing Animation */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                className="mb-8"
              >
                <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6">
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-600 bg-clip-text text-transparent"
                  >
                    ParkPlaza
                  </motion.span>
                  <br />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.8 }}
                    className="text-lg md:text-2xl font-medium relative inline-block"
                  >
                    <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent font-semibold tracking-wide">
                      A Smart Parking Revolution
                    </span>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 1.8, duration: 1.2, ease: "easeInOut" }}
                      className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-blue-400 to-purple-500 origin-left"
                    />
                  </motion.span>
                </h1>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5, duration: 0.8 }}
                  className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
                >
                  Discover, book, and manage parking spaces with cutting-edge technology. 
                  Say goodbye to parking stress forever.
                </motion.p>
              </motion.div>

              {/* 3D Card with Search */}
              <motion.div
                initial={{ opacity: 0, y: 50, rotateX: 15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 2, duration: 1 }}
                className="max-w-4xl mx-auto mb-12"
              >
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8">
                  <div className="grid md:grid-cols-3 gap-6">
                    
                    {/* Search Input */}
                    <div className="md:col-span-2">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileFocus={{ scale: 1.02 }}
                        className="relative"
                      >
                        <input
                          type="text"
                          placeholder="🔍 Search parking by location, mall, or landmark..."
                          value={searchQuery}
                          onChange={(e) => handleSearch(e.target.value)}
                          className="w-full px-6 py-4 bg-white/90 rounded-2xl border-0 text-gray-800 placeholder-gray-500 text-lg focus:ring-4 focus:ring-blue-400/50 focus:outline-none shadow-lg"
                        />
                        <motion.div
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>

                    {/* Search Button */}
                    <motion.button
                      onClick={() => handleSearch(searchQuery)}
                      whileHover={{ 
                        scale: 1.05,
                        boxShadow: "0 20px 40px rgba(59, 130, 246, 0.4)"
                      }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg text-lg transition-all duration-300"
                    >
                      Find Parking
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Feature Cards */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3, duration: 1 }}
                className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16"
              >
                {[
                  {
                    icon: "🎯",
                    title: "Real-Time Availability",
                    description: "Live updates on parking spot availability",
                    color: "from-blue-500 to-cyan-500"
                  },
                  {
                    icon: "⚡",
                    title: "Instant Booking",
                    description: "Reserve your spot in seconds",
                    color: "from-purple-500 to-pink-500"
                  },
                  {
                    icon: "🔒",
                    title: "Secure Payments",
                    description: "Safe and encrypted transactions",
                    color: "from-green-500 to-emerald-500"
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3.5 + index * 0.2, duration: 0.8 }}
                    whileHover={{ 
                      y: -10,
                      rotateY: 5,
                      scale: 1.05
                    }}
                    className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300"
                  >
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-300">{feature.description}</p>
                    <div className={`w-full h-1 bg-gradient-to-r ${feature.color} rounded-full mt-4 opacity-80`}></div>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 4, duration: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/auth')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-full shadow-lg text-lg transition-all duration-300"
                >
                  Get Started Free
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/10 backdrop-blur-lg border border-white/30 text-white font-bold py-3 px-8 rounded-full hover:bg-white/20 transition-all duration-300"
                >
                  Watch Demo
                </motion.button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.5, duration: 1 }}
          className="mt-20 py-12 bg-white/5 backdrop-blur-lg border-t border-white/10"
        >
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              {[
                { number: "Growing Every Minute", label: "Happy Users" },
                { number: "Expanding City by City", label: "Parking Spots" },
                { number: "Targeting Global Reach", label: "Cities" },
                { number: "Always Ready, Always Reliable", label: "Uptime" }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 5 + index * 0.1, duration: 0.6 }}
                  className="text-white"
                >
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {stat.number}
                  </div>
                  <div className="text-gray-300 mt-2">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Location Status */}
      {locationError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-yellow-500/90 backdrop-blur-lg text-white px-4 py-2 rounded-lg shadow-lg z-50"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">Using default location</span>
          </div>
        </motion.div>
      )}

      {/* Scroll Down Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60"
      >
        <div className="flex flex-col items-center">
          <span className="text-sm mb-2">Scroll for parking options</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </motion.div>

      {/* Floating Action Button for Quick Search */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 5, type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-2xl"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </motion.button>
      </motion.div>
    </div>
    
    {/* Search & Results Section */}
    <div id="search-section" className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Find Your Perfect
            <span className="gradient-text"> Parking Spot</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover available parking spaces near you with real-time updates and instant booking
          </p>
        </motion.div>

        {/* Enhanced Search Filters */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            parkingLots={filteredLots}
          />
        </motion.div>

        {/* View Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="flex justify-center mb-8"
        >
          <div className="bg-white rounded-2xl p-2 shadow-lg">
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setViewMode('map')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  viewMode === 'map'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🗺️ Map View
              </motion.button>
              <motion.button
                onClick={() => setViewMode('list')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋 List View
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {lotsLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center items-center py-20"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-6xl mb-4"
              >
                🚗
              </motion.div>
              <p className="text-xl text-gray-600">Finding amazing parking spots...</p>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {lotsError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center"
          >
            <div className="text-4xl mb-4">😔</div>
            <h3 className="text-xl font-semibold text-red-800 mb-2">Oops! Something went wrong</h3>
            <p className="text-red-600 mb-4">{lotsError}</p>
            <motion.button
              onClick={handleRefresh}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-red-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-700 transition-colors"
            >
              Try Again
            </motion.button>
          </motion.div>
        )}

        {/* Results */}
        {!lotsLoading && !lotsError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {filteredLots.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-lg p-12 text-center"
              >
                <div className="text-6xl mb-6">🚫</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No parking spots found</h3>
                <p className="text-gray-600 mb-8">Try adjusting your search criteria or explore different areas</p>
                <motion.button
                  onClick={() => {
                    setSearchQuery('');
                    setFilters({
                      priceRange: [0, 100],
                      rating: 0,
                      features: [],
                      availabilityOnly: false
                    });
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Reset Filters
                </motion.button>
              </motion.div>
            ) : (
              <div className="space-y-8">
                {/* Results Header */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Found {filteredLots.length} parking spots
                    </h3>
                    <p className="text-gray-600">
                      {filteredLots.reduce((sum, lot) => sum + lot.availableSlots, 0)} spaces available now
                    </p>
                  </div>
                  <motion.button
                    onClick={handleRefresh}
                    disabled={lotsLoading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white border border-gray-200 px-6 py-3 rounded-xl font-medium text-gray-700 hover:border-gray-300 transition-all disabled:opacity-50"
                  >
                    {lotsLoading ? '🔄' : '↻'} Refresh
                  </motion.button>
                </motion.div>

                {/* View Content - Map or List */}
                {viewMode === 'map' ? (
                  /* Map View */
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="bg-white rounded-3xl shadow-lg overflow-hidden"
                  >
                    <div className="flex flex-col lg:flex-row h-[600px]">
                      {/* Map Section - Left Side */}
                      <div className="flex-1 lg:w-2/3 h-64 lg:h-full">
                        <MapContainer
                          center={[userLocation?.lat || 28.6139, userLocation?.lng || 77.2090]}
                          zoom={13}
                          style={{ height: '100%', width: '100%' }}
                          className="rounded-t-3xl lg:rounded-l-3xl lg:rounded-tr-none"
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          
                          {/* User Location Marker */}
                          {userLocation && (
                            <CircleMarker
                              center={[userLocation.lat, userLocation.lng]}
                              radius={8}
                              fillColor="#3b82f6"
                              color="#1e40af"
                              weight={2}
                              opacity={1}
                              fillOpacity={0.8}
                            >
                              <Popup>
                                <div className="text-center">
                                  <strong>Your Location</strong>
                                </div>
                              </Popup>
                            </CircleMarker>
                          )}
                          
                          {/* Parking Lot Markers */}
                          {filteredLots.map((lot) => (
                            <Marker
                              key={lot.id}
                              position={[lot.lat, lot.lng]}
                            >
                              <Popup>
                                <div className="p-2 min-w-[200px]">
                                  <h3 className="font-bold text-gray-800 mb-2">{lot.name}</h3>
                                  <p className="text-sm text-gray-600 mb-2">{lot.address}</p>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-green-600">
                                      {lot.availableSlots} spots available
                                    </span>
                                    <span className="text-sm font-bold text-blue-600">
                                      ₹{lot.pricePerHour.day}/hr
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => navigate(`/booking?lotId=${lot.id}`)}
                                    disabled={lot.availableSlots === 0}
                                    className={`w-full bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors ${lot.availableSlots === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''}`}
                                  >
                                    {lot.availableSlots === 0 ? 'Full' : 'Book Now'}
                                  </button>
                                </div>
                              </Popup>
                            </Marker>
                          ))}
                        </MapContainer>
                      </div>
                      
                      {/* Details Section - Right Side */}
                      <div className="lg:w-1/3 h-96 lg:h-full overflow-y-auto p-6 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200">
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">Available Parking Lots</h3>
                          <p className="text-sm text-gray-600">Click on a marker or lot below to view details</p>
                        </div>
                        
                        <div className="space-y-4">
                          {filteredLots.map((lot, index) => (
                            <motion.div
                              key={lot.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: index * 0.1 }}
                              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-gray-200"
                              whileHover={{ scale: 1.02 }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-800 text-sm pr-2">{lot.name}</h4>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full whitespace-nowrap">
                                  {lot.availableSlots} spots
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mb-2">{lot.address}</p>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">📍 {lot.distance}km away</span>
                                <span className="font-bold text-blue-600">₹{lot.pricePerHour.day}/hr</span>
                              </div>
                              <div className="flex items-center mt-2">
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <span
                                      key={i}
                                      className={`text-xs ${
                                        i < Math.floor(lot.rating) ? 'text-yellow-400' : 'text-gray-300'
                                      }`}
                                    >
                                      ⭐
                                    </span>
                                  ))}
                                  <span className="text-xs text-gray-600 ml-1">({lot.rating})</span>
                                </div>
                              </div>
                              <button
                                onClick={() => navigate(`/booking?lotId=${lot.id}`)}
                                disabled={lot.availableSlots === 0}
                                className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${lot.availableSlots === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                              >
                                {lot.availableSlots === 0 ? 'Full' : 'Book Now'}
                              </button>
                            </motion.div>
                          ))}
                        </div>
                        
                        <motion.button
                          onClick={() => setViewMode('list')}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                        >
                          Switch to List View
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* List View */
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                  >
                    {filteredLots.map((lot, index) => (
                      <motion.div
                        key={lot.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        whileHover={{ y: -5 }}
                        className="interactive-card"
                      >
                        <ParkingLotCard
                          lot={lot}
                          onViewDetails={() => handleViewDetails(lot.id)}
                          onBookNow={() => handleBookNow(lot.id)}
                          userLocation={userLocation}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
    </>
  );
};

export default HomePage;
