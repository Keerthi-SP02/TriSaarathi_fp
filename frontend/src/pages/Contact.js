import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

export default function Contact({ onNavigate }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await apiRequest('/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-viewport">
      {/* Left side: Information and Rural Travel Desk */}
      <div className="contact-info">
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--peach)',
          }}
        >
          COMMUNITY & HOST CONNECTIONS
        </span>
        <h1 className="contact-title">Have a Journey in Mind?</h1>
        <p className="contact-desc">
          Whether you want to curate a village trail for your travel group, list an authentic rural homestay, or collaborate as a local heritage craft artisan, we would love to hear from you.
        </p>

        <div className="contact-meta-list">
          <div className="contact-meta-item">
            <div className="contact-meta-icon">
              <Mail size={16} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Direct Rural Support Desk
              </strong>
              <span>journeys@trisaarathi.org</span>
            </div>
          </div>

          <div className="contact-meta-item">
            <div className="contact-meta-icon">
              <MapPin size={16} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Field Coordinators Hub
              </strong>
              <span>Rural Tourism Collective · Across Himachal, Uttarakhand, Karnataka & Kerala</span>
            </div>
          </div>

          <div className="contact-meta-item">
            <div className="contact-meta-icon">
              <Phone size={16} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Community Toll-free
              </strong>
              <span>+91 1800 244 8742 (9 AM - 6 PM IST)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Contact Form */}
      <div className="contact-form-card">
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <CheckCircle2
              size={48}
              style={{ color: 'var(--light-green)', margin: '0 auto 0.75rem auto' }}
            />
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-serif)', marginBottom: '0.4rem' }}>
              Message Received, Fellow Traveller!
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Our rural trail coordinator will reach out to <strong>{formData.email}</strong> within 24 hours.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setFormData({ name: '', email: '', message: '' });
              }}
              className="btn-primary-journey"
              style={{ margin: '0 auto' }}
            >
              Send Another Note
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group">
              <label htmlFor="contact-name" className="form-label">
                Your Full Name
              </label>
              <input
                id="contact-name"
                type="text"
                className="form-input"
                placeholder="e.g. Keerthi Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="contact-email" className="form-label">
                Email Address
              </label>
              <input
                id="contact-email"
                type="email"
                className="form-input"
                placeholder="e.g. keerthi@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="contact-message" className="form-label">
                Tell Us About Your Journey
              </label>
              <textarea
                id="contact-message"
                className="form-textarea"
                rows={3}
                maxLength={5000}
                placeholder="Share your planned destinations, group size, or community inquiry..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
            </div>

            {error && <p role="alert" style={{ color: 'var(--peach)', fontSize: '0.82rem' }}>{error}</p>}

            <button type="submit" className="btn-send-message" disabled={isSubmitting}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                <Send size={14} />
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
