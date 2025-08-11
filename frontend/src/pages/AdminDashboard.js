import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import parkingService from '../services/parkingService';
import { useGeolocation } from '../hooks/useGeolocation';

const AdminDashboard = () => {
  const { user } = useSelector((s) => s.auth);
  const { location, error: geoError } = useGeolocation();
  const [form, setForm] = useState({ lat: '', lng: '', radiusMeters: 2000, limit: 10, ownerEmail: '' });
  const [loading, setLoading] = useState(false);
  const [osmLoading, setOsmLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (location?.lat && location?.lng) {
      setForm((f) => ({ ...f, lat: location.lat, lng: location.lng }));
    }
  }, [location]);

  const canChooseOwner = user?.role === 'admin';
  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onImport = async (e) => {
    e.preventDefault();
    setLoading(true); setErr(''); setResult(null);
    try {
      const payload = {
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        radiusMeters: parseInt(form.radiusMeters || 2000, 10),
        limit: parseInt(form.limit || 10, 10),
        ownerEmail: canChooseOwner && form.ownerEmail ? form.ownerEmail : undefined,
      };
      const data = await parkingService.importPlaces(payload);
      setResult(data?.data || data);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Import failed';
      const details = e?.response?.data?.details;
      setErr(details ? `${msg} — ${details}` : msg);
    } finally {
      setLoading(false);
    }
  };

  const onImportOSM = async () => {
    setOsmLoading(true); setErr(''); setResult(null);
    try {
      const payload = {
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        radiusMeters: parseInt(form.radiusMeters || 2000, 10),
        limit: parseInt(form.limit || 10, 10),
        ownerEmail: canChooseOwner && form.ownerEmail ? form.ownerEmail : undefined,
      };
      const data = await parkingService.importOSM(payload);
      setResult(data?.data || data);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'OSM import failed';
      const details = e?.response?.data?.details;
      setErr(details ? `${msg} — ${details}` : msg);
    } finally {
      setOsmLoading(false);
    }
  };

  const onSeedRandom = async () => {
    setLoading(true); setErr(''); setResult(null);
    try {
      const payload = {
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        radiusMeters: parseInt(form.radiusMeters || 2000, 10),
        count: parseInt(form.limit || 10, 10),
        ownerEmail: canChooseOwner && form.ownerEmail ? form.ownerEmail : undefined,
      };
      const data = await parkingService.seedRandomLots(payload);
      setResult({ createdCount: data?.data?.lots?.length || 0 });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Seed failed';
      const details = e?.response?.data?.details;
      setErr(details ? `${msg} — ${details}` : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="bg-white shadow rounded p-6 mb-8">
  <h2 className="text-xl font-semibold mb-4">Import Nearby Parking</h2>
  <p className="text-sm text-gray-500 mb-4">Use Google Places (paid/billed) or OpenStreetMap (free) to import nearby parking lots into your database.</p>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onImport}>
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Latitude</span>
            <input name="lat" value={form.lat} onChange={onChange} type="number" step="any" required className="border rounded px-3 py-2" />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Longitude</span>
            <input name="lng" value={form.lng} onChange={onChange} type="number" step="any" required className="border rounded px-3 py-2" />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Radius (meters)</span>
            <input name="radiusMeters" value={form.radiusMeters} onChange={onChange} type="number" min="100" max="50000" className="border rounded px-3 py-2" />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Limit</span>
            <input name="limit" value={form.limit} onChange={onChange} type="number" min="1" max="20" className="border rounded px-3 py-2" />
          </label>
          {canChooseOwner && (
            <label className="flex flex-col md:col-span-2">
              <span className="text-sm font-medium mb-1">Assign to Owner (email)</span>
              <input name="ownerEmail" value={form.ownerEmail} onChange={onChange} type="email" placeholder="owner1@gmail.com" className="border rounded px-3 py-2" />
            </label>
          )}
          <div className="md:col-span-2 flex items-center gap-3 flex-wrap">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60">
              {loading ? 'Importing…' : 'Import (Google Places)'}
            </button>
            <button type="button" onClick={onImportOSM} disabled={osmLoading} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60">
              {osmLoading ? 'Importing…' : 'Import (OSM Free)'}
            </button>
            <button type="button" onClick={onSeedRandom} disabled={loading} className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-60">
              {loading ? 'Seeding…' : 'Seed Random (Dev)'}
            </button>
            {geoError && <span className="text-xs text-red-500">Geolocation error: {String(geoError)}</span>}
          </div>
        </form>
  {err && <div className="mt-4 text-red-600 whitespace-pre-wrap">{err}</div>}
        {result && (
          <div className="mt-4 text-sm text-gray-700">
            <div className="font-medium">Import complete</div>
            <div>Created: {result.createdCount ?? result.created?.length ?? 0}</div>
            <div>Updated: {result.updatedCount ?? result.updated?.length ?? 0}</div>
            <div>Skipped: {result.skippedCount ?? result.skipped?.length ?? 0}</div>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded p-6">
        <p className="text-gray-600">More admin tools will appear here.</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
