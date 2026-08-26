import { PlayerRosterItem } from '../types';

export interface BalanceResult {
  roster: PlayerRosterItem[];
  greenTeam: PlayerRosterItem[];
  blueTeam: PlayerRosterItem[];
  greenAvgRating: number;
  blueAvgRating: number;
  parityPercentage: number;
}

export function balanceTeams(
  roster: PlayerRosterItem[],
  mode: 'balanced' | 'random' | 'veterans_vs_newcomers' = 'balanced'
): BalanceResult {
  if (roster.length === 0) {
    return {
      roster: [],
      greenTeam: [],
      blueTeam: [],
      greenAvgRating: 0,
      blueAvgRating: 0,
      parityPercentage: 100,
    };
  }

  let players = [...roster];
  let green: PlayerRosterItem[] = [];
  let blue: PlayerRosterItem[] = [];

  if (mode === 'random') {
    // Shuffle randomly
    players = players.sort(() => Math.random() - 0.5);
    players.forEach((p, idx) => {
      if (idx % 2 === 0) {
        green.push({ ...p, team: 'green' });
      } else {
        blue.push({ ...p, team: 'blue' });
      }
    });
  } else if (mode === 'veterans_vs_newcomers') {
    // Sort by rating
    players.sort((a, b) => (b.rating || 3) - (a.rating || 3));
    const half = Math.ceil(players.length / 2);
    green = players.slice(0, half).map((p) => ({ ...p, team: 'green' }));
    blue = players.slice(half).map((p) => ({ ...p, team: 'blue' }));
  } else {
    // Balanced: Snake draft by rating
    players.sort((a, b) => (b.rating || 3) - (a.rating || 3));

    let greenSum = 0;
    let blueSum = 0;

    players.forEach((player) => {
      const rating = player.rating || 3;
      if (green.length < blue.length) {
        green.push({ ...player, team: 'green' });
        greenSum += rating;
      } else if (blue.length < green.length) {
        blue.push({ ...player, team: 'blue' });
        blueSum += rating;
      } else {
        if (greenSum <= blueSum) {
          green.push({ ...player, team: 'green' });
          greenSum += rating;
        } else {
          blue.push({ ...player, team: 'blue' });
          blueSum += rating;
        }
      }
    });
  }

  const updatedRoster = [...green, ...blue];
  const greenAvgRating =
    green.length > 0 ? Number((green.reduce((acc, p) => acc + (p.rating || 3), 0) / green.length).toFixed(1)) : 0;
  const blueAvgRating =
    blue.length > 0 ? Number((blue.reduce((acc, p) => acc + (p.rating || 3), 0) / blue.length).toFixed(1)) : 0;

  const maxAvg = Math.max(greenAvgRating, blueAvgRating);
  const minAvg = Math.min(greenAvgRating, blueAvgRating);
  const parityPercentage = maxAvg > 0 ? Math.round((minAvg / maxAvg) * 100) : 100;

  return {
    roster: updatedRoster,
    greenTeam: green,
    blueTeam: blue,
    greenAvgRating,
    blueAvgRating,
    parityPercentage,
  };
}
