import React from 'react';
import { CalendarDays } from 'lucide-react';

export default function DashboardDate() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const dateTime = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return <time className="ts-date" dateTime={dateTime}><CalendarDays size={15} aria-hidden="true" />{formattedDate}</time>;
}
