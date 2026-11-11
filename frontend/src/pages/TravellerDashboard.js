import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Compass,
  FileText,
  Heart,
  LogOut,
  Map,
  MapPin,
  Menu,
  Plus,
  Sparkles,
  Sun,
  UserRound,
  UsersRound,
  Wallet,
  Moon,
  MessageCircle,
  Search,
  Send,
  Share2,
  ThumbsUp,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import Logo from '../components/Logo.js';
import { feedCategories, matchesFeedCategory } from '../components/community/CategoryFilters.jsx';

const sections = [
  { label: 'Dashboard', Icon: Compass },
  { label: 'Community Feed', Icon: MessageCircle },
  { label: 'My Trips', Icon: CalendarDays },
  { label: 'Plan New Trip', Icon: Plus },
  { label: 'Discover Destinations', Icon: MapPin },
  { label: 'Collaborate', Icon: UsersRound },
  { label: 'My Expenses', Icon: Wallet },
  { label: 'Memories', Icon: Heart },
  { label: 'AI Travel Story', Icon: Sparkles },
  { label: 'My Profile', Icon: UserRound },
];

function CommunityPostCard({ post, onLike, onComment, onProfile, onShare }) {
  const [comment, setComment] = useState('');
  const isBusiness = post.source === 'business';
  const initials = getInitials(post.author?.name || (isBusiness ? 'Local business' : 'Traveller'));
  const media = post.media?.length
    ? post.media
    : post.imageUrl ? [{ url: post.imageUrl, type: 'image' }] : [];
  const submitComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    if (await onComment(post, comment)) setComment('');
  };

  return (
    <article className="traveller-community-feed-card">
      <header className="traveller-community-feed-author">
        {isBusiness && post.author?.id
          ? <button type="button" className="traveller-community-feed-avatar" onClick={() => onProfile(post.author.id)} aria-label={`View ${post.author.name}'s business profile`}>{post.author.avatarUrl ? <img src={post.author.avatarUrl} alt="" loading="lazy" /> : initials}</button>
          : <span className="traveller-community-feed-avatar" aria-hidden="true">{initials}</span>}
        <span className="traveller-community-feed-author-copy">
          {isBusiness && post.author?.id
            ? <button type="button" onClick={() => onProfile(post.author.id)}>{post.author.name}</button>
            : <strong>{post.author?.name || 'Traveller'}</strong>}
          <small>{isBusiness ? 'Approved business' : 'Community member'}{isBusiness && post.author?.category ? ` · ${post.author.category}` : ''}{post.author?.region ? ` · ${post.author.region}` : ''}{post.createdAt ? ` · ${new Date(post.createdAt).toLocaleDateString()}` : ''}</small>
        </span>
      </header>
      <p className="traveller-community-feed-content">{post.content}</p>
      {media.length > 0 && <div className={`traveller-community-feed-media ${media.length === 1 ? 'single' : ''}`}>{media.map((item, index) => item.type === 'video'
        ? <video key={item.publicId || item.url || index} src={item.url} poster={item.thumbnailUrl || undefined} controls preload="none" />
        : <img key={item.publicId || item.url || index} src={item.url} alt={`Shared by ${post.author?.name || 'a community member'}`} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none'; }} />)}</div>}
      <div className="traveller-community-feed-counts"><span>{post.likeCount || 0} likes</span><span>{post.comments?.length || 0} comments</span></div>
      <div className="traveller-community-feed-actions">
        <button type="button" aria-pressed={Boolean(post.likedByMe)} onClick={() => onLike(post)}><ThumbsUp size={16} />{post.likedByMe ? 'Liked' : 'Like'}</button>
        <button type="button" onClick={() => document.getElementById(`traveller-comment-${post.source}-${post.id}`)?.focus()}><MessageCircle size={16} />Comment</button>
        <button type="button" onClick={() => onShare(post)}><Share2 size={16} />Share</button>
        {isBusiness && post.author?.id && <button type="button" onClick={() => onProfile(post.author.id)}><BriefcaseBusiness size={16} />View Profile</button>}
      </div>
      {post.comments?.length > 0 && <div className="traveller-community-feed-comments">{post.comments.map((item) => <p key={item.id}><strong>{item.name}</strong> {item.content}</p>)}</div>}
      <form className="traveller-community-feed-comment-form" onSubmit={submitComment}>
        <input id={`traveller-comment-${post.source}-${post.id}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} placeholder="Write a comment..." aria-label={`Comment on ${post.author?.name || 'community'} post`} />
        <button type="submit" disabled={!comment.trim()} aria-label="Send comment"><Send size={16} /></button>
      </form>
    </article>
  );
}

function getInitials(name = 'Traveller') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '').join('') || 'T';
}

function EmptySection({ section }) {
  const descriptions = {
    'My Trips': 'Your planned and upcoming journeys will appear here.',
    'Plan New Trip': 'Start a trip plan and organize destinations, dates, and travel details in one place.',
    Collaborate: 'Invite friends and family to plan a journey together.',
    'My Expenses': 'Keep shared trip costs and payments organized here.',
    Memories: 'Save photos and moments from your journeys here.',
    'AI Travel Story': 'Turn your itinerary and travel memories into a story when this feature is available.',
    'My Profile': 'Review and update the details associated with your traveller account.',
  };
  return (
    <section className="traveller-section-placeholder">
      <span className="traveller-panel-icon"><Compass size={18} /></span>
      <h1>{section}</h1>
      <p>{descriptions[section] || 'This section will be available here.'}</p>
    </section>
  );
}

export default function TravellerDashboard({ user, onUserUpdate, onLogout, theme, onToggleTheme }) {
  const [section, setSection] = useState('Dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profile, setProfile] = useState({ name: user.name || '', region: user.region || '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [destinations, setDestinations] = useState([]);
  const [destinationsLoading, setDestinationsLoading] = useState(true);
  const [destinationsError, setDestinationsError] = useState('');
  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityPage, setCommunityPage] = useState(1);
  const [communityTotal, setCommunityTotal] = useState(0);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState('');
  const [businessPostCategory, setBusinessPostCategory] = useState('all');
  const [businessPostSearch, setBusinessPostSearch] = useState('');
  const [businessProfile, setBusinessProfile] = useState(null);
  const [businessProfileLoading, setBusinessProfileLoading] = useState(false);
  const [businessProfileError, setBusinessProfileError] = useState('');

  const initials = getInitials(profile.name);

  const loadCommunityFeed = useCallback(async ({ append = false, nextPage = 1 } = {}) => {
    setCommunityError('');
    setCommunityLoading(true);
    await apiRequest(`/community/posts?scope=feed&page=${nextPage}&limit=15&type=business`)
      .then((result) => {
        setCommunityPosts((current) => append ? [...current, ...result.posts] : result.posts);
        setCommunityPage(result.page);
        setCommunityTotal(result.total);
      })
      .catch((requestError) => {
        setCommunityError(requestError.message);
        if (!append) setCommunityPosts([]);
      })
      .finally(() => setCommunityLoading(false));
  }, []);

  useEffect(() => {
    if (section === 'Community Feed') loadCommunityFeed();
  }, [section, loadCommunityFeed]);

  const toggleCommunityLike = async (post) => {
    try {
      const result = await apiRequest(`/community/posts/${post.source}/${post.id}/like`, { method: 'POST' });
      setCommunityPosts((current) => current.map((item) => item.id === post.id && item.source === post.source
        ? { ...item, likedByMe: result.active, likeCount: result.likeCount }
        : item));
    } catch (requestError) { setCommunityError(requestError.message); }
  };

  const addCommunityComment = async (post, content) => {
    try {
      const result = await apiRequest(`/community/posts/${post.source}/${post.id}/comments`, { method: 'POST', body: JSON.stringify({ content }) });
      setCommunityPosts((current) => current.map((item) => item.id === post.id && item.source === post.source
        ? { ...item, comments: [...item.comments, result.comment] }
        : item));
      return true;
    } catch (requestError) { setCommunityError(requestError.message); return false; }
  };

  const shareCommunityPost = async (post) => {
    const text = `${post.author?.name || 'Community member'} on TriSaarathi: ${post.content}`;
    try {
      if (navigator.share) await navigator.share({ title: 'TriSaarathi Community', text, url: window.location.href });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(`${text} ${window.location.href}`); setNotice('Post link copied.'); }
      else setNotice(text);
    } catch (shareError) {
      if (shareError.name !== 'AbortError') setCommunityError('This post could not be shared from this browser.');
    }
  };

  const openBusinessProfile = async (businessId) => {
    setBusinessProfile(null);
    setBusinessProfileError('');
    setBusinessProfileLoading(true);
    try {
      const result = await apiRequest(`/businesses/${businessId}`);
      setBusinessProfile(result.business);
    } catch (requestError) { setBusinessProfileError(requestError.message); }
    finally { setBusinessProfileLoading(false); }
  };

  useEffect(() => {
    let isCurrent = true;
    apiRequest('/destinations?limit=20')
      .then((result) => {
        if (isCurrent) setDestinations(result.destinations || []);
      })
      .catch((requestError) => {
        if (isCurrent) setDestinationsError(requestError.message);
      })
      .finally(() => {
        if (isCurrent) setDestinationsLoading(false);
      });
    return () => { isCurrent = false; };
  }, []);

  const selectSection = (nextSection) => {
    setSection(nextSection);
    setMobileNavOpen(false);
    setError('');
    setNotice('');
    setIsEditingProfile(false);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest('/account/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      onUserUpdate(result.user);
      setIsEditingProfile(false);
      setNotice('Your profile was updated.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const visibleBusinessPosts = communityPosts.filter((post) => {
    const search = businessPostSearch.trim().toLocaleLowerCase();
    const matchesSearch = !search || [
      post.content,
      post.category,
      post.author?.name,
      post.author?.category,
      post.author?.region,
      post.author?.district,
    ].some((value) => String(value || '').toLocaleLowerCase().includes(search));
    return matchesFeedCategory(post, businessPostCategory) && matchesSearch;
  });

  return (
    <section className="traveller-dashboard-viewport" aria-label="Traveller dashboard">
      {mobileNavOpen && (
        <button
          type="button"
          className="traveller-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <div className="traveller-dashboard-shell">
        <aside className={`traveller-sidebar ${mobileNavOpen ? 'is-open' : ''}`}>
          <button type="button" className="traveller-sidebar-brand" onClick={() => selectSection('Dashboard')} aria-label="Open dashboard">
            <Logo size={40} />
            <small>Rural Roots. Richer Journeys.</small>
          </button>
          <p className="traveller-sidebar-label">YOUR TRAVEL</p>
          <nav className="traveller-sidebar-nav" aria-label="Traveller navigation">
            {sections.map(({ label, Icon }) => (
              <button
                type="button"
                key={label}
                className={`traveller-sidebar-item ${section === label ? 'active' : ''}`}
                aria-current={section === label ? 'page' : undefined}
                onClick={() => selectSection(label)}
              >
                <Icon size={17} aria-hidden="true" /><span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="traveller-sidebar-bottom">
            <button type="button" className="traveller-sidebar-item traveller-sidebar-logout" onClick={onLogout}>
              <LogOut size={17} aria-hidden="true" /><span>Log out</span>
            </button>
            <svg className="traveller-travel-illustration" viewBox="0 0 280 120" role="img" aria-label="Travel bus and luggage illustration">
              <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 105h256" />
                <path d="M48 91V55a9 9 0 0 1 9-9h110a9 9 0 0 1 8 5l18 25v15a8 8 0 0 1-8 8H57a9 9 0 0 1-9-8Z" />
                <path d="M63 54h54v24H63zM123 54h39v24h-39zM169 55l17 23h-17z" />
                <path d="M49 83h152M70 94a11 11 0 1 0 22 0m61 0a11 11 0 1 0 22 0" />
                <circle cx="81" cy="94" r="3.5" />
                <circle cx="164" cy="94" r="3.5" />
                <rect x="216" y="66" width="38" height="30" rx="4" />
                <path d="M226 66v-6a9 9 0 0 1 18 0v6m-21 11h24m-24 7h24" />
                <path d="M23 39q7-7 14 0m-2 0q7-7 14 0" />
                <path d="M27 109q36-16 67-3t67-1q40-19 85 1" />
              </g>
            </svg>
          </div>
        </aside>

        <main className="traveller-dashboard-main">
          <header className="traveller-main-topbar">
            <button
              type="button"
              className="traveller-menu-toggle"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="traveller-topbar-heading">
              <span>TRISAARATHI TRAVELLER SPACE</span>
              <strong>{section}</strong>
            </div>
            <div className="traveller-topbar-actions">
              <button
                type="button"
                className="traveller-theme-toggle"
                onClick={onToggleTheme}
                aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              </button>
              <span className="traveller-topbar-date">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
          </header>

          {(error || notice) && (
            <p className={`dashboard-message ${error ? 'dashboard-error' : 'dashboard-success'}`} role={error ? 'alert' : 'status'}>
              {error || notice}
            </p>
          )}

          {section === 'Dashboard' ? (
            <>
              <section className="traveller-hero">
                <div className="traveller-hero-content">
                  <span className="traveller-hero-kicker">Your next journey starts here</span>
                  <h1>Welcome back, {profile.name.split(/\s+/)[0] || 'traveller'}.</h1>
                  <p className="traveller-hero-subtitle">Every road has a story. Let us guide you back to it.</p>
                  <p>Discover village stays, local traditions, and memorable journeys across rural India.</p>
                  <button type="button" className="traveller-primary-button" onClick={() => selectSection('Plan New Trip')}>
                    <Plus size={17} /> Plan a new trip
                  </button>
                </div>
              </section>

              <section className="traveller-stats-grid traveller-trip-summary-grid" aria-label="Travel summary">
                <article className="traveller-stat-card traveller-stat-blue">
                  <span className="traveller-stat-icon"><CalendarDays size={18} /></span>
                  <span className="traveller-stat-copy"><strong className="traveller-stat-unavailable">Not tracked yet</strong><span>Trips planned</span></span>
                </article>
                <article className="traveller-stat-card traveller-stat-green">
                  <span className="traveller-stat-icon"><MapPin size={18} /></span>
                  <span className="traveller-stat-copy"><strong className="traveller-stat-unavailable">Not tracked yet</strong><span>Places covered</span></span>
                </article>
                <article className="traveller-stat-card traveller-stat-amber">
                  <span className="traveller-stat-icon"><UsersRound size={18} /></span>
                  <span className="traveller-stat-copy"><strong className="traveller-stat-unavailable">Not tracked yet</strong><span>Trip members</span></span>
                </article>
                <article className="traveller-stat-card traveller-stat-purple">
                  <span className="traveller-stat-icon"><Wallet size={18} /></span>
                  <span className="traveller-stat-copy"><strong className="traveller-stat-unavailable">Not tracked yet</strong><span>Total trip expenditure</span></span>
                </article>
              </section>
              <p className="traveller-summary-note">
                Trip, member, destination, and expense totals will appear once trip tracking is connected.
              </p>

            </>
          ) : section === 'Community Feed' ? (
            <section className="traveller-panel traveller-community-feed-panel">
              {communityError && <p className="traveller-community-feed-message error" role="alert">{communityError} <button type="button" onClick={() => loadCommunityFeed()}>Retry</button></p>}
              <section className="traveller-community-posts" aria-label="Rural business posts">
                <div className="traveller-community-post-tools">
                  <div className="traveller-community-post-search-row">
                    <label className="traveller-community-post-search">
                      <Search size={16} aria-hidden="true" />
                      <input type="search" value={businessPostSearch} onChange={(event) => setBusinessPostSearch(event.target.value)} placeholder="Search posts, businesses, or locations" aria-label="Search business posts" />
                    </label>
                    <button type="button" className="traveller-link traveller-community-refresh" onClick={() => loadCommunityFeed()} disabled={communityLoading}>Refresh</button>
                  </div>
                  <nav className="traveller-community-category-filters" aria-label="Filter business posts by category">
                    {feedCategories.map((category) => <button key={category.id} type="button" className={businessPostCategory === category.id ? 'active' : ''} aria-pressed={businessPostCategory === category.id} onClick={() => setBusinessPostCategory(category.id)}>{category.label}</button>)}
                  </nav>
                </div>
                {communityLoading && communityPosts.length === 0 ? <p className="traveller-section-description" role="status">Loading business posts...</p>
                  : communityError && communityPosts.length === 0 ? <div className="traveller-community-feed-empty" role="alert"><p>Business posts could not be loaded.</p><button type="button" className="traveller-secondary-button" onClick={() => loadCommunityFeed()}>Retry posts</button></div>
                    : <>
                      {visibleBusinessPosts.length > 0
                        ? <div className="traveller-community-post-list">{visibleBusinessPosts.map((post) => <CommunityPostCard key={`${post.source}-${post.id}`} post={post} onLike={toggleCommunityLike} onComment={addCommunityComment} onProfile={openBusinessProfile} onShare={shareCommunityPost} />)}</div>
                        : <div className="traveller-community-feed-empty"><p>{communityPosts.length ? 'No loaded business posts match these filters.' : 'No rural business posts yet.'}</p></div>}
                      {communityPosts.length < communityTotal && <button type="button" className="traveller-secondary-button" onClick={() => loadCommunityFeed({ append: true, nextPage: communityPage + 1 })} disabled={communityLoading}>{communityLoading ? 'Loading...' : 'Load more posts'}</button>}
                    </>}
              </section>
            </section>
          ) : section === 'My Profile' ? (
            <section className="traveller-panel traveller-profile-panel">
              <header className="traveller-panel-header">
                <span className="traveller-panel-title-wrap"><span className="traveller-panel-icon"><UserRound size={17} /></span><h2>My profile</h2></span>
                {!isEditingProfile && <button type="button" className="traveller-link" onClick={() => setIsEditingProfile(true)}><FileText size={14} /> Edit profile</button>}
              </header>
              {isEditingProfile ? (
                <form className="traveller-profile-form" onSubmit={saveProfile}>
                  <label className="dashboard-field"><span>Full name</span><input className="form-input" value={profile.name} maxLength={100} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></label>
                  <label className="dashboard-field"><span>Preferred region</span><input className="form-input" value={profile.region} maxLength={120} onChange={(event) => setProfile({ ...profile, region: event.target.value })} required /></label>
                  <label className="dashboard-field"><span>Email address</span><input className="form-input" value={user.email || ''} readOnly /></label>
                  <div className="traveller-profile-form-actions">
                    <button type="button" className="traveller-secondary-button" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                    <button type="submit" className="traveller-primary-button" disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save profile'}</button>
                  </div>
                </form>
              ) : (
                <div className="traveller-profile-details">
                  <span className="traveller-user-avatar">{initials}</span>
                  <div><strong>{profile.name || 'Traveller'}</strong><span>{profile.region || 'Preferred region not set'}</span><span>{user.email || 'Email not available'}</span></div>
                </div>
              )}
            </section>
          ) : section === 'Discover Destinations' ? (
            <section className="traveller-panel traveller-destinations-panel">
              <header className="traveller-panel-header">
                <span className="traveller-panel-title-wrap"><span className="traveller-panel-icon traveller-panel-icon-green"><Map size={17} /></span><h2>Recommended rural destinations</h2></span>
              </header>
              <p className="traveller-section-description">Published experiences from registered, approved rural businesses.</p>
              {destinationsLoading ? <p className="traveller-section-description" role="status">Loading published rural experiences...</p>
                : destinationsError ? <p className="traveller-section-description" role="alert">Rural experiences could not be loaded: {destinationsError}</p>
                  : destinations.length === 0 ? <p className="traveller-section-description">No published rural experiences are available yet.</p>
                    : <div className="traveller-destination-grid">
                      {destinations.map((destination) => (
                        <article className="traveller-destination-card" key={destination.id}>
                          {destination.imageUrl && <img src={destination.imageUrl} alt={`Photo for ${destination.title}`} loading="lazy" />}
                          <span className="traveller-destination-copy"><strong>{destination.title}</strong><span><MapPin size={13} />{destination.region}</span><span>{destination.category}</span>{destination.business?.name && <span>{destination.business.name}</span>}<span>{destination.description}</span></span>
                        </article>
                      ))}
                    </div>}
            </section>
          ) : (
            <EmptySection section={section} />
          )}
          {(businessProfileLoading || businessProfileError || businessProfile) && <div className="traveller-business-profile-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setBusinessProfile(null); setBusinessProfileError(''); } }}>
            <section className="traveller-business-profile-dialog" role="dialog" aria-modal="true" aria-label="Business profile">
              <button type="button" className="traveller-business-profile-close" onClick={() => { setBusinessProfile(null); setBusinessProfileError(''); }}>Close</button>
              {businessProfileLoading ? <p role="status">Loading business profile...</p> : businessProfileError ? <p role="alert">{businessProfileError}</p> : businessProfile && <>
                <div className="traveller-business-profile-cover" style={businessProfile.coverImageUrl ? { backgroundImage: `linear-gradient(90deg, rgb(21 48 34 / 70%), rgb(21 48 34 / 12%)), url("${businessProfile.coverImageUrl}")` } : undefined} />
                <header><span className="traveller-business-profile-avatar">{businessProfile.avatarUrl ? <img src={businessProfile.avatarUrl} alt="" /> : getInitials(businessProfile.name)}</span><div><span>APPROVED LOCAL BUSINESS</span><h2>{businessProfile.name}</h2><p>{businessProfile.category || 'Category not provided'} · {businessProfile.location || 'Location not provided'}</p>{businessProfile.phone && <a href={`tel:${businessProfile.phone}`}>Call business</a>}{businessProfile.email && <a href={`mailto:${businessProfile.email}`}>Email business</a>}{businessProfile.website && <a href={businessProfile.website} target="_blank" rel="noreferrer">Visit website</a>}</div></header>
                <div className="traveller-business-profile-grid"><section><h3>About</h3><p>{businessProfile.description || 'Description not provided.'}</p></section><section><h3>Contact & shopping</h3>{businessProfile.address && <p>{businessProfile.address}</p>}{businessProfile.phone && <p><a href={`tel:${businessProfile.phone}`}>Call {businessProfile.phone}</a></p>}{businessProfile.email && <p><a href={`mailto:${businessProfile.email}`}>Email {businessProfile.email}</a></p>}{businessProfile.website && <p><a href={businessProfile.website} target="_blank" rel="noreferrer">Visit website / shop</a></p>}{Number.isFinite(businessProfile.latitude) && Number.isFinite(businessProfile.longitude) && <p><a href={`https://www.openstreetmap.org/?mlat=${businessProfile.latitude}&mlon=${businessProfile.longitude}#map=15/${businessProfile.latitude}/${businessProfile.longitude}`} target="_blank" rel="noreferrer">View map</a></p>}</section></div>
              </>}
            </section>
          </div>}
        </main>
      </div>
    </section>
  );
}
