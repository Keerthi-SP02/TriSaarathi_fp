import React from 'react';

export default function RegisterBusinessButton({ status, onClick }) {
  const pending = status === 'pending_review';
  const editable = ['draft', 'changes_requested', 'rejected'].includes(status);
  const label = pending ? 'Track Application' : editable && status !== 'draft' ? 'Update Application' : editable ? 'Resume Registration' : 'Register Business';
  return <div className="ts-business-actions">
    <button type="button" className="ts-register-button" onClick={onClick}>{label}</button>
  </div>;
}
