const express = require('express');
// Use global fetch (Node 18+) for simpler HTTP calls

const router = express.Router();

// Helper to fetch Overpass data with simple mirror fallback
async function fetchOverpass(query) {
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter'
  ];
  const body = `data=${encodeURIComponent(query)}`;
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  let lastErr;
  for (const url of mirrors) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') ? AbortSignal.timeout(15000) : undefined
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      return json;
    } catch (e) {
      lastErr = e;
      // try next mirror
    }
  }
  throw lastErr || new Error('All Overpass mirrors failed');
}

// Map requested categories to Overpass filters (nodes only for speed)
const categoryFilters = {
  parking: 'node[amenity=parking]',
  restaurant: 'node[amenity=restaurant]',
  fuel: 'node[amenity=fuel]',
  supermarket: 'node[shop=supermarket]',
  atm: 'node[amenity=atm]',
  hospital: 'node[amenity=hospital]'
};

// GET /api/places/osm/nearby?lat=..&lng=..&radiusMeters=2000&categories=parking,restaurant
router.get('/osm/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = Math.min(parseInt(req.query.radiusMeters || '2000', 10) || 2000, 10000);
    const categories = String(req.query.categories || 'parking').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: 'lat and lng required' });
    }
    const filters = categories.map(c => categoryFilters[c]).filter(Boolean);
    if (filters.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid categories provided' });
    }
    const around = `(around:${radius},${lat},${lng})`;
    const union = filters.map(f => `${f}${around};`).join('');
    const query = `
      [out:json][timeout:25];
      (
        ${union}
      );
      out body;
    `;
    const data = await fetchOverpass(query);
    const results = (data.elements || []).filter(el => el.type === 'node').map(node => {
      const t = node.tags || {};
      // Infer category from tags
      let type = 'place';
      if (t.amenity === 'parking') type = 'parking';
      else if (t.amenity === 'restaurant') type = 'restaurant';
      else if (t.amenity === 'fuel') type = 'fuel';
      else if (t.amenity === 'atm') type = 'atm';
      else if (t.amenity === 'hospital') type = 'hospital';
      else if (t.shop === 'supermarket') type = 'supermarket';
      return {
        id: String(node.id),
        type,
        name: t.name || `${type.charAt(0).toUpperCase()}${type.slice(1)}`,
        lat: node.lat,
        lng: node.lon,
        address: [t['addr:street'], t['addr:housenumber'], t['addr:city']].filter(Boolean).join(' '),
        openingHours: t.opening_hours,
        capacity: t.capacity ? Number(t.capacity) : undefined
      };
    });
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('OSM nearby error:', err?.message || err);
    res.status(500).json({ success: false, message: 'Failed to fetch OSM places' });
  }
});

module.exports = router;
