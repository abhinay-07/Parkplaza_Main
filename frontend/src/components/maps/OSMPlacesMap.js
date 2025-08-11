import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import API from '../../services/api';

const CATS = [
  { key: 'parking', label: 'Parking' },
  { key: 'restaurant', label: 'Restaurants' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'supermarket', label: 'Supermarkets' },
  { key: 'hospital', label: 'Hospitals' },
  { key: 'atm', label: 'ATMs' }
];

export default function OSMPlacesMap({ center = { lat: 17.385, lng: 78.4867 }, radiusMeters = 2000 }) {
  const [cats, setCats] = useState(['parking']);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const categoriesParam = useMemo(() => cats.join(','), [cats]);

  const fetchPlaces = async () => {
    try {
      setLoading(true); setErr('');
      const url = `/places/osm/nearby`;
      const resp = await API.get(url, { params: { lat: center.lat, lng: center.lng, radiusMeters, categories: categoriesParam } });
      const data = resp.data?.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || 'Failed to load places');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlaces(); }, [categoriesParam, center.lat, center.lng, radiusMeters]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {CATS.map(c => (
          <label key={c.key} className={`text-sm px-3 py-1 rounded border cursor-pointer ${cats.includes(c.key) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>
            <input type="checkbox" className="hidden" checked={cats.includes(c.key)} onChange={(e)=>{
              setCats(prev => e.target.checked ? [...prev, c.key] : prev.filter(x=>x!==c.key));
            }} />
            {c.label}
          </label>
        ))}
        <button onClick={fetchPlaces} className="ml-auto text-sm px-3 py-1 rounded bg-gray-100 border border-gray-300 hover:bg-gray-200">Refresh</button>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="w-full h-96 rounded overflow-hidden border">
        <MapContainer center={[center.lat, center.lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          {items.map(p => (
            <Marker key={`${p.type}-${p.id}`} position={[p.lat, p.lng]}>
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-600">{p.type}</div>
                  {p.address && <div className="text-xs">{p.address}</div>}
                  {p.capacity != null && <div className="text-xs">Capacity: {p.capacity}</div>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {loading && <div className="text-sm text-gray-600">Loading…</div>}
    </div>
  );
}
