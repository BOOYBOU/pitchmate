import { PlayerPosition } from '../types';

export interface SlotDefinition {
  key: string;
  label: string;
  roleDescription: string;
  position: PlayerPosition;
  top: number; // percentage 0-100 on 2D board
  left: number; // percentage 0-100 on 2D board
  team: 'green' | 'blue';
}

export interface FormationConfig {
  label: string;
  category: '5v5' | '6v6' | '7v7' | '8v8' | '9v9' | '10v10' | '11v11' | 'custom';
  slots: { green: SlotDefinition[]; blue: SlotDefinition[] };
}

export function getPositionArabicLabel(position: PlayerPosition, label: string): string {
  switch (label.toUpperCase()) {
    case 'GK':
      return 'حارس مرمى (GK)';
    case 'CB':
      return 'قلب دفاع (CB)';
    case 'LCB':
      return 'مدافع أوسط أيسر (LCB)';
    case 'RCB':
      return 'مدافع أوسط أيمن (RCB)';
    case 'LB':
      return 'ظهير أيسر (LB)';
    case 'RB':
      return 'ظهير أيمن (RB)';
    case 'LWB':
      return 'جناح دفاعي أيسر (LWB)';
    case 'RWB':
      return 'جناح دفاعي أيمن (RWB)';
    case 'CDM':
      return 'وسط دفاعي / ارتكاز (CDM)';
    case 'CM':
      return 'وسط ميدان (CM)';
    case 'LCM':
      return 'لاعب وسط أيسر (LCM)';
    case 'RCM':
      return 'لاعب وسط أيمن (RCM)';
    case 'CAM':
      return 'صانع ألعاب / وسط هجومي (CAM)';
    case 'LM':
    case 'LW':
    case 'LF':
      return 'جناح أيسر / مهاجم (LW)';
    case 'RM':
    case 'RW':
    case 'RF':
      return 'جناح أيمن / مهاجم (RW)';
    case 'ST':
    case 'CF':
      return 'مهاجم صريح / رأس حربة (ST)';
    default:
      if (position === 'GK') return 'حارس مرمى (GK)';
      if (position === 'DEF') return 'مدافع (DEF)';
      if (position === 'MID') return 'لاعب وسط (MID)';
      return 'مهاجم (FWD)';
  }
}

/**
 * Dynamic Algorithmic Formation Generator
 * For arbitrary squad sizes (e.g. 4v4, 6v6, 9v9, 10v10, or custom uneven teams).
 * Distributes players across 4 tactical vertical tiers (GK, DEF, MID, FWD)
 * with symmetrical horizontal spacing.
 */
export function generateDynamicTacticalSlots(
  teamSize: number,
  team: 'green' | 'blue'
): SlotDefinition[] {
  const size = Math.max(1, teamSize);
  const slots: SlotDefinition[] = [];
  const isGreen = team === 'green';
  const prefix = isGreen ? 'g' : 'b';

  // Always 1 GK
  slots.push({
    key: `${prefix}_gk`,
    label: 'GK',
    roleDescription: 'Goalkeeper',
    position: 'GK',
    top: isGreen ? 90 : 10,
    left: 50,
    team,
  });

  const outfieldCount = size - 1;
  if (outfieldCount <= 0) return slots;

  // Determine lines distribution based on outfield count
  let defCount = 0;
  let midCount = 0;
  let fwdCount = 0;

  if (outfieldCount === 1) {
    midCount = 1;
  } else if (outfieldCount === 2) {
    defCount = 1;
    fwdCount = 1;
  } else if (outfieldCount === 3) {
    defCount = 1;
    midCount = 1;
    fwdCount = 1;
  } else if (outfieldCount === 4) {
    defCount = 2;
    midCount = 1;
    fwdCount = 1;
  } else if (outfieldCount === 5) {
    defCount = 2;
    midCount = 2;
    fwdCount = 1;
  } else if (outfieldCount === 6) {
    defCount = 2;
    midCount = 3;
    fwdCount = 1;
  } else if (outfieldCount === 7) {
    defCount = 3;
    midCount = 3;
    fwdCount = 1;
  } else if (outfieldCount === 8) {
    defCount = 3;
    midCount = 3;
    fwdCount = 2;
  } else if (outfieldCount === 9) {
    defCount = 4;
    midCount = 3;
    fwdCount = 2;
  } else if (outfieldCount === 10) {
    defCount = 4;
    midCount = 3;
    fwdCount = 3;
  } else {
    // Arbitrary large sizes
    defCount = Math.floor(outfieldCount * 0.38);
    fwdCount = Math.max(1, Math.floor(outfieldCount * 0.25));
    midCount = outfieldCount - defCount - fwdCount;
  }

  // Helper to place a row horizontally
  const placeRow = (
    count: number,
    baseTop: number,
    rolePrefix: string,
    rolePos: PlayerPosition,
    roleDesc: string
  ) => {
    if (count <= 0) return;
    const spacing = 70 / (count + 1);
    for (let i = 0; i < count; i++) {
      const left = Math.round(15 + spacing * (i + 1));
      let label = `${rolePrefix}${count > 1 ? i + 1 : ''}`;
      if (rolePos === 'DEF') {
        if (count === 2) label = i === 0 ? 'LB' : 'RB';
        else if (count === 3) label = i === 0 ? 'LB' : i === 1 ? 'CB' : 'RB';
        else if (count === 4) label = i === 0 ? 'LB' : i === 1 ? 'LCB' : i === 2 ? 'RCB' : 'RB';
      } else if (rolePos === 'MID') {
        if (count === 2) label = i === 0 ? 'LM' : 'RM';
        else if (count === 3) label = i === 0 ? 'LM' : i === 1 ? 'CM' : 'RM';
        else if (count === 4) label = i === 0 ? 'LM' : i === 1 ? 'LCM' : i === 2 ? 'RCM' : 'RM';
      } else if (rolePos === 'FWD') {
        if (count === 1) label = 'ST';
        else if (count === 2) label = i === 0 ? 'LF' : 'RF';
        else if (count === 3) label = i === 0 ? 'LW' : i === 1 ? 'ST' : 'RW';
      }

      const calculatedTop = isGreen ? baseTop : 100 - baseTop;

      slots.push({
        key: `${prefix}_${rolePos.toLowerCase()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        label,
        roleDescription: `${roleDesc} (${rolePos})`,
        position: rolePos,
        top: calculatedTop,
        left: isGreen ? left : 100 - left,
        team,
      });
    }
  };

  placeRow(defCount, 76, 'DEF', 'DEF', 'Defender');
  placeRow(midCount, 60, 'MID', 'MID', 'Midfielder');
  placeRow(fwdCount, 46, 'FWD', 'FWD', 'Forward / Striker');

  return slots;
}

export const FORMATIONS: Record<string, FormationConfig> = {
  // -------------------------------------------------------------
  // 5v5 FORMATS
  // -------------------------------------------------------------
  '5v5-1-2-1': {
    label: '5v5 (1-2-1 Diamond)',
    category: '5v5',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_cb', label: 'CB', roleDescription: 'Central Defender (DEF)', position: 'DEF', top: 75, left: 50, team: 'green' },
        { key: 'g_lm', label: 'LM', roleDescription: 'Left Midfield (MID)', position: 'MID', top: 62, left: 24, team: 'green' },
        { key: 'g_rm', label: 'RM', roleDescription: 'Right Midfield (MID)', position: 'MID', top: 62, left: 76, team: 'green' },
        { key: 'g_st', label: 'ST', roleDescription: 'Striker (FWD)', position: 'FWD', top: 48, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_cb', label: 'CB', roleDescription: 'Central Defender (DEF)', position: 'DEF', top: 25, left: 50, team: 'blue' },
        { key: 'b_lm', label: 'LM', roleDescription: 'Left Midfield (MID)', position: 'MID', top: 38, left: 76, team: 'blue' },
        { key: 'b_rm', label: 'RM', roleDescription: 'Right Midfield (MID)', position: 'MID', top: 38, left: 24, team: 'blue' },
        { key: 'b_st', label: 'ST', roleDescription: 'Striker (FWD)', position: 'FWD', top: 52, left: 50, team: 'blue' },
      ],
    },
  },
  '5v5-2-1-1': {
    label: '5v5 (2-1-1 Solid Shield)',
    category: '5v5',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lcb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 75, left: 32, team: 'green' },
        { key: 'g_rcb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 75, left: 68, team: 'green' },
        { key: 'g_cm', label: 'CM', roleDescription: 'Central Mid (MID)', position: 'MID', top: 60, left: 50, team: 'green' },
        { key: 'g_st', label: 'ST', roleDescription: 'Striker (FWD)', position: 'FWD', top: 47, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lcb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 25, left: 68, team: 'blue' },
        { key: 'b_rcb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 25, left: 32, team: 'blue' },
        { key: 'b_cm', label: 'CM', roleDescription: 'Central Mid (MID)', position: 'MID', top: 40, left: 50, team: 'blue' },
        { key: 'b_st', label: 'ST', roleDescription: 'Striker (FWD)', position: 'FWD', top: 53, left: 50, team: 'blue' },
      ],
    },
  },
  '5v5-2-2': {
    label: '5v5 (2-2 Box Attack)',
    category: '5v5',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 74, left: 28, team: 'green' },
        { key: 'g_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 74, left: 72, team: 'green' },
        { key: 'g_lf', label: 'LF', roleDescription: 'Left Forward (FWD)', position: 'FWD', top: 52, left: 30, team: 'green' },
        { key: 'g_rf', label: 'RF', roleDescription: 'Right Forward (FWD)', position: 'FWD', top: 52, left: 70, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 26, left: 72, team: 'blue' },
        { key: 'b_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 26, left: 28, team: 'blue' },
        { key: 'b_lf', label: 'LF', roleDescription: 'Left Forward (FWD)', position: 'FWD', top: 48, left: 70, team: 'blue' },
        { key: 'b_rf', label: 'RF', roleDescription: 'Right Forward (FWD)', position: 'FWD', top: 48, left: 30, team: 'blue' },
      ],
    },
  },

  // -------------------------------------------------------------
  // 6v6 FORMATS
  // -------------------------------------------------------------
  '6v6-2-2-1': {
    label: '6v6 (2-2-1 Balanced Pyramid)',
    category: '6v6',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', roleDescription: 'Left Defender (DEF)', position: 'DEF', top: 75, left: 28, team: 'green' },
        { key: 'g_rb', label: 'RB', roleDescription: 'Right Defender (DEF)', position: 'DEF', top: 75, left: 72, team: 'green' },
        { key: 'g_lm', label: 'LM', roleDescription: 'Left Midfield (MID)', position: 'MID', top: 60, left: 32, team: 'green' },
        { key: 'g_rm', label: 'RM', roleDescription: 'Right Midfield (MID)', position: 'MID', top: 60, left: 68, team: 'green' },
        { key: 'g_st', label: 'ST', roleDescription: 'Center Forward (FWD)', position: 'FWD', top: 47, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', roleDescription: 'Left Defender (DEF)', position: 'DEF', top: 25, left: 72, team: 'blue' },
        { key: 'b_rb', label: 'RB', roleDescription: 'Right Defender (DEF)', position: 'DEF', top: 25, left: 28, team: 'blue' },
        { key: 'b_lm', label: 'LM', roleDescription: 'Left Midfield (MID)', position: 'MID', top: 40, left: 68, team: 'blue' },
        { key: 'b_rm', label: 'RM', roleDescription: 'Right Midfield (MID)', position: 'MID', top: 40, left: 32, team: 'blue' },
        { key: 'b_st', label: 'ST', roleDescription: 'Center Forward (FWD)', position: 'FWD', top: 53, left: 50, team: 'blue' },
      ],
    },
  },
  '6v6-3-1-1': {
    label: '6v6 (3-1-1 Solid Wall)',
    category: '6v6',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lcb', label: 'LCB', roleDescription: 'Left Center Defender (DEF)', position: 'DEF', top: 75, left: 20, team: 'green' },
        { key: 'g_cb', label: 'CB', roleDescription: 'Center Defender (DEF)', position: 'DEF', top: 77, left: 50, team: 'green' },
        { key: 'g_rcb', label: 'RCB', roleDescription: 'Right Center Defender (DEF)', position: 'DEF', top: 75, left: 80, team: 'green' },
        { key: 'g_cm', label: 'CM', roleDescription: 'Central Midfielder (MID)', position: 'MID', top: 60, left: 50, team: 'green' },
        { key: 'g_st', label: 'ST', roleDescription: 'Target Striker (FWD)', position: 'FWD', top: 46, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lcb', label: 'LCB', roleDescription: 'Left Center Defender (DEF)', position: 'DEF', top: 25, left: 80, team: 'blue' },
        { key: 'b_cb', label: 'CB', roleDescription: 'Center Defender (DEF)', position: 'DEF', top: 23, left: 50, team: 'blue' },
        { key: 'b_rcb', label: 'RCB', roleDescription: 'Right Center Defender (DEF)', position: 'DEF', top: 25, left: 20, team: 'blue' },
        { key: 'b_cm', label: 'CM', roleDescription: 'Central Midfielder (MID)', position: 'MID', top: 40, left: 50, team: 'blue' },
        { key: 'b_st', label: 'ST', roleDescription: 'Target Striker (FWD)', position: 'FWD', top: 54, left: 50, team: 'blue' },
      ],
    },
  },
  '6v6-2-1-2': {
    label: '6v6 (2-1-2 Dual Attack)',
    category: '6v6',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', roleDescription: 'Left Defender (DEF)', position: 'DEF', top: 75, left: 28, team: 'green' },
        { key: 'g_rb', label: 'RB', roleDescription: 'Right Defender (DEF)', position: 'DEF', top: 75, left: 72, team: 'green' },
        { key: 'g_cm', label: 'CM', roleDescription: 'Playmaker Midfield (MID)', position: 'MID', top: 61, left: 50, team: 'green' },
        { key: 'g_lf', label: 'LF', roleDescription: 'Left Striker (FWD)', position: 'FWD', top: 48, left: 30, team: 'green' },
        { key: 'g_rf', label: 'RF', roleDescription: 'Right Striker (FWD)', position: 'FWD', top: 48, left: 70, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', roleDescription: 'Left Defender (DEF)', position: 'DEF', top: 25, left: 72, team: 'blue' },
        { key: 'b_rb', label: 'RB', roleDescription: 'Right Defender (DEF)', position: 'DEF', top: 25, left: 28, team: 'blue' },
        { key: 'b_cm', label: 'CM', roleDescription: 'Playmaker Midfield (MID)', position: 'MID', top: 39, left: 50, team: 'blue' },
        { key: 'b_lf', label: 'LF', roleDescription: 'Left Striker (FWD)', position: 'FWD', top: 52, left: 70, team: 'blue' },
        { key: 'b_rf', label: 'RF', roleDescription: 'Right Striker (FWD)', position: 'FWD', top: 52, left: 30, team: 'blue' },
      ],
    },
  },

  // -------------------------------------------------------------
  // 7v7 FORMATS
  // -------------------------------------------------------------
  '7v7-2-3-1': {
    label: '7v7 (2-3-1 Modern Balance)',
    category: '7v7',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 74, left: 26, team: 'green' },
        { key: 'g_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 74, left: 74, team: 'green' },
        { key: 'g_lm', label: 'LM', roleDescription: 'Left Winger (MID)', position: 'MID', top: 59, left: 18, team: 'green' },
        { key: 'g_cm', label: 'CM', roleDescription: 'Central Midfield (MID)', position: 'MID', top: 59, left: 50, team: 'green' },
        { key: 'g_rm', label: 'RM', roleDescription: 'Right Winger (MID)', position: 'MID', top: 59, left: 82, team: 'green' },
        { key: 'g_st', label: 'ST', roleDescription: 'Apex Striker (FWD)', position: 'FWD', top: 46, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 26, left: 74, team: 'blue' },
        { key: 'b_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 26, left: 26, team: 'blue' },
        { key: 'b_lm', label: 'LM', roleDescription: 'Left Winger (MID)', position: 'MID', top: 41, left: 82, team: 'blue' },
        { key: 'b_cm', label: 'CM', roleDescription: 'Central Midfield (MID)', position: 'MID', top: 41, left: 50, team: 'blue' },
        { key: 'b_rm', label: 'RM', roleDescription: 'Right Winger (MID)', position: 'MID', top: 41, left: 18, team: 'blue' },
        { key: 'b_st', label: 'ST', roleDescription: 'Apex Striker (FWD)', position: 'FWD', top: 54, left: 50, team: 'blue' },
      ],
    },
  },
  '7v7-3-2-1': {
    label: '7v7 (3-2-1 Solid Shield)',
    category: '7v7',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', roleDescription: 'Left Defender (DEF)', position: 'DEF', top: 75, left: 20, team: 'green' },
        { key: 'g_cb', label: 'CB', roleDescription: 'Center Defender (DEF)', position: 'DEF', top: 76, left: 50, team: 'green' },
        { key: 'g_rb', label: 'RB', roleDescription: 'Right Defender (DEF)', position: 'DEF', top: 75, left: 80, team: 'green' },
        { key: 'g_lcm', label: 'LCM', roleDescription: 'Left Center Mid (MID)', position: 'MID', top: 60, left: 34, team: 'green' },
        { key: 'g_rcm', label: 'RCM', roleDescription: 'Right Center Mid (MID)', position: 'MID', top: 60, left: 66, team: 'green' },
        { key: 'g_st', label: 'ST', roleDescription: 'Solo Striker (FWD)', position: 'FWD', top: 46, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', roleDescription: 'Left Defender (DEF)', position: 'DEF', top: 25, left: 80, team: 'blue' },
        { key: 'b_cb', label: 'CB', roleDescription: 'Center Defender (DEF)', position: 'DEF', top: 24, left: 50, team: 'blue' },
        { key: 'b_rb', label: 'RB', roleDescription: 'Right Defender (DEF)', position: 'DEF', top: 25, left: 20, team: 'blue' },
        { key: 'b_lcm', label: 'LCM', roleDescription: 'Left Center Mid (MID)', position: 'MID', top: 40, left: 66, team: 'blue' },
        { key: 'b_rcm', label: 'RCM', roleDescription: 'Right Center Mid (MID)', position: 'MID', top: 40, left: 34, team: 'blue' },
        { key: 'b_st', label: 'ST', roleDescription: 'Solo Striker (FWD)', position: 'FWD', top: 54, left: 50, team: 'blue' },
      ],
    },
  },

  // -------------------------------------------------------------
  // 8v8 FORMATS
  // -------------------------------------------------------------
  '8v8-3-3-1': {
    label: '8v8 (3-3-1 Tactical Control)',
    category: '8v8',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 76, left: 22, team: 'green' },
        { key: 'g_cb', label: 'CB', roleDescription: 'Center Back (DEF)', position: 'DEF', top: 77, left: 50, team: 'green' },
        { key: 'g_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 76, left: 78, team: 'green' },
        { key: 'g_lm', label: 'LM', roleDescription: 'Left Midfield (MID)', position: 'MID', top: 61, left: 20, team: 'green' },
        { key: 'g_cm', label: 'CM', roleDescription: 'Central Midfield (MID)', position: 'MID', top: 61, left: 50, team: 'green' },
        { key: 'g_rm', label: 'RM', roleDescription: 'Right Midfield (MID)', position: 'MID', top: 61, left: 80, team: 'green' },
        { key: 'g_st', label: 'ST', roleDescription: 'Striker (FWD)', position: 'FWD', top: 46, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 24, left: 78, team: 'blue' },
        { key: 'b_cb', label: 'CB', roleDescription: 'Center Back (DEF)', position: 'DEF', top: 23, left: 50, team: 'blue' },
        { key: 'b_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 24, left: 22, team: 'blue' },
        { key: 'b_lm', label: 'LM', roleDescription: 'Left Midfield (MID)', position: 'MID', top: 39, left: 80, team: 'blue' },
        { key: 'b_cm', label: 'CM', roleDescription: 'Central Midfield (MID)', position: 'MID', top: 39, left: 50, team: 'blue' },
        { key: 'b_rm', label: 'RM', roleDescription: 'Right Midfield (MID)', position: 'MID', top: 39, left: 20, team: 'blue' },
        { key: 'b_st', label: 'ST', roleDescription: 'Striker (FWD)', position: 'FWD', top: 54, left: 50, team: 'blue' },
      ],
    },
  },

  // -------------------------------------------------------------
  // 9v9 FORMATS
  // -------------------------------------------------------------
  '9v9-3-3-2': {
    label: '9v9 (3-3-2 Dynamic Dual Attack)',
    category: '9v9',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 76, left: 20, team: 'green' },
        { key: 'g_cb', label: 'CB', roleDescription: 'Center Back (DEF)', position: 'DEF', top: 77, left: 50, team: 'green' },
        { key: 'g_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 76, left: 80, team: 'green' },
        { key: 'g_lm', label: 'LM', roleDescription: 'Left Mid (MID)', position: 'MID', top: 61, left: 22, team: 'green' },
        { key: 'g_cm', label: 'CM', roleDescription: 'Center Mid (MID)', position: 'MID', top: 61, left: 50, team: 'green' },
        { key: 'g_rm', label: 'RM', roleDescription: 'Right Mid (MID)', position: 'MID', top: 61, left: 78, team: 'green' },
        { key: 'g_lf', label: 'LF', roleDescription: 'Left Striker (FWD)', position: 'FWD', top: 46, left: 34, team: 'green' },
        { key: 'g_rf', label: 'RF', roleDescription: 'Right Striker (FWD)', position: 'FWD', top: 46, left: 66, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 24, left: 80, team: 'blue' },
        { key: 'b_cb', label: 'CB', roleDescription: 'Center Back (DEF)', position: 'DEF', top: 23, left: 50, team: 'blue' },
        { key: 'b_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 24, left: 20, team: 'blue' },
        { key: 'b_lm', label: 'LM', roleDescription: 'Left Mid (MID)', position: 'MID', top: 39, left: 78, team: 'blue' },
        { key: 'b_cm', label: 'CM', roleDescription: 'Center Mid (MID)', position: 'MID', top: 39, left: 50, team: 'blue' },
        { key: 'b_rm', label: 'RM', roleDescription: 'Right Mid (MID)', position: 'MID', top: 39, left: 22, team: 'blue' },
        { key: 'b_lf', label: 'LF', roleDescription: 'Left Striker (FWD)', position: 'FWD', top: 54, left: 66, team: 'blue' },
        { key: 'b_rf', label: 'RF', roleDescription: 'Right Striker (FWD)', position: 'FWD', top: 54, left: 34, team: 'blue' },
      ],
    },
  },
  '9v9-3-2-3': {
    label: '9v9 (3-2-3 Wide Triad)',
    category: '9v9',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 76, left: 20, team: 'green' },
        { key: 'g_cb', label: 'CB', roleDescription: 'Center Back (DEF)', position: 'DEF', top: 78, left: 50, team: 'green' },
        { key: 'g_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 76, left: 80, team: 'green' },
        { key: 'g_lcm', label: 'LCM', roleDescription: 'Left Center Mid (MID)', position: 'MID', top: 62, left: 36, team: 'green' },
        { key: 'g_rcm', label: 'RCM', roleDescription: 'Right Center Mid (MID)', position: 'MID', top: 62, left: 64, team: 'green' },
        { key: 'g_lw', label: 'LW', roleDescription: 'Left Wing (FWD)', position: 'FWD', top: 47, left: 20, team: 'green' },
        { key: 'g_st', label: 'ST', roleDescription: 'Center Striker (FWD)', position: 'FWD', top: 45, left: 50, team: 'green' },
        { key: 'g_rw', label: 'RW', roleDescription: 'Right Wing (FWD)', position: 'FWD', top: 47, left: 80, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 24, left: 80, team: 'blue' },
        { key: 'b_cb', label: 'CB', roleDescription: 'Center Back (DEF)', position: 'DEF', top: 22, left: 50, team: 'blue' },
        { key: 'b_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 24, left: 20, team: 'blue' },
        { key: 'b_lcm', label: 'LCM', roleDescription: 'Left Center Mid (MID)', position: 'MID', top: 38, left: 64, team: 'blue' },
        { key: 'b_rcm', label: 'RCM', roleDescription: 'Right Center Mid (MID)', position: 'MID', top: 38, left: 36, team: 'blue' },
        { key: 'b_lw', label: 'LW', roleDescription: 'Left Wing (FWD)', position: 'FWD', top: 53, left: 80, team: 'blue' },
        { key: 'b_st', label: 'ST', roleDescription: 'Center Striker (FWD)', position: 'FWD', top: 55, left: 50, team: 'blue' },
        { key: 'b_rw', label: 'RW', roleDescription: 'Right Wing (FWD)', position: 'FWD', top: 53, left: 20, team: 'blue' },
      ],
    },
  },

  // -------------------------------------------------------------
  // 10v10 FORMATS
  // -------------------------------------------------------------
  '10v10-4-3-2': {
    label: '10v10 (4-3-2 Controlled Press)',
    category: '10v10',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 90, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 78, left: 16, team: 'green' },
        { key: 'g_lcb', label: 'LCB', roleDescription: 'Left Center Back (DEF)', position: 'DEF', top: 80, left: 38, team: 'green' },
        { key: 'g_rcb', label: 'RCB', roleDescription: 'Right Center Back (DEF)', position: 'DEF', top: 80, left: 62, team: 'green' },
        { key: 'g_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 78, left: 84, team: 'green' },
        { key: 'g_lm', label: 'LM', roleDescription: 'Left Midfield (MID)', position: 'MID', top: 61, left: 24, team: 'green' },
        { key: 'g_cm', label: 'CM', roleDescription: 'Central Midfield (MID)', position: 'MID', top: 61, left: 50, team: 'green' },
        { key: 'g_rm', label: 'RM', roleDescription: 'Right Midfield (MID)', position: 'MID', top: 61, left: 76, team: 'green' },
        { key: 'g_lf', label: 'LF', roleDescription: 'Left Forward (FWD)', position: 'FWD', top: 46, left: 35, team: 'green' },
        { key: 'g_rf', label: 'RF', roleDescription: 'Right Forward (FWD)', position: 'FWD', top: 46, left: 65, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 10, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 22, left: 84, team: 'blue' },
        { key: 'b_lcb', label: 'LCB', roleDescription: 'Left Center Back (DEF)', position: 'DEF', top: 20, left: 62, team: 'blue' },
        { key: 'b_rcb', label: 'RCB', roleDescription: 'Right Center Back (DEF)', position: 'DEF', top: 20, left: 38, team: 'blue' },
        { key: 'b_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 22, left: 16, team: 'blue' },
        { key: 'b_lm', label: 'LM', roleDescription: 'Left Midfield (MID)', position: 'MID', top: 39, left: 76, team: 'blue' },
        { key: 'b_cm', label: 'CM', roleDescription: 'Central Midfield (MID)', position: 'MID', top: 39, left: 50, team: 'blue' },
        { key: 'b_rm', label: 'RM', roleDescription: 'Right Midfield (MID)', position: 'MID', top: 39, left: 24, team: 'blue' },
        { key: 'b_lf', label: 'LF', roleDescription: 'Left Forward (FWD)', position: 'FWD', top: 54, left: 65, team: 'blue' },
        { key: 'b_rf', label: 'RF', roleDescription: 'Right Forward (FWD)', position: 'FWD', top: 54, left: 35, team: 'blue' },
      ],
    },
  },

  // -------------------------------------------------------------
  // 11v11 FULL PITCH FORMATS
  // -------------------------------------------------------------
  '11v11-4-3-3': {
    label: '11v11 (4-3-3 Total Football)',
    category: '11v11',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 90, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 78, left: 16, team: 'green' },
        { key: 'g_lcb', label: 'LCB', roleDescription: 'Left Center Back (DEF)', position: 'DEF', top: 80, left: 38, team: 'green' },
        { key: 'g_rcb', label: 'RCB', roleDescription: 'Right Center Back (DEF)', position: 'DEF', top: 80, left: 62, team: 'green' },
        { key: 'g_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 78, left: 84, team: 'green' },
        { key: 'g_cdm', label: 'CDM', roleDescription: 'Holding Midfield (MID)', position: 'MID', top: 68, left: 50, team: 'green' },
        { key: 'g_lcm', label: 'LCM', roleDescription: 'Left Central Mid (MID)', position: 'MID', top: 60, left: 32, team: 'green' },
        { key: 'g_rcm', label: 'RCM', roleDescription: 'Right Central Mid (MID)', position: 'MID', top: 60, left: 68, team: 'green' },
        { key: 'g_lw', label: 'LW', roleDescription: 'Left Winger (FWD)', position: 'FWD', top: 48, left: 18, team: 'green' },
        { key: 'g_st', label: 'ST', roleDescription: 'Striker (FWD)', position: 'FWD', top: 45, left: 50, team: 'green' },
        { key: 'g_rw', label: 'RW', roleDescription: 'Right Winger (FWD)', position: 'FWD', top: 48, left: 82, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 10, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 22, left: 84, team: 'blue' },
        { key: 'b_lcb', label: 'LCB', roleDescription: 'Left Center Back (DEF)', position: 'DEF', top: 20, left: 62, team: 'blue' },
        { key: 'b_rcb', label: 'RCB', roleDescription: 'Right Center Back (DEF)', position: 'DEF', top: 20, left: 38, team: 'blue' },
        { key: 'b_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 22, left: 16, team: 'blue' },
        { key: 'b_cdm', label: 'CDM', roleDescription: 'Holding Midfield (MID)', position: 'MID', top: 32, left: 50, team: 'blue' },
        { key: 'b_lcm', label: 'LCM', roleDescription: 'Left Central Mid (MID)', position: 'MID', top: 40, left: 68, team: 'blue' },
        { key: 'b_rcm', label: 'RCM', roleDescription: 'Right Central Mid (MID)', position: 'MID', top: 40, left: 32, team: 'blue' },
        { key: 'b_lw', label: 'LW', roleDescription: 'Left Winger (FWD)', position: 'FWD', top: 52, left: 82, team: 'blue' },
        { key: 'b_st', label: 'ST', roleDescription: 'Striker (FWD)', position: 'FWD', top: 55, left: 50, team: 'blue' },
        { key: 'b_rw', label: 'RW', roleDescription: 'Right Winger (FWD)', position: 'FWD', top: 52, left: 18, team: 'blue' },
      ],
    },
  },
  '11v11-4-4-2': {
    label: '11v11 (4-4-2 Classic)',
    category: '11v11',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 90, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 78, left: 16, team: 'green' },
        { key: 'g_lcb', label: 'LCB', roleDescription: 'Left Center Back (DEF)', position: 'DEF', top: 80, left: 38, team: 'green' },
        { key: 'g_rcb', label: 'RCB', roleDescription: 'Right Center Back (DEF)', position: 'DEF', top: 80, left: 62, team: 'green' },
        { key: 'g_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 78, left: 84, team: 'green' },
        { key: 'g_lm', label: 'LM', roleDescription: 'Left Mid (MID)', position: 'MID', top: 62, left: 18, team: 'green' },
        { key: 'g_lcm', label: 'LCM', roleDescription: 'Left Central Mid (MID)', position: 'MID', top: 62, left: 40, team: 'green' },
        { key: 'g_rcm', label: 'RCM', roleDescription: 'Right Central Mid (MID)', position: 'MID', top: 62, left: 60, team: 'green' },
        { key: 'g_rm', label: 'RM', roleDescription: 'Right Mid (MID)', position: 'MID', top: 62, left: 82, team: 'green' },
        { key: 'g_lf', label: 'LF', roleDescription: 'Left Striker (FWD)', position: 'FWD', top: 46, left: 36, team: 'green' },
        { key: 'g_rf', label: 'RF', roleDescription: 'Right Striker (FWD)', position: 'FWD', top: 46, left: 64, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', roleDescription: 'Goalkeeper', position: 'GK', top: 10, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', roleDescription: 'Left Back (DEF)', position: 'DEF', top: 22, left: 84, team: 'blue' },
        { key: 'b_lcb', label: 'LCB', roleDescription: 'Left Center Back (DEF)', position: 'DEF', top: 20, left: 62, team: 'blue' },
        { key: 'b_rcb', label: 'RCB', roleDescription: 'Right Center Back (DEF)', position: 'DEF', top: 20, left: 38, team: 'blue' },
        { key: 'b_rb', label: 'RB', roleDescription: 'Right Back (DEF)', position: 'DEF', top: 22, left: 16, team: 'blue' },
        { key: 'b_lm', label: 'LM', roleDescription: 'Left Mid (MID)', position: 'MID', top: 38, left: 82, team: 'blue' },
        { key: 'b_lcm', label: 'LCM', roleDescription: 'Left Central Mid (MID)', position: 'MID', top: 38, left: 60, team: 'blue' },
        { key: 'b_rcm', label: 'RCM', roleDescription: 'Right Central Mid (MID)', position: 'MID', top: 38, left: 40, team: 'blue' },
        { key: 'b_rm', label: 'RM', roleDescription: 'Right Mid (MID)', position: 'MID', top: 38, left: 18, team: 'blue' },
        { key: 'b_lf', label: 'LF', roleDescription: 'Left Striker (FWD)', position: 'FWD', top: 54, left: 64, team: 'blue' },
        { key: 'b_rf', label: 'RF', roleDescription: 'Right Striker (FWD)', position: 'FWD', top: 54, left: 36, team: 'blue' },
      ],
    },
  },
};

// Helper to get default formation key matching match format and player count
export const getDefaultFormationForFormat = (format?: string, maxPlayers?: number): string => {
  let resolvedFormat = format;
  if (!resolvedFormat && maxPlayers) {
    if (maxPlayers <= 10) resolvedFormat = '5v5';
    else if (maxPlayers <= 12) resolvedFormat = '6v6';
    else if (maxPlayers <= 14) resolvedFormat = '7v7';
    else if (maxPlayers <= 16) resolvedFormat = '8v8';
    else if (maxPlayers <= 18) resolvedFormat = '9v9';
    else if (maxPlayers <= 20) resolvedFormat = '10v10';
    else resolvedFormat = '11v11';
  }

  switch (resolvedFormat) {
    case '5v5':
      return '5v5-1-2-1';
    case '6v6':
      return '6v6-2-2-1';
    case '7v7':
      return '7v7-2-3-1';
    case '8v8':
      return '8v8-3-3-1';
    case '9v9':
      return '9v9-3-3-2';
    case '10v10':
      return '10v10-4-3-2';
    case '11v11':
      return '11v11-4-3-3';
    default:
      return '7v7-2-3-1';
  }
};

// Helper to normalize formation keys with robust fallbacks matching match format
export const getNormalizedFormationKey = (
  key?: string,
  format?: string,
  maxPlayers?: number
): string => {
  let expectedFormat = format;
  if (!expectedFormat && maxPlayers) {
    if (maxPlayers <= 10) expectedFormat = '5v5';
    else if (maxPlayers <= 12) expectedFormat = '6v6';
    else if (maxPlayers <= 14) expectedFormat = '7v7';
    else if (maxPlayers <= 16) expectedFormat = '8v8';
    else if (maxPlayers <= 18) expectedFormat = '9v9';
    else if (maxPlayers <= 20) expectedFormat = '10v10';
    else expectedFormat = '11v11';
  }

  if (key && FORMATIONS[key]) {
    if (expectedFormat) {
      if (FORMATIONS[key].category === expectedFormat) {
        return key;
      }
    } else {
      return key;
    }
  }

  if (key && expectedFormat) {
    const matchWithCategory = Object.keys(FORMATIONS).find(
      (k) =>
        FORMATIONS[k].category === expectedFormat &&
        (k.endsWith(`-${key}`) || k === `${expectedFormat}-${key}`)
    );
    if (matchWithCategory) return matchWithCategory;
  }

  return getDefaultFormationForFormat(expectedFormat, maxPlayers);
};
