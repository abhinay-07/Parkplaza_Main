// Robust Google Maps JS API loader with retries, timeouts, and library awareness
let mapsPromise = null;
let loadedLibs = new Set();
let requestedLibs = new Set();

/**
 * Load the Google Maps SDK script once and return window.google when ready.
 * Options:
 * - libraries: string[] (e.g. ['places'])
 * - retry: number (default 0-2)
 * - timeoutMs: number (default 15000)
 * - language, region, nonce: optional URL/script attributes
 */
export default function loadGoogleMaps(
  apiKey,
  { libraries = [], retry = 0, timeoutMs = 15000, language, region, nonce } = {}
) {
  const DBG = !!(typeof window !== 'undefined' && window.GMAPS_DEBUG);
  const log = (...a) => { if (DBG) console.log('[gmaps-loader]', ...a); };
  const warn = (...a) => { if (DBG) console.warn('[gmaps-loader]', ...a); };
  const err = (...a) => { if (DBG) console.error('[gmaps-loader]', ...a); };

  // If already loaded in this page, return immediately
  if (window.google?.maps) {
    // Warn if requested libraries may be missing
    if (libraries?.length) {
      libraries.forEach((lib) => {
        if (!loadedLibs.has(lib)) {
          // Try to detect presence (e.g., places)
          const present = lib === 'places' ? !!window.google.maps.places : true;
          if (!present) warn('Already loaded without requested library:', lib);
        }
      });
    }
    return Promise.resolve(window.google);
  }

  // Track requested libraries (for first load)
  (libraries || []).forEach((lib) => requestedLibs.add(lib));

  if (mapsPromise) {
    return mapsPromise;
  }

  const buildSrc = (attempt = 1) => {
    const libs = Array.from(requestedLibs).sort();
    const noAsync = !!(typeof window !== 'undefined' && window.GMAPS_NO_ASYNC) || attempt > 1; // retry with non-async
    const useCallback = !!(typeof window !== 'undefined' && window.GMAPS_USE_CALLBACK) || attempt > 2; // later attempts add callback
    const parts = [
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`,
      'v=weekly',
      // Recommended fully async loading; can be disabled via window.GMAPS_NO_ASYNC for diagnostics
      noAsync ? null : 'loading=async',
      libs.length ? `libraries=${encodeURIComponent(libs.join(','))}` : null,
      language ? `language=${encodeURIComponent(language)}` : null,
      region ? `region=${encodeURIComponent(region)}` : null,
      useCallback ? `callback=__gm_cb${attempt > 1 ? attempt : ''}` : null,
    ].filter(Boolean);
    return parts.join('&');
  };

  const inject = (attempt) => new Promise((resolve, reject) => {
  if (window.google?.maps) { log('window.google.maps already present'); return resolve(window.google); }

    // Reuse existing script if present, else create
    let script = document.getElementById('gmaps-sdk');
    if (!script) {
      script = document.createElement('script');
      script.id = 'gmaps-sdk';
      if (nonce) script.nonce = nonce;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    // Capture auth failures (invalid key / referrer) if Google triggers it
    let authFailed = false;
    if (typeof window !== 'undefined') {
      window.gm_authFailure = () => { authFailed = true; err('gm_authFailure: API key or referrer not authorized'); };
    }
    // If using callback for diagnostics, define it before setting src
    if (typeof window !== 'undefined') {
      window.__gm_cb = () => { log('google callback fired (__gm_cb)'); };
      window.__gm_cb2 = () => { log('google callback fired (__gm_cb2)'); };
      window.__gm_cb3 = () => { log('google callback fired (__gm_cb3)'); };
    }
    script.src = buildSrc(attempt);
    log('injecting script', { src: script.src, attempt });

  const onLoad = async () => {
      if (!window.google?.maps) {
        reject(new Error('Google Maps loaded but window.google.maps is undefined'));
        return;
      }

      if (authFailed) {
        reject(new Error('Google Maps auth failed (gm_authFailure)'));
        return;
      }

      // With loading=async, ensure core and requested libraries via importLibrary
      try {
        if (window.google.maps.importLibrary) {
          const libsToImport = Array.from(new Set(['maps', ...Array.from(requestedLibs)]));
          log('importLibrary start', libsToImport);
          await Promise.all(libsToImport.map((lib) => window.google.maps.importLibrary(lib)));
          log('importLibrary done');
          libsToImport.forEach((lib) => loadedLibs.add(lib));
        } else if (requestedLibs.has('places') && !window.google.maps.places) {
          warn('places requested but importLibrary unavailable; relying on libraries param');
        }
      } catch (e) {
        err('importLibrary failed:', e?.message || e);
        // Proceed anyway; base maps might still work even if a lib failed
      }
      resolve(window.google);
    };
    const onError = (e) => {
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
      err('script error', e);
      reject(e || new Error('Failed to load Google Maps script'));
    };
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });

    // Readiness polling fallback in case 'load' event doesn't fire in some environments
    const startedAt = Date.now();
    const maxWait = Math.max(5000, timeoutMs);
    const poll = () => {
      if (authFailed) {
        err('auth failed during poll');
        reject(new Error('Google Maps auth failed'));
        return;
      }
      if (window.google?.maps) {
        log('readiness poll: google.maps present');
        onLoad();
        return;
      }
      if (Date.now() - startedAt > maxWait) {
        err('timeout (poll)', attempt);
        reject(new Error(`Loading Google Maps timed out (attempt ${attempt})`));
        return;
      }
      setTimeout(poll, 150);
    };
    setTimeout(poll, 150);
  });

  const maxAttempts = Math.max(1, 1 + Number(retry || 0));
  mapsPromise = (async () => {
    // Optional: try official loader when requested
    if (typeof window !== 'undefined' && window.GMAPS_USE_OFFICIAL_LOADER) {
      try {
        log('trying official @googlemaps/js-api-loader');
        const mod = await import(/* webpackIgnore: true */ /* @vite-ignore */ '@googlemaps/js-api-loader').catch((e) => { throw e; });
        const LoaderCls = mod?.Loader || mod?.default?.Loader || mod?.default;
        if (LoaderCls) {
          const loader = new LoaderCls({ apiKey, version: 'weekly', libraries: Array.from(requestedLibs) });
          await loader.importLibrary('maps');
          for (const lib of requestedLibs) {
            try { await loader.importLibrary(lib); } catch (e) { warn('official loader: failed lib', lib, e?.message || e); }
          }
          log('official loader done');
          return window.google;
        }
      } catch (e) {
        err('official loader failed, falling back', e?.message || e);
      }
    }

    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        if (attempt > 1) {
          const backoff = Math.min(2000 * attempt, 6000);
          warn(`retrying (${attempt}/${maxAttempts}) in ${backoff}ms`);
          await new Promise((r) => setTimeout(r, backoff));
        }
        const g = await inject(attempt);
        return g;
      } catch (e) {
        lastErr = e;
        err('load attempt failed:', e?.message || e);
        // Remove broken script so next attempt can re-inject cleanly
        const s = document.getElementById('gmaps-sdk');
        if (s && s.parentNode) {
          try { s.parentNode.removeChild(s); } catch (_) {}
        }
      }
    }
    throw lastErr || new Error('Failed to load Google Maps');
  })();

  return mapsPromise;
}
