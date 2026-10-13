import React, { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
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
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import Logo from '../components/Logo.js';

const destinations = [
  {
    name: 'Araku Valley',
    region: 'Andhra Pradesh',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Konaseema',
    region: 'Andhra Pradesh',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Lambasingi',
    region: 'Andhra Pradesh',
    image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Hampi',
    region: 'Karnataka',
    image: 'https://images.unsplash.com/photo-1600100397608-e5d8d7d9ec7d?auto=format&fit=crop&w=900&q=80',
  },
];

const sections = [
  { label: 'Dashboard', Icon: Compass },
  { label: 'My Trips', Icon: CalendarDays },
  { label: 'Plan New Trip', Icon: Plus },
  { label: 'Discover Destinations', Icon: MapPin },
  { label: 'Collaborate', Icon: UsersRound },
  { label: 'My Expenses', Icon: Wallet },
  { label: 'Memories', Icon: Heart },
  { label: 'AI Travel Story', Icon: Sparkles },
  { label: 'My Profile', Icon: UserRound },
];

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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState({ name: user.name || '', region: user.region || '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const initials = getInitials(profile.name);

  const selectSection = (nextSection) => {
    setSection(nextSection);
    setMobileNavOpen(false);
    setIsProfileOpen(false);
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
            <div className="traveller-sidebar-header">
              <span className="traveller-user-avatar">{initials}</span>
              <span><strong>{profile.name || 'Traveller'}</strong><small>Traveller</small></span>
            </div>
            <button type="button" className="traveller-sidebar-item traveller-sidebar-logout" onClick={onLogout}>
              <LogOut size={17} aria-hidden="true" /><span>Log out</span>
            </button>
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
              <div className="traveller-profile-menu">
                <button
                  type="button"
                  className="traveller-profile-trigger"
                  aria-expanded={isProfileOpen}
                  onClick={() => setIsProfileOpen((open) => !open)}
                >
                  <span className="traveller-mini-avatar">{initials}</span>
                  <span className="traveller-profile-copy"><strong>{profile.name || 'Traveller'}</strong><small>Traveller</small></span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
                {isProfileOpen && (
                  <div className="traveller-profile-dropdown">
                    <button type="button" onClick={() => selectSection('My Profile')}>My Profile</button>
                    <button type="button" onClick={onLogout}>Log out</button>
                  </div>
                )}
              </div>
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
                <div className="traveller-hero-visual">
                  <div className="traveller-hero-image-wrap">
                    <img
                      src="https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1100&q=80"
                      alt="Traditional village homes among the hills of rural India"
                    />
                    <span className="traveller-hero-script">Find your own path</span>
                  </div>
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
              <p className="traveller-section-description">A few places to inspire your next journey. Destination booking and trip saving are not connected yet.</p>
              <div className="traveller-destination-grid">
                {destinations.map((destination) => (
                  <article className="traveller-destination-card" key={destination.name}>
                    <img src={destination.image} alt={`Rural landscape near ${destination.name}`} loading="lazy" />
                    <span className="traveller-destination-copy"><strong>{destination.name}</strong><span><MapPin size={13} />{destination.region}</span></span>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <EmptySection section={section} />
          )}
        </main>
      </div>
    </section>
  );
}
