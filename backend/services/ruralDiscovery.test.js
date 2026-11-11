import assert from 'node:assert/strict';
import test from 'node:test';
import { findNominatimArea, getRuralDestinations, isWikimediaImageMatch } from './ruralDiscovery.js';

test('matches Commons titles containing the distinctive destination name', () => {
  assert.equal(isWikimediaImageMatch('Charpa Waterfall', 'Charpa-waterfalls-summer-season.jpg'), true);
  assert.equal(
    isWikimediaImageMatch(
      'Sri Kalyana Venkateshwara Temple',
      'Kalyana Venkateshwara Swamy Temple And Sri Anjaneya SwamyTemple.jpg'
    ),
    true
  );
});

test('does not match generic place labels to unrelated Commons images', () => {
  assert.equal(isWikimediaImageMatch('Waterfall', 'Marmala Waterfall.jpg'), false);
  assert.equal(isWikimediaImageMatch('Lake', 'Dal Lake, Srinagar.jpg'), false);
  assert.equal(
    isWikimediaImageMatch('Vegetable Market', 'Vegetable vendor at Mir Alam Mandi, Hyderabad.jpg'),
    false
  );
});

test('rejects destination batches larger than 20 before contacting providers', async () => {
  await assert.rejects(getRuralDestinations({ limit: 21 }), /between 1 and 20/);
});

test('supports feed categories with matching OpenStreetMap queries', async () => {
  const originalFetch = globalThis.fetch;
  const originalPrimary = process.env.OVERPASS_URL;
  const originalFallback = process.env.OVERPASS_FALLBACK_URL;
  const queries = new Map();
  process.env.OVERPASS_URL = 'https://category-overpass.example/api/interpreter';
  process.env.OVERPASS_FALLBACK_URL = 'https://category-fallback.example/api/interpreter';
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('category-overpass.example')) {
      queries.set(new URLSearchParams(options.body).get('data'), true);
      return new Response(JSON.stringify({ elements: [] }));
    }
    return new Response(JSON.stringify({ elements: [] }));
  };
  try {
    for (const [category, phrase] of [
      ['businesses', '["shop"]'],
      ['homestays', 'guest_house'],
      ['food', 'food_court'],
      ['farms', 'landuse'],
      ['craft', '["craft"]'],
      ['experiences', 'attraction'],
    ]) {
      const result = await getRuralDestinations({ category, limit: 20, forceRefresh: true });
      assert.equal(result.destinations.length, 0);
      assert.ok([...queries.keys()].some((query) => query.includes(phrase)), `${category} query should include ${phrase}`);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPrimary === undefined) delete process.env.OVERPASS_URL;
    else process.env.OVERPASS_URL = originalPrimary;
    if (originalFallback === undefined) delete process.env.OVERPASS_FALLBACK_URL;
    else process.env.OVERPASS_FALLBACK_URL = originalFallback;
  }
});

test('tries the free Overpass fallback when the primary endpoint fails', async () => {
  const originalFetch = globalThis.fetch;
  const originalPrimary = process.env.OVERPASS_URL;
  const originalFallback = process.env.OVERPASS_FALLBACK_URL;
  const requestedUrls = [];
  process.env.OVERPASS_URL = 'https://primary-overpass.example/api/interpreter';
  process.env.OVERPASS_FALLBACK_URL = 'https://fallback-overpass.example/api/interpreter';
  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    if (String(url).includes('primary-overpass.example')) return new Response('upstream error', { status: 502 });
    if (String(url).includes('fallback-overpass.example')) {
      return new Response(JSON.stringify({ elements: [{ type: 'node', id: 1, lat: 16.5, lon: 80.6, tags: { name: 'Village Kitchen', amenity: 'restaurant' } }] }));
    }
    return new Response(JSON.stringify({ query: { pages: {} } }));
  };
  try {
    const result = await getRuralDestinations({ category: 'food', limit: 19, forceRefresh: true });
    assert.equal(result.destinations[0].name, 'Village Kitchen');
    assert.ok(requestedUrls.some((url) => url.includes('primary-overpass.example')));
    assert.ok(requestedUrls.some((url) => url.includes('fallback-overpass.example')));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPrimary === undefined) delete process.env.OVERPASS_URL;
    else process.env.OVERPASS_URL = originalPrimary;
    if (originalFallback === undefined) delete process.env.OVERPASS_FALLBACK_URL;
    else process.env.OVERPASS_FALLBACK_URL = originalFallback;
  }
});

test('does not use broad Nominatim searches when statewide Overpass discovery fails', async () => {
  const originalFetch = globalThis.fetch;
  const originalPrimary = process.env.OVERPASS_URL;
  const originalFallback = process.env.OVERPASS_FALLBACK_URL;
  const requestedUrls = [];
  process.env.OVERPASS_URL = 'https://primary-empty.example/api/interpreter';
  process.env.OVERPASS_FALLBACK_URL = 'https://fallback-empty.example/api/interpreter';
  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    return new Response('upstream error', { status: 503 });
  };
  try {
    const result = await getRuralDestinations({ category: 'market', limit: 18, forceRefresh: true });
    assert.equal(result.destinations.length, 0);
    assert.equal(requestedUrls.some((url) => url.includes('nominatim.openstreetmap.org')), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPrimary === undefined) delete process.env.OVERPASS_URL;
    else process.env.OVERPASS_URL = originalPrimary;
    if (originalFallback === undefined) delete process.env.OVERPASS_FALLBACK_URL;
    else process.env.OVERPASS_FALLBACK_URL = originalFallback;
  }
});

test('geocodes a user-entered Andhra Pradesh area and reuses the cached result', async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response(JSON.stringify([{ lat: '17.9', lon: '82.7', display_name: 'Araku Valley, Andhra Pradesh, India', address: { country_code: 'in', state: 'Andhra Pradesh' } }]));
  };
  try {
    const first = await findNominatimArea('Araku Valley');
    const second = await findNominatimArea('Araku Valley');
    assert.equal(first.latitude, 17.9);
    assert.equal(first.longitude, 82.7);
    assert.equal(second.displayName, first.displayName);
    assert.equal(requestCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
