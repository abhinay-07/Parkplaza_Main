import React, { useState, useEffect } from 'react';
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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Find Perfect Parking Spots
            </h1>
            <p className="text-xl opacity-90 mb-6">
              Discover, book, and manage parking spaces with ease
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search parking lots by name or location..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Location Status */}
        {locationError && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Location Access:</strong> {locationError}. Showing default area (Delhi).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Nearby Parking ({filteredLots.length})
            </h2>
            <button
              onClick={handleRefresh}
              disabled={lotsLoading}
              className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              {lotsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-lg font-medium ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Map View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              List View
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            parkingLots={filteredLots}
          />
        </div>

        {/* Error State */}
        {lotsError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  <strong>Error loading parking lots:</strong> {lotsError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {lotsLoading ? (
          <LoadingSpinner message="Loading parking lots..." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Map/List View */}
            <div className={`${viewMode === 'map' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              {viewMode === 'map' ? (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Interactive Map
                  </h3>
                  <div className="h-96">
                    <MapContainer
                      center={[userLocation?.lat || 28.6139, userLocation?.lng || 77.2090]}
                      zoom={14}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                      />
                      {userLocation && (
                        <CircleMarker
                          center={[userLocation.lat, userLocation.lng]}
                          radius={8}
                          pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.8 }}
                        >
                          <Popup>Your location</Popup>
                        </CircleMarker>
                      )}
                      {filteredLots.map((lot) => (
                        typeof lot?.lat === 'number' && typeof lot?.lng === 'number' ? (
                          <Marker
                            key={String(lot.id)}
                            position={[lot.lat, lot.lng]}
                            eventHandlers={{ click: () => handleLotSelect(lot) }}
                          >
                            <Popup>
                              <div className="space-y-1">
                                <div className="font-semibold">{lot.name}</div>
                                <div className="text-xs text-gray-600">{lot.address}</div>
                                <div className="text-xs">Avail: {lot.availableSlots}/{lot.totalSlots}</div>
                                {lot.pricePerHour?.day != null && (
                                  <div className="text-xs">Price: ₹{lot.pricePerHour.day}/hr</div>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                        ) : null
                      ))}
                    </MapContainer>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLots.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No parking lots found</h3>
                      <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria or filters.</p>
                      <div className="mt-6">
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setFilters({
                              priceRange: [0, 100],
                              rating: 0,
                              features: [],
                              availabilityOnly: false
                            });
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                        >
                          Clear filters
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {filteredLots.map(lot => (
                        <ParkingLotCard
                          key={lot.id}
                          lot={lot}
                          onViewDetails={() => handleViewDetails(lot.id)}
                          onBookNow={() => handleBookNow(lot.id)}
                          userLocation={userLocation}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            {viewMode === 'map' && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Parking Lots
                  </h3>
                  
                  {filteredLots.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No parking lots match your criteria.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {filteredLots.map(lot => (
                        <div
                          key={lot.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleLotSelect(lot)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleLotSelect(lot);
                            }
                          }}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedLot?.id === lot.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <h4 className="font-medium text-gray-900 mb-1">{lot.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{lot.address}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-400">★</span>
                              <span className="text-sm text-gray-600">{lot.rating}</span>
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              {lot.availableSlots} slots
                            </div>
                          </div>
                          <div className="flex justify-between mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(lot.id);
                              }}
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            >
                              Details
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookNow(lot.id);
                              }}
                              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                            >
                              Book Now
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Spots</span>
                      <span className="font-medium">
                        {filteredLots.reduce((sum, lot) => sum + lot.totalSlots, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available Now</span>
                      <span className="font-medium text-green-600">
                        {filteredLots.reduce((sum, lot) => sum + lot.availableSlots, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Price</span>
                      <span className="font-medium">
                        ₹{Math.round(filteredLots.reduce((sum, lot) => sum + lot.pricePerHour.day, 0) / filteredLots.length || 0)}/hr
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
