import { UserProfile, PlayerRosterItem } from '../types';

export interface ReputationTier {
  key: 'el_capitano' | 'reliable_starter' | 'occasional_sub' | 'high_risk';
  label: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  minScore: number;
}

export const REPUTATION_TIERS: Record<string, ReputationTier> = {
  el_capitano: {
    key: 'el_capitano',
    label: 'El Capitano',
    badge: '🌟',
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-400/40',
    description: 'Flawless attendance & sportsmanship (95%+)',
    minScore: 95,
  },
  reliable_starter: {
    key: 'reliable_starter',
    label: 'Reliable Starter',
    badge: '⚽',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/30',
    description: 'Dependable squad regular (85% - 94%)',
    minScore: 85,
  },
  occasional_sub: {
    key: 'occasional_sub',
    label: 'Occasional Sub',
    badge: '⚠️',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: 'Moderate attendance record (70% - 84%)',
    minScore: 70,
  },
  high_risk: {
    key: 'high_risk',
    label: 'High Risk No-Show',
    badge: '🚨',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/15',
    borderColor: 'border-rose-500/30',
    description: 'Frequent late dropouts or absences (<70%)',
    minScore: 0,
  },
};

/**
 * Calculates reliability percentage based on matches attended and no-shows
 */
export function calculateReliabilityScore(attended: number = 0, noShows: number = 0): number {
  const total = attended + noShows;
  if (total === 0) return 100; // New player default
  const ratio = (attended / total) * 100;
  return Math.round(Math.max(0, Math.min(100, ratio)));
}

/**
 * Returns the corresponding ReputationTier for a given score (0-100)
 */
export function getReputationTier(score: number = 100): ReputationTier {
  if (score >= 95) return REPUTATION_TIERS.el_capitano;
  if (score >= 85) return REPUTATION_TIERS.reliable_starter;
  if (score >= 70) return REPUTATION_TIERS.occasional_sub;
  return REPUTATION_TIERS.high_risk;
}

/**
 * Calculates Fair Play points
 */
export function calculateFairPlayPoints(user: Partial<UserProfile>): number {
  const attendedPts = (user.matchesAttended || 0) * 10;
  const mvpPts = (user.mvpCount || 0) * 25;
  const goalPts = (user.goalsCount || 0) * 5;
  const noShowPenalty = (user.noShowCount || 0) * 50;

  return Math.max(0, attendedPts + mvpPts + goalPts - noShowPenalty);
}
