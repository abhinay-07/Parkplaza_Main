import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import LocalParkingOutlinedIcon from '@mui/icons-material/LocalParkingOutlined';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';
import NavigationOutlinedIcon from '@mui/icons-material/NavigationOutlined';

// Components
import ParkingMap from '../components/parking/ParkingMap';
import ParkingLotCard from '../components/parking/ParkingLotCard';
import SearchFilters from '../components/parking/SearchFilters';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Redux
import { fetchParkingLots, setFilters } from '../store/slices/parkingSlice';

const HomePage = () => {
  const dispatch = useDispatch();
  const { lots, loading, error, filters, pagination } = useSelector((state) => state.parking);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          
          // Update filters with user location
          dispatch(setFilters({
            lat: latitude,
            lng: longitude,
            radius: 10
          }));
        },
        (error) => {
          console.log('Location access denied:', error);
          // Fetch lots without location
          dispatch(fetchParkingLots(filters));
        }
      );
    } else {
      // Geolocation not supported
      dispatch(fetchParkingLots(filters));
    }
  }, []);

  useEffect(() => {
    // Fetch parking lots when filters change
    if (userLocation || Object.values(filters).some(v => v)) {
      dispatch(fetchParkingLots(filters));
    }
  }, [dispatch, filters, userLocation]);

  const handleSearch = (searchTerm) => {
    dispatch(setFilters({ search: searchTerm }));
  };

  const handleFilterChange = (newFilters) => {
    dispatch(setFilters(newFilters));
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'grid' ? 'map' : 'grid');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Find Your Perfect
              <span className="block text-gradient">Parking Spot</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Smart parking management system for urban mobility
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by location, city, or landmark..."
                  className="w-full px-6 py-4 pl-12 rounded-xl text-gray-900 text-lg focus:outline-none focus:ring-4 focus:ring-white/30"
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <SearchOutlinedIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center"
              >
                <LocalParkingOutlinedIcon className="text-4xl mb-2" />
                <h3 className="text-2xl font-bold">{lots.length}+</h3>
                <p className="text-blue-100">Parking Locations</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-center"
              >
                <StarOutlinedIcon className="text-4xl mb-2" />
                <h3 className="text-2xl font-bold">4.8</h3>
                <p className="text-blue-100">Average Rating</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-center"
              >
                <NavigationOutlinedIcon className="text-4xl mb-2" />
                <h3 className="text-2xl font-bold">Real-time</h3>
                <p className="text-blue-100">Live Navigation</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <FilterListOutlinedIcon />
              Filters
            </button>
            
            {userLocation && (
              <div className="flex items-center gap-2 text-gray-600">
                <LocationOnOutlinedIcon className="text-primary-600" />
                <span>Near your location</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-gray-600">View:</span>
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'grid' 
                    ? 'bg-white shadow text-primary-600' 
                    : 'text-gray-600'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'map' 
                    ? 'bg-white shadow text-primary-600' 
                    : 'text-gray-600'
                }`}
              >
                Map
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <SearchFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-6">
            <p className="text-error-800">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lots.map((lot) => (
                  <motion.div
                    key={lot._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ParkingLotCard lot={lot} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="h-96 rounded-xl overflow-hidden shadow-lg">
                <ParkingMap
                  lots={lots}
                  center={userLocation}
                  zoom={12}
                />
              </div>
            )}

            {/* No Results */}
            {lots.length === 0 && (
              <div className="text-center py-12">
                <LocalParkingOutlinedIcon className="text-6xl text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No parking lots found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your search criteria or location
                </p>
              </div>
            )}

            {/* Pagination */}
            {pagination.total > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2">
                  {pagination.hasPrev && (
                    <button
                      onClick={() => dispatch(setFilters({ page: pagination.current - 1 }))}
                      className="btn btn-secondary"
                    >
                      Previous
                    </button>
                  )}
                  
                  <span className="px-4 py-2 text-gray-600">
                    Page {pagination.current} of {pagination.total}
                  </span>
                  
                  {pagination.hasNext && (
                    <button
                      onClick={() => dispatch(setFilters({ page: pagination.current + 1 }))}
                      className="btn btn-secondary"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;
