import React from 'react';
import { ArrowDown, Compass, Route, Store, UsersRound } from 'lucide-react';
import StorySection from '../components/about/StorySection.jsx';
import storySections from './aboutStory.js';
import '../styles/about-story.css';

const platformFeatures = [
  {
    title: 'Plan trips as a group',
    description: 'Create a shared trip and keep travel plans and decisions together.',
    icon: UsersRound,
  },
  {
    title: 'Organize routes and budgets',
    description: 'Arrange destinations, routes, stays, and group expenses in one itinerary.',
    icon: Route,
  },
  {
    title: 'Discover local experiences',
    description: 'Find village stays, local food, crafts, landscapes, and cultural experiences.',
    icon: Compass,
  },
  {
    title: 'Connect with rural businesses',
    description: 'Explore local hosts, makers, and guides and help their work reach more travellers.',
    icon: Store,
  },
];

export default function About({ onNavigate }) {
  const storyRows = Array.from(
    { length: Math.ceil(storySections.length / 5) },
    (_, rowIndex) => storySections.slice(rowIndex * 5, rowIndex * 5 + 5),
  );

  return (
    <div className="about-story-page">
      <header className="story-intro">
        <p className="story-intro__eyebrow">THE STORY BEHIND TRISAARATHI</p>
        <h1>Every Road Has a Story</h1>
        <p className="story-intro__lead">
          A wrong turn led Arjun to the people and experiences that inspired TriSaarathi.
        </p>
        <a className="story-continue" href="#story-start">
          Continue the journey <ArrowDown size={16} aria-hidden="true" />
        </a>
      </header>

      <section className="story-road" id="story-start" aria-label="How TriSaarathi began">
        {storyRows.map((row, rowIndex) => {
          const firstIndex = rowIndex * 5;
          const isReverse = rowIndex % 2 === 1;

          return (
            <div
              className={`story-road__row${isReverse ? ' story-road__row--reverse' : ''}`}
              key={firstIndex}
            >
              {row.map((section) => (
                <StorySection
                  key={section.label}
                  section={section}
                  index={storySections.indexOf(section)}
                />
              ))}
              {rowIndex === 0 && storyRows.length > 1 && (
                <svg
                  className="story-road__turn"
                  viewBox="0 0 28 52"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    className="story-road__turn-edge"
                    d="M0 0 H18 C22 0 24 2 24 8 V44 C24 50 22 52 18 52 H0"
                  />
                  <path
                    className="story-road__turn-center"
                    d="M0 0 H18 C22 0 24 2 24 8 V44 C24 50 22 52 18 52 H0"
                  />
                  <path
                    className="story-road__turn-marking"
                    d="M0 0 H18 C22 0 24 2 24 8 V44 C24 50 22 52 18 52 H0"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </section>

      <section className="story-purpose" aria-labelledby="story-purpose-title">
        <h2 id="story-purpose-title">Plan together. Discover rural life.</h2>
        <div className="story-purpose__grid">
          {platformFeatures.map(({ title, description, icon: Icon }) => (
            <article className="story-purpose__card" key={title}>
              <span className="story-purpose__icon" aria-hidden="true">
                <Icon size={20} strokeWidth={1.8} />
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

    </div>
  );
}
