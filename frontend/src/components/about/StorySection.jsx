import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

export default function StorySection({ section, index }) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const number = String(index + 1).padStart(2, '0');

  return (
    <article
      className="story-section"
      aria-labelledby={`story-title-${number}`}
    >
      <span className="story-section__marker" aria-hidden="true">{number}</span>
      <figure className="story-section__visual">
        <div className="story-section__media">
          {imageUnavailable ? (
            <div className="story-image-fallback" role="img" aria-label={section.imageAlt}>
              <MapPin size={28} aria-hidden="true" />
              <span>Village story</span>
            </div>
          ) : (
            <img
              src={section.image}
              alt={section.imageAlt}
              width={section.width}
              height={section.height}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding="async"
              onError={() => setImageUnavailable(true)}
            />
          )}
        </div>
        <figcaption className="story-section__caption">
          <span>TriSaarathi · {section.label.toLowerCase()}</span>
        </figcaption>
      </figure>

      <div className="story-section__copy">
        <p className="story-section__eyebrow">{section.label}</p>
        <h2 id={`story-title-${number}`}>{section.title}</h2>
        {section.paragraphs.map((paragraph) => (
          <p className="story-section__paragraph" key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
