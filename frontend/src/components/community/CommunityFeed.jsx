import React from 'react';
import { MessageCircle } from 'lucide-react';
import CommunityPostCard from './CommunityPostCard.jsx';
import CategoryFilters, { matchesFeedCategory } from './CategoryFilters.jsx';

export default function CommunityFeed({ posts, category, onCategory, loading, error, onRetry, actions, emptyTitle, emptyMessage, hideBusinessAction = false }) {
  const filtered = posts.filter((post) => matchesFeedCategory(post, category));
  return <section className="ts-feed" aria-label="Community feed">
    <CategoryFilters value={category} onChange={onCategory} />
    {error && <div className="ts-feed-state error" role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Try again</button></div>}
    {loading && posts.length === 0 && <div className="ts-feed-skeleton" role="status" aria-label="Loading community posts"><span /><span /><span /><span /><span /><span /></div>}
    {!loading && !error && filtered.length === 0 && <div className="ts-feed-state"><span><MessageCircle size={22} /></span><h2>{emptyTitle || (posts.length ? 'No posts in this category yet' : 'No community updates yet')}</h2><p>{emptyMessage || 'Approved rural businesses’ real updates will appear here.'}</p></div>}
    <div className="ts-post-list">{filtered.map((post) => <CommunityPostCard key={`${post.source}-${post.id}`} post={post} hideBusinessAction={hideBusinessAction} {...actions} />)}</div>
  </section>;
}
