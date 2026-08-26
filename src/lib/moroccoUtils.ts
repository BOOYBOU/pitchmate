/**
 * Morocco Localization & Utilities (MAD Currency & Casablanca GMT+1 Timezone)
 */

import { MOROCCO_TIMEZONE } from '../types';

export interface MoroccanCityInfo {
  name: string;
  lat: number;
  lng: number;
}

export const MOROCCAN_CITIES: MoroccanCityInfo[] = [
  { name: 'Casablanca', lat: 33.5731, lng: -7.5898 },
  { name: 'Rabat', lat: 34.0209, lng: -6.8416 },
  { name: 'Marrakech', lat: 31.6295, lng: -7.9811 },
  { name: 'Tangier', lat: 35.7595, lng: -5.8340 },
  { name: 'Agadir', lat: 30.4278, lng: -9.5981 },
  { name: 'Fes', lat: 34.0181, lng: -5.0078 },
  { name: 'Kenitra', lat: 34.2610, lng: -6.5802 },
  { name: 'Tetouan', lat: 35.5785, lng: -5.3684 },
  { name: 'Mohammedia', lat: 33.6835, lng: -7.3849 },
  { name: 'El Jadida', lat: 33.2316, lng: -8.5007 },
];

export const MOROCCO_CITIES = MOROCCAN_CITIES;

/**
 * Return current Date/time formatted for standard HTML datetime-local input in Morocco timezone
 */
export function getMoroccoNow(addHours = 24): string {
  const d = new Date(Date.now() + addHours * 3600000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = '00';
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format amounts in Moroccan Dirham (MAD)
 * Example: 50 MAD or 0 MAD (Free)
 */
export function formatMAD(amount: number | undefined | null, options?: { showZeroAsFree?: boolean; suffix?: string }): string {
  const num = Number(amount) || 0;
  if (num === 0 && options?.showZeroAsFree) {
    return 'Free';
  }
  const suffix = options?.suffix || 'MAD';
  return `${num} ${suffix}`;
}

/**
 * Format dates in Morocco GMT+1 (Casablanca Time)
 */
export function formatMoroccoDate(
  isoDateStr: string | undefined | null,
  format: 'datetime' | 'date_only' | 'time_only' | 'relative' | 'short_date' | 'day_month_time' = 'datetime'
): string {
  if (!isoDateStr) return 'TBD';
  const date = new Date(isoDateStr);
  if (isNaN(date.getTime())) return 'Invalid Date';

  const timeZone = MOROCCO_TIMEZONE;

  if (format === 'time_only') {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  if (format === 'date_only') {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  if (format === 'short_date') {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  if (format === 'day_month_time') {
    const dStr = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
    const tStr = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return `${dStr} • ${tStr} (GMT+1)`;
  }

  if (format === 'relative') {
    const now = Date.now();
    const diffMs = date.getTime() - now;
    const diffMin = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMs < 0) {
      const pastMin = Math.abs(diffMin);
      if (pastMin < 60) return `${pastMin}m ago`;
      const pastHours = Math.abs(diffHours);
      if (pastHours < 24) return `${pastHours}h ago`;
      const pastDays = Math.abs(diffDays);
      return `${pastDays}d ago`;
    }

    if (diffMin < 60) return `In ${diffMin} mins`;
    if (diffHours < 24) return `In ${diffHours} hours`;
    if (diffDays === 1) return `Tomorrow`;
    return `In ${diffDays} days`;
  }

  // default 'datetime'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date) + ' (Morocco Time)';
}

/**
 * Generate Google Calendar Link and .ics file download for a match
 */
export function generateGoogleCalendarUrl(match: {
  title: string;
  dateTime: string;
  durationMinutes: number;
  location: { venueName: string; address: string; city?: string };
  notes?: string;
}): string {
  const startDate = new Date(match.dateTime);
  const endDate = new Date(startDate.getTime() + (match.durationMinutes || 90) * 60000);

  const formatUtcForGCal = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const startUtc = formatUtcForGCal(startDate);
  const endUtc = formatUtcForGCal(endDate);

  const details = encodeURIComponent(
    `${match.title}\nVenue: ${match.location.venueName}, ${match.location.address} (${match.location.city || 'Casablanca'})\nTimezone: Morocco Time (GMT+1 / Casablanca)\n\n${match.notes || 'Organized via PitchMate'}`
  );
  const location = encodeURIComponent(`${match.location.venueName}, ${match.location.address}, ${match.location.city || 'Casablanca'}, Morocco`);
  const title = encodeURIComponent(`⚽ PitchMate: ${match.title}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startUtc}/${endUtc}&details=${details}&location=${location}&ctz=${MOROCCO_TIMEZONE}`;
}

export function downloadIcsFile(match: {
  id: string;
  title: string;
  dateTime: string;
  durationMinutes: number;
  location: { venueName: string; address: string; city?: string };
  notes?: string;
}) {
  const startDate = new Date(match.dateTime);
  const endDate = new Date(startDate.getTime() + (match.durationMinutes || 90) * 60000);

  const formatIcsTime = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PitchMate//Soccer Match Organizer//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:pitchmate-match-${match.id}@pitchmate.ma`,
    `DTSTAMP:${formatIcsTime(new Date())}`,
    `DTSTART:${formatIcsTime(startDate)}`,
    `DTEND:${formatIcsTime(endDate)}`,
    `SUMMARY:⚽ ${match.title}`,
    `DESCRIPTION:${match.notes ? match.notes.replace(/\n/g, '\\n') : 'PitchMate Soccer Match'} (Morocco GMT+1)`,
    `LOCATION:${match.location.venueName}, ${match.location.address}, ${match.location.city || 'Casablanca'}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `pitchmate-${match.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
