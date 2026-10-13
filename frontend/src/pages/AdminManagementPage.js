import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

const verificationTabs = ['Pending', 'Approved', 'Rejected', 'Suspended'];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function EmptyFeaturePage({ page }) {
  const descriptions = {
    'Rural Business Posts': 'Post moderation is not connected to an admin review workflow yet. Business posts are persisted in the existing service.',
    'Destinations & Experiences': 'Destination and experience management is not available because these records do not yet have database models.',
    'Reviews & Reports': 'Reviews and content reports are not connected to persisted data services yet.',
    Notifications: 'There are no persisted administrator notifications in the current platform data model.',
    'Settings': 'There are no additional administrator preferences configured for this platform yet.',
  };
  return (
    <section className="admin-feature-placeholder">
      <span><ShieldCheck size={21} aria-hidden="true" /></span>
      <p className="admin-feature-eyebrow">ADMINISTRATION</p>
      <h1>{page}</h1>
      <p>{descriptions[page] || 'This administration page is not available yet.'}</p>
    </section>
  );
}

export default function AdminManagementPage({ page, adminUser, options, onNavigate }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(options.status || 'Pending');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await apiRequest('/admin/users?page=1&limit=100');
      setUsers(result.users);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadBusinesses = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [allUsers, pending] = await Promise.all([
        apiRequest('/admin/users?page=1&limit=100'),
        apiRequest('/admin/businesses/pending'),
      ]);
      const businesses = allUsers.users.filter((user) => user.role === 'Business');
      const pendingIds = new Set(pending.businesses.map((business) => business._id));
      setUsers(businesses.map((business) => (
        pendingIds.has(business._id)
          ? { ...business, businessApprovalStatus: 'pending' }
          : business
      )));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options.status) setStatus(options.status[0].toUpperCase() + options.status.slice(1));
    setSearch('');
    setNotice('');
  }, [page, options.status]);

  useEffect(() => {
    if (page === 'User Management') loadUsers();
    if (page === 'Business Verification') loadBusinesses();
  }, [page, loadBusinesses, loadUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !term || [
        user.name,
        user.email,
        user.businessName,
        user.region,
      ].some((value) => value?.toLowerCase().includes(term));
      if (page === 'Business Verification') {
        const businessStatus = user.isActive === false ? 'Suspended' : (user.businessApprovalStatus || 'pending');
        return matchesSearch && businessStatus.toLowerCase() === status.toLowerCase();
      }
      return matchesSearch;
    });
  }, [page, search, status, users]);

  const updateAccount = async (user, changes) => {
    setError('');
    setNotice('');
    try {
      const endpoint = changes.businessApprovalStatus
        ? `/admin/businesses/${user._id}/approval`
        : `/admin/users/${user._id}/status`;
      await apiRequest(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(changes.businessApprovalStatus
          ? { status: changes.businessApprovalStatus }
          : { isActive: changes.isActive }),
      });
      setNotice(changes.businessApprovalStatus
        ? `Business ${changes.businessApprovalStatus}.`
        : `Account ${changes.isActive ? 'enabled' : 'disabled'}.`);
      if (page === 'Business Verification') await loadBusinesses();
      else await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!['User Management', 'Business Verification', 'My Profile'].includes(page)) {
    return <EmptyFeaturePage page={page} />;
  }

  if (page === 'My Profile') {
    return (
      <section className="admin-management-page">
        <header className="admin-management-heading">
          <p>ACCOUNT</p><h1>My Profile</h1>
          <span>Profile information for the signed-in administrator.</span>
        </header>
        <article className="admin-profile-details">
          <span className="admin-avatar admin-avatar-large">
            {(adminUser?.name || 'Admin').split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}
          </span>
          <dl>
            <div><dt>Name</dt><dd>{adminUser?.name || '—'}</dd></div>
            <div><dt>Email</dt><dd>{adminUser?.email || '—'}</dd></div>
            <div><dt>Role</dt><dd>{adminUser?.role || 'Admin'}</dd></div>
            {adminUser?.employeeId && <div><dt>Employee ID</dt><dd>{adminUser.employeeId}</dd></div>}
          </dl>
          <button type="button" className="admin-management-secondary" onClick={() => onNavigate('Settings')}>Account settings</button>
        </article>
      </section>
    );
  }

  const isVerification = page === 'Business Verification';

  return (
    <section className="admin-management-page">
      <header className="admin-management-heading">
        <p>PLATFORM ACCOUNTS</p>
        <h1>{page}</h1>
        <span>{isVerification ? 'Review actual rural business registrations and update their verification status.' : 'Search registered accounts and manage account access.'}</span>
      </header>

      {error && <p className="admin-management-message error" role="alert">{error}</p>}
      {notice && <p className="admin-management-message success" role="status">{notice}</p>}

      <div className="admin-management-toolbar">
        {isVerification && (
          <div className="admin-verification-tabs" aria-label="Business verification status">
            {verificationTabs.map((tab) => (
              <button type="button" className={status === tab ? 'is-active' : ''} key={tab} onClick={() => setStatus(tab)}>
                {tab}
              </button>
            ))}
          </div>
        )}
        <label className="admin-management-search">
          <span className="sr-only">Search {isVerification ? 'businesses' : 'users'}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={isVerification ? 'Search business or owner…' : 'Search name, email, or business…'}
          />
        </label>
        <button
          type="button"
          className="admin-management-secondary"
          onClick={isVerification ? loadBusinesses : loadUsers}
          disabled={isLoading}
        ><RefreshCw size={15} aria-hidden="true" /> Refresh</button>
      </div>

      <div className="admin-management-table-wrap">
        {isLoading ? <p className="admin-management-empty" role="status">Loading accounts…</p>
          : filteredUsers.length === 0 ? <p className="admin-management-empty">{isVerification ? `No ${status.toLowerCase()} business accounts.` : 'No matching accounts.'}</p>
            : (
              <table className="admin-management-table">
                <thead>
                  <tr>
                    <th>{isVerification ? 'Business' : 'Name'}</th>
                    <th>{isVerification ? 'Owner' : 'Email'}</th>
                    {isVerification && <th>Location</th>}
                    {!isVerification && <th>Role</th>}
                    <th>{isVerification ? 'Applied' : 'Status'}</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const businessStatus = user.isActive === false ? 'suspended' : (user.businessApprovalStatus || 'pending');
                    return (
                      <tr key={user._id}>
                        <td>{isVerification ? user.businessName || user.name : user.name}</td>
                        <td>{isVerification ? `${user.name} · ${user.email}` : user.email}</td>
                        {isVerification && <td>{user.region || '—'}</td>}
                        {!isVerification && <td>{user.role}</td>}
                        <td>{isVerification ? businessStatus : user.isActive === false ? 'Disabled' : 'Active'}</td>
                        <td>
                          {isVerification && businessStatus === 'pending' ? (
                            <div className="admin-management-actions">
                              <button type="button" onClick={() => updateAccount(user, { businessApprovalStatus: 'approved' })}>Approve</button>
                              <button type="button" className="is-danger" onClick={() => updateAccount(user, { businessApprovalStatus: 'rejected' })}>Reject</button>
                            </div>
                          ) : isVerification && businessStatus === 'suspended' ? (
                            <button type="button" className="admin-management-action" onClick={() => updateAccount(user, { isActive: true })}>Reinstate</button>
                          ) : !isVerification ? (
                            <button
                              type="button"
                              className="admin-management-action"
                              disabled={user._id === adminUser?.id}
                              onClick={() => updateAccount(user, { isActive: user.isActive === false })}
                            >{user.isActive === false ? 'Enable' : 'Disable'}</button>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
      </div>
      {isVerification && <p className="admin-management-footnote"><Building2 size={14} /> Pending business accounts are not allowed to publish until approved.</p>}
      {!isVerification && <p className="admin-management-footnote"><UsersRound size={14} /> Account access changes take effect immediately.</p>}
    </section>
  );
}
