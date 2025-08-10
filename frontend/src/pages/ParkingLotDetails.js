import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import GoogleMapsComponent from '../components/maps/GoogleMapsComponent';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useParkingLotDetails, useServices } from '../hooks/useAPI';

const ParkingLotDetails = () => {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('overview');
  
  const { parkingLot, loading: lotLoading, error: lotError } = useParkingLotDetails(lotId);
  const { services, loading: servicesLoading } = useServices(lotId);

  const handleBookNow = () => {
    const target = `/booking?lotId=${lotId}`;
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: { pathname: target } } });
      return;
    }
    navigate(target);
  };

  const handleCall = () => {
    if (parkingLot?.contact) {
      window.location.href = `tel:${parkingLot.contact}`;
    }
  };

  const handleDirections = () => {
    if (parkingLot?.lat && parkingLot?.lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${parkingLot.lat},${parkingLot.lng}`;
      window.open(url, '_blank');
    }
  };

  if (lotLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <LoadingSpinner message="Loading parking lot details..." />
        </div>
      </div>
    );
  }

  if (lotError || !parkingLot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Parking Lot Not Found</h2>
            <p className="text-red-600 mb-4">{lotError || 'The parking lot you are looking for does not exist.'}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const availabilityRatio = parkingLot.availableSlots / parkingLot.totalSlots;
  const availabilityColor = availabilityRatio > 0.5 ? 'text-green-600' : availabilityRatio > 0.2 ? 'text-yellow-600' : 'text-red-600';
  const availabilityBg = availabilityRatio > 0.5 ? 'bg-green-100' : availabilityRatio > 0.2 ? 'bg-yellow-100' : 'bg-red-100';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Parking Lot Image */}
            <div className="lg:col-span-1">
              <div className="aspect-w-16 aspect-h-12 rounded-lg overflow-hidden bg-gray-200">
                <img
                  src={parkingLot.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'}
                  alt={parkingLot.name}
                  className="w-full h-64 lg:h-full object-cover"
                />
              </div>
            </div>

            {/* Parking Lot Info */}
            <div className="lg:col-span-2">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="mb-4">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{parkingLot.name}</h1>
                  <p className="text-lg text-gray-600 mb-3">{parkingLot.address}</p>
                  
                  {/* Rating and Availability */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center">
                      <div className="flex items-center text-yellow-400 mr-2">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-5 h-5 ${i < Math.floor(parkingLot.rating) ? 'fill-current' : 'text-gray-300'}`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 15l-5.878 3.09 1.123-6.545L0 6.91l6.564-.954L10 0l3.436 5.956L20 6.91l-5.245 4.635L15.878 18z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="text-lg font-medium text-gray-900">{parkingLot.rating}</span>
                    </div>
                    
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${availabilityBg} ${availabilityColor}`}>
                      <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                      {parkingLot.availableSlots} / {parkingLot.totalSlots} available
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="flex items-center text-gray-600 mb-4">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{parkingLot.operatingHours}</span>
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">Day Pricing</div>
                      <div className="text-2xl font-bold text-blue-900">₹{parkingLot.pricePerHour.day}</div>
                      <div className="text-sm text-blue-600">per hour</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-purple-600 font-medium">Night Pricing</div>
                      <div className="text-2xl font-bold text-purple-900">₹{parkingLot.pricePerHour.night}</div>
                      <div className="text-sm text-purple-600">per hour</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={handleBookNow}
                      disabled={parkingLot.availableSlots === 0}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        parkingLot.availableSlots === 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {parkingLot.availableSlots === 0 ? 'Fully Booked' : 'Book Now'}
                    </button>
                    
                    <button
                      onClick={handleCall}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Call
                    </button>
                    
                    <button
                      onClick={handleDirections}
                      className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Directions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'slots', label: 'Slot Details' },
              { id: 'services', label: 'Services' },
              { id: 'location', label: 'Location' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Features & Amenities</h3>
                <div className="grid grid-cols-2 gap-3">
                  {parkingLot.features?.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-700">{parkingLot.contact}</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-gray-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-700">{parkingLot.address}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slots Tab */}
          {activeTab === 'slots' && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Available Slots by Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {parkingLot.slotTypes?.map((slotType, index) => (
                  <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg mr-3">
                        {slotType.type === 'car' ? (
                          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 16a2 2 0 100-4 2 2 0 000 4zM16 16a2 2 0 100-4 2 2 0 000 4z"/>
                            <path fillRule="evenodd" d="M3 4a1 1 0 00-1 1v10a1 1 0 102 0V5a1 1 0 001-1h12a1 1 0 001 1v10a1 1 0 102 0V5a1 1 0 00-1-1H3z" clipRule="evenodd"/>
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 capitalize">{slotType.type} Parking</h4>
                        <p className="text-sm text-gray-600">₹{slotType.price}/hour</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Slots</span>
                        <span className="font-medium">{slotType.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available</span>
                        <span className={`font-medium ${slotType.available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {slotType.available}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${slotType.available / slotType.total > 0.5 ? 'bg-green-500' : slotType.available / slotType.total > 0.2 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${(slotType.available / slotType.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Available Services</h3>
              {servicesLoading ? (
                <div className="text-center py-8">
                  <LoadingSpinner message="Loading services..." />
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h4 className="mt-2 text-sm font-medium text-gray-900">No services available</h4>
                  <p className="mt-1 text-sm text-gray-500">This parking lot doesn't offer additional services yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service) => (
                    <div key={service.id} className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center mb-3">
                        <div className="text-2xl mr-3">{service.icon}</div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{service.name}</h4>
                          <p className="text-sm text-gray-600">₹{service.price} {service.priceType === 'per-kwh' ? '/kWh' : ''}</p>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-3">{service.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Duration: {service.duration}min</span>
                        {service.popular && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Popular</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Location & Directions</h3>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div style={{ height: '400px' }}>
                  <GoogleMapsComponent
                    parkingLots={[parkingLot]}
                    selectedLotId={parkingLot.id}
                    showUserLocation={false}
                    height="100%"
                    zoom={16}
                    debug={true}
                    lazy={false}
                    idleDelay={0}
                  />
                </div>
              </div>
              <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-gray-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-gray-900">Address</h4>
                    <p className="text-gray-600">{parkingLot.address}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParkingLotDetails;
