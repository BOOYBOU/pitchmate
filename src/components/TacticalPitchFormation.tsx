import React, { useState } from 'react';
import { SoccerMatch, PlayerPosition, TeamSide } from '../types';
import {
  Sparkles,
  Check,
  ChevronDown,
  Lock,
  UserCheck,
  Shirt,
  Rotate3d,
  Layers,
  Trash2,
  Eye,
  Sliders,
  Shield,
  Compass,
  CheckCircle2,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { TacticalPitch3DWebGL } from './TacticalPitch3DWebGL';
import { SoundEffects } from '../lib/audioService';

interface TacticalPitchFormationProps {
  match: SoccerMatch;
  onUpdateTactical?: (formationGreen: string, formationBlue: string, tacticalAssignments: Record<string, string>) => void;
  isHostOrAdmin?: boolean;
}

export interface SlotDefinition {
  key: string;
  label: string;
  roleDescription: string;
  position: PlayerPosition;
  top: number; // percentage 0-100
  left: number; // percentage 0-100
  team: 'green' | 'blue';
}

export function getPositionArabicLabel(position: PlayerPosition, label: string): string {
  switch (label.toUpperCase()) {
    case 'GK':
      return 'حارس مرمى (GK)';
    case 'CB':
      return 'قلب دفاع (CB)';
    case 'LB':
      return 'ظهير أيسر (LB)';
    case 'RB':
      return 'ظهير أيمن (RB)';
    case 'CDM':
      return 'وسط دفاعي / ارتكاز (CDM)';
    case 'CM':
      return 'وسط ميدان (CM)';
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

export interface FormationConfig {
  label: string;
  category: '5v5' | '6v6' | '7v7' | '8v8' | '9v9' | '10v10' | '11v11';
  slots: { green: SlotDefinition[]; blue: SlotDefinition[] };
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
  // 8v8 & 9v9 FORMATS
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
  // 1. Determine expected format category
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

  // 2. If a key is passed and exists in FORMATIONS
  if (key && FORMATIONS[key]) {
    // If match format is specified, verify the key actually belongs to this format
    if (expectedFormat) {
      if (FORMATIONS[key].category === expectedFormat) {
        return key;
      }
    } else {
      return key;
    }
  }

  // 3. If key is a shorthand like '2-2-1' or '2-3-1', find matching key within expected category
  if (key && expectedFormat) {
    const matchWithCategory = Object.keys(FORMATIONS).find(
      (k) =>
        FORMATIONS[k].category === expectedFormat &&
        (k.endsWith(`-${key}`) || k === `${expectedFormat}-${key}`)
    );
    if (matchWithCategory) return matchWithCategory;
  }

  // 4. Default strictly to the formation for this match format!
  return getDefaultFormationForFormat(expectedFormat, maxPlayers);
};

export const TacticalPitchFormation: React.FC<TacticalPitchFormationProps> = ({
  match,
  onUpdateTactical,
  isHostOrAdmin,
}) => {
  const { currentUser, assignPlayerTacticalSlot, joinMatch, assignPlayerTeam } = usePitchStore();
  const { t, language, isRTL } = useLanguage();

  const [formationKey, setFormationKey] = useState<string>(
    getNormalizedFormationKey(match.formationGreen, match.format, match.maxPlayers)
  );
  const [assignments, setAssignments] = useState<Record<string, string>>(
    match.tacticalAssignments || {}
  );
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'green' | 'blue'>('full');
  const [isConfirmingPosition, setIsConfirmingPosition] = useState(false);
  const [confirmationSuccessMsg, setConfirmationSuccessMsg] = useState<string | null>(null);

  // Sync state if match format, match ID, or formation changes
  React.useEffect(() => {
    const normalized = getNormalizedFormationKey(match.formationGreen, match.format, match.maxPlayers);
    setFormationKey(normalized);
  }, [match.id, match.format, match.formationGreen, match.maxPlayers]);

  // Sync assignments if match updates from broadcast
  React.useEffect(() => {
    if (match.tacticalAssignments) {
      setAssignments(match.tacticalAssignments);
    }
  }, [match.tacticalAssignments]);

  const formation = FORMATIONS[formationKey] || FORMATIONS['6v6-2-2-1'] || FORMATIONS['7v7-2-3-1'];
  const greenPlayers = match.roster.filter((p) => p.team === 'green');
  const bluePlayers = match.roster.filter((p) => p.team === 'blue');

  const isUserInRoster = match.roster.some((p) => p.userId === currentUser.id);
  const userTeam = match.roster.find((p) => p.userId === currentUser.id)?.team;

  // Selected slot details
  const allSlots = [...formation.slots.green, ...formation.slots.blue];
  const selectedSlot = allSlots.find((s) => s.key === selectedSlotKey);
  const isSelectedSlotOccupiedByMe = selectedSlot ? assignments[selectedSlot.key] === currentUser.id : false;
  const currentOccupantId = selectedSlot ? assignments[selectedSlot.key] : null;
  const currentOccupantPlayer = currentOccupantId ? match.roster.find((p) => p.userId === currentOccupantId) : null;

  // Handle slot selection
  const handleSlotClick = (slotKey: string) => {
    if (selectedSlotKey === slotKey) {
      setSelectedSlotKey(null);
    } else {
      setSelectedSlotKey(slotKey);
      setConfirmationSuccessMsg(null);
    }
  };

  // Primary Position Confirmation Function
  const handleConfirmMyPosition = async (slot: SlotDefinition) => {
    setIsConfirmingPosition(true);
    try {
      // 1. Join match roster if not already joined
      if (!isUserInRoster) {
        await joinMatch(match.id, slot.team);
      } else if (userTeam !== slot.team) {
        // Switch team side if user is on opposite team
        await assignPlayerTeam(match.id, currentUser.id, slot.team);
      }

      // 2. Prepare new assignments
      const next = { ...assignments };
      // Remove current user from any previous position
      Object.keys(next).forEach((key) => {
        if (next[key] === currentUser.id) delete next[key];
      });
      next[slot.key] = currentUser.id;
      setAssignments(next);

      // 3. Assign tactical slot in store
      await assignPlayerTacticalSlot(match.id, slot.key, currentUser.id, slot.position);
      onUpdateTactical?.(formationKey, formationKey, next);

      // 4. Trigger audio fanfare and success state
      SoundEffects.playJoin();
      const posLabel = getPositionArabicLabel(slot.position, slot.label);
      const teamLabel = slot.team === 'green' ? (language === 'ar' ? 'الفريق الأخضر' : 'Team Green') : (language === 'ar' ? 'الفريق الأزرق' : 'Team Blue');
      
      const successText = language === 'ar'
        ? `✅ تم تثبيت وتأكيد مركزك في الملعب: ${slot.label} - ${posLabel} في ${teamLabel}!`
        : `✅ Position confirmed & locked: ${slot.label} - ${posLabel} in ${teamLabel}!`;

      setConfirmationSuccessMsg(successText);

      setTimeout(() => {
        setConfirmationSuccessMsg(null);
      }, 5000);
    } catch (err) {
      console.error('Failed to confirm position:', err);
    } finally {
      setIsConfirmingPosition(false);
    }
  };

  // Direct Self Claim Position (alias for backwards compatibility)
  const handleSelfClaimPosition = async (slot: SlotDefinition) => {
    await handleConfirmMyPosition(slot);
  };

  // Host/Admin Assign Player
  const handleAssignPlayer = async (slotKey: string, userId: string, position: PlayerPosition) => {
    const next = { ...assignments };
    // Remove user from other slots
    Object.keys(next).forEach((key) => {
      if (next[key] === userId) delete next[key];
    });
    next[slotKey] = userId;
    setAssignments(next);

    await assignPlayerTacticalSlot(match.id, slotKey, userId, position);
    onUpdateTactical?.(formationKey, formationKey, next);
  };

  // Clear Slot
  const handleClearSlot = async (slotKey: string) => {
    const next = { ...assignments };
    delete next[slotKey];
    setAssignments(next);
    setSelectedSlotKey(null);
    setConfirmationSuccessMsg(null);

    await assignPlayerTacticalSlot(match.id, slotKey, '');
    onUpdateTactical?.(formationKey, formationKey, next);
  };

  // Smart Auto-Fill Lineup
  const handleAutoFillFormation = () => {
    const next: Record<string, string> = { ...assignments };

    // Auto-fill Green slots
    formation.slots.green.forEach((slot) => {
      if (!next[slot.key]) {
        const matching = greenPlayers.find(
          (p) =>
            (p.position === slot.position || p.position === 'ANY' || !p.position) &&
            !Object.values(next).includes(p.userId)
        );
        if (matching) {
          next[slot.key] = matching.userId;
        } else {
          const unassigned = greenPlayers.find((p) => !Object.values(next).includes(p.userId));
          if (unassigned) next[slot.key] = unassigned.userId;
        }
      }
    });

    // Auto-fill Blue slots
    formation.slots.blue.forEach((slot) => {
      if (!next[slot.key]) {
        const matching = bluePlayers.find(
          (p) =>
            (p.position === slot.position || p.position === 'ANY' || !p.position) &&
            !Object.values(next).includes(p.userId)
        );
        if (matching) {
          next[slot.key] = matching.userId;
        } else {
          const unassigned = bluePlayers.find((p) => !Object.values(next).includes(p.userId));
          if (unassigned) next[slot.key] = unassigned.userId;
        }
      }
    });

    setAssignments(next);
    onUpdateTactical?.(formationKey, formationKey, next);
  };

  // Reset / Clear All Slots
  const handleResetFormation = () => {
    const confirmPrompt = language === 'ar' ? 'هل أنت متأكد من رغبتك في تفريغ كافة المراكز التكتيكية في الملعب؟' : 'Clear all tactical position assignments on the pitch?';
    if (confirm(confirmPrompt)) {
      setAssignments({});
      setSelectedSlotKey(null);
      onUpdateTactical?.(formationKey, formationKey, {});
    }
  };

  // Eligible candidate players for selected slot
  const eligiblePlayers = selectedSlot
    ? selectedSlot.team === 'green'
      ? greenPlayers
      : bluePlayers
    : [];

  const categories: Array<'5v5' | '6v6' | '7v7' | '8v8' | '9v9' | '10v10' | '11v11'> = [
    '5v5',
    '6v6',
    '7v7',
    '8v8',
    '9v9',
    '10v10',
    '11v11',
  ];

  return (
    <div id="3d-tactical-pitch-container" className="space-y-4">
      {/* 3D Tactical Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141A26] p-3 sm:p-4 rounded-2xl border border-[#E5B869]/30 shadow-xl">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Formation Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-[#E5B869]" />
              {language === 'ar' ? 'الخطة التكتيكية:' : 'Formation:'}
            </span>
            <div className="relative">
              <select
                id="tactical-formation-select"
                value={formationKey}
                onChange={(e) => {
                  const key = e.target.value;
                  setFormationKey(key);
                  onUpdateTactical?.(key, key, assignments);
                }}
                className="appearance-none pl-3 pr-8 py-2 bg-[#080B10] border border-[#E5B869]/30 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#E5B869] cursor-pointer shadow-sm transition-all"
              >
                {categories.map((cat) => (
                  <optgroup
                    key={cat}
                    label={`─── ${cat} ───`}
                    className="bg-[#080B10] font-bold text-[#F5D794]"
                  >
                    {Object.entries(FORMATIONS)
                      .filter(([_, val]) => val.category === cat)
                      .map(([key, val]) => (
                        <option key={key} value={key} className="bg-[#080B10] text-white font-normal">
                          {val.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#E5B869] absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action Controls: Auto-Fill, Clear & Team Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {isHostOrAdmin && (
            <button
              id="tactical-autofill-btn"
              type="button"
              onClick={handleAutoFillFormation}
              className="px-3 py-1.5 bg-[#0D503C]/40 hover:bg-[#0D503C]/60 text-[#F5D794] border border-[#E5B869]/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
              title={language === 'ar' ? 'توزيع اللاعبين المؤكدين تلقائياً على مراكز الخطة' : 'Auto-place confirmed roster players onto tactical pitch slots'}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E5B869]" />
              {language === 'ar' ? 'توزيع التشكيلة تلقائياً' : 'Auto-Fill Lineup'}
            </button>
          )}

          {isHostOrAdmin && Object.keys(assignments).length > 0 && (
            <button
              id="tactical-reset-btn"
              type="button"
              onClick={handleResetFormation}
              className="px-2.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title={language === 'ar' ? 'إعادة ضبط كافة المراكز' : 'Reset all positions'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {language === 'ar' ? 'إعادة ضبط' : 'Reset'}
            </button>
          )}

          {/* Team Filter */}
          <div className="flex items-center bg-[#080B10] p-1 rounded-xl border border-[#E5B869]/20">
            <button
              type="button"
              onClick={() => setViewMode('full')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'full' ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'ar' ? 'الفريقين' : 'Both'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('green')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'green' ? 'bg-[#0D503C] text-[#F5D794] font-black border border-[#E5B869]/40' : 'text-slate-400 hover:text-[#F5D794]'
              }`}
            >
              {t('matches.greenTeam')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('blue')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'blue' ? 'bg-[#241A0B] text-[#F5D794] font-black border border-[#E5B869]/40' : 'text-slate-400 hover:text-[#E5B869]'
              }`}
            >
              {t('matches.blueTeam')}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Success Toast / Banner */}
      {confirmationSuccessMsg && (
        <div
          id="position-confirmation-success-banner"
          className="bg-gradient-to-r from-[#0D503C]/90 via-[#241A0B]/90 to-[#141A26] border-2 border-[#E5B869]/80 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 text-white animate-in zoom-in-95 duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E5B869]/20 border border-[#E5B869]/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-[#E5B869]" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-[#F5D794]">
                {language === 'ar' ? 'تم تثبيت وتأكيد المركز' : 'Position Confirmed & Locked'}
              </div>
              <div className="text-sm font-bold text-slate-100 mt-0.5">
                {confirmationSuccessMsg}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmationSuccessMsg(null)}
            className="px-3 py-1.5 bg-[#E5B869]/20 hover:bg-[#E5B869]/30 text-[#F5D794] text-xs font-bold rounded-xl border border-[#E5B869]/30 cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Interactive Slot Assignment & Confirmation Drawer */}
      {selectedSlot && (
        <div
          id="slot-assignment-drawer"
          className="bg-gradient-to-b from-[#141A26] to-[#080B10] border-2 border-[#E5B869]/50 rounded-3xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200"
        >
          {/* Header with Slot Identity */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5B869]/20">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg border ${
                  selectedSlot.team === 'green'
                    ? 'bg-[#0D503C]/80 border-[#E5B869] text-[#F5D794]'
                    : 'bg-[#241A0B] border-[#E5B869] text-[#F5D794]'
                }`}
              >
                <span className="text-base leading-none">{selectedSlot.label}</span>
                <span className="text-[9px] uppercase tracking-tighter text-slate-400 mt-0.5">
                  {selectedSlot.position}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedSlot.team === 'green'
                        ? 'bg-[#0D503C]/30 text-[#F5D794] border border-[#E5B869]/40'
                        : 'bg-[#241A0B] text-[#F5D794] border border-[#E5B869]/40'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedSlot.team === 'green' ? 'bg-[#0D503C]' : 'bg-[#E5B869]'}`} />
                    {selectedSlot.team === 'green' ? (language === 'ar' ? 'الفريق الأخضر' : 'Team Green') : (language === 'ar' ? 'الفريق الأزرق' : 'Team Blue')}
                  </span>

                  <span className="text-sm font-black text-[#F5D794]">
                    {getPositionArabicLabel(selectedSlot.position, selectedSlot.label)}
                  </span>
                </div>

                <div className="text-xs text-slate-300 mt-1 font-medium flex items-center gap-2">
                  <span>{selectedSlot.roleDescription}</span>
                  {currentOccupantPlayer && (
                    <span className="text-slate-400 text-[11px]">
                      • {language === 'ar' ? 'يشغله حالياً:' : 'Currently:'} <strong className="text-white">{currentOccupantPlayer.name}</strong>
                    </span>
                  )}
                  {!currentOccupantPlayer && (
                    <span className="text-[#E5B869] text-[11px] font-bold">
                      • {language === 'ar' ? 'مركز شاغر ومتاح' : 'Vacant Role'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* DIRECT ACTION BUTTONS (CONFIRM POSITION BUTTON) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* PRIMARY POSITION CONFIRMATION BUTTON */}
              <button
                id="confirm-tactical-position-btn"
                type="button"
                disabled={isConfirmingPosition}
                onClick={() => handleConfirmMyPosition(selectedSlot)}
                className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shadow-xl cursor-pointer active:scale-95 ${
                  isSelectedSlotOccupiedByMe
                    ? 'bg-[#E5B869] text-slate-950 ring-2 ring-[#F5D794] shadow-amber-950/30'
                    : 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 text-slate-950 shadow-amber-950/30 border border-[#F5D794]'
                }`}
              >
                {isConfirmingPosition ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>{language === 'ar' ? 'جارٍ تأكيد المركز...' : 'Confirming Position...'}</span>
                  </>
                ) : isSelectedSlotOccupiedByMe ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-slate-950" />
                    <span>{language === 'ar' ? `تم حجز مركزك (${selectedSlot.label})` : `Confirmed Position (${selectedSlot.label})`}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>{language === 'ar' ? `تأكيد واختيار المركز (${selectedSlot.label})` : `Confirm Position (${selectedSlot.label})`}</span>
                  </>
                )}
              </button>

              {/* Clear Slot (Host/Admin or Current Player) */}
              {assignments[selectedSlot.key] && (isHostOrAdmin || assignments[selectedSlot.key] === currentUser.id) && (
                <button
                  id="clear-slot-btn"
                  type="button"
                  onClick={() => handleClearSlot(selectedSlot.key)}
                  className="px-3.5 py-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title={language === 'ar' ? 'إلغاء تعيين المركز' : 'Clear position assignment'}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تفريغ' : 'Clear'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Host / Admin Player Candidates List */}
          <div className="pt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="uppercase tracking-wider">
                {language === 'ar'
                  ? `أو قم بتعيين لاعب آخر من التشكيلة (${selectedSlot.team === 'green' ? 'الأخضر' : 'الأزرق'}):`
                  : `Or Assign Another Roster Teammate (${selectedSlot.team === 'green' ? 'Green' : 'Blue'}):`}
              </span>
              <span>{language === 'ar' ? 'اضغط على لاعب لوضعه في هذا المركز' : 'Click a teammate to place them here'}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {eligiblePlayers.map((player) => {
                const isCurrent = assignments[selectedSlot.key] === player.userId;
                const isAssignedElsewhere = Object.entries(assignments).some(
                  ([k, uId]) => k !== selectedSlot.key && uId === player.userId
                );

                return (
                  <button
                    key={player.userId}
                    type="button"
                    onClick={() => handleAssignPlayer(selectedSlot.key, player.userId, selectedSlot.position)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isCurrent
                        ? 'bg-[#E5B869] text-slate-950 ring-2 ring-[#F5D794] shadow-md font-black'
                        : isAssignedElsewhere
                        ? 'bg-[#080B10] text-slate-400 border border-slate-800 hover:border-slate-700'
                        : selectedSlot.team === 'green'
                        ? 'bg-[#0D503C]/30 hover:bg-[#0D503C]/50 text-[#F5D794] border border-[#E5B869]/30'
                        : 'bg-[#241A0B] hover:bg-[#342410] text-[#F5D794] border border-[#E5B869]/30'
                    }`}
                  >
                    <img
                      src={player.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`}
                      alt={player.name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span>{player.name}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
              {eligiblePlayers.length === 0 && (
                <div className="text-xs text-slate-400 py-1">
                  {language === 'ar' ? 'لا يوجد لاعبون آخرون مؤكدون في تشكيلة هذا الفريق بعد.' : 'No other confirmed players on this team roster yet.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TRUE 3D WEBGL SOCCER STADIUM & PITCH CANVAS */}
      <TacticalPitch3DWebGL
        match={match}
        formation={formation}
        assignments={assignments}
        selectedSlotKey={selectedSlotKey}
        viewMode={viewMode}
        onSelectSlot={(key) => handleSlotClick(key)}
        onSelfClaimSlot={(slot) => handleSelfClaimPosition(slot)}
      />

      {/* Roster Bench Breakdown & Position Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Team Green Lineup & Bench */}
        <div className="bg-[#141A26] p-4 rounded-2xl border border-[#0D503C]/40 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-[#F5D794] mb-2.5">
            <span>{language === 'ar' ? `تشكيلة الفريق الأخضر (${greenPlayers.length})` : `Team Green Squad (${greenPlayers.length})`}</span>
            <span className="text-[10px] text-slate-400">
              {Object.keys(assignments).filter((k) => k.startsWith('g_')).length} / {formation.slots.green.length} {language === 'ar' ? 'مراكز محجوزة' : 'Roles Assigned'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {greenPlayers.map((player) => {
              const assignedSlotKey = Object.entries(assignments).find(
                ([_, uId]) => uId === player.userId
              )?.[0];
              const slotDef = formation.slots.green.find((s) => s.key === assignedSlotKey);

              return (
                <div
                  key={player.userId}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#080B10] border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-[#0D503C] shrink-0" />
                  <span className="font-semibold">{player.name}</span>
                  {slotDef ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#0D503C] text-[#F5D794] border border-[#E5B869]/30">
                      {slotDef.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">
                      {language === 'ar' ? 'بدون مركز' : 'Unassigned'}
                    </span>
                  )}
                </div>
              );
            })}
            {greenPlayers.length === 0 && (
              <span className="text-xs text-slate-500 py-1">
                {language === 'ar' ? 'لا يوجد لاعبون مسجلون في الفريق الأخضر بعد.' : 'No players assigned to Team Green yet.'}
              </span>
            )}
          </div>
        </div>

        {/* Team Blue Lineup & Bench */}
        <div className="bg-[#141A26] p-4 rounded-2xl border border-[#E5B869]/30 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-[#E5B869] mb-2.5">
            <span>{language === 'ar' ? `تشكيلة الفريق الذهبي/الأزرق (${bluePlayers.length})` : `Team Blue Squad (${bluePlayers.length})`}</span>
            <span className="text-[10px] text-slate-400">
              {Object.keys(assignments).filter((k) => k.startsWith('b_')).length} / {formation.slots.blue.length} {language === 'ar' ? 'مراكز محجوزة' : 'Roles Assigned'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bluePlayers.map((player) => {
              const assignedSlotKey = Object.entries(assignments).find(
                ([_, uId]) => uId === player.userId
              )?.[0];
              const slotDef = formation.slots.blue.find((s) => s.key === assignedSlotKey);

              return (
                <div
                  key={player.userId}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#080B10] border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-[#E5B869] shrink-0" />
                  <span className="font-semibold">{player.name}</span>
                  {slotDef ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#241A0B] text-[#F5D794] border border-[#E5B869]/40">
                      {slotDef.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">
                      {language === 'ar' ? 'بدون مركز' : 'Unassigned'}
                    </span>
                  )}
                </div>
              );
            })}
            {bluePlayers.length === 0 && (
              <span className="text-xs text-slate-500 py-1">
                {language === 'ar' ? 'لا يوجد لاعبون مسجلون في الفريق الأزرق بعد.' : 'No players assigned to Team Blue yet.'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
