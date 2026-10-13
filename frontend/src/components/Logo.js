import React from 'react';

export default function Logo({ size = 38, showText = true, className = '' }) {
  return (
    <div className={`logo-container ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
        aria-label="TriSaarathi Logo"
      >
        {/* Soft circular badge background with subtle ring */}
        <circle cx="32" cy="32" r="30" fill="url(#logoBgGrad)" stroke="var(--border)" strokeWidth="1.5" />
        
        {/* Rising sun / dawn over the rural horizon in peach */}
        <circle cx="32" cy="24" r="11" fill="url(#sunGrad)" />

        {/* Back rolling hills in soft green */}
        <path
          d="M6 44C14 36 24 33 34 38C44 42 52 37 58 43V58H6V44Z"
          fill="var(--light-green)"
          opacity="0.8"
        />

        {/* Front rolling hill */}
        <path
          d="M6 48C16 42 28 44 40 46C49 48 54 45 58 50V58H6V48Z"
          fill="var(--light-green)"
        />

        {/* Small village tree on the ridge */}
        <circle cx="17" cy="38" r="4.5" fill="#14532d" />
        <rect x="16.2" y="41" width="1.6" height="4" fill="#5c3a21" />

        {/* Winding rural earthen road guiding forward */}
        <path
          d="M26 58C28 50 34 47 33 43C32.5 41 33.5 39 34 38C34.5 39 35.5 41 35 43C34 47 40 50 42 58H26Z"
          fill="url(#roadGrad)"
        />

        {/* Dashed center path marker */}
        <path
          d="M34 42L33.5 47M34 51L34 56"
          stroke="#fffaf0"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="2 3"
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="logoBgGrad" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--surface-alt)" />
            <stop offset="1" stopColor="var(--surface)" />
          </linearGradient>
          <linearGradient id="sunGrad" x1="32" y1="13" x2="32" y2="35" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--peach)" />
            <stop offset="1" stopColor="var(--peach)" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="roadGrad" x1="34" y1="38" x2="34" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8d5b3d" />
            <stop offset="1" stopColor="#5c3a21" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <span className="brand-title">
          TriSaarathi
          <span className="brand-dot" aria-hidden="true"></span>
        </span>
      )}
    </div>
  );
}
