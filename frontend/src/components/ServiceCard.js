import React from 'react';

export default function ServiceCard({
  title,
  description,
  image,
  icon,
  accentColor = '#2c7da0',
  accentBg = '#eaf3f8',
  onClick,
}) {
  return (
    <div
      className="service-card"
      onClick={onClick}
      style={{
        '--card-accent': accentColor,
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Top Image */}
      <div className="card-image-wrapper">
        <img
          src={image}
          alt={title}
          className="card-img"
          loading="lazy"
        />
        {/* Floating icon overlapping bottom of image */}
        <div
          className="card-icon-badge"
          style={{
            backgroundColor: accentColor,
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      {/* Card Content */}
      <div className="card-body">
        <div>
          <h3 className="card-title">{title}</h3>
          <p className="card-description">{description}</p>
        </div>
      </div>

      {/* Subtle bottom accent line */}
      <div className="card-accent-bar" aria-hidden="true" />
    </div>
  );
}
