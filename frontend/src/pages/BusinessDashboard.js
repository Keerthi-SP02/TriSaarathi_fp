import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  Camera,
  ChartNoAxesColumn,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Compass,
  Heart,
  Home,
  Image,
  Inbox,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Send,
  Share2,
  ShieldAlert,
  Sparkles,
  Sun,
  Star,
  ThumbsUp,
  Trash2,
  Upload,
  UsersRound,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import Logo from '../components/Logo.js';
import RuralDiscoveryMap from '../components/RuralDiscoveryMap.js';

const navigation = [
  { label: 'Dashboard', Icon: Home },
  { label: 'Discover Destinations', Icon: Compass },
  { label: 'My Experiences', Icon: Sparkles },
  { label: 'My Photos', Icon: Camera },
  { label: 'Reviews & Ratings', Icon: Star },
  { label: 'Inquiries', Icon: Inbox },
  { label: 'Notifications', Icon: Bell },
  { label: 'Bookings', Icon: CalendarCheck },
  { label: 'Analytics', Icon: ChartNoAxesColumn },
  { label: 'Events', Icon: CalendarDays },
  { label: 'Settings', Icon: Pencil },
];

const ruralHeroImage = 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1600&q=80';

function getInitials(name = 'Business') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '').join('') || 'B';
}

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(seconds, 'second');
}

function initialsForPost(post) {
  return getInitials(post.author?.name || 'Traveller');
}

function normalizeBusinessPost(post, fallbackProfile) {
  return {
    ...post,
    source: 'business',
    author: {
      id: post.business?.id,
      name: post.business?.name || fallbackProfile.businessName || fallbackProfile.name,
      role: 'Business',
      region: post.business?.region || fallbackProfile.region || '',
    },
  };
}

function DestinationFeedCard({ destination, onSelectStart, onSelectEnd }) {
  const hasCoordinates = Number.isFinite(destination.latitude) && Number.isFinite(destination.longitude);
  const mapLink = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${destination.latitude}&mlon=${destination.longitude}#map=15/${destination.latitude}/${destination.longitude}`
    : '';

  return (
    <article className="business-card business-v2-discovery-card">
      {destination.external && destination.photo ? (
        <a className="business-v2-discovery-photo-link" href={destination.photo.mediaPageUrl} target="_blank" rel="noreferrer">
          <img
            className="business-v2-discovery-photo"
            src={destination.photo.thumbnailUrl}
            alt={destination.photo.description || destination.photo.title || `Wikimedia Commons photo for ${destination.name}`}
            loading="lazy"
          />
        </a>
      ) : !destination.external && destination.imageUrl ? (
        <img className="business-v2-discovery-photo" src={destination.imageUrl} alt="" loading="lazy" />
      ) : (
        <div className="business-v2-discovery-no-photo"><Image size={22} /><span>No matching photograph available</span></div>
      )}
      <div className="business-v2-discovery-copy">
        <div className="business-v2-discovery-labels">
          <span className={destination.external ? 'external' : 'registered'}>
            {destination.external ? 'OpenStreetMap place' : 'Registered rural experience'}
          </span>
          {destination.category && <span>{destination.category}</span>}
        </div>
        <h2>{destination.name}</h2>
        {(destination.location || destination.region) && <p className="business-v2-discovery-location"><MapPin size={14} />{destination.location || destination.region}</p>}
        {destination.description && <p>{destination.description}</p>}
        {destination.wikidata?.description && <p className="business-v2-wikidata-description">{destination.wikidata.description} · <a href={destination.wikidata.url} target="_blank" rel="noreferrer">Wikidata</a></p>}
        {!destination.external && destination.duration && <p>{destination.duration}</p>}
        {!destination.external && destination.price !== undefined && <strong>₹{Number(destination.price).toLocaleString('en-IN')} per person</strong>}
        {!destination.external && destination.eventDate && <p>Event date: {new Date(destination.eventDate).toLocaleDateString()}</p>}
        {!destination.external && destination.businessName && <p>Hosted by {destination.businessName}</p>}
        {destination.external && destination.photo && (
          <p className="business-v2-image-attribution">
            Photo: {destination.photo.artist} · {destination.photo.licenseUrl
              ? <a href={destination.photo.licenseUrl} target="_blank" rel="noreferrer">{destination.photo.license}</a>
              : destination.photo.license}
            {' '}· <a href={destination.photo.mediaPageUrl} target="_blank" rel="noreferrer">Original media</a>
          </p>
        )}
        <div className="business-v2-discovery-actions">
          {mapLink && <>
            <a href={mapLink} target="_blank" rel="noreferrer"><MapPin size={14} /> Open map</a>
            <button type="button" onClick={() => onSelectStart(destination)}>Route start</button>
            <button type="button" onClick={() => onSelectEnd(destination)}>Route end</button>
          </>}
        </div>
        {destination.external && <small className="business-v2-source-attribution">Place data: © OpenStreetMap contributors{destination.sourceProvider === 'Nominatim' ? ' · Nominatim search' : ''} · <a href={mapLink || 'https://www.openstreetmap.org/copyright'} target="_blank" rel="noreferrer">OpenStreetMap</a>{destination.wikidata?.url && <> · <a href={destination.wikidata.url} target="_blank" rel="noreferrer">Wikidata source</a></>}</small>}
      </div>
    </article>
  );
}

function RoutePlanner({
  destinations,
  routeStart,
  routeEnd,
  route,
  routeError,
  isRouting,
  onSelectStart,
  onSelectEnd,
  onCalculate,
}) {
  const distance = route ? `${(route.distanceMetres / 1000).toFixed(1)} km` : '';
  const durationMinutes = route ? Math.round(route.durationSeconds / 60) : 0;
  const duration = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)} hr ${durationMinutes % 60} min`
    : `${durationMinutes} min`;

  return (
    <section className="business-card business-v2-map-panel">
      <div className="business-v2-map-heading">
        <div><span>OPENSTREETMAP DESTINATIONS</span><h2>Explore the map</h2></div>
        <span>{destinations.length} mapped locations</span>
      </div>
      <p className="business-v2-map-help">Choose route start and end locations below, or select them from map markers.</p>
      <div className="business-v2-route-controls">
        <label>Start
          <select value={routeStart?.id || ''} onChange={(event) => onSelectStart(destinations.find((place) => place.id === event.target.value) || null)}>
            <option value="">Select a mapped place</option>
            {destinations.map((place) => <option key={place.id} value={place.id}>{place.name}{place.location ? ` · ${place.location}` : ''}</option>)}
          </select>
        </label>
        <label>Destination
          <select value={routeEnd?.id || ''} onChange={(event) => onSelectEnd(destinations.find((place) => place.id === event.target.value) || null)}>
            <option value="">Select a mapped place</option>
            {destinations.map((place) => <option key={place.id} value={place.id}>{place.name}{place.location ? ` · ${place.location}` : ''}</option>)}
          </select>
        </label>
        <button type="button" onClick={onCalculate} disabled={isRouting || destinations.length < 2}>
          {isRouting ? 'Calculating route...' : 'Calculate road route'}
        </button>
      </div>
      {routeError && <p className="business-v2-inline-error" role="alert">{routeError}</p>}
      {route && <p className="business-v2-route-summary" role="status">{routeStart?.name} to {routeEnd?.name}: <strong>{distance}</strong>, about <strong>{duration}</strong> by road · {route.source}</p>}
      <RuralDiscoveryMap
        destinations={destinations}
        route={route}
        routeStart={routeStart}
        routeEnd={routeEnd}
        onSelectStart={onSelectStart}
        onSelectEnd={onSelectEnd}
      />
    </section>
  );
}

function PostCard({
  post,
  canManage,
  onLike,
  onComment,
  commentValue,
  onCommentChange,
  onEdit,
  onDelete,
  onShare,
}) {
  const postKey = `${post.source}-${post.id}`;
  const hashtags = [...new Set(post.content.match(/#[\p{L}\p{N}_]+/gu) || [])];
  const isBusinessAuthor = post.source === 'business';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(post.content);

  const submitEdit = async (event) => {
    event.preventDefault();
    if (await onEdit(post, editValue)) setIsEditing(false);
  };

  return (
    <article className="business-card rural-post">
      <header className="rural-post-header">
        <span className="rural-avatar" aria-hidden="true">{initialsForPost(post)}</span>
        <div className="rural-post-author">
          <strong>{post.author.name}</strong>
          <div className="rural-post-meta">
            <span className={`rural-role-badge ${isBusinessAuthor ? 'host' : 'traveller'}`}>
              {isBusinessAuthor ? 'Host' : 'Traveller'}
            </span>
            {post.author.region && <span className="rural-post-location"><MapPin size={12} />{post.author.region}</span>}
            <span aria-hidden="true">·</span>
            <time dateTime={post.createdAt}>{formatRelativeTime(post.createdAt)}</time>
          </div>
        </div>
        {canManage && (
          <details className="rural-post-menu">
            <summary aria-label="Post actions"><MoreVertical size={19} /></summary>
            <div className="rural-post-menu-items">
              <button type="button" onClick={() => { setEditValue(post.content); setIsEditing(true); }}><Pencil size={14} /> Edit post</button>
              <button type="button" className="danger" onClick={() => onDelete(post)}><Trash2 size={14} /> Delete post</button>
            </div>
          </details>
        )}
      </header>

      {isEditing ? (
        <form className="business-v2-edit-form" onSubmit={submitEdit}>
          <textarea value={editValue} maxLength={5000} onChange={(event) => setEditValue(event.target.value)} aria-label="Edit your business post" required />
          <div>
            <button type="button" className="secondary" onClick={() => setIsEditing(false)}>Cancel</button>
            <button type="submit">Save changes</button>
          </div>
        </form>
      ) : (
        <>
          {post.imageUrl && <img className="rural-post-image" src={post.imageUrl} alt={`Photo shared by ${post.author.name}`} loading="lazy" />}
          <p className="rural-post-content">{post.content}</p>
        </>
      )}
      {hashtags.length > 0 && (
        <div className="rural-post-hashtags" aria-label="Post hashtags">
          {hashtags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      )}

      {(post.likeCount > 0 || post.comments.length > 0) && (
        <div className="rural-post-counts">
          {post.likeCount > 0 && <span><Heart size={14} />{post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}</span>}
          <span>{post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}</span>
        </div>
      )}

      <div className="rural-post-actions">
        <button type="button" className={post.likedByMe ? 'liked' : ''} aria-pressed={post.likedByMe} onClick={() => onLike(post)}>
          <ThumbsUp size={16} /> Like
        </button>
        <button type="button" onClick={() => document.getElementById(`comment-${postKey}`)?.focus()}>
          <MessageCircle size={16} /> Comment
        </button>
        <button type="button" onClick={() => onShare(post)}><Share2 size={16} /> Share</button>
      </div>

      <div className="rural-post-comments">
        {post.comments.map((comment) => (
          <div className="rural-comment" key={comment.id}>
            <span className="rural-avatar small" aria-hidden="true">{getInitials(comment.name)}</span>
            <div>
              <strong>{comment.name}</strong>
              <p>{comment.content}</p>
              <time dateTime={comment.createdAt}>{formatRelativeTime(comment.createdAt)}</time>
            </div>
          </div>
        ))}
      </div>
      <form className="rural-comment-form" onSubmit={(event) => onComment(event, post)}>
        <input
          id={`comment-${postKey}`}
          value={commentValue}
          onChange={(event) => onCommentChange(postKey, event.target.value)}
          maxLength={2000}
          aria-label={`Comment on ${post.author.name}'s post`}
          placeholder="Write a comment..."
        />
        <button type="submit" aria-label="Send comment" disabled={!commentValue.trim()}><Send size={15} /></button>
      </form>
    </article>
  );
}

export default function BusinessDashboard({ user, onUserUpdate, onLogout, onNavigate, theme, onToggleTheme }) {
  const approvalStatus = user.businessApprovalStatus || 'pending';
  const isApproved = approvalStatus === 'approved';
  const StatusIcon = isApproved ? CheckCircle2 : approvalStatus === 'rejected' ? ShieldAlert : Clock3;
  const [section, setSection] = useState('Dashboard');
  const [profile, setProfile] = useState({
    name: user.name || '',
    region: user.region || '',
    businessName: user.businessName || '',
    description: user.businessDescription || '',
    phone: user.businessPhone || '',
    website: user.businessWebsite || '',
    address: user.businessAddress || '',
    latitude: user.businessLatitude ?? '',
    longitude: user.businessLongitude ?? '',
  });
  const [feedPosts, setFeedPosts] = useState([]);
  const [businessPosts, setBusinessPosts] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [externalDestinations, setExternalDestinations] = useState([]);
  const [externalServices, setExternalServices] = useState(null);
  const [externalError, setExternalError] = useState('');
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);
  const [destinationCategory, setDestinationCategory] = useState('all');
  const [destinationLocation, setDestinationLocation] = useState('all');
  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);
  const [roadRoute, setRoadRoute] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [isRouting, setIsRouting] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ count: 0, average: 0 });
  const [inquiries, setInquiries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [experienceDraft, setExperienceDraft] = useState({
    title: '',
    description: '',
    category: '',
    region: user.region || '',
    duration: '',
    price: 0,
    imageUrl: '',
    eventDate: '',
    status: 'draft',
  });
  const [editingExperienceId, setEditingExperienceId] = useState('');
  const [reviewReplyDrafts, setReviewReplyDrafts] = useState({});
  const [inquiryReplyDrafts, setInquiryReplyDrafts] = useState({});
  const [page, setPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [ownPostCount, setOwnPostCount] = useState(0);
  const [draft, setDraft] = useState('');
  const [selectedPostPhotoId, setSelectedPostPhotoId] = useState('');
  const [editingPostId, setEditingPostId] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [feedFilter, setFeedFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const businessDisplayName = profile.businessName || profile.name || 'Your business';
  const initials = getInitials(businessDisplayName);

  const loadFeed = useCallback(async ({ append = false, nextPage = 1 } = {}) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError('');
    const requests = [
      apiRequest(`/community/posts?scope=feed&page=${nextPage}&limit=15&type=all`)
        .then((result) => {
          setFeedPosts((current) => append ? [...current, ...result.posts] : result.posts);
          setPage(result.page);
          setTotalPosts(result.total);
        })
        .catch((requestError) => {
          setError(requestError.message);
          if (!append) setFeedPosts([]);
        })
        .finally(() => {
          setIsLoading(false);
          setIsLoadingMore(false);
        }),
    ];
    if (!append) {
      setIsLoadingExternal(true);
      requests.push(
        apiRequest('/destinations?limit=15')
          .then((result) => setDestinations(result.destinations))
          .catch((requestError) => {
            setDestinations([]);
            setExternalError(`Registered experiences could not be loaded: ${requestError.message}`);
          })
      );
      requests.push(
        apiRequest('/discovery/destinations?limit=15')
          .then((result) => {
            setExternalDestinations(result.destinations);
            setExternalServices(result.services);
            setExternalError(result.services?.openStreetMap?.message || '');
          })
          .catch((requestError) => {
            setExternalDestinations([]);
            setExternalServices(null);
            setExternalError(requestError.message);
          })
          .finally(() => setIsLoadingExternal(false))
      );
      requests.push(
        apiRequest('/business/photos')
          .then((result) => setPhotos(result.photos))
          .catch((requestError) => {
            setError((current) => current || `Your business photos could not be loaded: ${requestError.message}`);
          })
      );
    }
    await Promise.allSettled(requests);
  }, []);

  const loadMyBusiness = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [postsResult, profileResult] = await Promise.all([
        apiRequest('/business/posts?scope=mine&limit=50'),
        apiRequest('/business/profile'),
      ]);
      const business = profileResult.business;
      if (business) {
        setProfile({
          name: business.name || '',
          region: business.region || '',
          businessName: business.businessName || '',
          description: business.description || '',
          phone: business.phone || '',
          website: business.website || '',
          address: business.address || '',
          latitude: business.latitude ?? '',
          longitude: business.longitude ?? '',
        });
      }
      setBusinessPosts(postsResult.posts.map((post) => normalizeBusinessPost(post, user)));
      setOwnPostCount(postsResult.ownPostCount);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadExperiences = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await apiRequest('/business/experiences');
      setExperiences(result.experiences);
    } catch (requestError) {
      setError(requestError.message);
      setExperiences([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDestinations = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingExternal(true);
    setError('');
    const [businessResult, discoveryResult] = await Promise.allSettled([
      apiRequest(`/destinations?limit=15${searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : ''}`),
      apiRequest('/discovery/destinations?limit=15'),
    ]);
    if (businessResult.status === 'fulfilled') setDestinations(businessResult.value.destinations);
    else {
      setDestinations([]);
      setError(businessResult.reason.message);
    }
    if (discoveryResult.status === 'fulfilled') {
      setExternalDestinations(discoveryResult.value.destinations);
      setExternalServices(discoveryResult.value.services);
      setExternalError(discoveryResult.value.services?.openStreetMap?.message || '');
    } else {
      setExternalDestinations([]);
      setExternalServices(null);
      setExternalError(discoveryResult.reason.message);
    }
    setIsLoading(false);
    setIsLoadingExternal(false);
  }, [searchQuery]);

  const loadPhotos = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await apiRequest('/business/photos');
      setPhotos(result.photos);
    } catch (requestError) {
      setError(requestError.message);
      setPhotos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await apiRequest('/business/reviews');
      setReviews(result.reviews);
      setReviewSummary(result.summary);
    } catch (requestError) {
      setError(requestError.message);
      setReviews([]);
      setReviewSummary({ count: 0, average: 0 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadInquiries = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await apiRequest('/business/inquiries');
      setInquiries(result.inquiries);
    } catch (requestError) {
      setError(requestError.message);
      setInquiries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await apiRequest('/notifications');
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (requestError) {
      setError(requestError.message);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'My Business') loadMyBusiness();
    else if (section === 'Dashboard') loadFeed();
    else if (section === 'My Experiences') loadExperiences();
    else if (section === 'Events') loadDestinations();
    else if (section === 'My Photos') loadPhotos();
    else if (section === 'Reviews & Ratings') loadReviews();
    else if (section === 'Inquiries') loadInquiries();
    else if (section === 'Notifications') loadNotifications();
    else setIsLoading(false);
  }, [
    section,
    loadFeed,
    loadMyBusiness,
    loadExperiences,
    loadPhotos,
    loadReviews,
    loadInquiries,
    loadNotifications,
  ]);

  useEffect(() => {
    if (section === 'Discover Destinations') loadDestinations();
  }, [section, loadDestinations]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mobileNavOpen]);

  const visiblePosts = useMemo(() => {
    const source = section === 'My Business' ? businessPosts : feedPosts;
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return source.filter((post) => {
      if (section === 'Dashboard' && feedFilter === 'destinations') return false;
      if (section === 'Dashboard' && feedFilter === 'business' && post.source !== 'business') return false;
      return !normalizedQuery || (
        `${post.content} ${post.author?.name} ${post.author?.role} ${post.author?.region}`
          .toLowerCase()
          .includes(normalizedQuery)
      );
    });
  }, [businessPosts, feedFilter, feedPosts, searchQuery, section]);

  const destinationCards = useMemo(() => [
    ...destinations.map((destination) => ({
      ...destination,
      id: `business-${destination.id}`,
      name: destination.title,
      location: destination.business?.region || destination.region || '',
      source: 'TriSaarathi business',
      external: false,
      category: destination.category,
      businessName: destination.business?.name || '',
      latitude: destination.business?.latitude,
      longitude: destination.business?.longitude,
    })),
    ...externalDestinations.map((destination) => ({
      ...destination,
      source: 'OpenStreetMap',
      external: true,
      description: destination.description || destination.wikidata?.description || '',
    })),
  ], [destinations, externalDestinations]);

  const filteredDestinationCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return destinationCards.filter((destination) => {
      const category = destination.category?.toLowerCase() || '';
      const tags = destination.tags || {};
      if (destinationCategory === 'nature' && !(tags.natural || tags.tourism === 'viewpoint' || category.includes('nature'))) return false;
      if (destinationCategory === 'heritage' && !(tags.historic || tags.amenity === 'place_of_worship' || category.includes('heritage') || category.includes('worship'))) return false;
      if (destinationCategory === 'food' && !(tags.amenity === 'restaurant' || category.includes('food'))) return false;
      if (destinationCategory === 'market' && !(tags.craft || tags.amenity === 'marketplace' || category.includes('market') || category.includes('craft'))) return false;
      if (destinationLocation !== 'all' && destination.location !== destinationLocation) return false;
      return !query || `${destination.name} ${destination.description} ${destination.category} ${destination.location} ${destination.businessName} ${destination.wikidata?.description || ''}`
        .toLowerCase()
        .includes(query);
    });
  }, [destinationCards, destinationCategory, destinationLocation, searchQuery]);

  const mapDestinations = useMemo(() => {
    const unique = new Map();
    for (const place of destinationCards) {
      if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) continue;
      const key = `${place.latitude},${place.longitude}`;
      if (!unique.has(key)) unique.set(key, place);
    }
    return [...unique.values()];
  }, [destinationCards]);

  const destinationLocations = useMemo(() => [...new Set(
    destinationCards.map((destination) => destination.location).filter(Boolean)
  )].sort((first, second) => first.localeCompare(second)), [destinationCards]);

  const locations = useMemo(() => {
    const unique = new Map();
    for (const post of feedPosts) {
      const name = post.author?.region?.trim();
      if (name && !unique.has(name.toLowerCase())) unique.set(name.toLowerCase(), name);
    }
    return [...unique.values()].slice(0, 5);
  }, [feedPosts]);

  const suggestedHosts = useMemo(() => {
    const unique = new Map();
    for (const post of feedPosts) {
      if (post.source !== 'business' || !post.author?.id) continue;
      const key = post.author.id.toString();
      if (!unique.has(key)) unique.set(key, post.author);
    }
    return [...unique.values()].slice(0, 4);
  }, [feedPosts]);

  const publishPost = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !isApproved) return;
    setIsPublishing(true);
    setError('');
    setNotice('');
    try {
      await apiRequest('/business/posts', {
        method: 'POST',
        body: JSON.stringify({ content: draft, imageId: selectedPostPhotoId || null }),
      });
      setDraft('');
      setSelectedPostPhotoId('');
      setNotice('Your post has been published.');
      await loadMyBusiness();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const savePostEdit = async (post, content = editingContent) => {
    setError('');
    try {
      await apiRequest(`/business/posts/${post.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
      setEditingPostId('');
      setNotice('Your post was updated.');
      if (section === 'My Business') await loadMyBusiness();
      else await loadFeed();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  };

  const deletePost = async (post) => {
    if (!window.confirm('Delete this post? This action cannot be undone.')) return;
    setError('');
    try {
      await apiRequest(`/business/posts/${post.id}`, { method: 'DELETE' });
      setNotice('Your post was deleted.');
      if (section === 'My Business') await loadMyBusiness();
      else await loadFeed();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const runPostAction = async (post, action, body) => {
    setError('');
    try {
      await apiRequest(`/community/posts/${post.source}/${post.id}/${action}`, {
        method: 'POST',
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      await loadFeed();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  };

  const addComment = async (event, post) => {
    event.preventDefault();
    const key = `${post.source}-${post.id}`;
    const content = commentDrafts[key] || '';
    if (!content.trim()) return;
    if (await runPostAction(post, 'comments', { content })) {
      setCommentDrafts((current) => ({ ...current, [key]: '' }));
    }
  };

  const sharePost = async (post) => {
    const text = `${post.author.name}: ${post.content}`;
    try {
      if (navigator.share) await navigator.share({ title: 'TriSaarathi rural story', text });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setNotice('Post text copied to clipboard.');
      } else setError('Sharing is not available in this browser.');
    } catch (shareError) {
      if (shareError.name !== 'AbortError') setError('The post could not be shared.');
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest('/business/profile', {
        method: 'PUT',
        body: JSON.stringify({
          ...profile,
          latitude: profile.latitude === '' ? null : Number(profile.latitude),
          longitude: profile.longitude === '' ? null : Number(profile.longitude),
        }),
      });
      setProfile(result.business);
      onUserUpdate({
        ...user,
        ...result.business,
        businessDescription: result.business.description,
        businessPhone: result.business.phone,
        businessWebsite: result.business.website,
        businessAddress: result.business.address,
        businessLatitude: result.business.latitude,
        businessLongitude: result.business.longitude,
      });
      setNotice('Your business profile was updated.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const saveExperience = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await apiRequest(editingExperienceId
        ? `/business/experiences/${editingExperienceId}`
        : '/business/experiences', {
        method: editingExperienceId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...experienceDraft,
          price: Number(experienceDraft.price),
          eventDate: experienceDraft.eventDate || null,
        }),
      });
      setExperienceDraft({
        title: '',
        description: '',
        category: '',
        region: profile.region || user.region || '',
        duration: '',
        price: 0,
        imageUrl: '',
        eventDate: '',
        status: 'draft',
      });
      setEditingExperienceId('');
      setNotice(editingExperienceId ? 'Your experience was updated.' : 'Your experience was saved.');
      await loadExperiences();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const editExperience = (experience) => {
    setExperienceDraft({
      title: experience.title,
      description: experience.description,
      category: experience.category,
      region: experience.region,
      duration: experience.duration,
      price: experience.price,
      imageUrl: experience.imageUrl,
      eventDate: experience.eventDate ? new Date(experience.eventDate).toISOString().slice(0, 10) : '',
      status: experience.status,
    });
    setEditingExperienceId(experience.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteExperience = async (experience) => {
    if (!window.confirm(`Delete "${experience.title}"? This action cannot be undone.`)) return;
    setError('');
    try {
      await apiRequest(`/business/experiences/${experience.id}`, { method: 'DELETE' });
      setNotice('Experience deleted.');
      await loadExperiences();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      setError('Choose an image file smaller than 10 MB.');
      return;
    }
    setIsUploading(true);
    setError('');
    setNotice('');
    try {
      const signing = await apiRequest('/business/uploads/sign', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const uploadBody = new FormData();
      uploadBody.append('file', file);
      uploadBody.append('api_key', signing.apiKey);
      uploadBody.append('timestamp', String(signing.timestamp));
      uploadBody.append('public_id', signing.publicId);
      uploadBody.append('signature', signing.signature);
      let uploadResponse;
      try {
        uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${encodeURIComponent(signing.cloudName)}/image/upload`,
          { method: 'POST', body: uploadBody }
        );
      } catch (cause) {
        throw new Error('Unable to reach Cloudinary. Check your connection and try again.', { cause });
      }
      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error?.message || 'Cloudinary could not upload this image.');
      }
      const saved = await apiRequest('/business/photos', {
        method: 'POST',
        body: JSON.stringify({
          cloudinaryPublicId: uploadResult.public_id,
          secureUrl: uploadResult.secure_url,
          altText: file.name.slice(0, 200),
        }),
      });
      setPhotos((current) => [saved.photo, ...current]);
      setNotice('Photo uploaded to your business gallery.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (photo) => {
    if (!window.confirm('Delete this photo from Cloudinary and your gallery?')) return;
    setError('');
    try {
      await apiRequest(`/business/photos/${photo.id}`, { method: 'DELETE' });
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setNotice('Photo deleted.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const replyToReview = async (event, review) => {
    event.preventDefault();
    const response = reviewReplyDrafts[review.id] || '';
    if (!response.trim()) return;
    setError('');
    try {
      await apiRequest(`/business/reviews/${review.id}/reply`, {
        method: 'PATCH',
        body: JSON.stringify({ response }),
      });
      setReviewReplyDrafts((current) => ({ ...current, [review.id]: '' }));
      setNotice('Your response was sent to the traveller.');
      await loadReviews();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const replyToInquiry = async (event, inquiry) => {
    event.preventDefault();
    const response = inquiryReplyDrafts[inquiry.id] || '';
    if (!response.trim()) return;
    setError('');
    try {
      await apiRequest(`/business/inquiries/${inquiry.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'responded', response }),
      });
      setInquiryReplyDrafts((current) => ({ ...current, [inquiry.id]: '' }));
      setNotice('Your response was sent to the traveller.');
      await loadInquiries();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const closeInquiry = async (inquiry) => {
    setError('');
    try {
      await apiRequest(`/business/inquiries/${inquiry.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'closed' }),
      });
      setNotice('Inquiry marked as closed.');
      await loadInquiries();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const markNotificationRead = async (notification) => {
    if (notification.read) return;
    setError('');
    try {
      await apiRequest(`/notifications/${notification.id}/read`, { method: 'PATCH' });
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, read: true } : item
      )));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const markAllNotificationsRead = async () => {
    setError('');
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' });
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const selectRouteStart = (place) => {
    setRouteStart(place);
    setRouteEnd(null);
    setRoadRoute(null);
    setRouteError('');
  };

  const selectRouteEnd = (place) => {
    setRouteEnd(place);
    setRoadRoute(null);
    setRouteError('');
  };

  const requestRoadRoute = async () => {
    if (!routeStart || !routeEnd || routeStart.id === routeEnd.id) {
      setRouteError('Choose two different mapped destinations to calculate a road route.');
      return;
    }
    setIsRouting(true);
    setRouteError('');
    try {
      const query = new URLSearchParams({
        fromLatitude: String(routeStart.latitude),
        fromLongitude: String(routeStart.longitude),
        toLatitude: String(routeEnd.latitude),
        toLongitude: String(routeEnd.longitude),
      });
      const result = await apiRequest(`/discovery/route?${query}`);
      setRoadRoute(result);
    } catch (requestError) {
      setRoadRoute(null);
      setRouteError(requestError.message);
    } finally {
      setIsRouting(false);
    }
  };

  const selectSection = (selected) => {
    setSection(selected);
    setMobileNavOpen(false);
    setIsProfileOpen(false);
    setSearchQuery('');
    setNotice('');
    setError('');
  };

  const discoverLocation = (location) => {
    setSection('Dashboard');
    setSearchQuery(location);
    setFeedFilter('all');
    setDestinationLocation(location);
  };

  const visibleOwnerPosts = section === 'My Business' ? visiblePosts : [];

  return (
    <section className="business-v2" aria-label="TriSaarathi business dashboard">
      {mobileNavOpen && <button type="button" className="business-v2-scrim" aria-label="Close navigation menu" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`business-v2-sidebar ${mobileNavOpen ? 'open' : ''}`} aria-label="Business workspace">
        <button type="button" className="business-v2-sidebar-brand" onClick={() => onNavigate?.('home')} aria-label="TriSaarathi home">
          <Logo size={39} />
          <small>Rural Roots. Richer Journeys.</small>
        </button>
        <p className="business-v2-nav-label">WORKSPACE</p>
        <nav aria-label="Workspace sections">
          {navigation.map(({ label, Icon }) => (
            <button
              type="button"
              key={label}
              className={`business-v2-nav-item ${section === label ? 'active' : ''}`}
              aria-current={section === label ? 'page' : undefined}
              onClick={() => selectSection(label)}
            >
              <Icon size={18} aria-hidden="true" /><span>{label}</span>
              {label === 'Notifications' && unreadCount > 0 && <span className="business-v2-notification-count">{unreadCount}</span>}
            </button>
          ))}
        </nav>
        <div className="business-v2-sidebar-bottom">
          <div className="business-v2-sidebar-divider" />
          <div className="business-v2-sidebar-account">
            <span className="business-v2-account-avatar" aria-hidden="true">{initials}</span>
            <span><strong>{businessDisplayName}</strong><small>{isApproved ? 'Approved Host' : approvalStatus === 'rejected' ? 'Review needed' : 'Pending review'}</small></span>
          </div>
          <button type="button" className="business-v2-nav-item logout" onClick={onLogout}><LogOut size={18} /><span>Log out</span></button>
        </div>
      </aside>

      <div className="business-v2-main-shell">
        <header className="business-v2-header">
        <button
          type="button"
          className="business-mobile-menu"
          aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          {mobileNavOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <div className="business-v2-topbar-heading">
          <span>TRISAARATHI BUSINESS SPACE</span>
          <strong>{section}</strong>
        </div>
        <label className="business-v2-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Search destinations, experiences, hosts, or places"
            placeholder="Search destinations, experiences, hosts, or places..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <div className="business-v2-header-actions">
          <span className="business-v2-header-date">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <button
            type="button"
            className="business-v2-theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
          <div className="business-v2-profile-menu">
            <button
              type="button"
              className="business-v2-profile-trigger"
              aria-expanded={isProfileOpen}
              onClick={() => setIsProfileOpen((open) => !open)}
            >
              <span className="business-v2-account-avatar" aria-hidden="true">{initials}</span>
              <span className="business-v2-profile-copy">
                <strong>{businessDisplayName}</strong>
                <small>{isApproved ? 'Approved Host' : approvalStatus === 'rejected' ? 'Review needed' : 'Pending review'}</small>
              </span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {isProfileOpen && (
              <div className="business-v2-profile-dropdown">
                <button type="button" onClick={() => selectSection('My Business')}>My Business</button>
                <button type="button" onClick={() => selectSection('Settings')}>Settings</button>
                <button type="button" onClick={onLogout}>Log out</button>
              </div>
            )}
          </div>
        </div>
        </header>

        <div className="business-v2-layout">
        <main className="business-v2-main">
          {error && <p className="dashboard-message dashboard-error" role="alert">{error}</p>}
          {notice && <p className="dashboard-message dashboard-success" role="status">{notice}</p>}
          {!isApproved && (
            <section className={`business-v2-approval ${approvalStatus === 'rejected' ? 'rejected' : ''}`}>
              <StatusIcon size={19} aria-hidden="true" />
              <div>
                <strong>{approvalStatus === 'rejected' ? 'Business approval needs attention' : 'Your host account is under review'}</strong>
                <p>{approvalStatus === 'rejected'
                  ? 'Your business is not currently visible in public feeds. Contact the TriSaarathi team for a review.'
                  : 'You can explore the community while your account is reviewed. Publishing is available after approval.'}</p>
              </div>
            </section>
          )}

          {section === 'Dashboard' ? (
            <>
              <section className="business-v2-hero" aria-label="Rural tourism stories">
                <img src={ruralHeroImage} alt="Rural landscape in India at sunrise" />
                <div className="business-v2-hero-shade" />
                <div className="business-v2-hero-copy">
                  <span>RURAL INDIA, THROUGH LOCAL EYES</span>
                  <h1>Rural Stories. Real People. Amazing Journeys.</h1>
                  <p>Explore posts from travellers, hosts and rural communities across India.</p>
                </div>
              </section>
              <div className="business-v2-feed-heading">
                <div><span>COMMUNITY STORIES</span><h2>From across rural India</h2></div>
                <button type="button" onClick={() => loadFeed()} disabled={isLoading}><ArrowRight size={15} /> Refresh</button>
              </div>
              <div className="business-v2-feed-filters" role="group" aria-label="Filter rural stories">
                <button type="button" className={feedFilter === 'all' ? 'active' : ''} aria-pressed={feedFilter === 'all'} onClick={() => setFeedFilter('all')}>All stories</button>
                <button type="button" className={feedFilter === 'business' ? 'active' : ''} aria-pressed={feedFilter === 'business'} onClick={() => setFeedFilter('business')}>Hosts & businesses</button>
                <button type="button" className={feedFilter === 'destinations' ? 'active' : ''} aria-pressed={feedFilter === 'destinations'} onClick={() => setFeedFilter('destinations')}>Destinations & experiences</button>
              </div>
              {externalError && <p className="business-v2-inline-note" role="status">OpenStreetMap discovery status: {externalError} Registered business posts remain available.</p>}
              {externalServices && ((!externalServices.wikimediaCommons.available && !externalServices.wikimediaCommons.skipped) || !externalServices.wikidata.available) && (
                <p className="business-v2-inline-note" role="status">Some optional photo or Wikidata details could not be loaded. Available mapped places and business posts are still shown.</p>
              )}
              {feedFilter !== 'business' && (
                <>
                  <div className="business-v2-discovery-filters">
                    <label>Category
                      <select value={destinationCategory} onChange={(event) => setDestinationCategory(event.target.value)}>
                        <option value="all">All categories</option>
                        <option value="nature">Nature & viewpoints</option>
                        <option value="heritage">Heritage & worship</option>
                        <option value="food">Food</option>
                        <option value="market">Markets & crafts</option>
                      </select>
                    </label>
                    <label>Location
                      <select value={destinationLocation} onChange={(event) => setDestinationLocation(event.target.value)}>
                        <option value="all">All locations</option>
                        {destinationLocations.map((location) => <option key={location} value={location}>{location}</option>)}
                      </select>
                    </label>
                  </div>
                  <RoutePlanner
                    destinations={mapDestinations}
                    routeStart={routeStart}
                    routeEnd={routeEnd}
                    route={roadRoute}
                    routeError={routeError}
                    isRouting={isRouting}
                    onSelectStart={selectRouteStart}
                    onSelectEnd={selectRouteEnd}
                    onCalculate={requestRoadRoute}
                  />
                  {isLoadingExternal && <div className="business-card business-v2-state" role="status">Loading mapped places, images, and destination facts...</div>}
                  {!isLoadingExternal && filteredDestinationCards.length === 0 && (
                    <section className="business-card business-v2-state"><span className="business-v2-state-icon"><Compass size={22} /></span><h2>No matching rural destinations</h2><p>Try a different search, location, or category. Only places returned by OpenStreetMap are shown.</p></section>
                  )}
                  <div className="business-v2-discovery-feed">
                    {filteredDestinationCards.map((destination) => (
                      <DestinationFeedCard
                        key={destination.id}
                        destination={destination}
                        onSelectStart={selectRouteStart}
                        onSelectEnd={selectRouteEnd}
                      />
                    ))}
                  </div>
                </>
              )}
              {isLoading && feedPosts.length === 0 ? (
                <div className="business-card business-v2-state" role="status">Loading community stories...</div>
              ) : visiblePosts.length === 0 ? (
                <section className="business-card business-v2-state">
                  <span className="business-v2-state-icon"><MessageCircle size={22} /></span>
                  <h2>{searchQuery ? 'No matching stories' : feedFilter === 'business' ? 'No host stories yet' : 'The community is just getting started'}</h2>
                  <p>{searchQuery
                    ? 'Try another place, host, or search phrase.'
                    : 'Updates from travellers and approved rural businesses will appear here when available.'}</p>
                </section>
              ) : (
                <div className="business-v2-post-list">
                  {visiblePosts.map((post) => (
                    <PostCard
                      key={`${post.source}-${post.id}`}
                      post={post}
                      canManage={post.source === 'business' && post.isOwner && isApproved}
                      onLike={(selected) => runPostAction(selected, 'like')}
                      onComment={addComment}
                      commentValue={commentDrafts[`${post.source}-${post.id}`] || ''}
                      onCommentChange={(key, value) => setCommentDrafts((current) => ({ ...current, [key]: value }))}
                      onEdit={savePostEdit}
                      onDelete={deletePost}
                      onShare={sharePost}
                    />
                  ))}
                  {!searchQuery && feedPosts.length < totalPosts && (
                    <button
                      type="button"
                      className="business-v2-load-more"
                      disabled={isLoadingMore}
                      onClick={() => loadFeed({ append: true, nextPage: page + 1 })}
                    >
                      {isLoadingMore ? 'Loading...' : 'Load more stories'}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : section === 'My Business' ? (
            <>
              <div className="business-v2-page-heading"><span>YOUR HOST SPACE</span><h1>My Business</h1><p>Manage your public details and share updates with travellers.</p></div>
              <form className="business-card business-v2-form" onSubmit={saveProfile}>
                <div className="business-v2-form-heading"><BriefcaseBusiness size={19} /><div><h2>Business profile</h2><p>These details identify your host account.</p></div></div>
                <label><span>Business name</span><input value={profile.businessName} maxLength={150} onChange={(event) => setProfile({ ...profile, businessName: event.target.value })} required /></label>
                <label><span>Contact name</span><input value={profile.name} maxLength={100} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></label>
                <label><span>Village or region</span><input value={profile.region} maxLength={120} onChange={(event) => setProfile({ ...profile, region: event.target.value })} required /></label>
                <label><span>Business description</span><textarea className="business-v2-rich-input" value={profile.description} maxLength={2000} onChange={(event) => setProfile({ ...profile, description: event.target.value })} rows={4} /></label>
                <label><span>Business phone</span><input type="tel" value={profile.phone} maxLength={30} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
                <label><span>Website (HTTPS)</span><input type="url" value={profile.website} maxLength={2048} onChange={(event) => setProfile({ ...profile, website: event.target.value })} placeholder="https://example.com" /></label>
                <label><span>Business address</span><textarea className="business-v2-rich-input" value={profile.address} maxLength={300} onChange={(event) => setProfile({ ...profile, address: event.target.value })} rows={2} /></label>
                <label><span>Map latitude (optional)</span><input type="number" min="-90" max="90" step="any" value={profile.latitude} onChange={(event) => setProfile({ ...profile, latitude: event.target.value })} /></label>
                <label><span>Map longitude (optional)</span><input type="number" min="-180" max="180" step="any" value={profile.longitude} onChange={(event) => setProfile({ ...profile, longitude: event.target.value })} /></label>
                <label><span>Email address</span><input value={user.email || ''} readOnly /></label>
                <div className="business-v2-form-actions"><button type="submit" disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save profile'}</button></div>
              </form>

              {isApproved && (
                <form className="business-card business-v2-composer" onSubmit={publishPost}>
                  <div><span className="rural-avatar">{initials}</span><label htmlFor="business-post-draft">Share a rural story</label></div>
                  <textarea id="business-post-draft" value={draft} maxLength={5000} onChange={(event) => setDraft(event.target.value)} placeholder="Share an update about your village, local traditions, food, or experiences..." required />
                  {photos.length > 0 && <label className="business-v2-post-photo-select"><span>Attach a photo from your gallery</span><select value={selectedPostPhotoId} onChange={(event) => setSelectedPostPhotoId(event.target.value)}><option value="">No photo</option>{photos.map((photo) => <option key={photo.id} value={photo.id}>{photo.altText || 'Business photo'}</option>)}</select></label>}
                  <footer><span>{draft.length}/5,000 characters</span><button type="submit" disabled={isPublishing || !draft.trim()}><Send size={15} />{isPublishing ? 'Publishing...' : 'Publish post'}</button></footer>
                </form>
              )}

              <div className="business-v2-feed-heading">
                <div><span>{ownPostCount} PUBLISHED {ownPostCount === 1 ? 'POST' : 'POSTS'}</span><h2>Your updates</h2></div>
                <button type="button" onClick={loadMyBusiness} disabled={isLoading}>Refresh</button>
              </div>
              {isLoading ? <div className="business-card business-v2-state" role="status">Loading your business updates...</div>
                : visibleOwnerPosts.length === 0 ? (
                  <section className="business-card business-v2-state">
                    <span className="business-v2-state-icon"><Image size={22} /></span>
                    <h2>No business posts yet</h2>
                    <p>{isApproved ? 'Your published updates will appear here.' : 'Publishing is enabled after your host account is approved.'}</p>
                  </section>
                ) : (
                  <div className="business-v2-post-list">
                    {visibleOwnerPosts.map((post) => (
                      <article className="business-card rural-post" key={post.id}>
                        <header className="rural-post-header">
                          <span className="rural-avatar">{initials}</span>
                          <div className="rural-post-author"><strong>{profile.businessName || profile.name}</strong><div className="rural-post-meta"><span className="rural-role-badge host">Host</span>{profile.region && <span className="rural-post-location"><MapPin size={12} />{profile.region}</span>}<time dateTime={post.createdAt}>{formatRelativeTime(post.createdAt)}</time></div></div>
                          <div className="rural-post-owner-actions">
                            <button type="button" aria-label="Edit business post" onClick={() => { setEditingPostId(post.id); setEditingContent(post.content); }}><Pencil size={15} /></button>
                            <button type="button" aria-label="Delete business post" onClick={() => deletePost(post)}><Trash2 size={15} /></button>
                          </div>
                        </header>
                        {editingPostId === post.id ? (
                          <form className="business-v2-edit-form" onSubmit={(event) => { event.preventDefault(); savePostEdit(post); }}>
                            <textarea value={editingContent} maxLength={5000} onChange={(event) => setEditingContent(event.target.value)} aria-label="Edit business post" required />
                            <div><button type="button" className="secondary" onClick={() => setEditingPostId('')}>Cancel</button><button type="submit">Save changes</button></div>
                          </form>
                        ) : <>{post.imageUrl && <img className="rural-post-image" src={post.imageUrl} alt={`Photo shared by ${profile.businessName || profile.name}`} loading="lazy" />}<p className="rural-post-content">{post.content}</p></>}
                        <div className="rural-post-counts"><span><Heart size={14} />{post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}</span><span>{post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}</span></div>
                      </article>
                    ))}
                  </div>
                )}
            </>
          ) : section === 'Discover Destinations' ? (
            <>
              <div className="business-v2-page-heading"><span>REAL MAPPED PLACES & HOST LISTINGS</span><h1>Discover Destinations</h1><p>Explore places returned by OpenStreetMap Overpass or Nominatim, and published TriSaarathi business experiences.</p></div>
              {externalError && <p className="business-v2-inline-note" role="status">OpenStreetMap discovery status: {externalError}</p>}
              {externalServices && ((!externalServices.wikimediaCommons.available && !externalServices.wikimediaCommons.skipped) || !externalServices.wikidata.available) && <p className="business-v2-inline-note" role="status">Some optional photo or Wikidata details could not be loaded. Available place records are still shown.</p>}
              <div className="business-v2-discovery-filters">
                <label>Category<select value={destinationCategory} onChange={(event) => setDestinationCategory(event.target.value)}><option value="all">All categories</option><option value="nature">Nature & viewpoints</option><option value="heritage">Heritage & worship</option><option value="food">Food</option><option value="market">Markets & crafts</option></select></label>
                <label>Location<select value={destinationLocation} onChange={(event) => setDestinationLocation(event.target.value)}><option value="all">All locations</option>{destinationLocations.map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
              </div>
              <RoutePlanner destinations={mapDestinations} routeStart={routeStart} routeEnd={routeEnd} route={roadRoute} routeError={routeError} isRouting={isRouting} onSelectStart={selectRouteStart} onSelectEnd={selectRouteEnd} onCalculate={requestRoadRoute} />
              {isLoading || isLoadingExternal ? <div className="business-card business-v2-state" role="status">Loading real destinations...</div>
                : filteredDestinationCards.length === 0 ? <section className="business-card business-v2-state"><span className="business-v2-state-icon"><Compass size={22} /></span><h2>No matching destinations</h2><p>Try a different search or filter. No sample destinations are shown.</p></section>
                  : <div className="business-v2-discovery-feed">{filteredDestinationCards.map((destination) => <DestinationFeedCard key={destination.id} destination={destination} onSelectStart={selectRouteStart} onSelectEnd={selectRouteEnd} />)}</div>}
            </>
          ) : section === 'My Experiences' ? (
            <>
              <div className="business-v2-page-heading"><span>YOUR DESTINATION LISTINGS</span><h1>My Experiences</h1><p>Create rural experiences. Drafts stay private; published listings appear in destination discovery.</p></div>
              <form className="business-card business-v2-form" onSubmit={saveExperience}>
                <div className="business-v2-form-heading"><Sparkles size={19} /><div><h2>{editingExperienceId ? 'Edit experience' : 'Add an experience'}</h2><p>Only publish details you can provide to visitors.</p></div></div>
                <label><span>Title</span><input value={experienceDraft.title} maxLength={150} onChange={(event) => setExperienceDraft({ ...experienceDraft, title: event.target.value })} required /></label>
                <label><span>Description</span><textarea className="business-v2-rich-input" value={experienceDraft.description} maxLength={5000} onChange={(event) => setExperienceDraft({ ...experienceDraft, description: event.target.value })} rows={5} required /></label>
                <label><span>Category</span><input value={experienceDraft.category} maxLength={100} onChange={(event) => setExperienceDraft({ ...experienceDraft, category: event.target.value })} placeholder="Homestay, craft, food, village walk..." required /></label>
                <label><span>Village or region</span><input value={experienceDraft.region} maxLength={120} onChange={(event) => setExperienceDraft({ ...experienceDraft, region: event.target.value })} required /></label>
                <label><span>Duration</span><input value={experienceDraft.duration} maxLength={80} onChange={(event) => setExperienceDraft({ ...experienceDraft, duration: event.target.value })} placeholder="e.g. Half day" /></label>
                <label><span>Price per person (INR)</span><input type="number" min="0" max="10000000" step="0.01" value={experienceDraft.price} onChange={(event) => setExperienceDraft({ ...experienceDraft, price: event.target.value })} required /></label>
                <label><span>Photo URL (optional)</span><input type="url" value={experienceDraft.imageUrl} maxLength={2048} onChange={(event) => setExperienceDraft({ ...experienceDraft, imageUrl: event.target.value })} placeholder="Use an HTTPS image URL" /></label>
                <label><span>Event date (only for dated events)</span><input type="date" value={experienceDraft.eventDate} onChange={(event) => setExperienceDraft({ ...experienceDraft, eventDate: event.target.value })} /></label>
                <label><span>Listing status</span><select className="business-v2-rich-input" value={experienceDraft.status} onChange={(event) => setExperienceDraft({ ...experienceDraft, status: event.target.value })}><option value="draft">Draft</option><option value="published" disabled={!isApproved}>Published</option></select></label>
                <div className="business-v2-form-actions">
                  {editingExperienceId && <button type="button" className="business-v2-secondary-button" onClick={() => { setEditingExperienceId(''); setExperienceDraft({ title: '', description: '', category: '', region: profile.region || user.region || '', duration: '', price: 0, imageUrl: '', eventDate: '', status: 'draft' }); }}>Cancel</button>}
                  <button type="submit" disabled={!isApproved}>{editingExperienceId ? 'Save changes' : 'Save experience'}</button>
                </div>
                {!isApproved && <p className="business-v2-inline-note">Experience publishing is available after business approval.</p>}
              </form>
              <div className="business-v2-business-list">
                {isLoading ? <div className="business-card business-v2-state" role="status">Loading your experiences...</div>
                  : experiences.length === 0 ? <section className="business-card business-v2-state"><p>You have not added any experiences yet.</p></section>
                    : experiences.map((experience) => (
                      <article className="business-card business-v2-data-card" key={experience.id}>
                        {experience.imageUrl && <img className="business-v2-destination-image" src={experience.imageUrl} alt="" loading="lazy" />}
                        <div className="business-v2-data-card-body"><span className="business-v2-data-eyebrow">{experience.status} · {experience.category} · {experience.region}</span><h2>{experience.title}</h2><p>{experience.description}</p><strong>₹{Number(experience.price).toLocaleString('en-IN')} per person</strong>{experience.eventDate && <small>Event date: {new Date(experience.eventDate).toLocaleDateString()}</small>}<div className="business-v2-data-actions"><button type="button" onClick={() => editExperience(experience)}><Pencil size={15} /> Edit</button><button type="button" onClick={() => deleteExperience(experience)}><Trash2 size={15} /> Delete</button></div></div>
                      </article>
                    ))}
              </div>
            </>
          ) : section === 'Events' ? (
            <>
              <div className="business-v2-page-heading"><span>APPROVED HOST EVENTS</span><h1>Rural Events</h1><p>Events are published by approved local businesses; dates appear only when the host provided one.</p></div>
              {isLoading ? <div className="business-card business-v2-state" role="status">Loading business events...</div>
                : filteredDestinationCards.filter((destination) => !destination.external && /event|festival|fair|workshop/i.test(destination.category || '')).length === 0
                  ? <section className="business-card business-v2-state"><span className="business-v2-state-icon"><CalendarDays size={22} /></span><h2>No business-submitted events</h2><p>Approved business listings categorized as events, festivals, fairs, or workshops will appear here.</p></section>
                  : <div className="business-v2-discovery-feed">{filteredDestinationCards.filter((destination) => !destination.external && /event|festival|fair|workshop/i.test(destination.category || '')).map((destination) => <DestinationFeedCard key={destination.id} destination={destination} onSelectStart={selectRouteStart} onSelectEnd={selectRouteEnd} />)}</div>}
            </>
          ) : section === 'My Photos' ? (
            <>
              <div className="business-v2-page-heading"><span>YOUR BUSINESS GALLERY</span><h1>My Photos</h1><p>Upload and manage real business images. Files are stored by Cloudinary.</p></div>
              <section className="business-card business-v2-upload-card">
                <label htmlFor="business-photo-upload"><Upload size={18} /> {isUploading ? 'Uploading image...' : 'Choose an image (max 10 MB)'}</label>
                <input id="business-photo-upload" type="file" accept="image/*" onChange={uploadPhoto} disabled={isUploading || !isApproved} />
                {!isApproved && <p className="business-v2-inline-note">Image uploads are available after business approval.</p>}
              </section>
              {isLoading ? <div className="business-card business-v2-state" role="status">Loading your photos...</div>
                : photos.length === 0 ? <section className="business-card business-v2-state"><span className="business-v2-state-icon"><Camera size={22} /></span><h2>No business photos yet</h2><p>Your uploaded gallery images will appear here.</p></section>
                  : <div className="business-v2-photo-grid">{photos.map((photo) => (
                    <article className="business-card business-v2-photo-card" key={photo.id}><img src={photo.secureUrl} alt={photo.altText || 'Business gallery'} loading="lazy" /><div><span>{photo.altText || 'Business photo'}</span><button type="button" onClick={() => deletePhoto(photo)} disabled={!isApproved} aria-label="Delete photo"><Trash2 size={16} /></button></div></article>
                  ))}</div>}
            </>
          ) : section === 'Reviews & Ratings' ? (
            <>
              <div className="business-v2-page-heading"><span>TRAVELLER FEEDBACK</span><h1>Reviews & Ratings</h1><p>Read traveller reviews and reply as the business owner.</p></div>
              <section className="business-card business-v2-review-summary"><strong><Star size={20} /> {reviewSummary.average.toFixed(1)} / 5</strong><span>{reviewSummary.count} {reviewSummary.count === 1 ? 'review' : 'reviews'}</span></section>
              {isLoading ? <div className="business-card business-v2-state" role="status">Loading reviews...</div>
                : reviews.length === 0 ? <section className="business-card business-v2-state"><span className="business-v2-state-icon"><Star size={22} /></span><h2>No reviews yet</h2><p>Traveller reviews for your business will appear here.</p></section>
                  : <div className="business-v2-business-list">{reviews.map((review) => (
                    <article className="business-card business-v2-data-card" key={review.id}><div className="business-v2-data-card-body"><span className="business-v2-data-eyebrow">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} · {new Date(review.createdAt).toLocaleDateString()}</span><h2>{review.reviewer.name}</h2><p>{review.content}</p>{review.businessResponse && <div className="business-v2-response"><strong>Your response</strong><p>{review.businessResponse}</p></div>}<form className="business-v2-inline-form" onSubmit={(event) => replyToReview(event, review)}><textarea className="business-v2-rich-input" value={reviewReplyDrafts[review.id] ?? review.businessResponse ?? ''} onChange={(event) => setReviewReplyDrafts({ ...reviewReplyDrafts, [review.id]: event.target.value })} maxLength={2000} rows={2} placeholder="Reply to this review..." required /><button type="submit" disabled={!isApproved}>Send response</button></form></div></article>
                  ))}</div>}
            </>
          ) : section === 'Inquiries' ? (
            <>
              <div className="business-v2-page-heading"><span>TRAVELLER MESSAGES</span><h1>Inquiries</h1><p>Messages sent directly to your rural business.</p></div>
              {isLoading ? <div className="business-card business-v2-state" role="status">Loading inquiries...</div>
                : inquiries.length === 0 ? <section className="business-card business-v2-state"><span className="business-v2-state-icon"><Inbox size={22} /></span><h2>No inquiries yet</h2><p>Traveller inquiries for your business will appear here.</p></section>
                  : <div className="business-v2-business-list">{inquiries.map((inquiry) => (
                    <article className="business-card business-v2-data-card" key={inquiry.id}><div className="business-v2-data-card-body"><span className="business-v2-data-eyebrow">{inquiry.status} · {new Date(inquiry.createdAt).toLocaleDateString()}</span><h2>{inquiry.subject}</h2><p>{inquiry.message}</p><small>From {inquiry.traveller?.name || 'Traveller'}{inquiry.traveller?.email ? ` · ${inquiry.traveller.email}` : ''}</small>{inquiry.businessResponse && <div className="business-v2-response"><strong>Your response</strong><p>{inquiry.businessResponse}</p></div>}{inquiry.status !== 'closed' && <form className="business-v2-inline-form" onSubmit={(event) => replyToInquiry(event, inquiry)}><textarea className="business-v2-rich-input" value={inquiryReplyDrafts[inquiry.id] || ''} onChange={(event) => setInquiryReplyDrafts({ ...inquiryReplyDrafts, [inquiry.id]: event.target.value })} maxLength={5000} rows={3} placeholder="Write a response..." required /><div><button type="submit" disabled={!isApproved}>Reply</button><button type="button" className="business-v2-secondary-button" onClick={() => closeInquiry(inquiry)}>Close inquiry</button></div></form>}</div></article>
                  ))}</div>}
            </>
          ) : section === 'Notifications' ? (
            <>
              <div className="business-v2-page-heading"><span>ACCOUNT ACTIVITY</span><h1>Notifications</h1><p>Business approval and messages related to your account.</p></div>
              {unreadCount > 0 && <div className="business-v2-notification-toolbar"><span>{unreadCount} unread</span><button type="button" onClick={markAllNotificationsRead}>Mark all as read</button></div>}
              {isLoading ? <div className="business-card business-v2-state" role="status">Loading notifications...</div>
                : notifications.length === 0 ? <section className="business-card business-v2-state"><span className="business-v2-state-icon"><Bell size={22} /></span><h2>No notifications</h2><p>New updates about approval, inquiries, and reviews will appear here.</p></section>
                  : <div className="business-v2-business-list">{notifications.map((notification) => (
                    <button type="button" className={`business-card business-v2-notification-card ${notification.read ? 'read' : 'unread'}`} key={notification.id} onClick={() => markNotificationRead(notification)}><span className="business-v2-notification-dot" /><span><strong>{notification.title}</strong><small>{notification.message}</small><time dateTime={notification.createdAt}>{formatRelativeTime(notification.createdAt)}</time></span></button>
                  ))}</div>}
            </>
          ) : section === 'Settings' ? (
            <>
              <div className="business-v2-page-heading"><span>ACCOUNT PREFERENCES</span><h1>Settings</h1><p>Review and update the business details connected to your host account.</p></div>
              <form className="business-card business-v2-form" onSubmit={saveProfile}>
                <div className="business-v2-form-heading"><Pencil size={19} /><div><h2>Account details</h2><p>Changes are saved to your TriSaarathi account.</p></div></div>
                <label><span>Business name</span><input value={profile.businessName} maxLength={150} onChange={(event) => setProfile({ ...profile, businessName: event.target.value })} required /></label>
                <label><span>Contact name</span><input value={profile.name} maxLength={100} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></label>
                <label><span>Village or region</span><input value={profile.region} maxLength={120} onChange={(event) => setProfile({ ...profile, region: event.target.value })} required /></label>
                <label><span>Business description</span><textarea className="business-v2-rich-input" value={profile.description} maxLength={2000} onChange={(event) => setProfile({ ...profile, description: event.target.value })} rows={4} /></label>
                <label><span>Business phone</span><input type="tel" value={profile.phone} maxLength={30} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
                <label><span>Website (HTTPS)</span><input type="url" value={profile.website} maxLength={2048} onChange={(event) => setProfile({ ...profile, website: event.target.value })} placeholder="https://example.com" /></label>
                <label><span>Business address</span><textarea className="business-v2-rich-input" value={profile.address} maxLength={300} onChange={(event) => setProfile({ ...profile, address: event.target.value })} rows={2} /></label>
                <label><span>Map latitude (optional)</span><input type="number" min="-90" max="90" step="any" value={profile.latitude} onChange={(event) => setProfile({ ...profile, latitude: event.target.value })} /></label>
                <label><span>Map longitude (optional)</span><input type="number" min="-180" max="180" step="any" value={profile.longitude} onChange={(event) => setProfile({ ...profile, longitude: event.target.value })} /></label>
                <label><span>Email address</span><input value={user.email || ''} readOnly /></label>
                <div className="business-v2-form-actions"><button type="submit" disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save changes'}</button></div>
              </form>
            </>
          ) : (
            <>
              <div className="business-v2-page-heading"><span>BUSINESS WORKSPACE</span><h1>{section}</h1></div>
              <section className="business-card business-v2-state">
                <span className="business-v2-state-icon">{section === 'Events' ? <CalendarDays size={22} /> : section === 'Bookings' ? <CalendarCheck size={22} /> : section === 'Analytics' ? <ChartNoAxesColumn size={22} /> : <Sparkles size={22} />}</span>
                <h2>{section} are not connected yet</h2>
                <p>This workspace will show your real {section.toLowerCase()} when the related service is available. No sample records or activity are shown.</p>
              </section>
            </>
          )}
        </main>

        <aside className="business-v2-rightbar" aria-label="Rural tourism discovery">
          <section className="business-card business-v2-side-card">
            <div className="business-v2-side-heading"><div><span>COMMUNITY HIGHLIGHTS</span><h2>Trending in Rural Tourism</h2></div><button type="button" onClick={() => selectSection('Discover Destinations')}>View all</button></div>
            {locations.length > 0 ? (
              <div className="business-v2-trending-list">{locations.slice(0, 4).map((location, index) => (
                <button type="button" key={location} onClick={() => discoverLocation(location)}>
                  <span className={`business-v2-trend-thumb tone-${index % 3}`}><MapPin size={15} /></span><span><strong>{location}</strong><small>From community stories</small></span><ChevronRight size={16} />
                </button>
              ))}</div>
            ) : <p className="business-v2-side-empty">Places will appear when they are mentioned in community posts.</p>}
          </section>

          <section className="business-v2-support">
            <div className="business-v2-support-photo" style={{ backgroundImage: `url("${ruralHeroImage}")` }} />
            <div className="business-v2-support-copy"><span>TRAVEL WITH PURPOSE</span><h2>Support Rural Communities</h2><p>Explore authentic experiences and help local businesses grow.</p><button type="button" onClick={() => selectSection('Discover Destinations')}>Discover Destinations <ArrowRight size={15} /></button></div>
          </section>

          <section className="business-card business-v2-side-card">
            <div className="business-v2-side-heading"><div><span>LOCAL CALENDAR</span><h2>Upcoming Events</h2></div><button type="button" onClick={() => selectSection('Events')}>View all</button></div>
            <div className="business-v2-side-empty"><CalendarDays size={18} /><p>Event listings are not connected yet. No unverified event dates are shown.</p></div>
          </section>

          <section className="business-card business-v2-side-card">
            <div className="business-v2-side-heading"><div><span>MEET LOCAL HOSTS</span><h2>Suggested Hosts</h2></div><button type="button" onClick={() => { setFeedFilter('business'); selectSection('Dashboard'); }}>View all</button></div>
            {suggestedHosts.length > 0 ? (
              <div className="business-v2-host-list">{suggestedHosts.map((host) => (
                <div className="business-v2-host" key={host.id}>
                  <span className="rural-avatar">{getInitials(host.name)}</span><span><strong>{host.name}</strong><small>{host.region || 'Rural India'} · Approved host</small></span>
                </div>
              ))}</div>
            ) : <p className="business-v2-side-empty">Hosts with published stories will appear here.</p>}
          </section>
          <footer className="business-v2-footer"><span>TriSaarathi</span><span>Every Road Has a Story.</span></footer>
        </aside>
      </div>
      </div>
    </section>
  );
}
