import React from 'react';
import { Link } from 'react-router-dom';
import { 
  LocationOnOutlined, 
  StarOutlined, 
  LocalParkingOutlined,
  AttachMoneyOutlined 
} from '@mui/icons-material';

const ParkingLotCard = ({ lot }) => {
  const occupancyRate = lot.liveStatus?.occupancyRate || 0;
  const isAvailable = lot.capacity?.available > 0;

  return (
    <div className="card card-hover">
      {/* Image */}
      <div className="relative">
        <img
          src={lot.images?.[0]?.url || '/placeholder-parking.jpg'}
          alt={lot.name}
          className="w-full h-48 object-cover rounded-t-xl"
        />
        <div className="absolute top-3 right-3">
          <span className={`badge ${isAvailable ? 'badge-success' : 'badge-error'}`}>
            {isAvailable ? 'Available' : 'Full'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{lot.name}</h3>
        
        {/* Location */}
        <div className="flex items-center gap-1 text-gray-600 mb-2">
          <LocationOnOutlined className="text-sm" />
          <span className="text-sm">
            {lot.location?.address?.city}, {lot.location?.address?.state}
          </span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <StarOutlined className="text-yellow-500 text-sm" />
          <span className="text-sm font-medium">{lot.rating?.average || 4.5}</span>
          <span className="text-sm text-gray-500">({lot.rating?.count || 0} reviews)</span>
        </div>

        {/* Availability and Price */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-1">
            <LocalParkingOutlined className="text-primary-600" />
            <span className="text-sm">
              {lot.capacity?.available || 0}/{lot.capacity?.total || 0} spots
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <AttachMoneyOutlined className="text-success-600 text-sm" />
            <span className="font-semibold">₹{lot.pricing?.hourly || 0}/hr</span>
          </div>
        </div>

        {/* Amenities */}
        {lot.amenities && lot.amenities.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {lot.amenities.slice(0, 3).map((amenity) => (
                <span key={amenity} className="badge badge-primary text-xs">
                  {amenity}
                </span>
              ))}
              {lot.amenities.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{lot.amenities.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Occupancy Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Occupancy</span>
            <span>{occupancyRate.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                occupancyRate < 50 ? 'bg-success-500' :
                occupancyRate < 80 ? 'bg-warning-500' : 'bg-error-500'
              }`}
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            to={`/parking/${lot._id}`}
            className="btn btn-primary flex-1 text-center"
          >
            View Details
          </Link>
          {isAvailable && (
            <Link
              to={`/booking/${lot._id}`}
              className="btn btn-success flex-1 text-center"
            >
              Book Now
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParkingLotCard;
