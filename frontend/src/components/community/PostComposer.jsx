import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Send, Video, X } from 'lucide-react';
import { apiRequest } from '../../lib/api.js';
import { feedCategories } from './CategoryFilters.jsx';

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const videoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const defaultLimits = {
  photoMaxBytes: 10 * 1024 * 1024,
  videoMaxBytes: 50 * 1024 * 1024,
  photoMaxCount: 5,
  videoMaxCount: 2,
  videoMaxDurationSeconds: 120,
};

function formatBytes(bytes) {
  return `${Math.ceil(bytes / 1024 / 1024)} MB`;
}

function readVideoDuration(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve(video.duration);
    video.onerror = () => reject(new Error('This video could not be previewed. Try another supported video file.'));
    video.src = url;
  });
}

function uploadToCloudinary(file, signedUpload, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', signedUpload.apiKey);
    form.append('timestamp', String(signedUpload.timestamp));
    form.append('public_id', signedUpload.publicId);
    form.append('signature', signedUpload.signature);
    if (signedUpload.overwrite === false) form.append('overwrite', 'false');

    const request = new XMLHttpRequest();
    request.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(signedUpload.cloudName)}/${signedUpload.resourceType}/upload`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error(`Could not upload ${file.name}. Check your connection and try again.`));
    request.onload = () => {
      let result;
      try {
        result = JSON.parse(request.responseText);
      } catch {
        reject(new Error(`The upload service returned an unreadable response for ${file.name}.`));
        return;
      }
      if (request.status < 200 || request.status >= 300 || result.public_id !== signedUpload.publicId) {
        reject(new Error(result.error?.message || `Could not upload ${file.name}.`));
        return;
      }
      resolve({ publicId: result.public_id, type: signedUpload.resourceType });
    };
    request.send(form);
  });
}

export default function PostComposer({ approved, draft, onDraft, onPublish, uploadPolicy, uploadPolicyError, mediaUploadsEnabled }) {
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [category, setCategory] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(null);
  const photoInput = useRef(null);
  const videoInput = useRef(null);
  const objectUrls = useRef(new Set());
  const limits = uploadPolicy || defaultLimits;

  useEffect(() => () => {
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
    objectUrls.current.clear();
  }, []);

  const addFiles = async (event, type) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    setUploadError('');
    setSuccess('');
    const next = [...selectedMedia];
    const errors = [];
    for (const file of files) {
      const expectedTypes = type === 'image' ? imageTypes : videoTypes;
      const maxBytes = type === 'image' ? limits.photoMaxBytes : limits.videoMaxBytes;
      const maxCount = type === 'image' ? limits.photoMaxCount : limits.videoMaxCount;
      const currentCount = next.filter((item) => item.type === type).length;
      if (!expectedTypes.has(file.type)) {
        errors.push(`${file.name}: unsupported file type.`);
        continue;
      }
      if (file.size === 0 || file.size > maxBytes) {
        errors.push(`${file.name}: file must be no larger than ${formatBytes(maxBytes)}.`);
        continue;
      }
      if (currentCount >= maxCount) {
        errors.push(`You can attach up to ${maxCount} ${type === 'image' ? 'photos' : 'videos'} per post.`);
        break;
      }
      const url = URL.createObjectURL(file);
      let duration = null;
      if (type === 'video') {
        try {
          duration = await readVideoDuration(url);
        } catch (previewError) {
          URL.revokeObjectURL(url);
          errors.push(`${file.name}: ${previewError.message}`);
          continue;
        }
        if (!Number.isFinite(duration) || duration <= 0 || duration > limits.videoMaxDurationSeconds) {
          URL.revokeObjectURL(url);
          errors.push(`${file.name}: video must be no longer than ${limits.videoMaxDurationSeconds} seconds.`);
          continue;
        }
      }
      objectUrls.current.add(url);
      next.push({ file, url, type, duration });
    }
    setSelectedMedia(next);
    if (errors.length) setUploadError(errors.join(' '));
  };

  const removeMedia = (url) => {
    URL.revokeObjectURL(url);
    objectUrls.current.delete(url);
    setSelectedMedia((current) => current.filter((item) => item.url !== url));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !approved || !draft.trim()) return;
    if (selectedMedia.length && mediaUploadsEnabled !== true) {
      setUploadError(uploadPolicyError
        ? `${uploadPolicyError} Configure media uploads on the backend before publishing attachments.`
        : mediaUploadsEnabled === false
          ? 'Photo and video publishing is not configured. Configure Cloudinary on the backend, then try again.'
          : 'Media upload settings are still loading. Please try again shortly.');
      return;
    }
    setSubmitting(true);
    setUploadError('');
    setSuccess('');
    const uploaded = [];
    try {
      for (const item of selectedMedia) {
        setProgress({ name: item.file.name, percent: 0 });
        const signedUpload = await apiRequest('/business/uploads/sign', {
          method: 'POST',
          body: JSON.stringify({ resourceType: item.type, purpose: 'post' }),
        });
        const uploadDescriptor = { publicId: signedUpload.publicId, type: item.type };
        uploaded.push(uploadDescriptor);
        const completedUpload = await uploadToCloudinary(item.file, signedUpload, (percent) => setProgress({ name: item.file.name, percent }));
        if (completedUpload.publicId !== uploadDescriptor.publicId) throw new Error(`The upload service returned an unexpected file for ${item.file.name}.`);
      }
      await onPublish({ content: draft.trim(), category, media: uploaded });
      selectedMedia.forEach((item) => URL.revokeObjectURL(item.url));
      objectUrls.current.clear();
      setSelectedMedia([]);
      setCategory('');
      onDraft('');
      setSuccess('Your update has been published.');
    } catch (publishError) {
      const cleanupErrors = [];
      for (const item of uploaded) {
        try {
          await apiRequest('/business/uploads/cleanup', {
            method: 'POST',
            body: JSON.stringify({ resourceType: item.type, publicId: item.publicId }),
          });
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError.message);
        }
      }
      setUploadError(cleanupErrors.length
        ? `${publishError.message} Some uploaded files could not be cleaned up: ${cleanupErrors.join(' ')}`
        : publishError.message);
    } finally {
      setProgress(null);
      setSubmitting(false);
    }
  };

  const photos = selectedMedia.filter((item) => item.type === 'image').length;
  const videos = selectedMedia.filter((item) => item.type === 'video').length;
  return <form className="ts-composer" onSubmit={handleSubmit}>
    <div className="ts-composer-content">
      <textarea value={draft} onChange={(event) => { onDraft(event.target.value); setSuccess(''); }} placeholder="Share an update from your business..." maxLength={5000} disabled={!approved || submitting} aria-label="Business update" />
      {!approved && <p className="ts-posting-note">Register and verify your business to start posting updates.</p>}
      {!uploadPolicy && !uploadPolicyError && <p className="ts-posting-note" role="status">Checking media upload limits…</p>}
      {uploadPolicyError && <p className="ts-posting-note" role="status">{uploadPolicyError} Text-only posts are still available.</p>}
      {mediaUploadsEnabled === false && <p className="ts-posting-note" role="status">Photos and videos can be selected and previewed. Publishing posts with media requires Cloudinary to be configured; text-only posts are still available.</p>}
      {selectedMedia.length > 0 && <div className="ts-composer-media" aria-label="Selected media previews">
        {selectedMedia.map((item) => <figure key={item.url}>
          {item.type === 'image' ? <img src={item.url} alt={item.file.name} /> : <video src={item.url} controls preload="metadata" />}
          <figcaption><span title={item.file.name}>{item.file.name}{item.duration ? ` · ${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, '0')}` : ''}</span><button type="button" aria-label={`Remove ${item.file.name}`} disabled={submitting} onClick={() => removeMedia(item.url)}><X size={15} /></button></figcaption>
        </figure>)}
      </div>}
      {progress && <div className="ts-upload-progress" role="status"><span>Uploading {progress.name}</span><progress max="100" value={progress.percent}>{progress.percent}%</progress><small>{progress.percent}%</small></div>}
      {uploadError && <p className="ts-error" role="alert">{uploadError}</p>}
      {success && <p className="ts-success-message" role="status">{success}</p>}
      <footer className="ts-composer-footer">
        <span>{draft.length}/5000 · {photos}/{limits.photoMaxCount} photos · {videos}/{limits.videoMaxCount} videos</span>
        <div className="ts-composer-tools">
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => addFiles(event, 'image')} />
          <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime" multiple hidden onChange={(event) => addFiles(event, 'video')} />
          <button type="button" className="ts-media-button" disabled={!approved || submitting || photos >= limits.photoMaxCount} onClick={() => photoInput.current?.click()}><ImagePlus size={16} />Add Photos</button>
          <button type="button" className="ts-media-button" disabled={!approved || submitting || videos >= limits.videoMaxCount} onClick={() => videoInput.current?.click()}><Video size={16} />Add Videos</button>
          <label className="ts-category-select"><span className="ts-sr-only">Post category</span><select value={category} onChange={(event) => setCategory(event.target.value)} disabled={submitting}><option value="">Category (optional)</option>{feedCategories.filter((item) => item.id !== 'all').map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <button type="submit" disabled={!approved || !draft.trim() || submitting}><Send size={15} />{submitting ? <><LoaderCircle className="ts-spin" size={15} />Publishing…</> : 'Publish'}</button>
        </div>
      </footer>
    </div>
  </form>;
}
