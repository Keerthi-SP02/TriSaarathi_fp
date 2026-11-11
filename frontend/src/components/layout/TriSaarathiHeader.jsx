import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, Moon, Sun } from 'lucide-react';
import { getInitials } from '../business/profileUtils.js';

export default function TriSaarathiHeader({ user, title, theme, onToggleTheme, onNavigate, onLogout, profileOpen, onToggleProfile, onOpenProfile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const navigate = (section) => {
    setMenuOpen(false);
    onNavigate(section);
  };

  const logout = () => {
    setMenuOpen(false);
    onLogout();
  };

  return <header className="business-header">
    <div className="business-header-inner">
      <div className="business-header-left">
        <button className="business-header-sidebar-toggle" type="button" aria-label={profileOpen ? 'Hide business profile' : 'Show business profile'} aria-expanded={profileOpen} onClick={onToggleProfile}>
          <Menu size={19} aria-hidden="true" />
        </button>
        <span className="business-header-eyebrow">RURAL BUSINESS PORTAL</span>
        <strong className="business-header-title">{title}</strong>
      </div>
      <div className="business-header-right">
        <time className="business-header-date" dateTime={now.toISOString()}>{dateLabel}</time>
        <button className="business-header-theme" type="button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'light' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
        <div className="business-header-menu" ref={menuRef}>
          <button className="business-header-avatar-toggle" type="button" onClick={onOpenProfile} aria-label="Show business profile">
            <span className="business-header-avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : getInitials(user?.name)}</span>
          </button>
          <button className="business-header-user" type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span className="business-header-user-copy"><strong>{user?.name || 'Business Owner'}</strong><small>Business Owner</small></span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {menuOpen && <div className="business-header-dropdown" role="menu">
            <button type="button" role="menuitem" onClick={() => navigate('My Profile')}>My Profile</button>
            <button type="button" role="menuitem" onClick={() => navigate('Settings')}>Settings</button>
            <button type="button" className="business-header-logout" role="menuitem" onClick={logout}>Logout</button>
          </div>}
        </div>
      </div>
    </div>
  </header>;
}
