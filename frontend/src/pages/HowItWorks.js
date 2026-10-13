import React from 'react';
import {
  Compass,
  UserPlus,
  Map,
  Coins,
  TentTree,
  ArrowRight,
} from 'lucide-react';

export default function HowItWorks({ onNavigate }) {
  const steps = [
    {
      num: '01',
      name: 'Create Your Trip',
      desc: 'Set your dates, travel pace, and choose whether you want mountain, river valley, or agricultural trails.',
      icon: <Compass size={18} />,
      accent: 'var(--light-blue)',
      soft: 'var(--light-blue-soft)',
    },
    {
      num: '02',
      name: 'Invite Your People',
      desc: 'Bring friends, family, or fellow explorers into a shared planning room with real-time consensus.',
      icon: <UserPlus size={18} />,
      accent: 'var(--light-green)',
      soft: 'var(--light-green-soft)',
    },
    {
      num: '03',
      name: 'Plan Destinations',
      desc: 'Pin heritage routes, quiet village homestays, and scenic pit stops along your day-wise itinerary.',
      icon: <Map size={18} />,
      accent: 'var(--peach)',
      soft: 'var(--peach-soft)',
    },
    {
      num: '04',
      name: 'Manage Budget',
      desc: 'Keep transport, food, and homestay costs clear with transparent split-expense tracking for all.',
      icon: <Coins size={18} />,
      accent: 'var(--light-brown)',
      soft: 'var(--light-brown-soft)',
    },
    {
      num: '05',
      name: 'Discover Rural Experiences',
      desc: 'Unlock authentic pottery workshops, harvest lunches, and oral heritage guided by village elders.',
      icon: <TentTree size={18} />,
      accent: 'var(--peach-pink)',
      soft: 'var(--peach-pink-soft)',
    },
  ];

  return (
    <div className="how-viewport">
      <div className="how-header">
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--light-blue)',
            display: 'block',
            marginBottom: '0.2rem',
          }}
        >
          FIVE STEPS TO MINDFUL TRAVEL
        </span>
        <h1 className="how-title">How TriSaarathi Works</h1>
        <p className="how-subtitle">
          From the first idea to village doorsteps, our collaborative workflow keeps group travel effortless, grounded, and rich with authentic memories.
        </p>
      </div>

      <div className="steps-container">
        {steps.map((step) => (
          <div
            key={step.num}
            className="step-card"
            style={{
              '--step-accent': step.accent,
              '--step-soft': step.soft,
            }}
          >
            <div className="step-number">
              <span>{step.num}</span>
              <div className="step-icon-wrap" aria-hidden="true">
                {step.icon}
              </div>
            </div>
            <h3 className="step-name">{step.name}</h3>
            <p className="step-desc">{step.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={() => onNavigate('register')}
          className="btn-primary-journey"
        >
          <span>Start Your First Trip</span>
          <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="btn-nav-login"
        >
          Back to Overview
        </button>
      </div>
    </div>
  );
}
