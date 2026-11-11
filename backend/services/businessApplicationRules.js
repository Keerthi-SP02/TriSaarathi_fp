import { andhraPradeshDistricts, businessCategories } from '../../shared/businessOptions.js';

export function normalizeIndianMobile(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\s()-]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');
}

export function validateBusinessDraft(body, now = new Date()) {
  const errors = {};
  const value = body && typeof body === 'object' ? body : {};
  if (value.state !== undefined && value.state !== 'Andhra Pradesh') errors.state = 'Business location must be in Andhra Pradesh.';
  if (typeof value.businessName !== 'string' || value.businessName.trim().length < 2 || value.businessName.trim().length > 150) errors.businessName = 'Business name must be between 2 and 150 characters.';
  if (typeof value.category !== 'string' || !businessCategories.includes(value.category)) errors.category = 'Choose a supported business category.';
  if (typeof value.description !== 'string' || !value.description.trim() || value.description.trim().length > 500) errors.description = 'Business description must contain up to 500 characters.';
  if (value.yearEstablished !== '' && value.yearEstablished !== null && value.yearEstablished !== undefined && (!Number.isInteger(Number(value.yearEstablished)) || Number(value.yearEstablished) < 1800 || Number(value.yearEstablished) > now.getFullYear())) errors.yearEstablished = 'Year established is invalid.';
  if (value.district !== undefined && value.district !== '' && !andhraPradeshDistricts.includes(value.district)) errors.district = 'Choose a valid Andhra Pradesh district.';
  if (value.locality !== undefined && (typeof value.locality !== 'string' || value.locality.length > 120)) errors.locality = 'Village or town is invalid.';
  if (value.address !== undefined && (typeof value.address !== 'string' || value.address.length > 500)) errors.address = 'Address is invalid.';
  if (value.mobile !== undefined && typeof value.mobile !== 'string') errors.mobile = 'Mobile number is invalid.';
  if (value.email !== undefined && (typeof value.email !== 'string' || value.email.length > 254 || (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)))) errors.email = 'Email address is invalid.';
  if (value.website !== undefined && (
    typeof value.website !== 'string' ||
    value.website.length > 2048 ||
    (value.website.trim() && (() => { try { return new URL(value.website.trim()).protocol !== 'https:'; } catch { return true; } })())
  )) errors.website = 'Enter a valid HTTPS website URL.';
  const latitudePresent = value.latitude !== null && value.latitude !== undefined && value.latitude !== '';
  const longitudePresent = value.longitude !== null && value.longitude !== undefined && value.longitude !== '';
  if (latitudePresent !== longitudePresent) errors.location = 'Both map coordinates must be supplied together.';
  if (latitudePresent && (!Number.isFinite(Number(value.latitude)) || Number(value.latitude) < -90 || Number(value.latitude) > 90)) errors.latitude = 'Latitude is outside the valid range.';
  if (longitudePresent && (!Number.isFinite(Number(value.longitude)) || Number(value.longitude) < -180 || Number(value.longitude) > 180)) errors.longitude = 'Longitude is outside the valid range.';
  if (value.verificationNotes !== undefined && (typeof value.verificationNotes !== 'string' || value.verificationNotes.length > 1000)) errors.verificationNotes = 'Verification notes exceed 1000 characters.';
  if (value.alternativeEvidence !== undefined && typeof value.alternativeEvidence !== 'boolean') errors.alternativeEvidence = 'Alternative evidence selection is invalid.';
  const mobile = normalizeIndianMobile(value.mobile);
  if (value.mobile && !/^[6-9]\d{9}$/.test(mobile)) errors.mobile = 'Enter a valid Indian mobile number.';
  return { errors, normalizedMobile: mobile };
}

export function isApplicationEditable(status) {
  return ['draft', 'changes_requested', 'rejected'].includes(status);
}

export function getSubmissionError(business, application, limits) {
  if (!business || !business.businessName || !businessCategories.includes(business.category) || !business.description || !andhraPradeshDistricts.includes(business.district) || !business.locality || (business.address || '').trim().length < 5 || !/^[6-9]\d{9}$/.test(normalizeIndianMobile(business.mobile))) return 'Complete all required business, location, and contact details before submitting.';
  if ((application.photos?.length || 0) < limits.minPhotos) return `Upload at least ${limits.minPhotos} business photos before submitting.`;
  if (!(application.documents?.length) && (!application.alternativeEvidence || (application.verificationNotes || '').trim().length < 20)) return 'Upload supporting evidence or provide at least 20 characters of alternative evidence notes.';
  return '';
}

export function validateUpload(kind, mimeType, data, limits) {
  const photo = kind === 'photos';
  const allowed = photo
    ? { 'image/jpeg': [0xff, 0xd8, 0xff], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/webp': null }
    : { 'application/pdf': [0x25, 0x50, 0x44, 0x46], 'image/jpeg': [0xff, 0xd8, 0xff], 'image/png': [0x89, 0x50, 0x4e, 0x47] };
  const sizeLimit = photo ? limits.photoMaxBytes : limits.documentMaxBytes;
  if (!allowed.hasOwnProperty(mimeType) || data.length === 0 || data.length > sizeLimit) return 'This file type is not supported or the file exceeds the configured size limit.';
  if (mimeType === 'image/webp') return data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP' ? '' : 'The file contents do not match the selected file type.';
  return allowed[mimeType].every((byte, index) => data[index] === byte) ? '' : 'The file contents do not match the selected file type.';
}

export function safeOriginalFilename(value) {
  return String(value || 'upload').replace(/\\/g, '/').split('/').pop().replace(/[\u0000-\u001f]/g, '').slice(0, 180) || 'upload';
}
