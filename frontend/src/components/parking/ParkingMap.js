import React from 'react';

const ParkingMap = ({ lots, center, zoom = 12 }) => {
  return (
    <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Interactive Map</h3>
        <p className="text-gray-500">Map will show {lots?.length || 0} parking locations</p>
        {center && (
          <p className="text-sm text-gray-400 mt-2">
            Centered at: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </p>
        )}
      </div>
    </div>
  );
};

export default ParkingMap;
