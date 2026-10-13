import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';

export default function Register({ onNavigate }) {
  const [role, setRole] = useState('Traveller');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    employeeId: '',
    password: '',
    confirmPassword: '',
  });
  const [registeredNotice, setRegisteredNotice] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles = [
    {
      id: 'Traveller',
      label: 'Traveller',
      desc: 'Plan group trips & discover rural India',
      Icon: UsersRound,
    },
    {
      id: 'Business',
      label: 'Rural Business / Host',
      desc: 'Homestays, village crafts & tours',
      Icon: Building2,
    },
    {
      id: 'Admin',
      label: 'Admin',
      desc: 'Manage users, businesses & platform activities',
      Icon: ShieldCheck,
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (role === 'Admin' && !/^[A-Z]{2}\d{4}$/.test(formData.employeeId)) {
      setError('Employee ID must contain two uppercase letters followed by four digits (for example, AB1234).');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role,
          ...(role === 'Business' && { businessName: formData.businessName }),
          ...(role === 'Admin' && { employeeId: formData.employeeId }),
        }),
      });
      setRegisteredNotice(true);
      if (role !== 'Admin') setTimeout(() => onNavigate('home'), 1500);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-viewport register-viewport">
      <div className="auth-card register-card">
        <div className="auth-header register-header">
          <span className="register-header-eyebrow">YOUR JOURNEY STARTS HERE</span>
          <h1 className="auth-title">Join TriSaarathi</h1>
          <p className="auth-subtitle">
            Start your journey through India's living villages and quiet roads
          </p>
        </div>

        {registeredNotice ? (
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
            ✓ {role === 'Business'
              ? 'Your host account is registered and awaiting administrator approval.'
              : role === 'Admin'
                ? 'Your Admin account is active. You can now log in.'
                : `Welcome aboard as a ${role}!`}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="register-form">
            <fieldset className="register-role-group">
              <legend className="form-label">Choose your account type</legend>
              <div className="register-role-selector">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`register-profile-card ${role === r.id ? 'is-selected' : ''}`}
                    data-role={r.id.toLowerCase()}
                    aria-pressed={role === r.id}
                  >
                    <span className="register-profile-icon"><r.Icon size={21} strokeWidth={1.8} /></span>
                    <span className="register-profile-copy">
                      <span className="register-profile-title">{r.label}</span>
                      <span className="register-profile-description">{r.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {role === 'Admin' && (
              <p className="register-admin-note">
                Use your unique Employee ID: two uppercase letters followed by four digits (for example, AB1234).
              </p>
            )}

            <div className="form-group">
              <label htmlFor="reg-name" className="form-label">Full Name</label>
              <div className="register-input-wrap">
                <UserRound className="register-input-icon" size={17} aria-hidden="true" />
                <input
                  id="reg-name"
                  type="text"
                  className="form-input register-input"
                  placeholder={role === 'Business' ? 'Keshava Naidu' : 'Arjun Reddy'}
                  autoComplete="name"
                  maxLength={100}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">Email Address</label>
              <div className="register-input-wrap">
                <Mail className="register-input-icon" size={17} aria-hidden="true" />
                <input
                  id="reg-email"
                  type="email"
                  className="form-input register-input"
                  placeholder="your.email@example.com"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {role === 'Business' && (
              <div className="form-group">
                <label htmlFor="reg-business-name" className="form-label">Village / Homestay / Craft Name</label>
                <div className="register-input-wrap">
                  <Building2 className="register-input-icon" size={17} aria-hidden="true" />
                  <input
                    id="reg-business-name"
                    type="text"
                    className="form-input register-input"
                    placeholder="e.g. Subbamma Gari Heritage Illu (Konaseema)"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {role === 'Admin' && (
              <div className="form-group">
                <label htmlFor="reg-employee-id" className="form-label">Employee ID</label>
                <div className="register-input-wrap">
                  <Building2 className="register-input-icon" size={17} aria-hidden="true" />
                  <input
                    id="reg-employee-id"
                    type="text"
                    className="form-input register-input"
                    placeholder="AB1234"
                    autoComplete="off"
                    maxLength={6}
                    pattern="[A-Z]{2}[0-9]{4}"
                    value={formData.employeeId}
                    onChange={(event) => setFormData({
                      ...formData,
                      employeeId: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6),
                    })}
                    required
                  />
                </div>
              </div>
            )}

            <div className="register-password-grid">
              <div className="form-group">
                <label htmlFor="reg-pass" className="form-label">Password</label>
                <div className="register-input-wrap register-password-wrap">
                  <LockKeyhole className="register-input-icon" size={17} aria-hidden="true" />
                  <input
                    id="reg-pass"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input register-input"
                    placeholder="Create a secure password"
                    autoComplete="new-password"
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

              <div className="form-group">
                <label htmlFor="reg-confirm" className="form-label">Confirm Password</label>
                <div className="register-input-wrap register-password-wrap">
                  <LockKeyhole className="register-input-icon" size={17} aria-hidden="true" />
                  <input
                    id="reg-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input register-input"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    minLength={8}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="password-visibility-toggle"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            </div>

            {role !== 'Admin' && <div className="register-privacy-note">
              <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>We never sell data. 100% of host inquiries go directly to local families.</span>
            </div>}

            {error && <p role="alert" className="register-error">{error}</p>}

            <button type="submit" className="auth-submit-btn register-submit" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Creating account...' : role === 'Admin' ? 'Register as Admin' : `Join TriSaarathi as ${role === 'Business' ? 'Business / Host' : 'Traveller'}`}</span>
              <span className="register-submit-icon" aria-hidden="true">
                {isSubmitting ? null : <ArrowRight size={18} />}
              </span>
            </button>
          </form>
        )}

        <div className="auth-switch-prompt">
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="auth-switch-link"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
