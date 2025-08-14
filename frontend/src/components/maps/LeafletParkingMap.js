import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ensure default marker icons render in bundlers by pointing to CDN assets
try {
  // eslint-disable-next-line no-underscore-dangle
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
} catch (_) {}

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 }; // New Delhi

function FitBounds({ points, selected }) {
  const map = useMap();
  const didFitRef = useRef(false);
  useEffect(() => {
    if (!map || didFitRef.current) return;
    if (!points || points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30] });
    didFitRef.current = true;
    if (selected) {
      setTimeout(() => {
        try { map.setView(selected, Math.max(map.getZoom(), 15)); } catch (_) {}
      }, 250);
    }
  }, [map, points, selected]);
  return null;
}

const LeafletParkingMap = ({
  userLocation = null,
  parkingLots = [],
  selectedLotId = null,
  onParkingLotSelect = null,
  height = '400px',
}) => {
  const center = userLocation || DEFAULT_CENTER;

  const markerPoints = useMemo(() => {
    const pts = [];
    (parkingLots || []).forEach(l => {
      if (typeof l?.lat === 'number' && typeof l?.lng === 'number') {
        pts.push([l.lat, l.lng]);
      }
    });
    if (userLocation) pts.push([userLocation.lat, userLocation.lng]);
    return pts;
  }, [parkingLots, userLocation]);

  const selectedPoint = useMemo(() => {
    const lot = (parkingLots || []).find(l => String(l.id) === String(selectedLotId));
    return lot && typeof lot.lat === 'number' && typeof lot.lng === 'number' ? [lot.lat, lot.lng] : null;
  }, [parkingLots, selectedLotId]);

  const containerStyle = { height, width: '100%', borderRadius: 8, overflow: 'hidden' };

  return (
    <div style={containerStyle}>
      <MapContainer center={[center.lat, center.lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {userLocation && (
          <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={8} pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.8 }}>
            <Popup>Your location</Popup>
          </CircleMarker>
        )}
        {(parkingLots || []).map((lot) => {
          if (typeof lot?.lat !== 'number' || typeof lot?.lng !== 'number') return null;
          const isSelected = String(lot.id) === String(selectedLotId);
          return (
            <Marker
              key={String(lot.id)}
              position={[lot.lat, lot.lng]}
              eventHandlers={{ click: () => { onParkingLotSelect && onParkingLotSelect(lot); } }}
              icon={isSelected ? new L.Icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                shadowSize: [41, 41],
                className: 'selected-marker'
              }) : undefined}
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
          );
        })}
        <FitBounds points={markerPoints} selected={selectedPoint} />
      </MapContainer>
    </div>
  );
};

export default LeafletParkingMap;
