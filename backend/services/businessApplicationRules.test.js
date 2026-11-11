import test from 'node:test';
import assert from 'node:assert/strict';
import { andhraPradeshDistricts, businessCategories } from '../../shared/businessOptions.js';
import { getSubmissionError, isApplicationEditable, normalizeIndianMobile, safeOriginalFilename, validateBusinessDraft, validateUpload } from './businessApplicationRules.js';

const limits = { documentMaxBytes: 1000, photoMaxBytes: 1000, minPhotos: 2, maxPhotos: 5 };
const validDraft = {
  businessName: 'Araku Weaves', category: businessCategories[0], description: 'Handwoven local products.', yearEstablished: '',
  state: 'Andhra Pradesh', district: andhraPradeshDistricts[0], locality: 'Araku', address: 'Main street, near the market',
  mobile: '+91 9876543210', email: '', latitude: null, longitude: null, verificationNotes: '', alternativeEvidence: false,
};

test('validates Andhra Pradesh registration details and leaves map coordinates optional', () => {
  assert.equal(andhraPradeshDistricts.length, 28);
  const result = validateBusinessDraft(validDraft, new Date('2026-01-01'));
  assert.deepEqual(result.errors, {});
  assert.equal(result.normalizedMobile, '9876543210');
});

test('accepts an optional HTTPS website and rejects invalid website URLs', () => {
  assert.deepEqual(validateBusinessDraft({ ...validDraft, website: 'https://example.com' }).errors, {});
  assert.ok(validateBusinessDraft({ ...validDraft, website: 'http://example.com' }).errors.website);
  assert.ok(validateBusinessDraft({ ...validDraft, website: 'not a URL' }).errors.website);
});

test('rejects invalid categories, unsupported districts, future years, bad mobile, and half coordinates', () => {
  const result = validateBusinessDraft({ ...validDraft, category: 'Unlisted', district: 'Not a district', yearEstablished: 2030, mobile: '123', latitude: 15, longitude: null }, new Date('2026-01-01'));
  assert.ok(result.errors.category);
  assert.ok(result.errors.district);
  assert.ok(result.errors.yearEstablished);
  assert.ok(result.errors.mobile);
  assert.ok(result.errors.location);
});

test('drafts remain editable only before final review or after requested changes/rejection', () => {
  assert.equal(isApplicationEditable('draft'), true);
  assert.equal(isApplicationEditable('changes_requested'), true);
  assert.equal(isApplicationEditable('rejected'), true);
  assert.equal(isApplicationEditable('pending_review'), false);
  assert.equal(isApplicationEditable('approved'), false);
});

test('submission requires required address/contact, minimum photos, and evidence or alternative notes', () => {
  const business = { businessName: 'Araku Weaves', category: businessCategories[0], description: 'Good products', district: andhraPradeshDistricts[0], locality: 'Araku', address: 'Main street, near the market', mobile: '+919876543210' };
  const app = { photos: [], documents: [], alternativeEvidence: false, verificationNotes: '' };
  assert.match(getSubmissionError(business, app, limits), /photos/);
  app.photos = [{ id: 'a' }, { id: 'b' }];
  assert.match(getSubmissionError(business, app, limits), /supporting evidence/);
  app.alternativeEvidence = true;
  app.verificationNotes = 'The business is locally established';
  assert.equal(getSubmissionError(business, app, limits), '');
  assert.match(getSubmissionError({ ...business, mobile: '123' }, app, limits), /contact details/);
});

test('upload validation checks content signatures, type, and configured size', () => {
  assert.equal(validateUpload('documents', 'application/pdf', Buffer.from('%PDF-1.4'), limits), '');
  assert.match(validateUpload('documents', 'application/pdf', Buffer.from('not a pdf'), limits), /contents/);
  assert.match(validateUpload('documents', 'application/x-msdownload', Buffer.from('MZ'), limits), /not supported/);
  assert.match(validateUpload('photos', 'image/png', Buffer.alloc(1001, 0), limits), /size limit/);
  const webp = Buffer.alloc(12); webp.write('RIFF', 0); webp.write('WEBP', 8);
  assert.equal(validateUpload('photos', 'image/webp', webp, limits), '');
});

test('normalizes mobile numbers and strips path components from upload filenames', () => {
  assert.equal(normalizeIndianMobile(' +91 (987) 654-3210 '), '9876543210');
  assert.equal(safeOriginalFilename('../../private/identity.pdf'), 'identity.pdf');
  assert.equal(safeOriginalFilename('C:\\fakepath\\proof.png'), 'proof.png');
});
