import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useParkingLotDetails, useServices, useBookingPrice } from '../hooks/useAPI';
import Slot3DViewer from '../components/parking/Slot3DViewer';

const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(location.search);
  const lotId = urlParams.get('lotId');

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to book a parking slot');
      // Preserve where the user came from so we can return after login
      try {
        const intended = `${location.pathname}${location.search || ''}`;
        sessionStorage.setItem('postLoginRedirect', intended);
      } catch {}
      navigate('/auth', { state: { from: location } });
    }
  }, [navigate, location]);

  // Form states
  const [slotType, setSlotType] = useState('car');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Fetch data
  const { parkingLot, loading: lotLoading, error: lotError } = useParkingLotDetails(lotId);
  const { services, loading: servicesLoading } = useServices(lotId);
  
  // Calculate booking price
  const { priceData, loading: priceLoading, calculatePrice, resetPrice } = useBookingPrice();

  // Recalculate price when inputs change
  useEffect(() => {
    (async () => {
      if (!lotId || !startDateTime || !endDateTime) { resetPrice(); return; }
      try {
        await calculatePrice(
          lotId,
          new Date(startDateTime).toISOString(),
          new Date(endDateTime).toISOString(),
          selectedServices
        );
      } catch (err) {
        console.warn('Price calculation failed', err);
      }
    })();
  }, [lotId, startDateTime, endDateTime, selectedServices]);

  // Initialize default start and end times
  useEffect(() => {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // Format for datetime-local input
    const formatDateTime = (date) => {
      return date.toISOString().slice(0, 16);
    };

    setStartDateTime(formatDateTime(now));
    setEndDateTime(formatDateTime(twoHoursLater));
  }, []);

  // Handle service selection
  const toggleService = (serviceId) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  // Calculate duration
  const calculateDuration = () => {
    if (!startDateTime || !endDateTime) return 0;
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60))); // hours
  };

  const duration = calculateDuration();

  // Handle booking submission
  const handleBooking = () => {
    if (!startDateTime || !endDateTime || !lotId) {
      alert('Please fill in all required fields');
      return;
    }

    const bookingData = {
      parkingLotId: lotId,
      slotType,
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: new Date(endDateTime).toISOString(),
      services: selectedServices,
  totalAmount: (priceData?.total || priceData?.pricing?.totalAmount || 0),
      slotCode: selectedSlot?.code || null
    };

    // Navigate to payment page with booking data
    navigate('/payment', { state: { bookingData, parkingLot } });
  };

  if (!lotId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Invalid Booking Request</h2>
            <p className="text-red-600 mb-4">No parking lot selected for booking.</p>
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

  if (lotLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <LoadingSpinner message="Loading booking details..." />
        </div>
      </div>
    );
  }

  if (lotError || !parkingLot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Parking Lot Not Found</h2>
            <p className="text-red-600 mb-4">{lotError || 'The parking lot you are trying to book is not available.'}</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Parking Spot</h1>
          <p className="text-lg text-gray-600">{parkingLot.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Slot Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Slot Type</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {
          // Prefer explicit slotTypes if provided; else fall back to vehicleTypes
          (parkingLot.slotTypes && parkingLot.slotTypes.length > 0
            ? parkingLot.slotTypes
            : (parkingLot.vehicleTypes || []).map(t => ({ type: t, available: parkingLot.capacity?.available || 0, price: parkingLot.pricing?.hourly || 0 }))
          ).map((slot) => (
                  <button
          key={slot.type}
                    onClick={() => setSlotType(slot.type)}
                    className={`border-2 rounded-lg p-4 text-left transition-colors ${
                      slotType === slot.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={(slot.available || 0) === 0}
                  >
                    <div className="flex items-center mb-2">
                      <div className="p-2 bg-gray-100 rounded-lg mr-3">
                        {slot.type === 'car' ? (
                          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 16a2 2 0 100-4 2 2 0 000 4zM16 16a2 2 0 100-4 2 2 0 000 4z"/>
                            <path fillRule="evenodd" d="M3 4a1 1 0 00-1 1v10a1 1 0 102 0V5a1 1 0 001-1h12a1 1 0 001 1v10a1 1 0 102 0V5a1 1 0 00-1-1H3z" clipRule="evenodd"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold capitalize">{slot.type} Parking</h3>
                        <p className="text-sm text-gray-600">₹{slot.price}/hour</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      {(slot.available || 0) > 0 ? `${slot.available} slots available` : 'Fully booked'}
                    </p>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Choose Specific Slot (Optional)</h3>
                <p className="text-xs text-gray-500 mb-3">Pick an exact slot from the layout below. If you skip, one will be auto-assigned.</p>
                <Slot3DViewer lotId={lotId} onSelect={setSelectedSlot} />
                {selectedSlot && (
                  <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">Selected Slot: <strong>{selectedSlot.code}</strong></div>
                )}
              </div>
            </div>

            {/* Date and Time Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Date & Time</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDateTime" className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time</label>
                  <input
                    id="startDateTime"
                    type="datetime-local"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="endDateTime" className="block text-sm font-medium text-gray-700 mb-2">End Date & Time</label>
                  <input
                    id="endDateTime"
                    type="datetime-local"
                    value={endDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    min={startDateTime}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {duration > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Duration: <span className="font-medium">{duration} hours</span>
                  </p>
                </div>
              )}
            </div>

            {/* Services Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Services</h2>
              {(() => {
                if (servicesLoading) {
                  return (
                    <div className="text-center py-4">
                      <LoadingSpinner message="Loading services..." />
                    </div>
                  );
                }
                if (!services.length) {
                  return <p className="text-gray-500 text-center py-4">No additional services available</p>;
                }
                return (
                  <div className="space-y-4">
                    {services.map((service) => (
                      <div key={service.id} className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id={`service-${service.id}`}
                          checked={selectedServices.includes(service.id)}
                          onChange={() => toggleService(service.id)}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <label htmlFor={`service-${service.id}`} className="flex items-center cursor-pointer">
                            <div className="text-xl mr-3">{service.icon}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-900">{service.name}</h3>
                                <span className="text-lg font-semibold text-gray-900">
                                  ₹{service.price}
                                  {service.priceType === 'per-kwh' && '/kWh'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500">Duration: {service.duration} min</span>
                                {service.popular && (
                                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Popular</span>
                                )}
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>
              
              {/* Parking Lot Info */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">{parkingLot.name}</h3>
                <p className="text-sm text-gray-600">{parkingLot.address}</p>
              </div>

              {/* Booking Details */}
              <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Slot Type:</span>
                  <span className="font-medium capitalize">{slotType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{duration} hours</span>
                </div>
                {startDateTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start:</span>
                    <span className="font-medium text-sm">
                      {new Date(startDateTime).toLocaleDateString()} at{' '}
                      {new Date(startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {endDateTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">End:</span>
                    <span className="font-medium text-sm">
                      {new Date(endDateTime).toLocaleDateString()} at{' '}
                      {new Date(endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 mb-4">
                {(() => {
                  if (priceLoading) {
                    return (
                      <div className="text-center py-2">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </div>
                    );
                  }
          if (!priceData) {
                    return <div className="text-gray-500 text-center py-2">Select dates to see pricing</div>;
                  }
                  return (
                    <>
                      <div className="flex justify-between">
            <span className="text-gray-600">Parking Fee:</span>
            <span className="font-medium">₹{priceData.parkingCost ?? priceData?.pricing?.basePrice ?? 0}</span>
                      </div>
            {(priceData.servicesCost ?? priceData?.pricing?.serviceFees ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Services:</span>
              <span className="font-medium">₹{priceData.servicesCost ?? priceData?.pricing?.serviceFees ?? 0}</span>
                        </div>
                      )}
            {(priceData.tax ?? priceData?.pricing?.taxes ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tax:</span>
              <span className="font-medium">₹{priceData.tax ?? priceData?.pricing?.taxes ?? 0}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-lg font-semibold text-gray-900">₹{priceData.total ?? priceData?.pricing?.totalAmount ?? 0}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Book Button */}
              <button
                onClick={handleBooking}
                disabled={!startDateTime || !endDateTime || !priceData || priceLoading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {priceLoading ? 'Calculating...' : 'Proceed to Payment'}
              </button>

              {/* Terms */}
              <p className="text-xs text-gray-500 mt-3 text-center">
                By booking, you agree to our terms and conditions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;