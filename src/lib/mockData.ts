import { SoccerMatch, UserProfile, SUPER_ADMIN_EMAIL, MESSI_AVATAR_URL, AdminAnnouncement, DirectMessage, InAppNotification } from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_mustapha',
    email: 'bouhbousmustapha@gmail.com',
    name: 'Mustapha Bouhbous',
    avatarUrl: MESSI_AVATAR_URL,
    phone: '+212 661-234567',
    city: 'Casablanca',
    isAdmin: true,
    status: 'approved',
    preferredPosition: 'MID',
    skillRating: 5.0,
    reliabilityScore: 100,
    matchesAttended: 50,
    noShowCount: 0,
    matchesPlayed: 50,
    mvpCount: 8,
    goalsCount: 24,
    badges: [
      { id: 'b1', key: 'reliable', title: 'Reliable Captain', description: '100% attendance rate', icon: '🛡️', unlockedAt: '2026-01-10' },
      { id: 'b2', key: 'mvp', title: 'Match MVP', description: 'Voted Best Player 8 times', icon: '🌟', unlockedAt: '2026-02-14' },
      { id: 'b3', key: 'ironman', title: 'Iron Man', description: '10 consecutive matches attended', icon: '⚡', unlockedAt: '2026-03-01' },
    ],
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    approvedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
];

const now = new Date();

const tomorrowNight = new Date(now.getTime() + 24 * 60 * 60 * 1000);
tomorrowNight.setHours(20, 30, 0, 0);

const dayAfterDawn = new Date(now.getTime() + 48 * 60 * 60 * 1000);
dayAfterDawn.setHours(7, 0, 0, 0);

const weekendNight = new Date(now.getTime() + 72 * 60 * 60 * 1000);
weekendNight.setHours(19, 0, 0, 0);

export const INITIAL_MATCHES: SoccerMatch[] = [
  {
    id: 'match_01_casablanca_lights',
    title: 'Casablanca 7v7 Under The Floodlights',
    dateTime: tomorrowNight.toISOString(),
    durationMinutes: 90,
    location: {
      venueName: 'Oasis Soccer Club',
      address: 'Route de l’Oasis, Near Tramway Station',
      city: 'Casablanca',
      latitude: 33.5658,
      longitude: -7.6324,
      googleMapsUrl: 'https://maps.google.com/?q=33.5658,-7.6324',
      pitchNumber: 'Terrain 2 (Synthetic Turf)',
    },
    format: '7v7',
    maxPlayers: 14,
    pricePerPlayer: 50,
    currency: 'MAD',
    totalPitchCost: 700,
    paidPlayerIds: ['user_mustapha'],
    formationGreen: '7v7-2-3-1',
    formationBlue: '7v7-2-3-1',
    score: { green: 0, blue: 0 },
    goals: [],
    notes: 'Match rental split is 50 MAD/player (Total 700 MAD). Bibs and official match balls provided. Payment via CIH Bank or Cash on pitch.',
    creatorId: 'user_mustapha',
    creatorName: 'Mustapha Bouhbous',
    creatorEmail: SUPER_ADMIN_EMAIL,
    roster: [
      {
        userId: 'user_mustapha',
        name: 'Mustapha Bouhbous',
        email: SUPER_ADMIN_EMAIL,
        avatarUrl: MESSI_AVATAR_URL,
        joinedAt: new Date(now.getTime() - 120000).toISOString(),
        team: 'green',
        position: 'MID',
        jerseyNumber: 10,
        isHost: true,
        reliabilityScore: 100,
        rating: 5.0,
        paymentStatus: 'paid',
        paymentMethod: 'cash',
      },
    ],
    waitlist: [],
    isLocked: false,
    status: 'upcoming',
    createdAt: new Date(now.getTime() - 150000).toISOString(),
    updatedAt: new Date(now.getTime() - 20000).toISOString(),
  },
  {
    id: 'match_02_rabat_agdal',
    title: 'Rabat Agdal Weekend 6v6 Cup',
    dateTime: weekendNight.toISOString(),
    durationMinutes: 80,
    location: {
      venueName: 'Complexe Sportif Agdal',
      address: 'Avenue de France, Agdal',
      city: 'Rabat',
      latitude: 33.9982,
      longitude: -6.8489,
      googleMapsUrl: 'https://maps.google.com/?q=33.9982,-6.8489',
      pitchNumber: 'Terrain 1',
    },
    format: '6v6',
    maxPlayers: 12,
    pricePerPlayer: 45,
    currency: 'MAD',
    totalPitchCost: 540,
    paidPlayerIds: ['user_mustapha'],
    formationGreen: '6v6-2-2-1',
    formationBlue: '6v6-2-2-1',
    score: { green: 0, blue: 0 },
    goals: [],
    notes: 'Kickoff at 19:00 Morocco Time sharp! Please arrive 15 minutes before for warm-up.',
    creatorId: 'user_mustapha',
    creatorName: 'Mustapha Bouhbous',
    creatorEmail: SUPER_ADMIN_EMAIL,
    roster: [
      {
        userId: 'user_mustapha',
        name: 'Mustapha Bouhbous',
        email: SUPER_ADMIN_EMAIL,
        avatarUrl: MESSI_AVATAR_URL,
        joinedAt: new Date(now.getTime() - 90000).toISOString(),
        team: 'green',
        position: 'MID',
        jerseyNumber: 10,
        isHost: true,
        reliabilityScore: 100,
        rating: 5.0,
        paymentStatus: 'paid',
        paymentMethod: 'cash',
      },
    ],
    waitlist: [],
    isLocked: false,
    status: 'upcoming',
    createdAt: new Date(now.getTime() - 100000).toISOString(),
    updatedAt: new Date(now.getTime() - 10000).toISOString(),
  },
];

export const POPULAR_PITCH_PRESETS = [
  {
    name: 'Stade Oasis Soccer Complex',
    address: 'Boulevard de l\'Oasis, Casablanca',
    city: 'Casablanca',
    latitude: 33.5592,
    longitude: -7.6321,
    notes: 'Premium 4G artificial turf with floodlights and parking',
  },
  {
    name: 'City Foot 5 Californie',
    address: 'Quartier Californie, Casablanca',
    city: 'Casablanca',
    latitude: 33.5389,
    longitude: -7.6015,
    notes: 'Five-a-side indoor and outdoor pitches with locker rooms',
  },
  {
    name: 'Complexe Sportif Hay Riad',
    address: 'Avenue Annakhil, Hay Riad, Rabat',
    city: 'Rabat',
    latitude: 33.9682,
    longitude: -6.8791,
    notes: 'Modern 7v7 and 11v11 pitches with high quality LED lighting',
  },
  {
    name: 'Palmerie Football Club Marrakech',
    address: 'Circuit de la Palmeraie, Marrakech',
    city: 'Marrakech',
    latitude: 31.6628,
    longitude: -7.9532,
    notes: 'Beautiful outdoor turf surrounded by palms, great clubhouse',
  },
  {
    name: 'Tangier Bay Sports Village',
    address: 'Route de Malabata, Tangier',
    city: 'Tangier',
    latitude: 35.7761,
    longitude: -5.7821,
    notes: 'Ocean-view synthetic pitches, 7v7 and 8v8 format',
  },
  {
    name: 'Agadir Marina Pitch Center',
    address: 'Boulevard 20 Août, Agadir',
    city: 'Agadir',
    latitude: 30.4215,
    longitude: -9.6052,
    notes: 'Coastal turf venue close to the marina',
  },
];

export const INITIAL_ANNOUNCEMENTS: AdminAnnouncement[] = [
  {
    id: 'ann_1',
    title: 'PitchMate Morocco League Guidelines & Dirham (MAD) Fees',
    message: 'Welcome to PitchMate Morocco! All matches are now scheduled in Morocco GMT+1 (Casablanca time) with transparent Dirham (MAD) fee tracking, live scoreboard, and MVP voting.',
    authorName: 'Mustapha Bouhbous (Super Admin)',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    type: 'info',
  },
];

export const INITIAL_DIRECT_MESSAGES: DirectMessage[] = [];

export const INITIAL_NOTIFICATIONS: InAppNotification[] = [];
