import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, ImagePlus, LoaderCircle, Send, Upload, X } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { businessCategories, andhraPradeshDistricts } from '../../../shared/businessOptions.js';
import VillageIllustration from '../components/business/VillageIllustration.jsx';

const steps = ['Business Details', 'Location & Contact', 'Documents', 'Business Photos', 'Review & Submit'];
const blank = { businessName: '', category: '', description: '', yearEstablished: '', district: '', locality: '', address: '', mobile: '', email: '', website: '', verificationNotes: '', alternativeEvidence: false };

function initialForm(application) {
  const b = application?.business || {};
  return { ...blank, businessName: b.businessName || '', category: b.category || '', description: b.description || '', yearEstablished: b.yearEstablished || '', district: b.district || '', locality: b.locality || '', address: b.address || '', mobile: b.mobile || '', email: b.email || '', website: b.website || '', verificationNotes: application?.verificationNotes || '', alternativeEvidence: Boolean(application?.alternativeEvidence) };
}

export default function BusinessRegistration({ application: initialApplication, onBack, onUpdated }) {
  const [application, setApplication] = useState(initialApplication || null);
  const [form, setForm] = useState(() => initialForm(initialApplication));
  const [policy, setPolicy] = useState({ minPhotos: 2, maxPhotos: 5, documentMaxBytes: 10485760, photoMaxBytes: 5242880 });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([apiRequest('/business-applications/mine'), apiRequest('/business-applications/config')]).then(([{ application: record }, config]) => {
      if (!active) return;
      setApplication(record || null); setForm(initialForm(record)); setPolicy(config.uploadPolicy || policy);
      if (record?.status === 'pending_review' || record?.status === 'approved') setSubmitted(true);
    }).catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const saveDraft = async () => {
    const result = await apiRequest('/business-applications/draft', { method: 'PUT', body: JSON.stringify(form) });
    setApplication(result.application); onUpdated?.(result.application); return result.application;
  };
  const next = async () => {
    setError(''); setBusy(true);
    try {
      if (step === 0 && (!form.businessName.trim() || !form.category || !form.description.trim())) throw new Error('Complete the business name, category, and description before continuing.');
      if (step === 1) {
        const mobile = form.mobile.replace(/[\s()-]/g, '').replace(/^\+?91/, '');
        if (!form.district || !form.locality.trim() || form.address.trim().length < 5 || !/^[6-9]\d{9}$/.test(mobile)) throw new Error('Complete your district, village, address, and valid mobile number before continuing.');
        await saveDraft();
      } else if (step > 1) await saveDraft();
      setStep((current) => Math.min(current + 1, steps.length - 1));
    }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  const upload = async (file, kind, category = 'additional') => {
    if (!application?.id) { setError('Save your business details before adding files.'); return; }
    setUploading(true); setError('');
    try {
      const headers = { 'Content-Type': file.type, 'X-File-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) };
      if (kind === 'documents') headers['X-Evidence-Category'] = category;
      const response = await fetch(`/api/business-applications/${application.id}/${kind}`, { method: 'POST', credentials: 'same-origin', headers, body: file });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The file could not be uploaded.');
      setApplication((current) => ({ ...current, [kind]: [...(current?.[kind] || []), data.file] }));
    } catch (requestError) { setError(requestError.message); }
    finally { setUploading(false); }
  };
  const uploadMany = async (event, kind) => {
    const files = [...(event.target.files || [])];
    const remaining = kind === 'photos' ? Math.max(0, policy.maxPhotos - (application?.photos?.length || 0)) : files.length;
    for (const file of files.slice(0, remaining)) await upload(file, kind, 'business_proof');
    event.target.value = '';
  };
  const removeFile = async (file) => {
    try { await apiRequest(`/business-applications/${application.id}/files/${file.id}`, { method: 'DELETE' }); setApplication((current) => ({ ...current, documents: current.documents.filter((item) => item.id !== file.id), photos: current.photos.filter((item) => item.id !== file.id) })); }
    catch (requestError) { setError(requestError.message); }
  };
  const submit = async () => {
    setBusy(true); setError('');
    try { const current = await saveDraft(); const result = await apiRequest(`/business-applications/${current.id}/submit`, { method: 'POST', body: '{}' }); setSubmitted(true); setApplication((value) => ({ ...value, ...result.application })); onUpdated?.({ ...current, ...result.application }); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  if (submitted) return <section className="ts-registration ts-submitted"><div className="ts-success-mark"><Check size={34} /></div><p className="ts-eyebrow">APPLICATION STATUS</p><h1>{application?.status === 'approved' ? 'Your business is verified' : 'Business application submitted'}</h1><p>{application?.status === 'approved' ? 'Your business is now verified on TriSaarathi.' : 'Your application has been received. You can track its review status from your business dashboard.'}</p>{application?.reviewNote && <div className="ts-review-note"><strong>Review team note</strong><p>{application.reviewNote}</p></div>}<button type="button" className="ts-primary-button" onClick={onBack}>Back to dashboard</button><VillageIllustration /></section>;

  return <section className="ts-registration">
    <button className="ts-back-button" type="button" onClick={onBack}><ArrowLeft size={17} />Back to dashboard</button>
    <p className="ts-eyebrow">RURAL BUSINESS VERIFICATION</p><h1>Register your business</h1>
    <div className="ts-progress" aria-label="Registration progress">{steps.map((label, index) => <button key={label} type="button" className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => index < step && setStep(index)}><span>{index < step ? <Check size={14} /> : index + 1}</span><small>{label}</small></button>)}</div>
    {error && <p className="ts-error" role="alert">{error}</p>}
    <article className="ts-form-card">
      {step === 0 && <div className="ts-form-grid"><label>Business name<input value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} maxLength={150} required /></label><label>Business category<select value={form.category} onChange={(e) => setField('category', e.target.value)} required><option value="">Choose a category</option>{businessCategories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="wide">About your business<textarea rows={4} value={form.description} onChange={(e) => setField('description', e.target.value)} maxLength={2000} required /></label><label>Year established (optional)<input type="number" min="1800" max={new Date().getFullYear()} value={form.yearEstablished} onChange={(e) => setField('yearEstablished', e.target.value)} /></label></div>}
      {step === 1 && <div className="ts-form-grid"><label>District<select value={form.district} onChange={(e) => setField('district', e.target.value)} required><option value="">Choose district</option>{andhraPradeshDistricts.map((item) => <option key={item}>{item}</option>)}</select></label><label>Village / town<input value={form.locality} onChange={(e) => setField('locality', e.target.value)} maxLength={120} required /></label><label className="wide">Business address<textarea rows={2} value={form.address} onChange={(e) => setField('address', e.target.value)} maxLength={300} required /></label><label>Mobile number<input type="tel" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} placeholder="10 digit mobile number" required /></label><label>Email (optional)<input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} /></label><label className="wide">Website URL (optional)<input type="url" value={form.website} onChange={(e) => setField('website', e.target.value)} maxLength={2048} placeholder="https://example.com" /></label></div>}
      {step === 2 && <div className="ts-upload-section"><p>Upload supporting business documents, or describe alternative evidence for the review team.</p><label className="ts-upload-button"><Upload size={18} />Add document<input type="file" accept="application/pdf,image/jpeg,image/png" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'documents', 'business_proof')} /></label><label className="ts-check"><input type="checkbox" checked={form.alternativeEvidence} onChange={(e) => setField('alternativeEvidence', e.target.checked)} />I will provide alternative evidence for verification</label>{form.alternativeEvidence && <label>Evidence notes<textarea rows={3} value={form.verificationNotes} onChange={(e) => setField('verificationNotes', e.target.value)} maxLength={1000} placeholder="Describe how the team can verify your business." /></label>}<FileList files={application?.documents || []} applicationId={application?.id} onRemove={removeFile} />{uploading && <p className="ts-hint">Uploading file…</p>}</div>}
      {step === 3 && <div className="ts-upload-section"><p>Add {policy.minPhotos}–{policy.maxPhotos} genuine photos of your business. Maximum {Math.ceil(policy.photoMaxBytes / 1024 / 1024)} MB each.</p><label className="ts-upload-button"><ImagePlus size={18} />Add business photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || (application?.photos?.length || 0) >= policy.maxPhotos} onChange={(e) => uploadMany(e, 'photos')} /></label><FileList files={application?.photos || []} applicationId={application?.id} onRemove={removeFile} photo /></div>}
      {step === 4 && <div className="ts-review"><h2>Review your application</h2><dl>{[['Business', form.businessName],['Category', form.category],['Description', form.description],['District', form.district],['Village / town', form.locality],['Address', form.address],['Mobile', form.mobile],['Email', form.email || 'Not provided'],['Website', form.website || 'Not provided'],['Documents', `${application?.documents?.length || 0} uploaded`],['Photos', `${application?.photos?.length || 0} uploaded`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl><p>Submitting sends your details and evidence to the TriSaarathi review team.</p></div>}
      <footer className="ts-form-actions">{step > 0 && <button type="button" className="ts-secondary-button" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={16} />Back</button>}{step < 4 ? <button type="button" className="ts-primary-button" onClick={next} disabled={busy || uploading}>{busy ? <LoaderCircle className="ts-spin" size={16} /> : null}Save & continue<ArrowRight size={16} /></button> : <button type="button" className="ts-primary-button" onClick={submit} disabled={busy || uploading}>{busy ? 'Submitting…' : 'Submit application'}<Send size={16} /></button>}</footer>
    </article><VillageIllustration />
  </section>;
}

function FileList({ files, applicationId, onRemove, photo = false }) {
  if (!files.length) return <p className="ts-hint">No {photo ? 'photos' : 'documents'} uploaded yet.</p>;
  return <div className={photo ? 'ts-upload-grid' : 'ts-file-list'}>{files.map((file) => photo ? <figure key={file.id}><img src={`/api/business-applications/${applicationId}/files/${file.id}`} alt={file.originalName} /><figcaption>{file.originalName}<button type="button" onClick={() => onRemove(file)} aria-label={`Remove ${file.originalName}`}><X size={15} /></button></figcaption></figure> : <div key={file.id}><FileText size={18} /><span>{file.originalName}</span><button type="button" onClick={() => onRemove(file)} aria-label={`Remove ${file.originalName}`}><X size={15} /></button></div>)}</div>;
}
