import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCloudinaryPostMedia, validatePostMediaRequest } from './businessPostMedia.js';
import { createCloudinarySignature } from './cloudinarySignature.js';

const limits = {
  photoMaxBytes: 10 * 1024 * 1024,
  videoMaxBytes: 50 * 1024 * 1024,
  photoMaxCount: 5,
  videoMaxCount: 2,
  videoMaxDurationSeconds: 120,
};
const ownerId = '507f1f77bcf86cd799439011';
const image = { type: 'image', publicId: `trisaarathi/business/${ownerId}/posts/photo-1` };
const video = { type: 'video', publicId: `trisaarathi/business/${ownerId}/posts/video-1` };
const resource = (item, overrides = {}) => ({
  public_id: item.publicId,
  resource_type: item.type,
  secure_url: `https://res.cloudinary.com/example/${item.type}/upload/${item.publicId}.jpg`,
  format: item.type === 'image' ? 'jpg' : 'mp4',
  bytes: 1024,
  duration: item.type === 'video' ? 45 : undefined,
  ...overrides,
});

test('creates Cloudinary signatures using sorted parameters and the appended API secret', () => {
  assert.equal(createCloudinarySignature({ timestamp: 1315060510 }, 'abcd'), 'a21ad0f63beb4de2e5575204b79ab90bffb02c10');
  assert.equal(createCloudinarySignature({
    timestamp: 1315060510,
    public_id: 'sample_image',
    eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
  }, 'abcd'), 'bfd09f95f331f558cbd1320e67aa8d488770583e');
});

test('accepts a bounded mixed media list owned by the business', () => {
  assert.equal(validatePostMediaRequest([], ownerId, limits), '');
  assert.equal(validatePostMediaRequest([image, video], ownerId, limits), '');
});

test('rejects duplicate or foreign media identifiers and over-limit counts', () => {
  assert.match(validatePostMediaRequest([image, image], ownerId, limits), /same media/);
  assert.match(validatePostMediaRequest([{ ...image, publicId: image.publicId.replace(ownerId, '507f1f77bcf86cd799439012') }], ownerId, limits), /created for this business/);
  assert.match(validatePostMediaRequest(Array.from({ length: 6 }, (_, index) => ({ ...image, publicId: `${image.publicId}-${index}` })), ownerId, limits), /up to 5 photos/);
  assert.match(validatePostMediaRequest(Array.from({ length: 3 }, (_, index) => ({ ...video, publicId: `${video.publicId}-${index}` })), ownerId, limits), /up to 2 videos/);
  assert.match(validatePostMediaRequest(null, ownerId, limits), /must be a list/);
});

test('accepts only provider-confirmed formats, sizes, and video duration', () => {
  assert.equal(validateCloudinaryPostMedia(image, resource(image), 'example', limits).media.type, 'image');
  assert.equal(validateCloudinaryPostMedia(video, resource(video), 'example', limits).media.duration, 45);
  assert.match(validateCloudinaryPostMedia(video, resource(video, { duration: 121 }), 'example', limits).error, /120 seconds/);
  assert.match(validateCloudinaryPostMedia(image, resource(image, { bytes: limits.photoMaxBytes + 1 }), 'example', limits).error, /no larger than 10 MB/);
  assert.match(validateCloudinaryPostMedia(image, resource(image, { format: 'svg' }), 'example', limits).error, /JPG, PNG, or WEBP/);
  assert.match(validateCloudinaryPostMedia(image, resource(image, { resource_type: 'video' }), 'example', limits).error, /could not be verified/);
  assert.match(validateCloudinaryPostMedia(image, resource(image, { secure_url: 'https://example.com/image.jpg' }), 'example', limits).error, /invalid media URL/);
});
