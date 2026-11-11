import React from 'react';

export const feedCategories = [
  { id: 'all', label: 'All' }, { id: 'handlooms', label: 'Handlooms' }, { id: 'agriculture', label: 'Agriculture' },
  { id: 'food', label: 'Food' }, { id: 'homestays', label: 'Homestays' }, { id: 'tourism', label: 'Tourism' },
  { id: 'handicrafts', label: 'Handicrafts' },
];

const categoryTerms = {
  handlooms: /handloom|weav|artisan/i,
  agriculture: /farm|agri|agriculture|harvest|crop|organic|dairy|livestock/i,
  food: /food|meal|recipe|restaurant|cooking|cuisine|traditional products/i,
  homestays: /homestay|guest ?house|village stay|farm ?stay/i,
  tourism: /tour|experience|walk|visit|travel|destination/i,
  handicrafts: /handicraft|craft|pottery|artisan/i,
};

export function matchesFeedCategory(post, category) {
  return category === 'all' || Boolean(categoryTerms[category]?.test(
    `${post.category || ''} ${post.author?.category || ''} ${post.content || ''}`,
  ));
}

export default function CategoryFilters({ value, onChange }) {
  return <nav className="ts-filters" aria-label="Filter community posts">
    {feedCategories.map((category) => <button type="button" key={category.id} className={value === category.id ? 'active' : ''} aria-pressed={value === category.id} onClick={() => onChange(category.id)}>{category.label}</button>)}
  </nav>;
}
