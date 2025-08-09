import React, { useEffect, useRef, useState } from 'react';
import loadGoogleMaps from './loadGoogleMaps';

const resolveApiKey = () =>
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY
  || (typeof document !== 'undefined' && document.querySelector('meta[name="gmaps-api-key"]')?.content)
  || (typeof window !== 'undefined' && window.GMAPS_API_KEY)
  || '';

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 }; // New Delhi

const ParkingMap = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [services, setServices] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      const apiKey = resolveApiKey();
      if (!apiKey) {
        // Surface a simple error state in place of the map
        if (mapRef.current) {
          mapRef.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:8px;">Missing Google Maps API key</div>';
        }
        return;
      }

      try {
        // Load the Google Maps script via our loader with Places library
        await loadGoogleMaps(apiKey, { libraries: ['places'], retry: 2 });
        if (cancelled || !mapRef.current) return;

        // Initialize map
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: DEFAULT_CENTER,
          zoom: 14,
          fullscreenControl: true,
          streetViewControl: true,
          mapTypeControl: false,
        });
        setMap(mapInstance);

        // Places search for nearby parking
        const placesService = new window.google.maps.places.PlacesService(mapInstance);
        placesService.nearbySearch(
          {
            location: DEFAULT_CENTER,
            radius: 2000,
            keyword: 'parking',
          },
          (results, status) => {
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !Array.isArray(results)) return;
            results.forEach((place) => {
              if (!place.geometry?.location) return;
              const marker = new window.google.maps.Marker({
                position: place.geometry.location,
                map: mapInstance,
                title: place.name,
              });

              marker.addListener('click', () => {
                setSelectedPlace(place);
                setServices([
                  { name: 'Car Cleaning', price: 200 },
                  { name: 'Oil Change', price: 500 },
                  { name: 'Repair Service', price: 1000 },
                ]);
              });
            });
          }
        );
      } catch (err) {
        // Render graceful error in container
        if (mapRef.current) {
          mapRef.current.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:8px;">Failed to load Google Maps</div>`;
        }
        // eslint-disable-next-line no-console
        console.error('ParkingMap init error:', err);
      }
    };

    initMap();
    return () => { cancelled = true; };
  }, []);

  const handleBooking = () => {
    if (!selectedPlace) return;
    // Simple demo booking confirmation
    // eslint-disable-next-line no-alert
    alert(`Booking confirmed for ${selectedPlace.name} with ${services.length} services!`);
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      {/* Map Container */}
      <div
        ref={mapRef}
        style={{
          width: '70%',
          height: '600px',
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#e5e7eb',
        }}
      />

      {/* Sidebar */}
      <div
        style={{
          width: '30%',
          background: '#fff',
          borderRadius: '10px',
          padding: '15px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          minHeight: '600px',
        }}
      >
        <h2>Parking Details</h2>
        {selectedPlace ? (
          <>
            <h3 style={{ marginTop: 8 }}>{selectedPlace.name}</h3>
            <p>{selectedPlace.vicinity}</p>
            <p>Price/hour: ₹50</p>
            <p>Day/Night Parking Available</p>

            <h4 style={{ marginTop: 16 }}>Available Services</h4>
            {services.map((service, idx) => (
              <div key={idx} style={{ margin: '6px 0' }}>
                <label>
                  <input type="checkbox" /> {service.name} — ₹{service.price}
                </label>
              </div>
            ))}

            <button
              onClick={handleBooking}
              style={{
                marginTop: '12px',
                background: '#4CAF50',
                color: '#fff',
                padding: '10px 15px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              Book Now
            </button>
          </>
        ) : (
          <p>Click on a parking location to see details.</p>
        )}
      </div>
    </div>
  );
};

export default ParkingMap;
