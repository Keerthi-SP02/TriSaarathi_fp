import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Building2, RefreshCw, UsersRound, BriefcaseBusiness, MapPinned } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

const ranges = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '12m', label: 'Last 12 months' },
];

const emptyDashboard = {
  counts: {
    totalUsers: 0,
    businesses: 0,
    pendingVerifications: 0,
    destinations: { value: null, available: false },
    businessPosts: 0,
  },
  registrations: { labels: [], travellers: [], businesses: [] },
  contentActivity: {
    posts: { value: 0, available: true },
    trips: { value: null, available: false },
    reviews: { value: null, available: false },
    experiences: { value: null, available: false },
  },
  businessVerification: { total: 0, approved: 0, pending: 0, rejected: 0, suspended: 0 },
};

function formatLabel(label, range) {
  if (range === '12m') {
    const [year, month] = label.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, { month: 'short' });
  }
  const [, month, day] = label.split('-').map(Number);
  return new Date(Date.UTC(2020, month - 1, day)).toLocaleDateString(undefined, {
    month: range === '7d' ? 'short' : undefined,
    day: 'numeric',
  });
}

function RegistrationChart({ data, range }) {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const width = 640;
  const height = 210;
  const padding = { top: 16, right: 18, bottom: 34, left: 28 };
  const values = [...data.travellers, ...data.businesses];
  const max = Math.max(1, ...values);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const toCoordinates = (series, name, color) => series.map((value, index) => {
    const x = padding.left + (series.length <= 1 ? chartWidth / 2 : (index / (series.length - 1)) * chartWidth);
    const y = padding.top + chartHeight - (value / max) * chartHeight;
    return { x, y, value, label: data.labels[index], name, color, key: `${name}-${data.labels[index]}` };
  });
  const travellers = toCoordinates(data.travellers, 'Travellers', '#c9870c');
  const businesses = toCoordinates(data.businesses, 'Businesses', '#df7138');
  const activePoint = hoveredPoint || selectedPoint;
  const selectPoint = (point) => setSelectedPoint(point);
  const renderPoints = (points) => points.map((point) => (
    <circle
      key={point.key}
      cx={point.x}
      cy={point.y}
      r={activePoint?.key === point.key ? 6 : 4}
      fill={point.color}
      className="admin-chart-point"
      role="button"
      tabIndex="0"
      aria-pressed={selectedPoint?.key === point.key}
      aria-label={`${point.name}, ${formatLabel(point.label, range)}: ${point.value} registrations. Select to keep this value visible.`}
      onMouseEnter={() => setHoveredPoint(point)}
      onMouseLeave={() => setHoveredPoint(null)}
      onFocus={() => setHoveredPoint(point)}
      onBlur={() => setHoveredPoint(null)}
      onClick={() => selectPoint(point)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectPoint(point);
        }
      }}
    >
      <title>{`${point.name}: ${point.value} on ${formatLabel(point.label, range)}. Click to pin.`}</title>
    </circle>
  ));
  const labelStep = Math.max(1, Math.ceil(data.labels.length / 6));

  return (
    <div className="admin-chart-plot">
      <svg className="admin-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Traveller and business registrations over time">
        {[0, 1, 2, 3].map((line) => {
          const y = padding.top + (chartHeight / 3) * line;
          return <line key={line} x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="admin-chart-gridline" />;
        })}
        <polyline points={travellers.map(({ x, y }) => `${x},${y}`).join(' ')} className="admin-chart-line admin-chart-line-travellers" />
        <polyline points={businesses.map(({ x, y }) => `${x},${y}`).join(' ')} className="admin-chart-line admin-chart-line-businesses" />
        {renderPoints(travellers)}
        {renderPoints(businesses)}
        {data.labels.map((label, index) => {
          if (index % labelStep !== 0 && index !== data.labels.length - 1) return null;
          const x = padding.left + (data.labels.length <= 1 ? chartWidth / 2 : (index / (data.labels.length - 1)) * chartWidth);
          return <text key={label} x={x} y={height - 9} textAnchor="middle" className="admin-chart-axis-label">{formatLabel(label, range)}</text>;
        })}
      </svg>
      <div className="admin-chart-legend">
        <span><i className="admin-legend-dot traveller" />Travellers</span>
        <span><i className="admin-legend-dot business" />Businesses</span>
      </div>
      <p className="admin-chart-point-detail" aria-live="polite">
        {activePoint
          ? <><strong>{activePoint.name}</strong><span>{formatLabel(activePoint.label, range)} · {activePoint.value.toLocaleString()} registrations</span></>
          : 'Hover over or select a point to inspect registrations.'}
      </p>
    </div>
  );
}

function ContentActivityChart({ data }) {
  const items = [
    { key: 'posts', label: 'Posts created', tone: 'gold' },
    { key: 'trips', label: 'Trips created', tone: 'orange' },
    { key: 'reviews', label: 'Reviews added', tone: 'green' },
    { key: 'experiences', label: 'Experiences added', tone: 'blue' },
  ];
  const max = Math.max(1, ...items.map(({ key }) => data[key].value ?? 0));

  return (
    <div className="admin-activity-bars">
      {items.map(({ key, label, tone }) => {
        const metric = data[key];
        return (
          <div className="admin-activity-bar-row" key={key}>
            <span>{label}</span>
            {metric.available ? (
              <div className="admin-activity-bar-track" aria-label={`${metric.value} ${label.toLowerCase()}`}>
                <i className={`admin-activity-bar-fill ${tone}`} style={{ width: `${metric.value ? Math.max(3, (metric.value / max) * 100) : 0}%` }} />
              </div>
            ) : <span className="admin-metric-unavailable">Not configured</span>}
            <strong>{metric.available ? metric.value.toLocaleString() : '—'}</strong>
          </div>
        );
      })}
    </div>
  );
}

function VerificationChart({ data }) {
  const slices = [
    { key: 'approved', label: 'Approved', color: '#2f8f60' },
    { key: 'pending', label: 'Pending', color: '#e9a62a' },
    { key: 'rejected', label: 'Rejected', color: '#dc6b58' },
    { key: 'suspended', label: 'Suspended', color: '#78839a' },
  ];
  const total = slices.reduce((sum, slice) => sum + data[slice.key], 0);
  let offset = 0;
  const stops = slices.map((slice) => {
    const start = offset;
    offset += total ? (data[slice.key] / total) * 100 : 0;
    return `${slice.color} ${start}% ${offset}%`;
  });
  const background = total ? `conic-gradient(${stops.join(', ')})` : '#e8e7e2';

  return (
    <div className="admin-verification-chart">
      <div className="admin-donut" style={{ background }} role="img" aria-label={`${total} businesses by verification status`}>
        <div className="admin-donut-center">
          <strong>{data.total.toLocaleString()}</strong>
          <span>Businesses</span>
        </div>
      </div>
      <ul className="admin-verification-legend">
        {slices.map((slice) => (
          <li key={slice.key}>
            <span><i style={{ backgroundColor: slice.color }} />{slice.label}</span>
            <strong>{data[slice.key].toLocaleString()}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminDashboard({ onNavigate }) {
  const [range, setRange] = useState('7d');
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await apiRequest(`/admin/dashboard?range=${range}`);
      setDashboard(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = [
    { label: 'Total users', value: dashboard.counts.totalUsers, Icon: UsersRound, tone: 'gold' },
    { label: 'Registered businesses', value: dashboard.counts.businesses, Icon: Building2, tone: 'green' },
    { label: 'Pending verifications', value: dashboard.counts.pendingVerifications, Icon: RefreshCw, tone: 'orange', action: 'Business Verification' },
    {
      label: 'Rural destinations',
      value: dashboard.counts.destinations.available ? dashboard.counts.destinations.value : null,
      Icon: MapPinned,
      tone: 'blue',
    },
    { label: 'Rural business posts', value: dashboard.counts.businessPosts, Icon: BriefcaseBusiness, tone: 'purple' },
  ];

  return (
    <div className="admin-dashboard-page">
      <header className="admin-welcome-banner">
        <div className="admin-welcome-copy">
          <span className="admin-welcome-eyebrow">TRISAARATHI OVERVIEW</span>
          <h1>Welcome back, Admin!</h1>
          <p>Here's what's happening on TriSaarathi today.</p>
        </div>
        <img
          src="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=85"
          alt="Traditional Indian village cottage with a terracotta roof and a sunlit rural courtyard"
          loading="eager"
          decoding="async"
        />
      </header>

      {error && (
        <div className="admin-dashboard-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadDashboard}>Try again</button>
        </div>
      )}

      <section className="admin-dashboard-stats" aria-label="Platform statistics">
        {stats.map(({ label, value, Icon, tone, action }) => {
          const content = (
            <>
              <span className={`admin-dashboard-stat-icon ${tone}`}><Icon size={19} aria-hidden="true" /></span>
              <span className="admin-dashboard-stat-copy">
                <span>{label}</span>
                <strong>{isLoading || error ? '—' : value === null ? 'Not configured' : value.toLocaleString()}</strong>
              </span>
              {action && <ArrowUpRight className="admin-dashboard-stat-link" size={17} aria-hidden="true" />}
            </>
          );
          return action ? (
            <button
              type="button"
              className="admin-dashboard-stat admin-dashboard-stat-button"
              key={label}
              onClick={() => onNavigate(action, { status: 'pending' })}
              aria-label={`${label}: ${value}. Open pending verifications`}
            >{content}</button>
          ) : (
            <article className="admin-dashboard-stat" key={label}>{content}</article>
          );
        })}
      </section>

      <section className="admin-platform-activity" aria-labelledby="admin-activity-title">
        <div className="admin-activity-heading">
          <div>
            <span>PLATFORM PULSE</span>
            <h2 id="admin-activity-title">Platform Activity</h2>
          </div>
          <label className="admin-range-select">
            <span className="sr-only">Registration date range</span>
            <select value={range} onChange={(event) => setRange(event.target.value)}>
              {ranges.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div className="admin-activity-grid">
          <article className="admin-activity-card admin-activity-card-registrations">
            <div className="admin-activity-card-heading">
              <div><h3>New Registrations</h3><p>Traveller and business accounts</p></div>
            </div>
            {isLoading ? <p className="admin-chart-state" role="status">Loading registration activity…</p> : error ? (
              <p className="admin-chart-state" role="status">Registration activity is unavailable until the dashboard API responds.</p>
            ) : (
              <RegistrationChart data={dashboard.registrations} range={range} />
            )}
          </article>

          <article className="admin-activity-card">
            <div className="admin-activity-card-heading">
              <div><h3>Platform Content Activity</h3><p>Records from connected services</p></div>
            </div>
            {isLoading ? <p className="admin-chart-state" role="status">Loading content activity…</p> : error ? (
              <p className="admin-chart-state" role="status">Content activity is unavailable until the dashboard API responds.</p>
            ) : (
              <ContentActivityChart data={dashboard.contentActivity} />
            )}
          </article>

          <article className="admin-activity-card">
            <div className="admin-activity-card-heading">
              <div><h3>Business Verification</h3><p>Current account status</p></div>
            </div>
            {isLoading ? <p className="admin-chart-state" role="status">Loading business verification…</p> : error ? (
              <p className="admin-chart-state" role="status">Verification data is unavailable until the dashboard API responds.</p>
            ) : (
              <VerificationChart data={dashboard.businessVerification} />
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
