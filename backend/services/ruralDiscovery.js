import { logProviderFailure, providerRetryDelay, shouldServeCachedResult } from './discoveryFallback.js';

const cache = new Map();
const STALE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 7000;
const OVERPASS_TIMEOUT_MS = 7000;
const MAX_DESTINATIONS = 20;
const NOMINATIM_MIN_INTERVAL_MS = 1100;
let nominatimQueue = Promise.resolve();
let nextNominatimRequestAt = 0;
const providerBackoff = new Map();
const nominatimAreaCache = new Map();
const genericPlaceNames = new Set([
  'waterfall',
  'lake',
  'temple',
  'historic site',
  'viewpoint',
  'village',
  'market',
  'handicraft',
  'restaurant',
  'place of worship',
]);
const genericImageTokens = new Set([
  'and', 'of', 'the', 'in', 'india', 'temple', 'lake', 'waterfall', 'viewpoint',
  'village', 'market', 'restaurant', 'historic', 'site', 'place', 'worship',
  'vegetable', 'vegetables', 'vendor', 'food', 'local', 'shop', 'house',
  'cottage', 'industries', 'handicraft', 'emporium', 'craft', 'overseas',
  'view', 'over', 'valley', 'falls', 'fall', 'hill', 'mountain', 'river', 'bridge',
  'garden', 'street', 'station', 'center', 'centre', 'sri', 'stp',
]);

const categories = {
  all: [
    'nwr({scope})["tourism"~"attraction|museum|guest_house|hostel|camp_site|viewpoint|artwork|alpine_hut"]["name"];',
    'nwr({scope})["historic"]["name"];',
    'nwr({scope})["natural"~"waterfall|lake|peak|hot_spring"]["name"];',
    'nwr({scope})["craft"]["name"];',
    'nwr({scope})["amenity"~"place_of_worship|restaurant|marketplace|cafe|food_court"]["name"];',
    'nwr({scope})["shop"~"art|craft|farm|local|food|pottery"]["name"];',
    'nwr({scope})["landuse"="farm"]["name"];',
    'nwr({scope})["tourism"="farm"]["name"];',
  ],
  businesses: [
    'nwr({scope})["amenity"~"restaurant|marketplace|cafe|food_court"]["name"];',
    'nwr({scope})["shop"]["name"];',
    'nwr({scope})["craft"]["name"];',
    'nwr({scope})["tourism"~"guest_house|hostel|camp_site"]["name"];',
  ],
  homestays: [
    'nwr({scope})["tourism"~"guest_house|hostel|camp_site|chalet"]["name"];',
    'nwr({scope})["accommodation"]["name"];',
  ],
  experiences: [
    'nwr({scope})["tourism"~"attraction|museum|viewpoint|artwork|camp_site"]["name"];',
    'nwr({scope})["historic"]["name"];',
    'nwr({scope})["natural"~"waterfall|lake|peak|hot_spring"]["name"];',
  ],
  nature: [
    'nwr({scope})["tourism"~"viewpoint|camp_site"]["name"];',
    'nwr({scope})["natural"~"waterfall|lake|peak|hot_spring"]["name"];',
  ],
  heritage: [
    'nwr({scope})["tourism"~"attraction|museum"]["name"];',
    'nwr({scope})["historic"]["name"];',
  ],
  food: [
    'nwr({scope})["amenity"~"restaurant|cafe|food_court"]["name"];',
    'nwr({scope})["shop"~"bakery|food"]["name"];',
  ],
  worship: [
    'nwr({scope})["amenity"="place_of_worship"]["name"];',
  ],
  market: [
    'nwr({scope})["craft"]["name"];',
    'nwr({scope})["amenity"="marketplace"]["name"];',
    'nwr({scope})["shop"~"art|craft|pottery"]["name"];',
  ],
  craft: [
    'nwr({scope})["craft"]["name"];',
    'nwr({scope})["shop"~"art|craft|pottery"]["name"];',
    'nwr({scope})["amenity"="marketplace"]["name"];',
  ],
  farms: [
    'nwr({scope})["tourism"="farm"]["name"];',
    'nwr({scope})["landuse"="farm"]["name"];',
    'nwr({scope})["shop"="farm"]["name"];',
    'nwr({scope})["craft"="pottery"]["name"];',
  ],
};

const requestHeaders = {
  'User-Agent': 'TriSaarathi/1.0 (rural tourism destination discovery)',
  Accept: 'application/json',
};

const nominatimTerms = {
  all: ['waterfall', 'temple', 'market'],
  businesses: ['restaurant', 'market', 'handicraft'],
  homestays: [],
  experiences: ['waterfall', 'historic site', 'viewpoint'],
  nature: ['waterfall', 'lake', 'viewpoint'],
  heritage: ['temple', 'historic site'],
  food: ['restaurant'],
  worship: ['temple'],
  market: ['market', 'handicraft'],
  craft: ['market', 'handicraft'],
  farms: [],
};

const relevantNominatimTypes = {
  waterfall: new Set(['attraction', 'waterfall', 'water_point', 'viewpoint']),
  lake: new Set(['lake', 'reservoir', 'pond']),
  temple: new Set(['temple', 'place_of_worship']),
  viewpoint: new Set(['viewpoint']),
  village: new Set(['village', 'hamlet', 'isolated_dwelling']),
  market: new Set(['market', 'marketplace']),
  'guest house': new Set(['guest_house', 'hostel', 'camp_site']),
  handicraft: new Set(['handicraft', 'craft']),
  restaurant: new Set(['restaurant', 'cafe', 'food_court']),
  'historic site': new Set(['archaeological_site', 'castle', 'fort', 'historic_site', 'monument', 'ruins']),
};

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    if (entry.staleUntil <= Date.now()) cache.delete(key);
    return null;
  }
  return entry.value;
}

function getStaleCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.staleUntil <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value) {
  if (cache.size >= 100 && !cache.has(key)) {
    for (const [cachedKey, entry] of cache) {
      if (entry.expiresAt <= Date.now()) cache.delete(cachedKey);
    }
    while (cache.size >= 100) cache.delete(cache.keys().next().value);
  }
  cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs(), staleUntil: Date.now() + STALE_CACHE_TTL_MS });
}

function cacheTtlMs() {
  return Math.max(60_000, Number(process.env.DISCOVERY_CACHE_TTL_MS) || 15 * 60 * 1000);
}

function retryWait(provider) {
  const entry = providerBackoff.get(provider);
  return entry && entry.retryAt > Date.now() ? entry.retryAt - Date.now() : 0;
}

function markProviderSuccess(provider) { providerBackoff.delete(provider); }

function markProviderFailure(provider, error, cachedUsed = false) {
  const previous = providerBackoff.get(provider);
  const attempt = (previous?.attempt || 0) + 1;
  providerBackoff.set(provider, { attempt, retryAt: Date.now() + providerRetryDelay(error?.status || 0, attempt) });
  logProviderFailure(provider, error, cachedUsed);
}

async function fetchJson(url, options = {}) {
  const { timeoutMs = REQUEST_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: { ...requestHeaders, ...options.headers },
    });
    if (!response.ok) {
      const error = new Error(`Upstream service returned HTTP ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function fetchNominatimJson(url) {
  const request = nominatimQueue.then(async () => {
    const waitMs = Math.max(0, nextNominatimRequestAt - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextNominatimRequestAt = Date.now() + NOMINATIM_MIN_INTERVAL_MS;
    return fetchJson(url);
  });
  nominatimQueue = request.catch((error) => {
    console.warn('Recovering the Nominatim request queue after a failed lookup:', error.message);
  });
  return request;
}

export async function findNominatimArea(query) {
  const areaName = typeof query === 'string' ? query.trim().replace(/\s+/g, ' ').slice(0, 100) : '';
  if (areaName.length < 2) throw new Error('Enter a village, town, or district name.');
  const cacheKey = areaName.toLocaleLowerCase();
  const cached = nominatimAreaCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'in',
    q: `${areaName}, Andhra Pradesh, India`,
  });
  const retryDelay = retryWait('Nominatim');
  if (retryDelay) throw new Error(`OpenStreetMap search is cooling down after an upstream error. Try again in ${Math.ceil(retryDelay / 1000)} seconds.`);
  try {
    const records = await fetchNominatimJson(`https://nominatim.openstreetmap.org/search?${params}`);
    markProviderSuccess('Nominatim');
    if (nominatimAreaCache.size >= 100 && !nominatimAreaCache.has(cacheKey)) {
      nominatimAreaCache.delete(nominatimAreaCache.keys().next().value);
    }
    const match = records.find((record) => record.address?.country_code === 'in' && /andhra pradesh/i.test(record.address?.state || ''));
    if (!match) {
      nominatimAreaCache.set(cacheKey, { value: null, expiresAt: Date.now() + cacheTtlMs() });
      return null;
    }
    const value = { latitude: Number(match.lat), longitude: Number(match.lon), displayName: match.display_name || areaName };
    if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)) return null;
    nominatimAreaCache.set(cacheKey, { value, expiresAt: Date.now() + cacheTtlMs() });
    return value;
  } catch (error) {
    markProviderFailure('Nominatim', error);
    throw new Error('OpenStreetMap could not find that Andhra Pradesh location right now. Try again later.');
  }
}

function categoryFor(tags) {
  if (tags.amenity === 'place_of_worship') return 'Heritage & worship';
  if (tags.amenity === 'restaurant') return 'Food';
  if (['cafe', 'food_court'].includes(tags.amenity) || tags.shop === 'food') return 'Food';
  if (tags.shop === 'farm' || tags.tourism === 'farm' || tags.landuse === 'farm') return 'Farm experiences';
  if (tags.shop === 'pottery' || tags.craft === 'pottery') return 'Pottery & crafts';
  if (tags.shop) return 'Local shops & artisans';
  if (tags.amenity === 'marketplace' || tags.craft) return 'Markets & crafts';
  if (tags.historic || tags.tourism === 'museum') return 'Heritage';
  if (tags.natural || tags.tourism === 'viewpoint') return 'Nature & viewpoints';
  if (['guest_house', 'hostel', 'camp_site'].includes(tags.tourism)) return 'Stay & outdoors';
  return 'Rural destination';
}

function locationFor(tags) {
  return tags['addr:place']
    || tags.village
    || tags.town
    || tags.city
    || tags.county
    || tags.state
    || tags['addr:city']
    || '';
}

function cleanWikimediaText(value = '') {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function isWikimediaImageMatch(destinationName, imageTitle) {
  const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const words = normalize(destinationName)
    .split(/\s+/)
    .filter((word) => word.length > 2 && !genericImageTokens.has(word));
  if (words.length === 0) return false;
  const imageWords = new Set(normalize(imageTitle).split(/\s+/));
  return words.every((word) => imageWords.has(word));
}

async function getWikimediaPhoto(destination) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: '5',
    gsrsearch: `${destination.name} India`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '640',
    format: 'json',
    origin: '*',
  });
  const result = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const pages = Object.values(result.query?.pages || {});
  const page = pages.find((candidate) => isWikimediaImageMatch(destination.name, candidate.title));
  const imageInfo = page?.imageinfo?.[0];
  if (!page || !imageInfo) return null;

  const metadata = imageInfo.extmetadata || {};
  const license = cleanWikimediaText(metadata.LicenseShortName?.value || metadata.UsageTerms?.value || '');
  const artist = cleanWikimediaText(metadata.Artist?.value || metadata.Credit?.value || '');
  if (!license) return null;

  return {
    thumbnailUrl: imageInfo.thumburl || imageInfo.url,
    originalUrl: imageInfo.url,
    mediaPageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title).replace(/%20/g, '_')}`,
    title: cleanWikimediaText(metadata.ObjectName?.value || page.title.replace(/^File:/, '').replace(/_/g, ' ')),
    artist: artist || 'See the Wikimedia Commons file page for creator details.',
    license,
    licenseUrl: metadata.LicenseUrl?.value || '',
    description: cleanWikimediaText(metadata.ImageDescription?.value || ''),
  };
}

async function mapConcurrent(items, concurrency, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(items[index], index);
    }
  }));
  return results;
}

function buildOverpassQuery({ category, latitude, longitude, radius, limit }) {
  const scope = latitude === undefined
    ? 'area.andhra_pradesh'
    : `around:${radius},${latitude},${longitude}`;
  const statements = (categories[category] || categories.all)
    .map((statement) => statement.replaceAll('{scope}', scope))
    .join('\n  ');
  const area = latitude === undefined
    ? 'area["ISO3166-2"="IN-AP"]["admin_level"="4"]->.andhra_pradesh;'
    : '';
  return `[out:json][timeout:6];\n${area}\n(\n  ${statements}\n);\nout center tags ${limit};`;
}

function normalizeOsmElement(element) {
  const tags = element.tags || {};
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (!tags.name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    id: `osm:${element.type}:${element.id}`,
    source: 'OpenStreetMap',
    name: tags.name,
    category: categoryFor(tags),
    location: locationFor(tags),
    latitude,
    longitude,
    description: tags['description:en'] || tags.description || '',
    address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:place'], tags['addr:city'], tags['addr:state']].filter(Boolean).join(', '),
    website: tags.website || tags['contact:website'] || '',
    phone: tags.phone || tags['contact:phone'] || '',
    openingHours: tags.opening_hours || '',
    wikidataId: /^Q\d+$/.test(tags.wikidata || '') ? tags.wikidata : '',
    tags: {
      tourism: tags.tourism || '',
      historic: tags.historic || '',
      natural: tags.natural || '',
      amenity: tags.amenity || '',
      craft: tags.craft || '',
      shop: tags.shop || '',
      landuse: tags.landuse || '',
    },
  };
}

function normalizeNominatimPlace(record, searchTerm) {
  const tags = record.extratags || {};
  const type = (record.type || '').toLowerCase();
  const allowedTypes = relevantNominatimTypes[searchTerm];
  const latitude = Number(record.lat);
  const longitude = Number(record.lon);
  const address = record.address || {};
  const normalizedName = record.name?.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() || '';
  const hasRuralLocation = Boolean(
    address.village || address.hamlet || address.isolated_dwelling || address.town ||
    address.county || address.state_district || address.state
  );
  if (
    !record.name ||
    address.country_code !== 'in' ||
    !/andhra pradesh/i.test(address.state || '') ||
    !allowedTypes?.has(type) ||
    genericPlaceNames.has(normalizedName) ||
    (address.city && !address.village && !address.hamlet && !address.isolated_dwelling) ||
    !hasRuralLocation ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) return null;

  const category = (
    ['waterfall', 'water_point', 'lake', 'reservoir', 'pond', 'viewpoint'].includes(type) ||
    (searchTerm === 'waterfall' && type === 'attraction')
  )
    ? 'Nature & viewpoints'
    : ['temple', 'place_of_worship'].includes(type)
      ? 'Heritage & worship'
      : ['archaeological_site', 'castle', 'fort', 'historic_site', 'monument', 'ruins'].includes(type)
        ? 'Heritage'
        : ['village', 'hamlet', 'isolated_dwelling'].includes(type)
          ? 'Villages & rural landscapes'
          : ['market', 'marketplace', 'handicraft', 'craft'].includes(type)
            ? 'Markets & crafts'
            : ['restaurant', 'cafe', 'food_court'].includes(type)
              ? 'Food'
              : categoryFor({
                amenity: tags.amenity,
                craft: tags.craft,
                historic: tags.historic,
                natural: tags.natural,
                tourism: tags.tourism,
              });

  return {
    id: `osm:${record.osm_type}:${record.osm_id}`,
    source: 'OpenStreetMap',
    sourceProvider: 'Nominatim',
    name: record.name,
    category,
    location: record.address?.village
      || record.address?.hamlet
      || record.address?.town
      || record.address?.city
      || record.address?.state_district
      || record.address?.state
      || '',
    latitude,
    longitude,
    description: tags['description:en'] || tags.description || '',
    address: [record.address?.house_number, record.address?.road, record.address?.village, record.address?.state].filter(Boolean).join(', '),
    website: tags.website || tags['contact:website'] || '',
    phone: tags.phone || tags['contact:phone'] || '',
    openingHours: tags.opening_hours || '',
    wikidataId: /^Q\d+$/.test(tags.wikidata || '') ? tags.wikidata : '',
    tags: {
      tourism: tags.tourism || '',
      historic: tags.historic || '',
      natural: tags.natural || '',
      amenity: tags.amenity || '',
      craft: tags.craft || '',
      shop: tags.shop || '',
      landuse: tags.landuse || '',
    },
  };
}

function searchViewbox(latitude, longitude, radius) {
  const latitudeDelta = radius / 111320;
  const longitudeDelta = radius / (111320 * Math.max(0.1, Math.cos(latitude * Math.PI / 180)));
  const left = Math.max(-180, longitude - longitudeDelta);
  const right = Math.min(180, longitude + longitudeDelta);
  const top = Math.min(90, latitude + latitudeDelta);
  const bottom = Math.max(-90, latitude - latitudeDelta);
  return `${left},${top},${right},${bottom}`;
}

async function getNominatimDestinations({ category, latitude, longitude, radius, limit }) {
  const terms = nominatimTerms[category];
  const byId = new Map();
  const errors = [];
  let successfulRequests = 0;
  const viewbox = latitude === undefined ? '76.7,19.5,84.8,12.5' : searchViewbox(latitude, longitude, radius);

  for (const term of terms) {
    const params = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      extratags: '1',
      limit: String(Math.min(limit, 20)),
      countrycodes: 'in',
      q: term,
    });
    params.set('viewbox', viewbox);
    params.set('bounded', '1');

    try {
      const waitMs = retryWait('Nominatim');
      if (waitMs) {
        errors.push(`Nominatim retry is delayed for ${Math.ceil(waitMs / 1000)} seconds after an upstream failure.`);
        break;
      }
      const records = await fetchNominatimJson(`https://nominatim.openstreetmap.org/search?${params}`);
      successfulRequests += 1;
      markProviderSuccess('Nominatim');
      for (const record of records) {
        const place = normalizeNominatimPlace(record, term);
        if (place && !byId.has(place.id)) byId.set(place.id, place);
      }
    } catch (error) {
      errors.push(`${term}: ${error.message}`);
      markProviderFailure('Nominatim', error);
    }
  }

  return {
    destinations: [...byId.values()].slice(0, limit),
    errors,
    available: successfulRequests > 0,
  };
}

async function getWikidataFacts(destinations) {
  const byId = new Map(destinations.filter((place) => place.wikidataId).map((place) => [place.wikidataId, place]));
  const ids = [...byId.keys()].slice(0, 20);
  if (ids.length === 0) return { facts: new Map(), available: true, skipped: true };
  const values = ids.map((id) => `wd:${id}`).join(' ');
  const query = [
    'SELECT ?item ?itemLabel ?itemDescription ?coordinate WHERE {',
    `  VALUES ?item { ${values} }`,
    '  OPTIONAL { ?item wdt:P625 ?coordinate. }',
    '  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }',
    '}',
  ].join('\n');
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  const result = await fetchJson(url, { headers: { Accept: 'application/sparql-results+json' } });
  const facts = new Map();
  for (const row of result.results?.bindings || []) {
    const id = row.item.value.split('/').pop();
    const place = byId.get(id);
    if (!place) continue;
    facts.set(id, {
      id,
      name: row.itemLabel?.value || place.name,
      description: row.itemDescription?.value || '',
      url: row.item.value,
      coordinate: row.coordinate?.value || '',
    });
  }
  return { facts, available: true };
}

export async function getRuralDestinations({
  category = 'all',
  latitude,
  longitude,
  radius = 25000,
  limit = 15,
  forceRefresh = false,
} = {}) {
  const safeCategory = Object.hasOwn(categories, category) ? category : 'all';
  if (!Object.hasOwn(categories, category)) {
    throw new Error('Destination category is invalid.');
  }
  const hasLatitude = latitude !== undefined && latitude !== null;
  const hasLongitude = longitude !== undefined && longitude !== null;
  if (hasLatitude !== hasLongitude) throw new Error('Provide both latitude and longitude.');
  if (hasLatitude && (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  )) {
    throw new Error('Destination coordinates are invalid.');
  }
  if (hasLatitude && (!Number.isInteger(radius) || radius < 1000 || radius > 50000)) {
    throw new Error('Search radius must be between 1,000 and 50,000 metres.');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_DESTINATIONS) {
    throw new Error(`Destination limit must be between 1 and ${MAX_DESTINATIONS}.`);
  }

  const cacheKey = JSON.stringify({ category: safeCategory, latitude, longitude, radius, limit });
  const cached = getCached(cacheKey);
  if (shouldServeCachedResult(Boolean(cached), forceRefresh)) return { ...cached, fromCache: true };

  const overpassUrls = [...new Set([
    process.env.OVERPASS_URL?.trim() || 'https://overpass-api.de/api/interpreter',
    process.env.OVERPASS_FALLBACK_URL?.trim() || 'https://overpass.private.coffee/api/interpreter',
  ].filter(Boolean))];
  const query = buildOverpassQuery({
    category: safeCategory,
    latitude: hasLatitude ? latitude : undefined,
    longitude,
    radius,
    limit,
  });
  let overpassAvailable = true;
  let overpassError = '';
  let places = [];
  let nominatimAvailable = false;
  let nominatimAttempted = false;
  const overpassWait = retryWait('Overpass');
  if (overpassWait) {
    overpassAvailable = false;
    overpassError = `Retry delayed for ${Math.ceil(overpassWait / 1000)} seconds after an upstream failure.`;
  } else {
    const errors = [];
    let lastError;
    for (const overpassUrl of overpassUrls) {
      try {
        const overpassResponse = await fetchJson(overpassUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: query }),
          timeoutMs: OVERPASS_TIMEOUT_MS,
        });
        places = (overpassResponse.elements || [])
          .map(normalizeOsmElement)
          .filter(Boolean)
          .slice(0, limit);
        markProviderSuccess('Overpass');
        break;
      } catch (error) {
        errors.push(error.message);
        lastError = error;
      }
    }
    if (errors.length === overpassUrls.length) {
      overpassAvailable = false;
      overpassError = errors.join('; ');
      markProviderFailure('Overpass', lastError, Boolean(getStaleCached(cacheKey)));
    }
  }

  let nominatimErrors = [];
  // Public Nominatim disallows systematic downloads of all POIs in a region.
  // Use it only when a user explicitly requests a bounded nearby search.
  if (places.length === 0 && hasLatitude) {
    const fallback = await getNominatimDestinations({
      category: safeCategory,
      latitude: hasLatitude ? latitude : undefined,
      longitude,
      radius,
      limit,
    });
    places = fallback.destinations;
    nominatimErrors = fallback.errors;
    nominatimAvailable = fallback.available;
    nominatimAttempted = true;
  }

  const liveOpenStreetMapAvailable = overpassAvailable || nominatimAvailable;
  if (!liveOpenStreetMapAvailable && places.length === 0) {
    const stale = getStaleCached(cacheKey);
    if (stale?.destinations?.length) {
      const staleMessage = 'OpenStreetMap is temporarily unavailable; showing previously cached places.';
      return {
        ...stale,
        fromCache: true,
        destinations: stale.destinations.map((place) => ({ ...place, cached: true })),
        services: {
          ...stale.services,
          openStreetMap: { available: false, cached: true, message: staleMessage, overpass: { available: false }, nominatim: { available: false } },
        },
      };
    }
  }

  const wikimediaStatus = { available: places.length > 0, skipped: places.length === 0 };
  const wikimediaTargets = places.slice(0, Math.min(places.length, 4));
  const photos = await mapConcurrent(wikimediaTargets, 1, async (place) => {
    if (retryWait('Wikimedia Commons')) return null;
    try {
      const photo = await getWikimediaPhoto(place);
      if (photo) markProviderSuccess('Wikimedia Commons');
      return photo;
    } catch (error) {
      wikimediaStatus.available = false;
      wikimediaStatus.error = error.message;
      markProviderFailure('Wikimedia Commons', error, Boolean(getStaleCached(cacheKey)));
      return null;
    }
  });
  const seenMediaPages = new Set();
  wikimediaTargets.forEach((place, index) => {
    const photo = photos[index];
    if (!photo || seenMediaPages.has(photo.mediaPageUrl)) {
      place.photo = null;
      return;
    }
    wikimediaStatus.available = true;
    seenMediaPages.add(photo.mediaPageUrl);
    place.photo = photo;
  });
  places.slice(wikimediaTargets.length).forEach((place) => {
    place.photo = null;
  });

  let wikidataStatus;
  try {
    const { facts, available } = await getWikidataFacts(places);
    markProviderSuccess('Wikidata');
    wikidataStatus = { available };
    for (const place of places) place.wikidata = facts.get(place.wikidataId) || null;
  } catch (error) {
    wikidataStatus = { available: false, error: error.message };
    markProviderFailure('Wikidata', error, Boolean(getStaleCached(cacheKey)));
    for (const place of places) place.wikidata = null;
  }

  const result = {
    destinations: places,
    total: places.length,
    services: {
      openStreetMap: {
      available: liveOpenStreetMapAvailable,
        provider: places.some((place) => place.sourceProvider === 'Nominatim') ? 'Nominatim' : 'Overpass',
        message: overpassError
          ? nominatimAvailable
            ? places.length > 0
              ? `Overpass is unavailable (${overpassError}); using matching results returned by Nominatim.`
              : `Overpass is unavailable (${overpassError}); Nominatim returned no matching places.`
            : `Overpass is unavailable (${overpassError}); Nominatim search also failed${nominatimErrors[0] ? `: ${nominatimErrors[0]}` : '.'}`
          : places.some((place) => place.sourceProvider === 'Nominatim')
            ? 'Overpass returned no matching places; showing matching results returned by Nominatim.'
            : nominatimAttempted && !nominatimAvailable && nominatimErrors.length > 0
              ? `OpenStreetMap search is temporarily unavailable: ${nominatimErrors[0]}`
              : '',
      },
      overpass: { available: overpassAvailable, ...(overpassError ? { error: overpassError } : {}) },
      nominatim: {
        available: nominatimAvailable,
        skipped: !nominatimAttempted,
        ...(nominatimErrors.length > 0 ? { errors: nominatimErrors } : {}),
      },
      wikimediaCommons: wikimediaStatus,
      wikidata: wikidataStatus,
    },
    attribution: {
      openStreetMap: '© OpenStreetMap contributors',
      wikimediaCommons: 'Image creator and licence are shown on each image card.',
    },
  };
  if (liveOpenStreetMapAvailable) setCached(cacheKey, result);
  return result;
}

export async function getRoadRoute({ fromLatitude, fromLongitude, toLatitude, toLongitude }) {
  const coordinates = [fromLatitude, fromLongitude, toLatitude, toLongitude];
  if (
    coordinates.some((value) => !Number.isFinite(value)) ||
    fromLatitude < -90 || fromLatitude > 90 || toLatitude < -90 || toLatitude > 90 ||
    fromLongitude < -180 || fromLongitude > 180 || toLongitude < -180 || toLongitude > 180
  ) {
    throw new Error('Route coordinates are invalid.');
  }
  const rounded = coordinates.map((value) => value.toFixed(5));
  const cacheKey = `route:${rounded.join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [fromLat, fromLon, toLat, toLon] = rounded;
  const response = await fetchJson(
    `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=false`
  );
  const route = response.routes?.[0];
  if (response.code !== 'Ok' || !route?.geometry?.coordinates?.length) {
    throw new Error(response.message || 'No driving route is available for these destinations.');
  }
  const result = {
    geometry: route.geometry,
    distanceMetres: route.distance,
    durationSeconds: route.duration,
    source: 'OpenStreetMap routing via OSRM',
  };
  setCached(cacheKey, result);
  return result;
}
