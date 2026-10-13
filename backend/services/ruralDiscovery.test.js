import assert from 'node:assert/strict';
import test from 'node:test';
import { getRuralDestinations, isWikimediaImageMatch } from './ruralDiscovery.js';

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
