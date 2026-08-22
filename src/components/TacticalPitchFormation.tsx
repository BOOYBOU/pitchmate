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
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { TacticalPitch3DWebGL } from './TacticalPitch3DWebGL';

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

// Helper to normalize formation keys
const getNormalizedFormationKey = (key?: string, format?: string): string => {
  if (key && FORMATIONS[key]) return key;
  if (format === '5v5') return '5v5-1-2-1';
  if (format === '6v6') return '6v6-2-2-1';
  if (format === '7v7') return '7v7-2-3-1';
  if (format === '8v8') return '8v8-3-3-1';
  if (format === '11v11') return '11v11-4-3-3';
  return '6v6-2-2-1';
};

export const TacticalPitchFormation: React.FC<TacticalPitchFormationProps> = ({
  match,
  onUpdateTactical,
  isHostOrAdmin,
}) => {
  const { currentUser, assignPlayerTacticalSlot } = usePitchStore();

  const [formationKey, setFormationKey] = useState<string>(
    getNormalizedFormationKey(match.formationGreen, match.format)
  );
  const [assignments, setAssignments] = useState<Record<string, string>>(
    match.tacticalAssignments || {}
  );
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'green' | 'blue'>('full');

  // Sync state if match updates from broadcast
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

  // Handle slot selection
  const handleSlotClick = (slotKey: string) => {
    if (selectedSlotKey === slotKey) {
      setSelectedSlotKey(null);
    } else {
      setSelectedSlotKey(slotKey);
    }
  };

  // Self Claim Position
  const handleSelfClaimPosition = async (slot: SlotDefinition) => {
    if (!isUserInRoster) return;
    const next = { ...assignments };
    // Remove user from previous slot
    Object.keys(next).forEach((key) => {
      if (next[key] === currentUser.id) delete next[key];
    });
    next[slot.key] = currentUser.id;
    setAssignments(next);
    setSelectedSlotKey(null);

    await assignPlayerTacticalSlot(match.id, slot.key, currentUser.id, slot.position);
    onUpdateTactical?.(formationKey, formationKey, next);
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
    setSelectedSlotKey(null);

    await assignPlayerTacticalSlot(match.id, slotKey, userId, position);
    onUpdateTactical?.(formationKey, formationKey, next);
  };

  // Clear Slot
  const handleClearSlot = async (slotKey: string) => {
    const next = { ...assignments };
    delete next[slotKey];
    setAssignments(next);
    setSelectedSlotKey(null);

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
    if (confirm('Clear all tactical position assignments on the pitch?')) {
      setAssignments({});
      setSelectedSlotKey(null);
      onUpdateTactical?.(formationKey, formationKey, {});
    }
  };

  // Selected slot details
  const allSlots = [...formation.slots.green, ...formation.slots.blue];
  const selectedSlot = allSlots.find((s) => s.key === selectedSlotKey);
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B1120] p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Formation Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-emerald-400" />
              Formation:
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
                className="appearance-none pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer shadow-sm transition-all"
              >
                {categories.map((cat) => (
                  <optgroup
                    key={cat}
                    label={`─── ${cat} FORMATS ───`}
                    className="bg-slate-900 font-bold text-emerald-400"
                  >
                    {Object.entries(FORMATIONS)
                      .filter(([_, val]) => val.category === cat)
                      .map(([key, val]) => (
                        <option key={key} value={key} className="bg-slate-950 text-white font-normal">
                          {val.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
              title="Auto-place confirmed roster players onto tactical pitch slots"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Auto-Fill Lineup
            </button>
          )}

          {isHostOrAdmin && Object.keys(assignments).length > 0 && (
            <button
              id="tactical-reset-btn"
              type="button"
              onClick={handleResetFormation}
              className="px-2.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Reset all positions"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

          {/* Team Filter */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('full')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'full' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Both
            </button>
            <button
              type="button"
              onClick={() => setViewMode('green')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'green' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              Green
            </button>
            <button
              type="button"
              onClick={() => setViewMode('blue')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'blue' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-blue-300'
              }`}
            >
              Blue
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Slot Assignment Drawer */}
      {selectedSlot && (
        <div
          id="slot-assignment-drawer"
          className="bg-[#0E1526] border border-amber-500/50 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    selectedSlot.team === 'green' ? 'bg-emerald-400' : 'bg-blue-400'
                  }`}
                />
                <span>
                  {selectedSlot.team === 'green' ? 'Team Green' : 'Team Blue'} ➔{' '}
                  <strong className="text-amber-400">{selectedSlot.label}</strong> ({selectedSlot.roleDescription})
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click an eligible player below or claim this role for yourself to lock it on the 3D pitch.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Direct Self-Claim Button */}
              {isUserInRoster && userTeam === selectedSlot.team && (
                <button
                  id="self-claim-slot-btn"
                  type="button"
                  onClick={() => handleSelfClaimPosition(selectedSlot)}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <UserCheck className="w-4 h-4" />
                  Claim {selectedSlot.label} as {currentUser.name.split(' ')[0]}
                </button>
              )}

              {/* Clear Slot */}
              {assignments[selectedSlot.key] && (isHostOrAdmin || assignments[selectedSlot.key] === currentUser.id) && (
                <button
                  id="clear-slot-btn"
                  type="button"
                  onClick={() => handleClearSlot(selectedSlot.key)}
                  className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Slot
                </button>
              )}
            </div>
          </div>

          {/* Player Candidates Roster List */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Assign Roster Player:
            </span>
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
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-md'
                        : isAssignedElsewhere
                        ? 'bg-slate-900 text-slate-400 border border-slate-800'
                        : selectedSlot.team === 'green'
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30'
                        : 'bg-blue-500/15 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30'
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
                  No confirmed players on this team roster yet. Join match to claim!
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
        <div className="bg-[#0B1120] p-4 rounded-2xl border border-emerald-500/20 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2.5">
            <span>Team Green Squad ({greenPlayers.length})</span>
            <span className="text-[10px] text-slate-400">
              {Object.keys(assignments).filter((k) => k.startsWith('g_')).length} / {formation.slots.green.length} Roles Assigned
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="font-semibold">{player.name}</span>
                  {slotDef ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {slotDef.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">Unassigned</span>
                  )}
                </div>
              );
            })}
            {greenPlayers.length === 0 && (
              <span className="text-xs text-slate-500 py-1">No players assigned to Team Green yet.</span>
            )}
          </div>
        </div>

        {/* Team Blue Lineup & Bench */}
        <div className="bg-[#0B1120] p-4 rounded-2xl border border-blue-500/20 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-blue-400 mb-2.5">
            <span>Team Blue Squad ({bluePlayers.length})</span>
            <span className="text-[10px] text-slate-400">
              {Object.keys(assignments).filter((k) => k.startsWith('b_')).length} / {formation.slots.blue.length} Roles Assigned
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="font-semibold">{player.name}</span>
                  {slotDef ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800">
                      {slotDef.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">Unassigned</span>
                  )}
                </div>
              );
            })}
            {bluePlayers.length === 0 && (
              <span className="text-xs text-slate-500 py-1">No players assigned to Team Blue yet.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
