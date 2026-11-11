import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  onClick,
  type = 'button',
  className = '',
  icon = null,
  disabled = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`app-btn app-btn--${variant} ${className}`.trim()}
    >
      <span className="app-btn__label">{children}</span>
      {icon && <span className="app-btn__icon" aria-hidden="true">{icon}</span>}
    </button>
  );
}
