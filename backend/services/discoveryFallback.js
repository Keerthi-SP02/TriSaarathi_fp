const FALLBACK_MESSAGE = 'Local place discovery is temporarily unavailable.';

function stablePlaceKey(place) {
  const name = (place.name || '').trim().toLocaleLowerCase();
  if (name && Number.isFinite(place.latitude) && Number.isFinite(place.longitude)) {
    return `${name}:${Number(place.latitude).toFixed(4)}:${Number(place.longitude).toFixed(4)}`;
  }
  return place.id || place.sourceId;
}

export function mergeDiscoverySources({ storedPlaces = [], openStreetMap, limit = 20 }) {
  const placesByKey = new Map();
  for (const place of storedPlaces) placesByKey.set(stablePlaceKey(place), { ...place, external: true, cached: true });
  for (const place of openStreetMap?.destinations || []) {
    const key = stablePlaceKey(place);
    const stored = placesByKey.get(key);
    placesByKey.set(key, { ...stored, ...place, photo: place.photo || stored?.photo || null, external: true, cached: false });
  }
  const destinations = [...placesByKey.values()].slice(0, limit).map((place) => ({
    ...place,
    displayName: place.name || 'Unnamed place',
    displayDescription: place.description || 'Description not provided.',
    displayAddress: place.location || place.address || 'Location details unavailable.',
    displayPhone: place.phone || 'Contact number not provided.',
    displayHours: place.openingHours || 'Hours not available.',
    hasMap: Number.isFinite(place.latitude) && Number.isFinite(place.longitude),
    displayImage: place.photo || null,
    isImported: true,
  }));
  const storedAvailable = storedPlaces.length > 0;
  const osmAvailable = Boolean(openStreetMap?.available);
  const sourcesUnavailable = !osmAvailable;
  const message = destinations.length
    ? sourcesUnavailable ? 'Showing previously saved local places; live place discovery is temporarily unavailable.' : ''
    : sourcesUnavailable ? FALLBACK_MESSAGE : 'No local places found for this area yet. Try another location or explore nearby destinations.';

  return {
    destinations,
    total: destinations.length,
    fromCache: storedAvailable || Boolean(openStreetMap?.fromCache),
    discovery: {
      available: !sourcesUnavailable || storedAvailable,
      empty: destinations.length === 0 && !sourcesUnavailable,
      message,
    },
    services: { openStreetMap: openStreetMap || { available: false, skipped: true } },
  };
}

export function providerRetryDelay(statusCode, attempt) {
  if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) return 60 * 60 * 1000;
  return Math.min(5 * 60 * 1000, 5000 * (2 ** Math.min(Math.max(attempt - 1, 0), 6)));
}

export function shouldServeCachedResult(hasFreshCache, forceRefresh = false) {
  return Boolean(hasFreshCache && !forceRefresh);
}

export function logProviderFailure(provider, error, cachedUsed = false) {
  const statusCode = Number.isInteger(error?.status) ? error.status : null;
  console.warn(JSON.stringify({
    provider,
    category: statusCode === 429 ? 'rate_limit' : statusCode ? statusCode >= 500 ? 'server_error' : 'client_error' : 'network_or_timeout',
    statusCode,
    timestamp: new Date().toISOString(),
    cachedUsed,
  }));
}
