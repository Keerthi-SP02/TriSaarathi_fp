import React from 'react';
import { ArrowRight, Sparkles, HeartHandshake, Trees, UtensilsCrossed } from 'lucide-react';

export default function About({ onNavigate }) {
  const pillars = [
    {
      title: 'Villages & Homestays',
      desc: 'Stay with welcoming rural families, support grassroots communities, and wake up to birdsong.',
      accent: 'var(--light-green)',
    },
    {
      title: 'Traditions & Crafts',
      desc: 'Learn ancient pottery, handloom weaving, and tribal arts directly from master rural artisans.',
      accent: 'var(--light-brown)',
    },
    {
      title: 'Local Food & Flavours',
      desc: 'Savor organic farm-to-table meals, seasonal regional recipes, and hearth-cooked heritage dishes.',
      accent: 'var(--peach)',
    },
    {
      title: 'People & Nature',
      desc: 'Connect with barefoot naturalists, oral historians, and gentle trails untouched by mass tourism.',
      accent: 'var(--peach-pink)',
    },
  ];

  return (
    <div className="about-viewport">
      {/* Left Column: Narrative */}
      <div className="about-content">
        <span className="about-kicker">ABOUT TRISAARATHI</span>
        <h1 className="about-heading">Travel Beyond the Usual</h1>
        <p className="about-lead">
          TriSaarathi brings collaborative trip planning and rural tourism discovery together in one place. We guide conscious travellers beyond tourist traps into living landscapes.
        </p>

        {/* 4 Feature blocks highlighting rural elements */}
        <div className="about-pills-grid">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="about-feature-box"
              style={{ '--feature-accent': pillar.accent }}
            >
              <h3 className="about-feature-title">{pillar.title}</h3>
              <p className="about-feature-desc">{pillar.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="btn-primary-journey"
          >
            <span>Explore The Journey</span>
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('how-it-works')}
            className="btn-nav-login"
            style={{ padding: '0.55rem 1.15rem' }}
          >
            How It Works
          </button>
        </div>
      </div>

      {/* Right Column: Authentic Rural Photography with Quote */}
      <div className="about-image-card">
        <img
          src="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1000&q=80"
          alt="Traditional Indian village cottage with terracotta roof, warm courtyard and rural life"
        />
        <div className="about-quote-overlay">
          <p className="about-quote-text">
            “The real journey of discovery consists not in seeking new landscapes, but in having new eyes for the quiet roads.”
          </p>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
            TriSaarathi Rural Guardians · Across 14 Indian States
          </span>
        </div>
      </div>
    </div>
  );
}
