import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import TriSaarathiHeader from '../components/layout/TriSaarathiHeader.jsx';
import ProfileSidebar from '../components/business/ProfileSidebar.jsx';
import PostComposer from '../components/community/PostComposer.jsx';
import CommunityFeed from '../components/community/CommunityFeed.jsx';
import BusinessRegistration from './BusinessRegistration.jsx';
import '../styles/trisaarathi-dashboard.css';

function uploadProfileImage(file, signedUpload) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signedUpload.apiKey);
    formData.append('timestamp', String(signedUpload.timestamp));
    formData.append('public_id', signedUpload.publicId);
    formData.append('signature', signedUpload.signature);

    const request = new XMLHttpRequest();
    request.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(signedUpload.cloudName)}/image/upload`);
    request.onerror = () => reject(new Error('Could not upload the profile photo. Check your connection and try again.'));
    request.onload = () => {
      let result;
      try {
        result = JSON.parse(request.responseText);
      } catch {
        reject(new Error('The upload service returned an unreadable response.'));
        return;
      }
      if (request.status < 200 || request.status >= 300 || result.public_id !== signedUpload.publicId || !result.secure_url) {
        reject(new Error(result.error?.message || 'Could not upload the profile photo.'));
        return;
      }
      resolve(result.secure_url);
    };
    request.send(formData);
  });
}

export default function BusinessDashboard({ user, onUserUpdate, onLogout, onNavigate, theme, onToggleTheme }) {
  const [section, setSection] = useState('Dashboard');
  const [profile, setProfile] = useState({});
  const [application, setApplication] = useState(null);
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [uploadPolicy, setUploadPolicy] = useState(null);
  const [mediaUploadsEnabled, setMediaUploadsEnabled] = useState(null);
  const [uploadPolicyError, setUploadPolicyError] = useState('');
  const [publicBusiness, setPublicBusiness] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ count: 0, average: 0 });
  const [notifications, setNotifications] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [inquiryReplies, setInquiryReplies] = useState({});
  const [destinations, setDestinations] = useState([]);
  const [profileOpen, setProfileOpen] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const [{ business }, { application: record }, { photos }] = await Promise.all([apiRequest('/business/profile'), apiRequest('/business-applications/mine'), apiRequest('/business/photos').catch(() => ({ photos: [] }))]);
      setProfile({ ...(business || {}), website: business?.website || record?.business?.website || '', avatarUrl: business?.avatarUrl || user.avatarUrl || photos?.[0]?.secureUrl || '' }); setApplication(record || null);
    } catch (requestError) { setProfileError(requestError.message); }
  }, [user.avatarUrl]);

  const loadFeed = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await apiRequest('/community/posts?scope=feed&page=1&limit=20&type=all'); setPosts(result.posts || []); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  const loadSavedPosts = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await apiRequest('/community/posts?scope=saved&page=1&limit=20&type=all'); setPosts(result.posts || []); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProfile(); apiRequest('/notifications').then((result) => { setUnreadCount(result.unreadCount || 0); setNotifications(result.notifications || []); }).catch(() => {}); }, [loadProfile]);
  useEffect(() => {
    apiRequest('/business/uploads/config')
      .then((result) => { setUploadPolicy(result.mediaPolicy); setMediaUploadsEnabled(result.mediaUploadsEnabled); })
      .catch((requestError) => setUploadPolicyError(requestError.message));
  }, []);
  useEffect(() => {
    if (section === 'Dashboard') loadFeed();
    if (section === 'Saved Posts') loadSavedPosts();
    if (section === 'Reviews & Ratings') apiRequest('/business/reviews').then((result) => { setReviews(result.reviews || []); setReviewSummary(result.summary || { count: 0, average: 0 }); }).catch(setProfileError);
    if (section === 'My Posts') { setLoading(true); apiRequest('/business/posts?scope=mine').then((result) => setPosts((result.posts || []).map((post) => ({ ...post, source: 'business', isOwner: true, author: { id: user.id, name: post.business?.name || user.name, region: post.business?.region || profile.region, district: post.business?.district || '', category: post.category || post.business?.category || '', verified: Boolean(post.business?.verified), avatarUrl: profile.avatarUrl } })))).catch(setError).finally(() => setLoading(false)); }
    if (section === 'Notifications') apiRequest('/notifications').then((result) => { setNotifications(result.notifications || []); setUnreadCount(result.unreadCount || 0); }).catch(setError);
    if (section === 'Inquiries') apiRequest('/business/inquiries').then((result) => setInquiries(result.inquiries || [])).catch(setError);
    if (section === 'Discover Destinations') apiRequest('/destinations?limit=20').then((result) => setDestinations(result.destinations || [])).catch(setError);
  }, [section, profile.region, user.name, loadFeed, loadSavedPosts]);

  const status = application?.status || (profile.approvalStatus === 'approved' ? 'approved' : profile.application?.submittedAt ? 'pending_review' : '');
  const approved = status === 'approved';
  const businessDetails = application?.business || {};
  const legacyApplication = profile.application || {};
  const goTo = (next) => {
    if (['Dashboard', 'Discover Destinations', 'Inquiries', 'Notifications', 'My Profile', 'My Business', 'My Posts', 'Saved Posts', 'Reviews & Ratings', 'Settings', 'Register Business', 'Application Tracking'].includes(next)) setSection(next);
    else onNavigate?.(next);
  };
  const filteredPosts = useMemo(() => posts.filter((post) => !search || `${post.content} ${post.author?.name} ${post.author?.region}`.toLowerCase().includes(search.toLowerCase())), [posts, search]);

  const submitPost = async ({ content, category: postCategory, media }) => {
    if (!approved) throw new Error('Your business must be approved before publishing.');
    await apiRequest('/business/posts', { method: 'POST', body: JSON.stringify({ content, category: postCategory, media }) });
    await loadFeed();
  };
  const postAction = async (post, action) => {
    try {
      return await apiRequest(`/community/posts/${post.source}/${post.id}/${action}`, { method: 'POST' });
    } catch (requestError) { setError(requestError.message); return null; }
  };
  const likePost = async (post) => { const result = await postAction(post, 'like'); if (result) setPosts((current) => current.map((item) => item.id === post.id && item.source === post.source ? { ...item, likedByMe: result.active, likeCount: result.likeCount } : item)); };
  const savePost = async (post) => { const result = await postAction(post, 'save'); if (result) setPosts((current) => section === 'Saved Posts' && !result.savedByMe ? current.filter((item) => item.id !== post.id || item.source !== post.source) : current.map((item) => item.id === post.id && item.source === post.source ? { ...item, savedByMe: result.savedByMe } : item)); };
  const commentPost = async (post, content) => { const result = await apiRequest(`/community/posts/${post.source}/${post.id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }).catch((requestError) => { setError(requestError.message); return null; }); if (!result) return false; setPosts((current) => current.map((item) => item.id === post.id && item.source === post.source ? { ...item, comments: [...(item.comments || []), result.comment] } : item)); return true; };
  const sharePost = async (post) => { const text = `${post.author?.name || 'Community member'} on TriSaarathi: ${post.content}`; try { if (navigator.share) await navigator.share({ title: 'TriSaarathi', text, url: window.location.href }); else { await navigator.clipboard.writeText(`${text} ${window.location.href}`); setError('Post link copied to clipboard.'); } } catch (shareError) { if (shareError.name !== 'AbortError') setError('Could not share this post.'); } };
  const viewBusiness = async (post) => {
    try {
      const result = await apiRequest(`/businesses/${encodeURIComponent(post.author.id)}`);
      setPublicBusiness(result.business);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const editPost = async (post, content) => { try { await apiRequest(post.source === 'business' ? `/business/posts/${post.id}` : `/community/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ content }) }); setPosts((current) => current.map((item) => item.id === post.id && item.source === post.source ? { ...item, content } : item)); return true; } catch (requestError) { setError(requestError.message); return false; } };
  const deletePost = async (post) => { if (!window.confirm('Delete this post?')) return; try { await apiRequest(post.source === 'business' ? `/business/posts/${post.id}` : `/community/posts/${post.id}`, { method: 'DELETE' }); setPosts((current) => current.filter((item) => !(item.id === post.id && item.source === post.source))); } catch (requestError) { setError(requestError.message); } };
  const feedActions = { onLike: likePost, onComment: commentPost, onShare: sharePost, onSave: savePost, onEdit: editPost, onDelete: deletePost, onViewBusiness: viewBusiness };
  const updateApplication = (record) => { setApplication((current) => ({ ...current, ...record })); if (record?.business?.website !== undefined) setProfile((value) => ({ ...value, website: record.business.website })); if (record?.status === 'pending_review') { const updated = { ...user, businessApprovalStatus: 'pending' }; onUserUpdate?.(updated); setProfile((value) => ({ ...value, approvalStatus: 'pending' })); } };
  const saveProfile = async (event) => {
    event.preventDefault(); setProfileError('');
    try { const result = await apiRequest('/business/profile', { method: 'PUT', body: JSON.stringify(profile) }); setProfile(result.business || profile); onUserUpdate?.({ ...user, ...result.business }); }
    catch (requestError) { setProfileError(requestError.message); }
  };
  const chooseProfilePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfileError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setProfileError('Profile photos must be 10 MB or smaller.');
      return;
    }
    setProfileError('');
    setUploadingProfilePhoto(true);
    try {
      const signedUpload = await apiRequest('/business/profile-image/sign', { method: 'POST', body: '{}' });
      const avatarUrl = await uploadProfileImage(file, signedUpload);
      setProfile((current) => ({ ...current, avatarUrl }));
    } catch (requestError) {
      setProfileError(requestError.message);
    } finally {
      setUploadingProfilePhoto(false);
    }
  };
  const respondToInquiry = async (inquiry) => {
    const response = (inquiryReplies[inquiry.id] || '').trim(); if (!response) return;
    try { const result = await apiRequest(`/business/inquiries/${inquiry.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'responded', response }) }); setInquiries((current) => current.map((item) => item.id === inquiry.id ? { ...item, ...result.inquiry } : item)); setInquiryReplies((current) => ({ ...current, [inquiry.id]: '' })); }
    catch (requestError) { setError(requestError.message); }
  };

  return <div className="trisaarathi-dashboard">
    <main className={`ts-dashboard-grid${profileOpen ? '' : ' profile-collapsed'}`}>
      {profileOpen && <ProfileSidebar user={user} profile={profile} status={status} active={section} onNavigate={goTo} onLogout={onLogout} />}
      <div className="ts-main-column">
        <TriSaarathiHeader user={user} title={section === 'Dashboard' ? 'Rural Business Community' : section} theme={theme} onToggleTheme={onToggleTheme} onNavigate={goTo} onLogout={onLogout} profileOpen={profileOpen} onToggleProfile={() => setProfileOpen((open) => !open)} onOpenProfile={() => setProfileOpen(true)} />
        {['My Posts', 'Saved Posts', 'My Profile'].includes(section) && <button className="ts-return-to-posts" type="button" onClick={() => goTo('Dashboard')}><ArrowLeft size={17} aria-hidden="true" />Back to posts</button>}
        {profileError && <p className="ts-inline-error" role="alert">{profileError}</p>}
        {section === 'Register Business' || section === 'Application Tracking' ? <BusinessRegistration application={application} onBack={() => goTo('Dashboard')} onUpdated={updateApplication} /> : null}
        {section === 'Dashboard' && <>
          {error && <p className="ts-inline-error" role="alert">{error}</p>}
          <PostComposer approved={approved} draft={draft} onDraft={setDraft} onPublish={submitPost} uploadPolicy={uploadPolicy} uploadPolicyError={uploadPolicyError} mediaUploadsEnabled={mediaUploadsEnabled} />
          <CommunityFeed posts={filteredPosts} category={category} onCategory={setCategory} loading={loading} error={error} onRetry={loadFeed} actions={feedActions} />
        </>}
        {section === 'My Profile' && <section className="ts-content-card ts-business-profile-details">
          <p className="ts-eyebrow">BUSINESS PROFILE</p><h1>{application?.business?.businessName || profile.businessName || user.name}</h1>
          <p className="ts-profile-summary">{businessDetails.description || profile.description || legacyApplication.description || 'Add a description to tell travellers about your business.'}</p>
          <span className={`ts-status ${status === 'approved' ? 'verified' : status === 'pending_review' ? 'pending' : ''}`}>{status === 'approved' ? 'Verified' : status === 'pending_review' ? 'Pending Review' : 'Not Registered'}</span>
          <dl className="ts-business-detail-grid">{[
            ['Owner', user.name], ['Account email', user.email], ['Category', businessDetails.category || legacyApplication.category || profile.category],
            ['Year established', businessDetails.yearEstablished || ''], ['Years operating', legacyApplication.yearsOperating || ''], ['District', businessDetails.district || ''],
            ['Village / town', businessDetails.locality || legacyApplication.region || profile.region], ['Business address', businessDetails.address || legacyApplication.address || profile.address],
            ['Business mobile', businessDetails.mobile || legacyApplication.phone || profile.phone], ['Public email', businessDetails.email || legacyApplication.publicEmail || profile.publicEmail],
            ['Website', businessDetails.website || profile.website || legacyApplication.website],
          ].filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {application?.verificationNotes && <div className="ts-profile-review-note"><strong>Verification notes</strong><p>{application.verificationNotes}</p></div>}
          {application?.reviewNote && <div className="ts-profile-review-note"><strong>Review team feedback</strong><p>{application.reviewNote}</p></div>}
          {!application?.business && !profile.businessName && !legacyApplication.businessName && <p className="ts-profile-summary">Your business details will appear here after you save a registration draft.</p>}
        </section>}
        {(section === 'My Business' || section === 'Settings') && <section className="ts-content-card"><p className="ts-eyebrow">BUSINESS ACCOUNT</p><h1>{section}</h1><form className="ts-profile-form" onSubmit={saveProfile}>
          {section === 'My Business' && <div className="ts-profile-photo-field">
            <span className="ts-profile-photo-preview">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="Current business profile" /> : <span>{(profile.businessName || user.name || 'B').slice(0, 1).toUpperCase()}</span>}</span>
            <div className="ts-profile-photo-control">
              <label htmlFor="business-profile-photo">Business profile picture</label>
              <p>{profile.avatarUrl ? 'Current picture shown on your profile and posts.' : 'Your first business gallery photo is used by default when available.'}</p>
              <input id="business-profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseProfilePhoto} disabled={uploadingProfilePhoto || mediaUploadsEnabled === false} />
              <label className="ts-profile-photo-button" htmlFor="business-profile-photo"><Camera size={16} aria-hidden="true" />{uploadingProfilePhoto ? 'Uploading…' : 'Choose a different picture'}</label>
              {mediaUploadsEnabled === false && <small>Photo uploads are not configured right now.</small>}
            </div>
          </div>}
          <label>Contact name<input value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></label>
          <label>Business name<input value={profile.businessName || ''} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} required /></label>
          <label>Village or region<input value={profile.region || ''} onChange={(e) => setProfile({ ...profile, region: e.target.value })} required /></label>
          <label>Business description<textarea rows={4} value={profile.description || ''} onChange={(e) => setProfile({ ...profile, description: e.target.value })} /></label>
          <label>Contact phone<input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
          <label>Public email<input type="email" value={profile.publicEmail || ''} onChange={(e) => setProfile({ ...profile, publicEmail: e.target.value })} /></label>
          <label>Website<input type="url" value={profile.website || ''} onChange={(e) => setProfile({ ...profile, website: e.target.value })} /></label>
          <label>Business address<textarea rows={2} value={profile.address || ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></label>
          <button className="ts-primary-button" type="submit" disabled={uploadingProfilePhoto}>Save profile</button>
        </form></section>}
        {section === 'My Posts' && <section className="ts-content-card"><p className="ts-eyebrow">YOUR COMMUNITY POSTS</p><h1>My Posts</h1><CommunityFeed posts={posts} category="all" onCategory={() => {}} loading={loading} error={error} onRetry={() => apiRequest('/business/posts?scope=mine').then((result) => setPosts((result.posts || []).map((post) => ({ ...post, source: 'business', isOwner: true, author: { id: user.id, name: post.business?.name || user.name, region: post.business?.region || profile.region, district: post.business?.district || '', category: post.category || post.business?.category || '', verified: Boolean(post.business?.verified), avatarUrl: profile.avatarUrl } })))).catch((requestError) => setError(requestError.message))} actions={feedActions} /></section>}
        {section === 'Saved Posts' && <section className="ts-content-card"><p className="ts-eyebrow">YOUR BOOKMARKS</p><h1>Saved Posts</h1><CommunityFeed posts={posts} category="all" onCategory={() => {}} loading={loading} error={error} onRetry={loadSavedPosts} actions={feedActions} emptyTitle="No saved posts yet" emptyMessage="Save posts from the community feed and they will appear here." /></section>}
        {section === 'Reviews & Ratings' && <section className="ts-content-card"><p className="ts-eyebrow">CUSTOMER FEEDBACK</p><h1>Reviews & Ratings</h1><p className="ts-review-summary">{reviewSummary.average.toFixed(1)} ★ · {reviewSummary.count} reviews</p>{reviews.length ? reviews.map((review) => <article className="ts-review-card" key={review.id}><strong>{review.reviewer.name}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><p>{review.content}</p>{review.businessResponse && <p className="ts-response"><b>Your response:</b> {review.businessResponse}</p>}</article>) : <p>No reviews have been submitted yet.</p>}</section>}
        {section === 'Notifications' && <section className="ts-content-card"><p className="ts-eyebrow">ACCOUNT UPDATES</p><h1>Notifications</h1>{notifications.length ? notifications.map((item) => <button className={`ts-notification ${item.read ? '' : 'unread'}`} key={item.id} type="button" onClick={async () => { if (!item.read) { await apiRequest(`/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => {}); setNotifications((current) => current.map((n) => n.id === item.id ? { ...n, read: true } : n)); setUnreadCount((count) => Math.max(0, count - 1)); } }}><strong>{item.title}</strong><p>{item.message}</p><time>{new Date(item.createdAt).toLocaleString()}</time></button>) : <p>You’re all caught up.</p>}</section>}
        {section === 'Inquiries' && <section className="ts-content-card"><p className="ts-eyebrow">TRAVELLER MESSAGES</p><h1>Messages</h1>{inquiries.length ? inquiries.map((inquiry) => <article className="ts-inquiry-card" key={inquiry.id}><div><strong>{inquiry.subject || `Message from ${inquiry.traveller?.name || 'Traveller'}`}</strong><small>{inquiry.traveller?.name || 'Traveller'} · {new Date(inquiry.createdAt).toLocaleDateString()} · {inquiry.status}</small></div><p>{inquiry.message}</p>{inquiry.businessResponse && <p className="ts-response"><b>Your reply:</b> {inquiry.businessResponse}</p>}{inquiry.status === 'open' && <><textarea value={inquiryReplies[inquiry.id] || ''} onChange={(event) => setInquiryReplies((current) => ({ ...current, [inquiry.id]: event.target.value }))} placeholder="Write your reply…" maxLength={5000} /><button className="ts-primary-button" type="button" disabled={!approved || !inquiryReplies[inquiry.id]?.trim()} onClick={() => respondToInquiry(inquiry)}>Send reply</button></>}</article>) : <p>No traveller inquiries yet.</p>}</section>}
        {section === 'Discover Destinations' && <section className="ts-content-card"><p className="ts-eyebrow">EXPLORE ANDHRA PRADESH</p><h1>Discover</h1><p>Real destinations returned by the existing destination service.</p>{destinations.length ? <div className="ts-destination-list">{destinations.map((place) => <article key={place.id || place._id}><strong>{place.name || place.title}</strong><span>{place.region || place.location || place.district || 'Andhra Pradesh'}</span><p>{place.description || 'Details provided by the destination record.'}</p></article>)}</div> : <p>No destination records are available right now.</p>}</section>}
      </div>
    </main>
    {publicBusiness && <div className="ts-business-modal-backdrop" role="presentation" onClick={() => setPublicBusiness(null)}>
      <section className="ts-business-modal" role="dialog" aria-modal="true" aria-labelledby="ts-business-modal-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="ts-business-modal-close" onClick={() => setPublicBusiness(null)} aria-label="Close business profile">×</button>
        <p className="ts-eyebrow">VERIFIED RURAL BUSINESS</p>
        <h2 id="ts-business-modal-title">{publicBusiness.name}</h2>
        <p>{publicBusiness.description || 'This business has not added a public description yet.'}</p>
        {publicBusiness.location && <p><strong>Location:</strong> {publicBusiness.location}</p>}
        {publicBusiness.category && <p><strong>Category:</strong> {publicBusiness.category}</p>}
        {publicBusiness.address && <p><strong>Address:</strong> {publicBusiness.address}</p>}
        {publicBusiness.phone && <p><strong>Contact:</strong> {publicBusiness.phone}</p>}
        {publicBusiness.email && <p><strong>Email:</strong> <a href={`mailto:${publicBusiness.email}`}>{publicBusiness.email}</a></p>}
        {publicBusiness.website && <p><a href={publicBusiness.website} target="_blank" rel="noreferrer">Visit business website</a></p>}
      </section>
    </div>}
  </div>;
}
