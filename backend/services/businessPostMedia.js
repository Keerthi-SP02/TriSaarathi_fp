const imageFormats = new Set(['jpg', 'jpeg', 'png', 'webp']);
const videoFormats = new Set(['mp4', 'webm', 'mov']);

export function validatePostMediaRequest(media, ownerId, limits) {
  if (!Array.isArray(media)) return 'Post media must be a list.';
  if (media.length > limits.photoMaxCount + limits.videoMaxCount) {
    return `A post can include up to ${limits.photoMaxCount} photos and ${limits.videoMaxCount} videos.`;
  }

  const counts = { image: 0, video: 0 };
  const ids = new Set();
  const expectedId = new RegExp(`^trisaarathi/business/${ownerId}/posts/[A-Za-z0-9_-]+$`);
  for (const item of media) {
    if (!item || !['image', 'video'].includes(item.type) || typeof item.publicId !== 'string' ||
      !expectedId.test(item.publicId)) {
      return 'Each post media item must be an upload created for this business.';
    }
    if (ids.has(item.publicId)) return 'A post cannot include the same media more than once.';
    ids.add(item.publicId);
    counts[item.type] += 1;
  }

  if (counts.image > limits.photoMaxCount) return `A post can include up to ${limits.photoMaxCount} photos.`;
  if (counts.video > limits.videoMaxCount) return `A post can include up to ${limits.videoMaxCount} videos.`;
  return '';
}

export function validateCloudinaryPostMedia(item, resource, cloudName, limits) {
  if (!resource || resource.public_id !== item.publicId || resource.resource_type !== item.type ||
    typeof resource.secure_url !== 'string') {
    return { error: 'The uploaded media could not be verified with the storage provider.' };
  }

  let url;
  try {
    url = new URL(resource.secure_url);
  } catch {
    return { error: 'The storage provider returned an invalid media URL.' };
  }
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' ||
    url.pathname.split('/')[1] !== cloudName) {
    return { error: 'The storage provider returned an invalid media URL.' };
  }

  const format = String(resource.format || '').toLowerCase();
  const bytes = Number(resource.bytes);
  const allowedFormats = item.type === 'image' ? imageFormats : videoFormats;
  const maxBytes = item.type === 'image' ? limits.photoMaxBytes : limits.videoMaxBytes;
  if (!allowedFormats.has(format) || !Number.isSafeInteger(bytes) || bytes < 1 || bytes > maxBytes) {
    return { error: item.type === 'image'
      ? `Photos must be JPG, PNG, or WEBP files no larger than ${Math.ceil(maxBytes / 1024 / 1024)} MB.`
      : `Videos must be MP4, WEBM, or MOV files no larger than ${Math.ceil(maxBytes / 1024 / 1024)} MB.` };
  }

  const duration = item.type === 'video' ? Number(resource.duration) : null;
  if (item.type === 'video' && (!Number.isFinite(duration) || duration <= 0 || duration > limits.videoMaxDurationSeconds)) {
    return { error: `Videos must be no longer than ${limits.videoMaxDurationSeconds} seconds.` };
  }

  return {
    media: {
      url: resource.secure_url,
      type: item.type,
      publicId: resource.public_id,
      thumbnailUrl: item.type === 'video' ? resource.secure_url.replace('/video/upload/', '/video/upload/so_0/').replace(/\.[^/.]+$/, '.jpg') : '',
      bytes,
      duration,
    },
  };
}
