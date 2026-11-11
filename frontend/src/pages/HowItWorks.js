import React from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  Compass,
  Heart,
  ImagePlus,
  MapPin,
  MessageCircle,
  UserRoundPlus,
  UsersRound,
  Wallet,
} from 'lucide-react';
import Button from '../components/Button.js';
import '../styles/how-it-works.css';

const journeys = [
  {
    id: 'travellers',
    eyebrow: 'FOR TRAVELLERS',
    title: 'Find your next rural experience',
    description: 'Plan, organize, and share a journey with friends while discovering rural places.',
    steps: [
      {
        title: 'Create a traveller account',
        description: 'Register to open your traveller dashboard.',
        Icon: UserRoundPlus,
      },
      {
        title: 'Plan a trip',
        description: 'Start a trip and organize its dates and travel details.',
        Icon: Compass,
      },
      {
        title: 'Discover destinations',
        description: 'Browse places and find local stays, food, crafts, and experiences.',
        Icon: MapPin,
      },
      {
        title: 'Add and split your budget',
        description: 'Keep trip costs and shared expenses organized.',
        Icon: Wallet,
      },
      {
        title: 'Plan with your friends',
        description: 'Invite friends and coordinate your plans together.',
        Icon: UsersRound,
      },
      {
        title: 'Manage your trips',
        description: 'Keep track of your planned and upcoming journeys.',
        Icon: CalendarDays,
      },
      {
        title: 'Save your memories',
        description: 'Keep photos and moments from your journeys together.',
        Icon: Heart,
      },
      {
        title: 'Create travel stories',
        description: 'Turn your itinerary and trip memories into a story when available.',
        Icon: BookOpen,
      },
    ],
  },
  {
    id: 'businesses',
    eyebrow: 'FOR RURAL BUSINESSES',
    title: 'Share your work with more travellers',
    description: 'Create a presence for your business and connect with visitors interested in your community.',
    steps: [
      {
        title: 'Apply to join',
        description: 'Register as a business and submit your details for review.',
        Icon: UserRoundPlus,
      },
      {
        title: 'Set up your profile',
        description: 'Add your business information, location, and the experiences you offer.',
        Icon: Building2,
      },
      {
        title: 'Share a post',
        description: 'Publish updates, photos, and videos about your products or local experiences.',
        Icon: ImagePlus,
      },
      {
        title: 'Connect with visitors',
        description: 'Manage traveller inquiries and keep up with feedback on your business.',
        Icon: BadgeCheck,
      },
    ],
  },
];

function JourneyRoad({ journey }) {
  return (
    <section className={`how-journey how-journey--${journey.id}`} aria-labelledby={`${journey.id}-title`}>
      <header className="how-journey__header">
        <p className="how-journey__eyebrow">{journey.eyebrow}</p>
        <h2 id={`${journey.id}-title`}>{journey.title}</h2>
        <p>{journey.description}</p>
      </header>

      <ol className="how-journey__steps">
        {journey.steps.map(({ title, description, Icon }, index) => (
          <li
            className={`how-step${journey.id === 'travellers' ? ' how-step--traveller' : ''}`}
            key={title}
          >
            <span className="how-step__icon" aria-hidden="true">
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <div className="how-step__heading">
              <span className="how-step__number">STEP {String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
            </div>
            <p>{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function HowItWorks({ onNavigate }) {
  return (
    <main className="how-it-works">
      <header className="how-it-works__intro">
        <p className="how-it-works__eyebrow">YOUR JOURNEY STARTS HERE</p>
        <h1>How TriSaarathi Works</h1>
        <p>Whether you are planning a visit or welcoming one, there is a simple way to get started.</p>
      </header>

      <div className="how-it-works__journeys">
        {journeys.map((journey) => <JourneyRoad key={journey.id} journey={journey} />)}
      </div>

      <footer className="how-it-works__actions">
        <Button
          onClick={() => onNavigate('register')}
          variant="primary"
          icon={<ArrowRight size={14} />}
        >
          Get Started
        </Button>
        <button type="button" onClick={() => onNavigate('home')} className="btn-nav-login">
          Back to Overview
        </button>
      </footer>
    </main>
  );
}
