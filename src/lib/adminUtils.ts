import { UserProfile, SoccerMatch, isSuperAdminEmail } from '../types';

export function filterUsers(
  users: UserProfile[],
  searchQuery: string,
  filterStatus: 'all' | 'approved' | 'pending' | 'banned' | 'admin'
): UserProfile[] {
  const query = searchQuery.trim().toLowerCase();

  return users.filter((u) => {
    // Status filter
    if (filterStatus === 'approved' && (u.status !== 'approved' || u.isBanned)) return false;
    if (filterStatus === 'pending' && u.status !== 'pending') return false;
    if (filterStatus === 'banned' && !u.isBanned) return false;
    if (filterStatus === 'admin' && !(u.isAdmin || isSuperAdminEmail(u.email))) return false;

    // Search query
    if (query) {
      const matchName = u.name?.toLowerCase().includes(query);
      const matchEmail = u.email?.toLowerCase().includes(query);
      const matchPhone = u.phone?.toLowerCase().includes(query);
      const matchCity = u.city?.toLowerCase().includes(query);
      const matchPos = u.preferredPosition?.toLowerCase().includes(query);
      return matchName || matchEmail || matchPhone || matchCity || matchPos;
    }

    return true;
  });
}

export function filterMatches(
  matches: SoccerMatch[],
  searchQuery: string,
  filterStatus: 'all' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
): SoccerMatch[] {
  const query = searchQuery.trim().toLowerCase();

  return matches.filter((m) => {
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;

    if (query) {
      const matchTitle = m.title.toLowerCase().includes(query);
      const matchVenue = m.location?.venueName?.toLowerCase().includes(query);
      const matchCity = m.location?.city?.toLowerCase().includes(query);
      const matchCreator = m.creatorName?.toLowerCase().includes(query);
      return matchTitle || matchVenue || matchCity || matchCreator;
    }

    return true;
  });
}

export function getUserStatusBadge(user: UserProfile): { label: string; bg: string; text: string; border: string } {
  if (user.isBanned) {
    return { label: 'Banned', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
  }
  if (isSuperAdminEmail(user.email)) {
    return { label: 'Super Admin', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
  }
  if (user.isAdmin) {
    return { label: 'Admin', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
  }
  if (user.status === 'pending') {
    return { label: 'Pending Approval', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
  }
  if (user.status === 'rejected') {
    return { label: 'Rejected', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
  }
  return { label: 'Approved', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
}

export function getMatchStatusBadge(status: SoccerMatch['status']): { label: string; bg: string; text: string; dot: string } {
  switch (status) {
    case 'upcoming':
      return { label: 'Upcoming', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' };
    case 'in_progress':
      return { label: 'Live Now', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500 animate-ping' };
    case 'completed':
      return { label: 'Completed', bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-500' };
    case 'cancelled':
      return { label: 'Cancelled', bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-500' };
    default:
      return { label: status, bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-500' };
  }
}
