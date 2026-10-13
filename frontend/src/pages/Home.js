import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function Home({ onNavigate }) {
  return (
    <div className="home-viewport">
      {/* 1. LARGE HORIZONTAL HERO IMAGE & BRANDING */}
      <section className="hero-card" aria-label="TriSaarathi Hero">
        <img
          src="/images/Landing_Page.webp"
          alt="Scenic rural countryside with lush hills, winding village path and morning sunlight"
          className="hero-bg-img"
          fetchPriority="high"
          decoding="async"
          width="1774"
          height="887"
        />

        {/* Gradient overlay for high legibility on the left while preserving landscape on the right */}
        <div className="hero-overlay" aria-hidden="true" />

        {/* Left-aligned hero content */}
        <div className="hero-content">
          <div className="hero-kicker">
            <span style={{ width: 14, height: 2, backgroundColor: 'var(--peach)', display: 'inline-block' }} />
            <span>Rural Discovery & Collaborative Journeys</span>
          </div>

          <h1 className="hero-brand">TriSaarathi</h1>

          <div className="hero-tagline">
            Every Road Has a Story.{' '}
            <span className="hero-tagline-highlight">Let Us Guide You Back to It.</span>
          </div>

          <p className="hero-description">
            Plan unforgettable journeys together and discover the villages, traditions, flavors, people and experiences hidden along the way.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="btn-primary-journey"
            >
              <span>Plan Your Journey</span>
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="btn-secondary-rural"
            >
              Explore Rural Experiences
            </button>
          </div>
        </div>
      </section>

      <section className="journey-overview" aria-label="Explore TriSaarathi">
        <div className="journey-overview-heading">
          <span className="services-label">MADE FOR MEANINGFUL JOURNEYS</span>
          <h2>Plan together. Travel deeper. Grow local.</h2>
          <p>
            Everything you need to make a trip memorable—and help the people and places you visit thrive.
          </p>
        </div>

        <div className="journey-overview-list">
          <article className="journey-overview-item">
            <span className="journey-overview-number">01</span>
            <div>
              <h3>Bring the whole trip together</h3>
              <p>
                Build shared itineraries, map routes, coordinate with your group, and keep budgets and travel details in one place.
              </p>
            </div>
          </article>
          <article className="journey-overview-item">
            <span className="journey-overview-number">02</span>
            <div>
              <h3>Find the stories beyond the usual route</h3>
              <p>
                Discover village stays, local food, crafts, festivals, landscapes, and experiences rooted in the places you explore.
              </p>
            </div>
          </article>
          <article className="journey-overview-item journey-overview-item--business">
            <span className="journey-overview-number">03</span>
            <div>
              <h3>Give rural businesses room to shine</h3>
              <p>
                Help local hosts, makers, and guides reach more travellers and share the experiences that make their communities special.
              </p>
              <button
                type="button"
                className="journey-business-link"
                onClick={() => onNavigate('register')}
              >
                Join as a rural business <ArrowRight size={15} />
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
