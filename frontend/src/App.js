import React, { lazy, Suspense, useState, useEffect } from 'react';
import Navbar from './components/Navbar.js';
import Home from './pages/Home.js';
import { apiRequest } from './lib/api.js';

const About = lazy(() => import('./pages/About.js'));
const HowItWorks = lazy(() => import('./pages/HowItWorks.js'));
const Contact = lazy(() => import('./pages/Contact.js'));
const Login = lazy(() => import('./pages/Login.js'));
const Register = lazy(() => import('./pages/Register.js'));
const AdminPortal = lazy(() => import('./pages/AdminPortal.js'));
const TravellerDashboard = lazy(() => import('./pages/TravellerDashboard.js'));
const BusinessDashboard = lazy(() => import('./pages/BusinessDashboard.js'));

let sessionRestoreRequest;

function dashboardFor(user) {
  if (user?.role === 'Admin') return 'admin';
  if (user?.role === 'Business') return 'business';
  return 'traveller';
}

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('trisaarathi-theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('trisaarathi-theme', theme);
  }, [theme]);

  useEffect(() => {
    let isMounted = true;
    sessionRestoreRequest ??= apiRequest('/auth/me');
    sessionRestoreRequest
      .then(({ user }) => {
        if (isMounted) {
          if (user) {
            setAuthenticatedUser(user);
            setCurrentView(dashboardFor(user));
          }
        }
      })
      .catch((error) => {
        if (isMounted && error.status !== 401) setAuthError(error.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleNavigate = (view) => {
    const dashboardViews = ['traveller', 'business', 'admin'];
    if (dashboardViews.includes(view)) {
      if (!authenticatedUser) {
        view = 'login';
      } else if (view !== dashboardFor(authenticatedUser)) {
        view = dashboardFor(authenticatedUser);
      }
    }
    if (view === currentView || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentView(view);
      setIsTransitioning(false);
    }, 120);
  };

  const handleLogin = (user) => {
    setAuthenticatedUser(user);
    setAuthError('');
    const nextView = dashboardFor(user);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentView(nextView);
      setIsTransitioning(false);
    }, 120);
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
      setAuthenticatedUser(null);
      setAuthError('');
      handleNavigate('home');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <Home onNavigate={handleNavigate} />;
      case 'about':
        return <About onNavigate={handleNavigate} />;
      case 'how-it-works':
        return <HowItWorks onNavigate={handleNavigate} />;
      case 'contact':
        return <Contact onNavigate={handleNavigate} />;
      case 'login':
        return <Login onNavigate={handleNavigate} onLogin={handleLogin} />;
      case 'register':
        return <Register onNavigate={handleNavigate} />;
      case 'admin':
        return authenticatedUser?.role === 'Admin'
          ? <AdminPortal adminUser={authenticatedUser} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
          : <Home onNavigate={handleNavigate} />;
      case 'traveller':
        return authenticatedUser?.role === 'Traveller'
          ? <TravellerDashboard user={authenticatedUser} onUserUpdate={setAuthenticatedUser} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
          : <Home onNavigate={handleNavigate} />;
      case 'business':
        return authenticatedUser?.role === 'Business'
          ? <BusinessDashboard user={authenticatedUser} onUserUpdate={setAuthenticatedUser} onLogout={handleLogout} onNavigate={handleNavigate} theme={theme} onToggleTheme={toggleTheme} />
          : <Home onNavigate={handleNavigate} />;
      default:
        return <Home onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="app-container" data-theme={theme}>
      {!['traveller', 'business', 'admin'].includes(currentView) && (
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          theme={theme}
          onToggleTheme={toggleTheme}
          authenticatedUser={authenticatedUser}
          onLogout={handleLogout}
        />
      )}

      {/* Single Page Application View Container (Cross-fades smoothly inside same viewport) */}
      <main className="app-main" id="main-content">
        {authError && <p className="app-auth-error" role="alert">{authError}</p>}
        <div
          className={`view-container ${isTransitioning ? 'fade-out' : 'fade-in'}`}
          key={currentView}
        >
          <Suspense fallback={<div className="view-loading" role="status">Loading page...</div>}>
            {renderCurrentView()}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
