import React, { useEffect, useState } from 'react';
import { Bookmark, CheckCircle2, ExternalLink, Heart, MessageCircle, Pencil, Send, Share2, Trash2, X } from 'lucide-react';
import { getInitials } from '../business/profileUtils.js';
import { feedCategories } from './CategoryFilters.jsx';

function relativeTime(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const seconds = Math.round((time - Date.now()) / 1000);
  for (const [unit, size] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(seconds) >= size) return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

function mediaFor(post) {
  if (post.media?.length) return post.media;
  return post.imageUrl ? [{ url: post.imageUrl, type: 'image', publicId: 'legacy-image' }] : [];
}

function contentWithHashtags(value) {
  return String(value || '').split(/(#[\p{L}\p{N}_]+)/gu).map((part, index) => (
    part.startsWith('#') ? <span className="ts-hashtag" key={`${part}-${index}`}>{part}</span> : part
  ));
}

export default function CommunityPostCard({ post, onLike, onComment, onShare, onSave, onEdit, onDelete, onViewBusiness, hideBusinessAction = false }) {
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content);
  const [viewingIndex, setViewingIndex] = useState(null);
  const media = mediaFor(post);
  const viewingMedia = viewingIndex === null ? null : media[viewingIndex];
  const category = post.category || post.author?.category || '';
  const categoryLabel = feedCategories.find((item) => item.id === category)?.label || category;

  useEffect(() => {
    if (viewingIndex === null) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setViewingMedia(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [viewingIndex]);

  const submitComment = async (event) => { event.preventDefault(); if (!comment.trim()) return; if (await onComment(post, comment.trim())) setComment(''); };
  const submitEdit = async (event) => { event.preventDefault(); if (!content.trim()) return; if (await onEdit(post, content.trim())) setEditing(false); };
  const openMedia = (index) => setViewingIndex(index);

  return <article className="ts-post-card">
    <header className="ts-post-header">
      <span className="ts-avatar">{post.author?.avatarUrl ? <img src={post.author.avatarUrl} alt="" /> : getInitials(post.author?.name)}</span>
      <div className="ts-post-author">
        <strong>{post.author?.name || 'Community member'}{post.author?.verified && <span className="ts-verified" title="Verified business"><CheckCircle2 size={15} />Verified</span>}</strong>
        <span>{[post.author?.district, categoryLabel, relativeTime(post.createdAt)].filter(Boolean).join(' · ') || 'Community update'}</span>
      </div>
    </header>
    {editing ? <form className="ts-post-edit" onSubmit={submitEdit}><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} /><div><button type="button" onClick={() => { setEditing(false); setContent(post.content); }}><X size={14} />Cancel</button><button type="submit">Save update</button></div></form> : <p className="ts-post-content">{contentWithHashtags(post.content)}</p>}
    {media.length > 0 && <div className={`ts-media-grid ${media.length === 1 ? 'single' : ''}`}>
      {media.slice(0, 4).map((item, index) => <div className={`ts-media-item ${item.type === 'video' ? 'video' : ''}`} key={item.publicId || item.url || index}>
        {item.type === 'video'
          ? <><video src={item.url} poster={item.thumbnailUrl || undefined} controls preload="metadata" aria-label={`Video shared by ${post.author?.name || 'business'}`} /><span className="ts-play-indicator" aria-hidden="true">▶</span></>
          : <button type="button" onClick={() => openMedia(index)} aria-label="Open shared photo"><img src={item.url} alt={`Shared by ${post.author?.name || 'community member'}`} loading="lazy" /></button>}
        {index === 3 && media.length > 4 && <button className="ts-media-more" type="button" onClick={() => openMedia(4)} aria-label={`View ${media.length - 4} more items`}>+{media.length - 4}</button>}
        {item.type === 'video' && <button className="ts-video-open" type="button" onClick={() => openMedia(index)} aria-label="Open video">Open video</button>}
      </div>)}
    </div>}
    <div className="ts-post-counts"><span>{post.likeCount || 0} likes</span><button type="button" onClick={() => setShowComments((open) => !open)}>{post.comments?.length || 0} comments</button></div>
    <div className="ts-post-actions">
      <button type="button" className={post.likedByMe ? 'selected' : ''} aria-pressed={Boolean(post.likedByMe)} onClick={() => onLike(post)}><Heart size={17} fill={post.likedByMe ? 'currentColor' : 'none'} />Like</button>
      <button type="button" onClick={() => setShowComments((open) => !open)}><MessageCircle size={17} />Comment</button>
      <button type="button" className={post.savedByMe ? 'selected saved' : ''} aria-pressed={Boolean(post.savedByMe)} onClick={() => onSave(post)}><Bookmark size={17} fill={post.savedByMe ? 'currentColor' : 'none'} />{post.savedByMe ? 'Saved' : 'Save'}</button>
      <button type="button" onClick={() => onShare(post)}><Share2 size={17} />Share</button>
      {!hideBusinessAction && post.author?.id && post.source === 'business' && <button type="button" onClick={() => onViewBusiness?.(post)}><ExternalLink size={17} />View Business</button>}
    </div>
    {post.isOwner && <div className="ts-owner-actions"><button type="button" onClick={() => setEditing(true)}><Pencil size={14} />Edit post</button><button type="button" onClick={() => onDelete(post)}><Trash2 size={14} />Delete post</button></div>}
    {showComments && <div className="ts-comments"><div>{(post.comments || []).map((item) => <p key={item.id}><strong>{item.name}</strong> {item.content}</p>)}</div><form onSubmit={submitComment}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment..." maxLength={2000} aria-label="Write a comment" /><button type="submit" aria-label="Send comment"><Send size={15} /></button></form></div>}
    {viewingMedia && <div className="ts-lightbox" role="dialog" aria-modal="true" aria-label="View shared media" onClick={() => setViewingIndex(null)}>
      <button type="button" className="ts-lightbox-close" onClick={() => setViewingIndex(null)} aria-label="Close media viewer"><X size={22} /></button>
      {media.length > 1 && <button type="button" className="ts-lightbox-nav previous" aria-label="Previous media" onClick={(event) => { event.stopPropagation(); setViewingIndex((viewingIndex + media.length - 1) % media.length); }}>‹</button>}
      {viewingMedia.type === 'video'
        ? <video src={viewingMedia.url} poster={viewingMedia.thumbnailUrl || undefined} controls autoPlay={false} preload="metadata" onClick={(event) => event.stopPropagation()} />
        : <img src={viewingMedia.url} alt={`Shared by ${post.author?.name || 'business'}`} onClick={(event) => event.stopPropagation()} />}
      {media.length > 1 && <button type="button" className="ts-lightbox-nav next" aria-label="Next media" onClick={(event) => { event.stopPropagation(); setViewingIndex((viewingIndex + 1) % media.length); }}>›</button>}
    </div>}
  </article>;
}
