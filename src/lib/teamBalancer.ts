import { PlayerRosterItem, PlayerPosition, TeamSide } from '../types';

export interface BalancedTeamResult {
  roster: PlayerRosterItem[];
  greenTeam: PlayerRosterItem[];
  blueTeam: PlayerRosterItem[];
  greenAvgRating: number;
  blueAvgRating: number;
  parityPercentage: number;
}

/**
 * Smart Balanced Team Generator
 * Symmetrically balances Goalkeepers, Defenders, Midfielders, and Forwards,
 * while equalizing total team skill rating.
 */
export function balanceTeams(
  roster: PlayerRosterItem[],
  mode: 'balanced' | 'random' | 'veterans_vs_newcomers' = 'balanced'
): BalancedTeamResult {
  if (!roster || roster.length === 0) {
    return {
      roster: [],
      greenTeam: [],
      blueTeam: [],
      greenAvgRating: 0,
      blueAvgRating: 0,
      parityPercentage: 100,
    };
  }

  if (mode === 'random') {
    const shuffled = [...roster].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    const green = shuffled.slice(0, half).map((p) => ({ ...p, team: 'green' as TeamSide }));
    const blue = shuffled.slice(half).map((p) => ({ ...p, team: 'blue' as TeamSide }));

    return calculateResult(green, blue);
  }

  if (mode === 'veterans_vs_newcomers') {
    const sorted = [...roster].sort((a, b) => {
      const relA = a.reliabilityScore ?? 95;
      const relB = b.reliabilityScore ?? 95;
      return relB - relA;
    });
    const half = Math.ceil(sorted.length / 2);
    const green = sorted.slice(0, half).map((p) => ({ ...p, team: 'green' as TeamSide }));
    const blue = sorted.slice(half).map((p) => ({ ...p, team: 'blue' as TeamSide }));

    return calculateResult(green, blue);
  }

  // DEFAULT: 'balanced' (Skill + Position based Snake Draft)
  const playersWithCompositeRating = roster.map((p) => {
    const skill = p.rating || 4.5;
    const reliability = (p.reliabilityScore ?? 95) / 100;
    const compositeScore = skill * 0.75 + reliability * 1.25;
    return {
      player: p,
      position: (p.position || 'MID') as PlayerPosition,
      compositeScore,
    };
  });

  // Separate Goalkeepers first
  const gks = playersWithCompositeRating.filter((p) => p.position === 'GK');
  const outfield = playersWithCompositeRating.filter((p) => p.position !== 'GK');

  // Group outfield by position
  const defs = outfield.filter((p) => p.position === 'DEF');
  const mids = outfield.filter((p) => p.position === 'MID');
  const fwds = outfield.filter((p) => p.position === 'FWD');
  const any = outfield.filter((p) => p.position === 'ANY');

  const greenTeam: PlayerRosterItem[] = [];
  const blueTeam: PlayerRosterItem[] = [];

  let greenScoreSum = 0;
  let blueScoreSum = 0;

  const distributeGroup = (group: typeof playersWithCompositeRating) => {
    // Sort descending by rating
    const sorted = [...group].sort((a, b) => b.compositeScore - a.compositeScore);

    sorted.forEach((item) => {
      // Assign to team with lower score, or lower player count
      const preferGreen =
        greenTeam.length < blueTeam.length ||
        (greenTeam.length === blueTeam.length && greenScoreSum <= blueScoreSum);

      if (preferGreen) {
        greenTeam.push({ ...item.player, team: 'green' });
        greenScoreSum += item.compositeScore;
      } else {
        blueTeam.push({ ...item.player, team: 'blue' });
        blueScoreSum += item.compositeScore;
      }
    });
  };

  // Distribute Goalkeepers, Defenders, Midfielders, Forwards, and Flex
  distributeGroup(gks);
  distributeGroup(defs);
  distributeGroup(mids);
  distributeGroup(fwds);
  distributeGroup(any);

  return calculateResult(greenTeam, blueTeam);
}

function calculateResult(greenTeam: PlayerRosterItem[], blueTeam: PlayerRosterItem[]): BalancedTeamResult {
  const getAvg = (team: PlayerRosterItem[]) => {
    if (team.length === 0) return 0;
    const sum = team.reduce((acc, p) => acc + (p.rating || 4.5), 0);
    return Math.round((sum / team.length) * 10) / 10;
  };

  const greenAvgRating = getAvg(greenTeam);
  const blueAvgRating = getAvg(blueTeam);

  const maxDiff = Math.abs(greenAvgRating - blueAvgRating);
  const parityPercentage = Math.max(70, Math.round(100 - maxDiff * 15));

  return {
    roster: [...greenTeam, ...blueTeam],
    greenTeam,
    blueTeam,
    greenAvgRating,
    blueAvgRating,
    parityPercentage,
  };
}
