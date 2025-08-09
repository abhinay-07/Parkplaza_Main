import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
// Using custom lightweight script loader
import loadGoogleMaps from './loadGoogleMaps';

// Removed @googlemaps/js-api-loader to reduce bundle size and control script injection manually

const GoogleMapsComponent = ({
  parkingLots = [],
  userLocation = null,
  selectedLotId = null,
  onMarkerClick = null, // primary callback
  onParkingLotSelect = null, // alias accepted by some pages
  height = '400px',
  zoom = 13,
  showUserLocation = true,
  recenterOnSelect = false, // optional behavior
  needPlaces = false, // allow caller to skip Places library if not required
  lazy = true, // viewport-based lazy load
  idleDelay = 0, // additional ms delay after visible before loading
  debug = false // log internal state transitions
}) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [map, setMap] = useState(null);
  const markersRef = useRef(new Map()); // lotId -> { marker, infoWindow }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [diagVisible, setDiagVisible] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false); // Leaflet fallback
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy); // if not lazy, treat as visible immediately
  const visibilityForcedRef = useRef(false);

  // Observe viewport visibility for lazy loading
  useEffect(() => {
    if (!lazy) return;
    if (!containerRef.current) return;
    const el = containerRef.current;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
          if (debug) console.log('[GoogleMaps] Visible via IntersectionObserver');
        }
      });
    }, { rootMargin: '100px' }); // preload slightly before visible
    obs.observe(el);
    return () => obs.disconnect();
  }, [lazy]);

  // Fallback: force load after timeout in case IntersectionObserver never fires (e.g., hidden container sizing issues)
  useEffect(() => {
    if (!lazy || isVisible) return;
    const timeout = setTimeout(() => {
      if (!isVisible) {
        visibilityForcedRef.current = true;
        setIsVisible(true);
        if (debug) console.warn('[GoogleMaps] Forcing visibility after timeout fallback');
      }
    }, 4000); // 4s fallback
    return () => clearTimeout(timeout);
  }, [lazy, isVisible, debug]);

  // Initialize Google Maps (run once unless api key / needPlaces changes)
  useEffect(() => {
    if (!isVisible) return; // defer until visible
    let cancelled = false;
    // Resolve API key from multiple sources to match loader setup
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY
      || (typeof document !== 'undefined' && document.querySelector('meta[name="gmaps-api-key"]')?.content)
      || (typeof window !== 'undefined' && window.GMAPS_API_KEY);
    if (!apiKey) { setError('Google Maps API key is not configured'); setLoading(false); return; }
    const existing = mapRef.current?.__mapInstance; // eslint-disable-line
    if (existing) {
      setMap(existing);
      setLoading(false);
      if (debug) console.log('[GoogleMaps] Reusing existing map instance');
      return;
    }
    (async () => {
      if (idleDelay > 0) await new Promise(r => setTimeout(r, idleDelay));
      try {
        const google = await loadGoogleMaps(apiKey, { libraries: needPlaces ? ['places'] : [], retry: 2 });
        if (cancelled || !mapRef.current) return;
        setGoogleLoaded(true);
        const defaultCenter = userLocation || { lat: 28.6139, lng: 77.2090 };
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          styles: [{ featureType: 'poi.business', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
        });
        mapRef.current.__mapInstance = mapInstance;
        if (cancelled) return;
        setMap(mapInstance);
        setLoading(false);
        if (debug) console.log('[GoogleMaps] Map initialized');
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading Google Maps:', err);
        setError('Failed to load Google Maps');
        setLoading(false);
        if (debug) console.error('[GoogleMaps] Init error', err);
      }
    })();
    return () => { cancelled = true; };
  }, [needPlaces, isVisible, idleDelay]);

  // Show or update user location marker separately (no marker recreation for lots)
  useEffect(() => {
    if (!map || !googleLoaded) return;
    if (!showUserLocation || !userLocation) return;
    // Only one user marker: reuse via ref on map object
    if (!map.__userMarker) {
      map.__userMarker = new window.google.maps.Marker({
        position: userLocation,
        map,
        title: 'Your Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,%3csvg width="24" height="24" xmlns="http://www.w3.org/2000/svg"%3e%3ccircle cx="12" cy="12" r="8" fill="%234285F4"/%3e%3ccircle cx="12" cy="12" r="4" fill="white"/%3e%3c/svg%3e',
          scaledSize: new window.google.maps.Size(24, 24),
          anchor: new window.google.maps.Point(12, 12)
        }
      });
    } else {
      map.__userMarker.setPosition(userLocation);
    }
  }, [map, googleLoaded, userLocation, showUserLocation]);

  // Create / update markers when parkingLots array changes (not on selection changes)
  useEffect(() => {
    if (!map || !parkingLots) return;
    const callback = onMarkerClick || onParkingLotSelect;

    // Remove markers no longer present
    for (const [lotId, entry] of markersRef.current.entries()) {
      if (!parkingLots.find(l => String(l.id) === String(lotId))) {
        entry.marker.setMap(null);
        markersRef.current.delete(lotId);
      }
    }

    const bounds = new window.google.maps.LatLngBounds();
    let anyValid = false;

    // Batch creation using requestIdleCallback / rAF fallback
    const createMarker = (lot) => {
      if (typeof lot?.lat !== 'number' || typeof lot?.lng !== 'number') return;
      anyValid = true;
      const lotId = String(lot.id);
      const position = { lat: lot.lat, lng: lot.lng };
      bounds.extend(position);
      const availabilityRatio = lot.totalSlots ? (lot.availableSlots / lot.totalSlots) : 0;
      let markerColor = '#ef4444';
      if (availabilityRatio > 0.5) markerColor = '#22c55e';
      else if (availabilityRatio > 0.2) markerColor = '#eab308';
      const markerIcon = {
        url: `data:image/svg+xml;charset=UTF-8,%3csvg width="32" height="40" xmlns="http://www.w3.org/2000/svg"%3e%3cpath d="M16 0C7.2 0 0 7.2 0 16c0 16 16 24 16 24s16-8 16-24C32 7.2 24.8 0 16 0z" fill="${markerColor}"/%3e%3ccircle cx="16" cy="16" r="6" fill="white"/%3e%3ctext x="16" y="20" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold" fill="${markerColor}"%3eP%3c/text%3e%3c/svg%3e`,
        scaledSize: new window.google.maps.Size(32, 40),
        anchor: new window.google.maps.Point(16, 40)
      };

      let entry = markersRef.current.get(lotId);
      if (!entry) {
        const marker = new window.google.maps.Marker({
          position,
          map,
          title: lot.name,
          icon: markerIcon
        });
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding:12px;max-width:260px;font-family:Arial,sans-serif;">
              <h3 style="margin:0 0 6px;color:#1f2937;font-size:15px;">${lot.name}</h3>
              <div style="margin:4px 0;color:#6b7280;font-size:13px;">📍 ${lot.address || ''}</div>
              <div style="display:flex;justify-content:space-between;margin:6px 0;font-size:12px;">
                <div style="text-align:center;">
                  <div style="font-weight:600;color:${markerColor};">${lot.availableSlots}/${lot.totalSlots}</div>
                  <div style="color:#6b7280;">Avail</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-weight:600;color:#1f2937;">₹${lot.pricePerHour?.day || '-'} /hr</div>
                  <div style="color:#6b7280;">Day</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-weight:600;color:#1f2937;">${lot.rating || '—'}⭐</div>
                  <div style="color:#6b7280;">Rating</div>
                </div>
              </div>
              <div style="display:flex;gap:6px;">
                <button onclick="window.viewParkingLotDetails('${lotId}')" style="background:#3b82f6;color:#fff;border:none;padding:6px 8px;border-radius:6px;font-size:12px;cursor:pointer;flex:1;font-weight:500;">Details</button>
                <button onclick="window.bookParkingLot('${lotId}')" style="background:#16a34a;color:#fff;border:none;padding:6px 8px;border-radius:6px;font-size:12px;cursor:pointer;flex:1;font-weight:500;">Book Now</button>
              </div>
            </div>`
        });
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
          if (callback) callback(lot);
          if (recenterOnSelect) {
            map.setCenter(position);
            map.setZoom(16);
          }
        });
        entry = { marker, infoWindow };
        markersRef.current.set(lotId, entry);
      } else {
        // Update position & icon if changed
        entry.marker.setPosition(position);
        entry.marker.setIcon(markerIcon);
      }
    };

    const lotsCopy = [...parkingLots];
    let i = 0;
    const step = () => {
      const slice = lotsCopy.slice(i, i + 25); // batch 25 markers per frame
      slice.forEach(createMarker);
      i += 25;
      if (i < lotsCopy.length) {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(step, { timeout: 100 });
        } else {
          requestAnimationFrame(step);
        }
      }
      if (i >= lotsCopy.length && !selectedLotId && anyValid && parkingLots.length > 1) {
        map.fitBounds(bounds); // Fit bounds once after all markers created
      }
    };
    step();
  }, [map, parkingLots, onMarkerClick, onParkingLotSelect, recenterOnSelect, selectedLotId]);

  // Highlight / focus selection without recreating markers
  useEffect(() => {
    if (!map || !selectedLotId) return;
    const entry = markersRef.current.get(String(selectedLotId));
    if (entry) {
      entry.infoWindow.open(map, entry.marker);
      if (recenterOnSelect) {
        map.setCenter(entry.marker.getPosition());
        map.setZoom(16);
      }
    }
  }, [map, selectedLotId, recenterOnSelect]);

  // Expose global function for details navigation (avoid redefining each render)
  if (typeof window !== 'undefined' && !window.viewParkingLotDetails) {
    window.viewParkingLotDetails = (lotId) => {
      window.location.href = `/parking-lot/${lotId}`;
    };
  }
  if (typeof window !== 'undefined' && !window.bookParkingLot) {
    window.bookParkingLot = (lotId) => {
      const target = `/booking?lotId=${lotId}`;
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = `/auth?from=${encodeURIComponent(target)}`;
        return;
      }
      window.location.href = target;
    };
  }

  // Diagnostics timer (must be before early returns to keep hook order stable)
  useEffect(() => {
    if (!isVisible || googleLoaded) return;
    const t = setTimeout(() => {
      if (!window.google?.maps) setDiagVisible(true);
    }, 5000);
    return () => clearTimeout(t);
  }, [isVisible, googleLoaded]);

  // Leaflet fallback loader (kept early so hooks not conditional)
  useEffect(() => {
    if (!fallbackMode) return;
    (async () => {
      try {
        if (!document.querySelector('link[data-leaflet]')) {
          const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            link.setAttribute('data-leaflet','');
            document.head.appendChild(link);
        }
        if (!window.L) {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s);
          });
        }
        if (mapRef.current && !mapRef.current.__leafletMap) {
          const center = userLocation || { lat: 28.6139, lng: 77.2090 };
          const leafletMap = window.L.map(mapRef.current).setView([center.lat, center.lng], zoom);
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(leafletMap);
          mapRef.current.__leafletMap = leafletMap;
          parkingLots.forEach(lot => {
            if (typeof lot?.lat !== 'number' || typeof lot?.lng !== 'number') return;
            window.L.marker([lot.lat, lot.lng]).addTo(leafletMap).bindPopup(`<strong>${lot.name}</strong><br/>${lot.address || ''}`);
          });
        }
      } catch (e) {
        console.error('Leaflet fallback failed', e);
      }
    })();
  }, [fallbackMode, parkingLots, userLocation, zoom]);

  // Early return placeholders AFTER all hooks declared
  if (loading && !isVisible) {
    return (
      <div ref={containerRef} style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background:'#f3f4f6', borderRadius: '8px' }}>
        <span style={{ fontSize:12, color:'#6b7280' }}>Map deferred… scroll into view</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div ref={containerRef} style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', height: '100%', position:'relative' }}>
          <div style={{position:'absolute', inset:0, background:'#e5e7eb', animation:'pulse 1.5s ease-in-out infinite'}} />
          <style>{`@keyframes pulse {0%,100%{opacity:0.6;}50%{opacity:1;}}`}</style>
          <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:12, color:'#374151'}}>Loading map…</div>
        </div>
      </div>
    );
  }

  if (error && !fallbackMode) {
    return (
      <div style={{ 
        height, 
        position:'relative',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Error Loading Map</p>
          <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
          <button onClick={() => setFallbackMode(true)} style={{marginTop:12, background:'#2563eb', color:'#fff', border:'none', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:13}}>Use Fallback Map</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden', position:'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {diagVisible && !googleLoaded && !fallbackMode && (
        <div style={{position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.65)', color:'#fff', padding:'8px 10px', borderRadius:6, fontSize:12, maxWidth:260}}>
          <strong style={{display:'block', marginBottom:4}}>Map Diagnostics</strong>
          {!process.env.REACT_APP_GOOGLE_MAPS_API_KEY && <div>Missing REACT_APP_GOOGLE_MAPS_API_KEY in frontend .env</div>}
          {process.env.REACT_APP_GOOGLE_MAPS_API_KEY && <div>Key present (env)</div>}
          {(!process.env.REACT_APP_GOOGLE_MAPS_API_KEY && document.querySelector('meta[name="gmaps-api-key"]')) && <div>Key present (meta)</div>}
          {(!process.env.REACT_APP_GOOGLE_MAPS_API_KEY && window.GMAPS_API_KEY) && <div>Key present (window)</div>}
          <div style={{marginTop:4}}>window.google: {window.google ? 'defined' : 'undefined'}</div>
          <div style={{marginTop:4}}>Script tag: {document.getElementById('gmaps-sdk') ? 'found' : 'not found'}</div>
          <div style={{marginTop:6, display:'flex', gap:6}}>
            <button onClick={() => { setDiagVisible(false); setFallbackMode(true); }} style={{background:'#3b82f6', color:'#fff', border:'none', padding:'4px 8px', borderRadius:4, cursor:'pointer'}}>Fallback</button>
            <button onClick={() => { window.location.reload(); }} style={{background:'#6b7280', color:'#fff', border:'none', padding:'4px 8px', borderRadius:4, cursor:'pointer'}}>Reload</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsComponent;

GoogleMapsComponent.propTypes = {
  parkingLots: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    name: PropTypes.string,
    address: PropTypes.string,
    lat: PropTypes.number,
    lng: PropTypes.number,
    availableSlots: PropTypes.number,
    totalSlots: PropTypes.number,
    pricePerHour: PropTypes.shape({ day: PropTypes.number }),
    rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  })),
  userLocation: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
  selectedLotId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  onMarkerClick: PropTypes.func,
  onParkingLotSelect: PropTypes.func,
  height: PropTypes.string,
  zoom: PropTypes.number,
  showUserLocation: PropTypes.bool,
  recenterOnSelect: PropTypes.bool,
  needPlaces: PropTypes.bool,
  lazy: PropTypes.bool,
  idleDelay: PropTypes.number,
  debug: PropTypes.bool,
};
// Default prop values are provided via parameter destructuring in the component signature.
