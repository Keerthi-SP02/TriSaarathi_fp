import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, MapPin, RefreshCw, Search } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import tourismListings from '../../../backend/data/andhraPradeshTourism.json';

function ExperienceCard({ experience }) {
  return (
    <article className="admin-destination-card admin-experience-card">
      {experience.imageUrl ? (
        <img
          className="admin-destination-image"
          src={experience.imageUrl}
          alt={`Photo for ${experience.title}`}
          loading="lazy"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      ) : <div className="admin-destination-image-fallback"><MapPin size={28} aria-hidden="true" /></div>}
      <div className="admin-destination-card-body">
        <span className="admin-destination-category">{experience.category || 'Rural experience'}</span>
        <h3>{experience.title}</h3>
        <p className="admin-destination-location"><MapPin size={14} aria-hidden="true" />{experience.region || experience.business?.region || 'Andhra Pradesh'}</p>
        <p className="admin-destination-description">{experience.description}</p>
        <p className="admin-destination-owner">Hosted by {experience.business?.name || 'Approved rural business'}</p>
      </div>
    </article>
  );
}

export default function AdminDestinationsPage() {
  const [experiences, setExperiences] = useState([]);
  const [experienceTotal, setExperienceTotal] = useState(0);
  const [experiencePage, setExperiencePage] = useState(1);
  const [isLoadingExperiences, setIsLoadingExperiences] = useState(true);
  const [experienceError, setExperienceError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All destinations');

  const loadExperiences = useCallback(async (page = 1, append = false) => {
    setIsLoadingExperiences(true);
    setExperienceError('');
    try {
      const result = await apiRequest(`/destinations?page=${page}&limit=20`);
      setExperiences((current) => append ? [...current, ...result.destinations] : result.destinations);
      setExperienceTotal(result.total);
      setExperiencePage(result.page);
    } catch (requestError) {
      setExperienceError(requestError.message);
    } finally {
      setIsLoadingExperiences(false);
    }
  }, []);

  useEffect(() => {
    loadExperiences();
  }, [loadExperiences]);

  const categories = useMemo(
    () => ['All destinations', ...new Set(tourismListings.map((listing) => listing.category))],
    []
  );
  const filteredListings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tourismListings.filter((listing) => {
      const matchesCategory = category === 'All destinations' || listing.category === category;
      const matchesTerm = !term || [listing.name, listing.location, listing.category, listing.description]
        .some((value) => value.toLowerCase().includes(term));
      return matchesCategory && matchesTerm;
    });
  }, [category, search]);

  return (
    <section className="admin-management-page admin-destinations-page">
      <header className="admin-management-heading">
        <p>ADMINISTRATION</p>
        <h1>Rural Destinations &amp; Experiences</h1>
        <span>Explore Andhra Pradesh highlights and published experiences from approved rural businesses.</span>
      </header>

      <div className="admin-destination-toolbar">
        <label className="admin-destination-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search destinations"
            aria-label="Search destinations"
          />
        </label>
        <label className="admin-destination-filter">
          <span className="sr-only">Filter by category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <section className="admin-destination-section" aria-labelledby="admin-destination-catalog-heading">
        <div className="admin-destination-section-heading">
          <div>
            <h2 id="admin-destination-catalog-heading">Andhra Pradesh highlights</h2>
            <p>{filteredListings.length} destinations in the curated guide</p>
          </div>
        </div>
        {filteredListings.length ? (
          <div className="admin-destination-grid">
            {filteredListings.map((listing) => (
              <article className="admin-destination-card" key={listing.slug}>
                <img
                  className="admin-destination-image"
                  src={listing.imageUrl}
                  alt={listing.imageAlt}
                  loading="lazy"
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                />
                <div className="admin-destination-card-body">
                  <span className="admin-destination-category">{listing.category}</span>
                  <h3>{listing.name}</h3>
                  <p className="admin-destination-location"><MapPin size={14} aria-hidden="true" />{listing.location}</p>
                  <p className="admin-destination-description">{listing.description}</p>
                  <div className="admin-destination-attribution">
                    <a href={listing.sourceUrl} target="_blank" rel="noreferrer">
                      Guide: {listing.sourceName}<ExternalLink size={13} aria-hidden="true" />
                    </a>
                    <a href={listing.imageSourceUrl} target="_blank" rel="noreferrer">
                      Photo: {listing.imageAuthor} · {listing.imageLicense}<ExternalLink size={13} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="admin-management-empty">No destinations match this search.</p>}
      </section>

      <section className="admin-destination-section" aria-labelledby="admin-experiences-heading">
        <div className="admin-destination-section-heading">
          <div>
            <h2 id="admin-experiences-heading">Published rural experiences</h2>
            <p>{experienceTotal} experiences shared by approved businesses</p>
          </div>
          <button
            type="button"
            className="admin-management-secondary"
            onClick={() => loadExperiences()}
            disabled={isLoadingExperiences}
          >
            <RefreshCw size={15} aria-hidden="true" />Refresh
          </button>
        </div>
        {experienceError && (
          <p className="admin-management-message error" role="alert">
            {experienceError}
            <button type="button" onClick={() => loadExperiences()}>Try again</button>
          </p>
        )}
        {isLoadingExperiences && experiences.length === 0
          ? <p className="admin-management-empty" role="status">Loading published experiences…</p>
          : experiences.length > 0
            ? <div className="admin-destination-grid">{experiences.map((experience) => <ExperienceCard key={experience.id} experience={experience} />)}</div>
            : !experienceError && <p className="admin-management-empty">No published rural experiences yet.</p>}
        {experiences.length < experienceTotal && (
          <button
            type="button"
            className="admin-management-secondary admin-destination-load-more"
            onClick={() => loadExperiences(experiencePage + 1, true)}
            disabled={isLoadingExperiences}
          >
            {isLoadingExperiences ? 'Loading…' : 'Load more experiences'}
          </button>
        )}
      </section>
    </section>
  );
}
