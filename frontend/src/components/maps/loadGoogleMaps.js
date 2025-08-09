let mapsPromise = null;

export default function loadGoogleMaps(apiKey, { libraries = [] } = {}) {
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google);

    const script = document.createElement('script');
    script.id = 'gmaps-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=${libraries.join(',')}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = reject;

    document.head.appendChild(script);
  });

  return mapsPromise;
}
