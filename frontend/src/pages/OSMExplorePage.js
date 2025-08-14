import React, { useEffect, useState } from 'react';
import OSMPlacesMap from '../components/maps/OSMPlacesMap';

export default function OSMExplorePage() {
  const [center, setCenter] = useState({ lat: 17.385, lng: 78.4867 });

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Explore Nearby Places (OpenStreetMap)</h1>
        <p className="text-gray-600 mb-4">Free map data: show parking and other nearby places without requiring Google billing.</p>
        <OSMPlacesMap center={center} />
      </div>
    </div>
  );
}
