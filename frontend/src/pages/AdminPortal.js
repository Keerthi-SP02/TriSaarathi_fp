import React, { useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  ChevronDown,
  Compass,
  FileCheck2,
  Flag,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UsersRound,
  Moon,
  X,
} from 'lucide-react';
import Logo from '../components/Logo.js';
import AdminDashboard from './AdminDashboard.js';
import AdminManagementPage from './AdminManagementPage.js';

const navigation = [
  { label: 'Dashboard', Icon: LayoutDashboard },
  { label: 'Business Verification', Icon: FileCheck2 },
  { label: 'User Management', Icon: UsersRound },
  { label: 'Rural Business Posts', Icon: Building2 },
  { label: 'Destinations & Experiences', Icon: MapPinned },
  { label: 'Reviews & Reports', Icon: Flag },
  { label: 'Notifications', Icon: Bell },
  { label: 'My Profile', Icon: Compass },
  { label: 'Settings', Icon: Settings },
];

function getInitials(name = 'Admin') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '').join('') || 'A';
}

export default function AdminPortal({ adminUser, onLogout, theme, onToggleTheme }) {
  const [activePage, setActivePage] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pageOptions, setPageOptions] = useState({});
  const matchingPages = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? navigation.filter(({ label }) => label.toLowerCase().includes(term)) : [];
  }, [search]);

  const navigate = (label, options = {}) => {
    setActivePage(label);
    setPageOptions(options);
    setIsSidebarOpen(false);
    setSearch('');
    setIsProfileOpen(false);
  };

  const avatar = getInitials(adminUser?.name);

  return (
    <div className="admin-portal">
      {isSidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        <div className="admin-sidebar-brand">
          <Logo size={39} />
          <button type="button" className="admin-icon-button admin-mobile-close" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar">
            <X size={19} />
          </button>
        </div>
        <p className="admin-sidebar-label">ADMINISTRATION</p>
        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          {navigation.map(({ label, Icon }) => (
            <button
              type="button"
              key={label}
              className={`admin-sidebar-link ${activePage === label ? 'is-active' : ''}`}
              aria-current={activePage === label ? 'page' : undefined}
              onClick={() => navigate(label)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <button type="button" className="admin-sidebar-logout" onClick={onLogout}>
            <LogOut size={17} aria-hidden="true" /><span>Logout</span>
          </button>
          <svg className="admin-sidebar-illustration" viewBox="0 0 280 120" role="img" aria-label="Admin reviewing business records and approvals">
            <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 108h256" />
              <rect x="30" y="54" width="72" height="52" rx="5" />
              <path d="M43 69h45M43 80h34M43 91h39" />
              <path d="M54 54V43h23v11" />
              <rect x="118" y="36" width="76" height="70" rx="5" />
              <path d="M132 52h46m-46 12h26m-26 12h23" />
              <circle cx="166" cy="82" r="10" />
              <path d="m161 82 4 4 7-8" />
              <path d="M216 53h38v53h-38zM226 64h18m-18 10h18m-18 10h10" />
              <path d="m233 92 5 5 10-12" />
              <path d="M18 42h20m-10-10v20M250 32h16m-8-8v16" />
            </g>
          </svg>
        </div>
      </aside>

      <div className="admin-portal-main">
        <header className="admin-topbar">
          <button type="button" className="admin-icon-button admin-menu-toggle" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation">
            <Menu size={21} />
          </button>
          <div className="admin-topbar-search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search admin pages"
              placeholder="Search pages…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {matchingPages.length > 0 && (
              <div className="admin-search-results" role="listbox" aria-label="Matching admin pages">
                {matchingPages.map(({ label, Icon }) => (
                  <button type="button" role="option" aria-selected="false" key={label} onClick={() => navigate(label)}>
                    <Icon size={16} aria-hidden="true" />{label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="admin-topbar-actions">
            <span className="admin-topbar-date">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <button
              type="button"
              className="admin-icon-button admin-theme-toggle"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <div className="admin-profile-menu">
              <button
                type="button"
                className="admin-profile-trigger"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((open) => !open)}
              >
                <span className="admin-avatar">{avatar}</span>
                <span className="admin-profile-trigger-copy"><strong>{adminUser?.name || 'Administrator'}</strong><small>Administrator</small></span>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {isProfileOpen && (
                <div className="admin-profile-dropdown">
                  <button type="button" onClick={() => navigate('My Profile')}>My Profile</button>
                  <button type="button" onClick={() => navigate('Settings')}>Settings</button>
                  <button type="button" className="admin-logout-action" onClick={onLogout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="admin-portal-content">
          {activePage === 'Dashboard'
            ? <AdminDashboard onNavigate={navigate} />
            : <AdminManagementPage
              page={activePage}
              adminUser={adminUser}
              options={pageOptions}
              onNavigate={navigate}
            />}
        </main>
      </div>
    </div>
  );
}
