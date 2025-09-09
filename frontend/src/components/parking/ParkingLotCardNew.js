import React from 'react';
import { useNavigate } from 'react-router-dom';

const ParkingLotCard = ({ lot, onViewDetails, onBookNow, userLocation }) => {
  const navigate = useNavigate();
  // Calculate distance if user location is available
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return d;
  };

  const distance = userLocation 
    ? calculateDistance(userLocation.lat, userLocation.lng, lot.lat, lot.lng)
    : null;

  const availabilityRatio = lot.availableSlots / lot.totalSlots;
  const availabilityColor = availabilityRatio > 0.5 
    ? 'text-green-600' 
    : availabilityRatio > 0.2 
      ? 'text-yellow-600' 
      : 'text-red-600';

  const availabilityBg = availabilityRatio > 0.5 
    ? 'bg-green-100' 
    : availabilityRatio > 0.2 
      ? 'bg-yellow-100' 
      : 'bg-red-100';

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      {/* Image */}
      <div className="h-48 bg-gray-200 relative">
        <img
          src={lot.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500'}
          alt={lot.name}
          className="w-full h-full object-cover"
        />
        
        {/* Availability Badge */}
        <div className={`absolute top-3 right-3 ${availabilityBg} ${availabilityColor} px-2 py-1 rounded-full text-xs font-medium`}>
          {lot.availableSlots} / {lot.totalSlots} slots
        </div>

        {/* Distance Badge */}
        {distance && (
          <div className="absolute top-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs font-medium">
            {distance < 1 
              ? `${Math.round(distance * 1000)}m away`
              : `${distance.toFixed(1)}km away`
            }
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
            {lot.name}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {lot.address}
          </p>
        </div>

        {/* Rating and Operating Hours */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="flex items-center text-yellow-400 mr-1">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L0 6.91l6.564-.954L10 0l3.436 5.956L20 6.91l-5.245 4.635L15.878 18z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">{lot.rating}</span>
          </div>
          
          <div className="text-xs text-gray-500">
            {lot.operatingHours}
          </div>
        </div>

        {/* Pricing */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex-1">
            <div className="flex items-baseline">
              <span className="text-lg font-bold text-gray-900">₹{lot.pricePerHour.day}</span>
              <span className="text-sm text-gray-500 ml-1">/hr day</span>
            </div>
            <div className="text-sm text-gray-600">
              ₹{lot.pricePerHour.night}/hr night
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {lot.features?.slice(0, 3).map((feature, index) => (
              <span 
                key={index}
                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
              >
                {feature}
              </span>
            ))}
            {lot.features?.length > 3 && (
              <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                +{lot.features.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Slot Types */}
        {lot.slotTypes && (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {lot.slotTypes.map((slotType, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
                  <div className="flex items-center">
                    {slotType.type === 'car' ? (
                      <svg className="w-3 h-3 mr-1 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 16a2 2 0 100-4 2 2 0 000 4zM16 16a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fillRule="evenodd" d="M3 4a1 1 0 00-1 1v10a1 1 0 102 0V5a1 1 0 001-1h12a1 1 0 001 1v10a1 1 0 102 0V5a1 1 0 00-1-1H3z" clipRule="evenodd"/>
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 mr-1 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                      </svg>
                    )}
                    <span className="text-gray-600 capitalize">{slotType.type}</span>
                  </div>
                  <span className={`font-medium ${slotType.available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {slotType.available}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails(lot.id)}
            className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 px-4 rounded-lg font-medium text-sm transition-colors"
          >
            View Details
          </button>
          <button
            onClick={() => {
              const target = `/booking?lotId=${lot.id}`;
              // Prefer local navigation but preserve onBookNow prop if provided
              if (onBookNow) {
                try { onBookNow(lot.id); return; } catch (e) {}
              }
              // Otherwise do internal navigation and auth redirect handling
              const token = localStorage.getItem('token');
              if (!token) {
                try { sessionStorage.setItem('postLoginRedirect', target); } catch {}
                navigate('/auth', { state: { from: target } });
                return;
              }
              navigate(target);
            }}
            disabled={lot.availableSlots === 0}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
              lot.availableSlots === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {lot.availableSlots === 0 ? 'Full' : 'Book Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParkingLotCard;
