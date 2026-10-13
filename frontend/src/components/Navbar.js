import React from 'react';
import Logo from './Logo.js';
import { Sun, Moon } from 'lucide-react';

export default function Navbar({
  currentView,
  onNavigate,
  theme,
  onToggleTheme,
  authenticatedUser,
  onLogout,
}) {
  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <header className="navbar">
      {/* LEFT: TriSaarathi Logo & Brand Name */}
      <div
        className="nav-left"
        onClick={() => onNavigate('home')}
        title="TriSaarathi - Home"
      >
        <Logo size={36} showText={true} />
      </div>

      {/* CENTER: Navigation Links */}
      <nav aria-label="Main Navigation">
        <ul className="nav-links">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* RIGHT: Theme Toggle and account actions */}
      <div className="nav-right">
        {/* Light / Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="theme-toggle-btn"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun size={17} style={{ color: '#fbd38d' }} />
          ) : (
            <Moon size={17} style={{ color: '#4a5568' }} />
          )}
        </button>

        {authenticatedUser ? (
          <>
            <button
              type="button"
              onClick={() => onNavigate(
                authenticatedUser.role === 'Admin'
                  ? 'admin'
                  : authenticatedUser.role === 'Business'
                    ? 'business'
                    : 'traveller'
              )}
              className="btn-nav-login"
              aria-current={['admin', 'business', 'traveller'].includes(currentView) ? 'page' : undefined}
            >
              Dashboard
            </button>
            <button type="button" onClick={onLogout} className="btn-nav-login">
              Log out
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="btn-nav-login"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="btn-nav-register"
            >
              Register
            </button>
          </>
        )}
      </div>
    </header>
  );
}
