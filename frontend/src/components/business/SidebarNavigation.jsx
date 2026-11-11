import React from 'react';
import { Bookmark, FileText, MessageSquare, Settings, Star, UserRound } from 'lucide-react';

const items = [
  ['My Profile', UserRound], ['My Business', FileText], ['My Posts', MessageSquare], ['Saved Posts', Bookmark], ['Reviews & Ratings', Star], ['Settings', Settings],
];

export default function SidebarNavigation({ active, onNavigate }) {
  return <nav className="ts-sidebar-nav" aria-label="Business workspace">
    {items.map(([label, Icon]) => <button type="button" key={label} className={active === label ? 'active' : ''} onClick={() => onNavigate(label)}><Icon size={17} />{label}</button>)}
  </nav>;
}
