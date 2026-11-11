import React from 'react';
import { Globe2, LogOut } from 'lucide-react';
import { getInitials } from './profileUtils.js';
import RegisterBusinessButton from './RegisterBusinessButton.jsx';
import SidebarNavigation from './SidebarNavigation.jsx';
import VillageIllustration from './VillageIllustration.jsx';

export default function ProfileSidebar({ user, profile, status, active, onNavigate, onLogout }) {
  const name = user?.name || 'Business owner';
  const badge = status === 'approved' ? 'Verified' : status === 'pending_review' ? 'Pending Review' : status ? status === 'draft' ? 'Not Registered' : status.replaceAll('_', ' ') : 'Not Registered';
  return <aside className="ts-profile-card">
    <div className="ts-cover" />
    <div className="ts-profile-body">
      <button type="button" className="ts-profile-identity" onClick={() => onNavigate('My Profile')} aria-label="View business profile details">
        <span className="ts-avatar ts-profile-avatar">{profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : getInitials(name)}</span>
        <span className="ts-profile-identity-copy"><strong>{name}</strong><small className="ts-profile-email">{user?.email}</small></span>
      </button>
      {profile?.website && <a className="ts-profile-website" href={profile.website} target="_blank" rel="noreferrer"><Globe2 size={15} aria-hidden="true" /><span>{profile.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}</span></a>}
      <span className={`ts-status ${status === 'approved' ? 'verified' : status === 'pending_review' ? 'pending' : ''}`}>{badge}</span>
      {status !== 'approved' && <p className="ts-register-info">Register your rural business to get verified and connect with customers across Andhra Pradesh.</p>}
      <RegisterBusinessButton status={status} onClick={() => onNavigate(['approved', 'pending_review'].includes(status) ? 'Application Tracking' : 'Register Business')} />
      <SidebarNavigation active={active} onNavigate={onNavigate} />
      <div className="ts-sidebar-logout-wrap">
        <button type="button" className="ts-sidebar-logout" onClick={onLogout}><LogOut size={17} aria-hidden="true" /><span>Log out</span></button>
      </div>
      <VillageIllustration />
    </div>
  </aside>;
}
