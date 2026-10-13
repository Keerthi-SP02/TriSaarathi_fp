import React, { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

export default function Login({ onNavigate, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loggedInNotice, setLoggedInNotice] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const { user } = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setLoggedInNotice(true);
      onLogin(user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-viewport">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">
            Sign in to continue planning and guiding rural journeys
          </p>
        </div>

        {loggedInNotice ? (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--light-green-soft)',
              color: 'var(--light-green)',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            ✓ Welcome to TriSaarathi! Opening your dashboard...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--light-blue)', cursor: 'pointer' }}>
                  Forgot?
                </span>
              </div>
              <div className="login-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-visibility-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && <p role="alert" style={{ color: 'var(--peach)', fontSize: '0.82rem' }}>{error}</p>}

            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}>
                <LogIn size={15} />
                <span>{isSubmitting ? 'Signing in...' : 'Login'}</span>
              </span>
            </button>
          </form>
        )}

        <div className="auth-switch-prompt">
          <span>Don't have an account?</span>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="auth-switch-link"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
