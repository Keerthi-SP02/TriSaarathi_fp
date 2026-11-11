import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeDiscoverySources, providerRetryDelay, shouldServeCachedResult } from './discoveryFallback.js';

const place = (id, source, extra = {}) => ({
  id, source, sourceProvider: source, name: `Place ${id}`, category: 'Food', latitude: 16.5, longitude: 80.6, ...extra,
});
const failed = { destinations: [], available: false, skipped: false, message: 'upstream unavailable' };

test('MongoDB records remain first and live OpenStreetMap duplicates are merged', () => {
  const stored = place('osm:node:1', 'OpenStreetMap', { description: 'Saved description' });
  const result = mergeDiscoverySources({
    storedPlaces: [stored],
    openStreetMap: { available: true, destinations: [place('osm:node:1', 'OpenStreetMap'), place('osm:node:2', 'OpenStreetMap')] },
  });
  assert.deepEqual(result.destinations.map(({ id }) => id), ['osm:node:1', 'osm:node:2']);
  assert.equal(result.destinations[0].description, 'Saved description');
  assert.equal(result.discovery.available, true);
});

test('OpenStreetMap results remain available', () => {
  const result = mergeDiscoverySources({ openStreetMap: { available: true, destinations: [place('osm:1', 'OpenStreetMap')] } });
  assert.equal(result.destinations[0].source, 'OpenStreetMap');
  assert.equal(result.discovery.available, true);
});

test('MongoDB imported records are shown when live place discovery fails', () => {
  const result = mergeDiscoverySources({ storedPlaces: [place('osm:saved', 'OpenStreetMap')], openStreetMap: failed });
  assert.equal(result.destinations[0].cached, true);
  assert.match(result.discovery.message, /previously saved/);
});

test('no cached places and failed place APIs produce a truthful unavailable state', () => {
  const result = mergeDiscoverySources({ openStreetMap: failed });
  assert.equal(result.destinations.length, 0);
  assert.equal(result.discovery.available, false);
  assert.match(result.discovery.message, /temporarily unavailable/);
});

test('a saved Commons image and its attribution survive an image-provider outage', () => {
  const photo = { thumbnailUrl: 'https://commons.wikimedia.org/thumb.jpg', artist: 'Creator', license: 'CC BY-SA' };
  const result = mergeDiscoverySources({
    storedPlaces: [place('osm:photo', 'OpenStreetMap', { photo })],
    openStreetMap: { available: true, destinations: [place('osm:photo', 'OpenStreetMap', { photo: null })] },
  });
  assert.equal(result.destinations[0].displayImage, photo);
  assert.equal(result.destinations[0].displayImage.artist, 'Creator');
});

test('no image provider result yields a neutral no-image value', () => {
  const result = mergeDiscoverySources({ openStreetMap: { available: true, destinations: [place('osm:no-photo', 'OpenStreetMap')] } });
  assert.equal(result.destinations[0].displayImage, null);
});

test('missing business phone uses the explicit contact fallback', () => {
  const result = mergeDiscoverySources({ openStreetMap: { available: true, destinations: [place('osm:no-phone', 'OpenStreetMap')] } });
  assert.equal(result.destinations[0].displayPhone, 'Contact number not provided.');
});

test('missing image and description have neutral display fallbacks', () => {
  const result = mergeDiscoverySources({ openStreetMap: { available: true, destinations: [place('osm:empty', 'OpenStreetMap')] } });
  assert.equal(result.destinations[0].displayImage, null);
  assert.equal(result.destinations[0].displayDescription, 'Description not provided.');
});

test('missing coordinates hide map navigation and missing address is stated clearly', () => {
  const result = mergeDiscoverySources({ openStreetMap: { available: true, destinations: [place('osm:no-coords', 'OpenStreetMap', { latitude: null, longitude: null, location: '', address: '' })] } });
  assert.equal(result.destinations[0].hasMap, false);
  assert.equal(result.destinations[0].displayAddress, 'Location details unavailable.');
});

test('a valid zero-result response is empty, not unavailable', () => {
  const result = mergeDiscoverySources({ openStreetMap: { available: true, destinations: [] } });
  assert.equal(result.destinations.length, 0);
  assert.equal(result.discovery.empty, true);
  assert.equal(result.discovery.available, true);
  assert.match(result.discovery.message, /No local places found/);
});

test('rate limits back off exponentially and permanent client errors back off for an hour', () => {
  assert.equal(providerRetryDelay(429, 1), 5000);
  assert.equal(providerRetryDelay(429, 2), 10000);
  assert.equal(providerRetryDelay(401, 4), 60 * 60 * 1000);
});

test('a user retry bypasses a fresh cache while normal feed loads reuse it', () => {
  assert.equal(shouldServeCachedResult(true), true);
  assert.equal(shouldServeCachedResult(true, true), false);
  assert.equal(shouldServeCachedResult(false, true), false);
});
