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
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--peach)',
          color: '#ffffff',
          border: '1.5px solid var(--peach)',
          boxShadow: '0 3px 10px rgba(240, 127, 101, 0.25)',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--skyblue-soft)',
          color: 'var(--skyblue)',
          border: '1.5px solid var(--skyblue)',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--skyblue)',
          border: '1.5px solid var(--skyblue)',
        };
      case 'hero-secondary':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.16)',
          color: '#ffffff',
          border: '1.5px solid rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(8px)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-muted)',
          border: '1.5px solid transparent',
        };
      default:
        return {};
    }
  };

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    padding: '0.52rem 1.2rem',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
    textDecoration: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.25,
    position: 'relative',
    overflow: 'hidden',
    ...getVariantStyles(),
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`app-btn btn-${variant} ${className}`}
      style={baseStyle}
    >
      <span>{children}</span>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
    </button>
  );
}
