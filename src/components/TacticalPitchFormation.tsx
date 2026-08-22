import React, { useState } from 'react';
import { SoccerMatch, PlayerPosition } from '../types';
import { Sparkles, Check, ChevronDown } from 'lucide-react';

interface TacticalPitchFormationProps {
  match: SoccerMatch;
  onUpdateTactical?: (formationGreen: string, formationBlue: string, tacticalAssignments: Record<string, string>) => void;
  isHostOrAdmin?: boolean;
}

interface SlotDefinition {
  key: string;
  label: string;
  position: PlayerPosition;
  top: number; // percentage 0-100
  left: number; // percentage 0-100
  team: 'green' | 'blue';
}

interface FormationConfig {
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
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_cb', label: 'CB', position: 'DEF', top: 74, left: 50, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 60, left: 24, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 60, left: 76, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 45, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_cb', label: 'CB', position: 'DEF', top: 26, left: 50, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 40, left: 76, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 40, left: 24, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 55, left: 50, team: 'blue' },
      ],
    },
  },
  '5v5-2-1-1': {
    label: '5v5 (2-1-1 Solid Shield)',
    category: '5v5',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lcb', label: 'LB', position: 'DEF', top: 74, left: 32, team: 'green' },
        { key: 'g_rcb', label: 'RB', position: 'DEF', top: 74, left: 68, team: 'green' },
        { key: 'g_cm', label: 'CM', position: 'MID', top: 59, left: 50, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 45, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lcb', label: 'LB', position: 'DEF', top: 26, left: 68, team: 'blue' },
        { key: 'b_rcb', label: 'RB', position: 'DEF', top: 26, left: 32, team: 'blue' },
        { key: 'b_cm', label: 'CM', position: 'MID', top: 41, left: 50, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 55, left: 50, team: 'blue' },
      ],
    },
  },
  '5v5-2-2': {
    label: '5v5 (2-2 Box Attack)',
    category: '5v5',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 73, left: 28, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 73, left: 72, team: 'green' },
        { key: 'g_lf', label: 'LF', position: 'FWD', top: 50, left: 30, team: 'green' },
        { key: 'g_rf', label: 'RF', position: 'FWD', top: 50, left: 70, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 27, left: 72, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 27, left: 28, team: 'blue' },
        { key: 'b_lf', label: 'LF', position: 'FWD', top: 50, left: 70, team: 'blue' },
        { key: 'b_rf', label: 'RF', position: 'FWD', top: 50, left: 30, team: 'blue' },
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
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 74, left: 28, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 74, left: 72, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 59, left: 32, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 59, left: 68, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 45, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 26, left: 72, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 26, left: 28, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 41, left: 68, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 41, left: 32, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 55, left: 50, team: 'blue' },
      ],
    },
  },
  '6v6-3-1-1': {
    label: '6v6 (3-1-1 Solid Wall)',
    category: '6v6',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lcb', label: 'LCB', position: 'DEF', top: 74, left: 20, team: 'green' },
        { key: 'g_cb', label: 'CB', position: 'DEF', top: 76, left: 50, team: 'green' },
        { key: 'g_rcb', label: 'RCB', position: 'DEF', top: 74, left: 80, team: 'green' },
        { key: 'g_cm', label: 'CM', position: 'MID', top: 58, left: 50, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 44, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lcb', label: 'LCB', position: 'DEF', top: 26, left: 80, team: 'blue' },
        { key: 'b_cb', label: 'CB', position: 'DEF', top: 24, left: 50, team: 'blue' },
        { key: 'b_rcb', label: 'RCB', position: 'DEF', top: 26, left: 20, team: 'blue' },
        { key: 'b_cm', label: 'CM', position: 'MID', top: 42, left: 50, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 56, left: 50, team: 'blue' },
      ],
    },
  },
  '6v6-2-1-2': {
    label: '6v6 (2-1-2 Dual Attack)',
    category: '6v6',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 74, left: 28, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 74, left: 72, team: 'green' },
        { key: 'g_cm', label: 'CM', position: 'MID', top: 60, left: 50, team: 'green' },
        { key: 'g_lf', label: 'LF', position: 'FWD', top: 46, left: 30, team: 'green' },
        { key: 'g_rf', label: 'RF', position: 'FWD', top: 46, left: 70, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 26, left: 72, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 26, left: 28, team: 'blue' },
        { key: 'b_cm', label: 'CM', position: 'MID', top: 40, left: 50, team: 'blue' },
        { key: 'b_lf', label: 'LF', position: 'FWD', top: 54, left: 70, team: 'blue' },
        { key: 'b_rf', label: 'RF', position: 'FWD', top: 54, left: 30, team: 'blue' },
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
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 73, left: 26, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 73, left: 74, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 58, left: 18, team: 'green' },
        { key: 'g_cm', label: 'CM', position: 'MID', top: 58, left: 50, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 58, left: 82, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 44, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 27, left: 74, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 27, left: 26, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 42, left: 82, team: 'blue' },
        { key: 'b_cm', label: 'CM', position: 'MID', top: 42, left: 50, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 42, left: 18, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 56, left: 50, team: 'blue' },
      ],
    },
  },
  '7v7-3-2-1': {
    label: '7v7 (3-2-1 Solid Defense)',
    category: '7v7',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lcb', label: 'LCB', position: 'DEF', top: 73, left: 20, team: 'green' },
        { key: 'g_cb', label: 'CB', position: 'DEF', top: 75, left: 50, team: 'green' },
        { key: 'g_rcb', label: 'RCB', position: 'DEF', top: 73, left: 80, team: 'green' },
        { key: 'g_lcm', label: 'LCM', position: 'MID', top: 58, left: 34, team: 'green' },
        { key: 'g_rcm', label: 'RCM', position: 'MID', top: 58, left: 66, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 44, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lcb', label: 'LCB', position: 'DEF', top: 27, left: 80, team: 'blue' },
        { key: 'b_cb', label: 'CB', position: 'DEF', top: 25, left: 50, team: 'blue' },
        { key: 'b_rcb', label: 'RCB', position: 'DEF', top: 27, left: 20, team: 'blue' },
        { key: 'b_lcm', label: 'LCM', position: 'MID', top: 42, left: 66, team: 'blue' },
        { key: 'b_rcm', label: 'RCM', position: 'MID', top: 42, left: 34, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 56, left: 50, team: 'blue' },
      ],
    },
  },
  '7v7-2-2-2': {
    label: '7v7 (2-2-2 Box & Strikers)',
    category: '7v7',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 74, left: 26, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 74, left: 74, team: 'green' },
        { key: 'g_lcm', label: 'LCM', position: 'MID', top: 59, left: 34, team: 'green' },
        { key: 'g_rcm', label: 'RCM', position: 'MID', top: 59, left: 66, team: 'green' },
        { key: 'g_lf', label: 'LF', position: 'FWD', top: 45, left: 30, team: 'green' },
        { key: 'g_rf', label: 'RF', position: 'FWD', top: 45, left: 70, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 26, left: 74, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 26, left: 26, team: 'blue' },
        { key: 'b_lcm', label: 'LCM', position: 'MID', top: 41, left: 66, team: 'blue' },
        { key: 'b_rcm', label: 'RCM', position: 'MID', top: 41, left: 34, team: 'blue' },
        { key: 'b_lf', label: 'LF', position: 'FWD', top: 55, left: 70, team: 'blue' },
        { key: 'b_rf', label: 'RF', position: 'FWD', top: 55, left: 30, team: 'blue' },
      ],
    },
  },

  // -------------------------------------------------------------
  // 8v8 FORMATS
  // -------------------------------------------------------------
  '8v8-3-3-1': {
    label: '8v8 (3-3-1 Balanced Wingers)',
    category: '8v8',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lcb', label: 'LCB', position: 'DEF', top: 74, left: 20, team: 'green' },
        { key: 'g_cb', label: 'CB', position: 'DEF', top: 76, left: 50, team: 'green' },
        { key: 'g_rcb', label: 'RCB', position: 'DEF', top: 74, left: 80, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 58, left: 20, team: 'green' },
        { key: 'g_cm', label: 'CM', position: 'MID', top: 60, left: 50, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 58, left: 80, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 45, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lcb', label: 'LCB', position: 'DEF', top: 26, left: 80, team: 'blue' },
        { key: 'b_cb', label: 'CB', position: 'DEF', top: 24, left: 50, team: 'blue' },
        { key: 'b_rcb', label: 'RCB', position: 'DEF', top: 26, left: 20, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 42, left: 80, team: 'blue' },
        { key: 'b_cm', label: 'CM', position: 'MID', top: 40, left: 50, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 42, left: 20, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 55, left: 50, team: 'blue' },
      ],
    },
  },
  '8v8-2-4-1': {
    label: '8v8 (2-4-1 Midfield Overload)',
    category: '8v8',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 74, left: 28, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 74, left: 72, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 59, left: 16, team: 'green' },
        { key: 'g_lcm', label: 'LCM', position: 'MID', top: 60, left: 38, team: 'green' },
        { key: 'g_rcm', label: 'RCM', position: 'MID', top: 60, left: 62, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 59, left: 84, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 45, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 26, left: 72, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 26, left: 28, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 41, left: 84, team: 'blue' },
        { key: 'b_lcm', label: 'LCM', position: 'MID', top: 40, left: 62, team: 'blue' },
        { key: 'b_rcm', label: 'RCM', position: 'MID', top: 40, left: 38, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 41, left: 16, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 55, left: 50, team: 'blue' },
      ],
    },
  },
  '8v8-3-2-2': {
    label: '8v8 (3-2-2 Double Threat)',
    category: '8v8',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lcb', label: 'LCB', position: 'DEF', top: 74, left: 20, team: 'green' },
        { key: 'g_cb', label: 'CB', position: 'DEF', top: 76, left: 50, team: 'green' },
        { key: 'g_rcb', label: 'RCB', position: 'DEF', top: 74, left: 80, team: 'green' },
        { key: 'g_lcm', label: 'LCM', position: 'MID', top: 60, left: 35, team: 'green' },
        { key: 'g_rcm', label: 'RCM', position: 'MID', top: 60, left: 65, team: 'green' },
        { key: 'g_lf', label: 'LF', position: 'FWD', top: 45, left: 32, team: 'green' },
        { key: 'g_rf', label: 'RF', position: 'FWD', top: 45, left: 68, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lcb', label: 'LCB', position: 'DEF', top: 26, left: 80, team: 'blue' },
        { key: 'b_cb', label: 'CB', position: 'DEF', top: 24, left: 50, team: 'blue' },
        { key: 'b_rcb', label: 'RCB', position: 'DEF', top: 26, left: 20, team: 'blue' },
        { key: 'b_lcm', label: 'LCM', position: 'MID', top: 40, left: 65, team: 'blue' },
        { key: 'b_rcm', label: 'RCM', position: 'MID', top: 40, left: 35, team: 'blue' },
        { key: 'b_lf', label: 'LF', position: 'FWD', top: 55, left: 68, team: 'blue' },
        { key: 'b_rf', label: 'RF', position: 'FWD', top: 55, left: 32, team: 'blue' },
      ],
    },
  },

  // -------------------------------------------------------------
  // 9v9 FORMATS
  // -------------------------------------------------------------
  '9v9-3-3-2': {
    label: '9v9 (3-3-2 Direct Attack)',
    category: '9v9',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 75, left: 18, team: 'green' },
        { key: 'g_cb', label: 'CB', position: 'DEF', top: 76, left: 50, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 75, left: 82, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 60, left: 20, team: 'green' },
        { key: 'g_cm', label: 'CM', position: 'MID', top: 61, left: 50, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 60, left: 80, team: 'green' },
        { key: 'g_lf', label: 'LF', position: 'FWD', top: 46, left: 32, team: 'green' },
        { key: 'g_rf', label: 'RF', position: 'FWD', top: 46, left: 68, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 25, left: 82, team: 'blue' },
        { key: 'b_cb', label: 'CB', position: 'DEF', top: 24, left: 50, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 25, left: 18, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 40, left: 80, team: 'blue' },
        { key: 'b_cm', label: 'CM', position: 'MID', top: 39, left: 50, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 40, left: 20, team: 'blue' },
        { key: 'b_lf', label: 'LF', position: 'FWD', top: 54, left: 68, team: 'blue' },
        { key: 'b_rf', label: 'RF', position: 'FWD', top: 54, left: 32, team: 'blue' },
      ],
    },
  },
  '9v9-3-4-1': {
    label: '9v9 (3-4-1 Engine Room)',
    category: '9v9',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 75, left: 18, team: 'green' },
        { key: 'g_cb', label: 'CB', position: 'DEF', top: 76, left: 50, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 75, left: 82, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 60, left: 16, team: 'green' },
        { key: 'g_lcm', label: 'LCM', position: 'MID', top: 61, left: 38, team: 'green' },
        { key: 'g_rcm', label: 'RCM', position: 'MID', top: 61, left: 62, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 60, left: 84, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 45, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 25, left: 82, team: 'blue' },
        { key: 'b_cb', label: 'CB', position: 'DEF', top: 24, left: 50, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 25, left: 18, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 40, left: 84, team: 'blue' },
        { key: 'b_lcm', label: 'LCM', position: 'MID', top: 39, left: 62, team: 'blue' },
        { key: 'b_rcm', label: 'RCM', position: 'MID', top: 39, left: 38, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 40, left: 16, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 55, left: 50, team: 'blue' },
      ],
    },
  },
  '9v9-4-3-1': {
    label: '9v9 (4-3-1 Back Four)',
    category: '9v9',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 88, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 76, left: 15, team: 'green' },
        { key: 'g_lcb', label: 'CB', position: 'DEF', top: 77, left: 38, team: 'green' },
        { key: 'g_rcb', label: 'CB', position: 'DEF', top: 77, left: 62, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 76, left: 85, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 60, left: 24, team: 'green' },
        { key: 'g_cm', label: 'CM', position: 'MID', top: 61, left: 50, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 60, left: 76, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 45, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 12, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 24, left: 85, team: 'blue' },
        { key: 'b_lcb', label: 'CB', position: 'DEF', top: 23, left: 62, team: 'blue' },
        { key: 'b_rcb', label: 'CB', position: 'DEF', top: 23, left: 38, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 24, left: 15, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 40, left: 76, team: 'blue' },
        { key: 'b_cm', label: 'CM', position: 'MID', top: 39, left: 50, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 40, left: 24, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 55, left: 50, team: 'blue' },
      ],
    },
  },

  // -------------------------------------------------------------
  // 10v10 FORMATS
  // -------------------------------------------------------------
  '10v10-3-4-2': {
    label: '10v10 (3-4-2 Tactical Width)',
    category: '10v10',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lcb', label: 'LCB', position: 'DEF', top: 76, left: 20, team: 'green' },
        { key: 'g_cb', label: 'CB', position: 'DEF', top: 77, left: 50, team: 'green' },
        { key: 'g_rcb', label: 'RCB', position: 'DEF', top: 76, left: 80, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 60, left: 15, team: 'green' },
        { key: 'g_lcm', label: 'LCM', position: 'MID', top: 62, left: 38, team: 'green' },
        { key: 'g_rcm', label: 'RCM', position: 'MID', top: 62, left: 62, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 60, left: 85, team: 'green' },
        { key: 'g_lf', label: 'LF', position: 'FWD', top: 46, left: 32, team: 'green' },
        { key: 'g_rf', label: 'RF', position: 'FWD', top: 46, left: 68, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lcb', label: 'LCB', position: 'DEF', top: 24, left: 80, team: 'blue' },
        { key: 'b_cb', label: 'CB', position: 'DEF', top: 23, left: 50, team: 'blue' },
        { key: 'b_rcb', label: 'RCB', position: 'DEF', top: 24, left: 20, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 40, left: 85, team: 'blue' },
        { key: 'b_lcm', label: 'LCM', position: 'MID', top: 38, left: 62, team: 'blue' },
        { key: 'b_rcm', label: 'RCM', position: 'MID', top: 38, left: 38, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 40, left: 15, team: 'blue' },
        { key: 'b_lf', label: 'LF', position: 'FWD', top: 54, left: 68, team: 'blue' },
        { key: 'b_rf', label: 'RF', position: 'FWD', top: 54, left: 32, team: 'blue' },
      ],
    },
  },
  '10v10-4-3-2': {
    label: '10v10 (4-3-2 Solid Dual Striker)',
    category: '10v10',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 76, left: 15, team: 'green' },
        { key: 'g_lcb', label: 'CB', position: 'DEF', top: 77, left: 38, team: 'green' },
        { key: 'g_rcb', label: 'CB', position: 'DEF', top: 77, left: 62, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 76, left: 85, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 60, left: 22, team: 'green' },
        { key: 'g_cm', label: 'CM', position: 'MID', top: 62, left: 50, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 60, left: 78, team: 'green' },
        { key: 'g_lf', label: 'LF', position: 'FWD', top: 46, left: 34, team: 'green' },
        { key: 'g_rf', label: 'RF', position: 'FWD', top: 46, left: 66, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 24, left: 85, team: 'blue' },
        { key: 'b_lcb', label: 'CB', position: 'DEF', top: 23, left: 62, team: 'blue' },
        { key: 'b_rcb', label: 'CB', position: 'DEF', top: 23, left: 38, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 24, left: 15, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 40, left: 78, team: 'blue' },
        { key: 'b_cm', label: 'CM', position: 'MID', top: 38, left: 50, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 40, left: 22, team: 'blue' },
        { key: 'b_lf', label: 'LF', position: 'FWD', top: 54, left: 66, team: 'blue' },
        { key: 'b_rf', label: 'RF', position: 'FWD', top: 54, left: 34, team: 'blue' },
      ],
    },
  },
  '10v10-4-4-1': {
    label: '10v10 (4-4-1 Traditional Pivot)',
    category: '10v10',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 89, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 76, left: 15, team: 'green' },
        { key: 'g_lcb', label: 'CB', position: 'DEF', top: 77, left: 38, team: 'green' },
        { key: 'g_rcb', label: 'CB', position: 'DEF', top: 77, left: 62, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 76, left: 85, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 60, left: 16, team: 'green' },
        { key: 'g_lcm', label: 'LCM', position: 'MID', top: 62, left: 38, team: 'green' },
        { key: 'g_rcm', label: 'RCM', position: 'MID', top: 62, left: 62, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 60, left: 84, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 45, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 11, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 24, left: 85, team: 'blue' },
        { key: 'b_lcb', label: 'CB', position: 'DEF', top: 23, left: 62, team: 'blue' },
        { key: 'b_rcb', label: 'CB', position: 'DEF', top: 23, left: 38, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 24, left: 15, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 40, left: 84, team: 'blue' },
        { key: 'b_lcm', label: 'LCM', position: 'MID', top: 38, left: 62, team: 'blue' },
        { key: 'b_rcm', label: 'RCM', position: 'MID', top: 38, left: 38, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 40, left: 16, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 55, left: 50, team: 'blue' },
      ],
    },
  },

  // -------------------------------------------------------------
  // 11v11 FORMATS
  // -------------------------------------------------------------
  '11v11-4-3-3': {
    label: '11v11 (4-3-3 Total Football)',
    category: '11v11',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 90, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 76, left: 14, team: 'green' },
        { key: 'g_lcb', label: 'CB', position: 'DEF', top: 78, left: 38, team: 'green' },
        { key: 'g_rcb', label: 'CB', position: 'DEF', top: 78, left: 62, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 76, left: 86, team: 'green' },
        { key: 'g_dm', label: 'DM', position: 'MID', top: 66, left: 50, team: 'green' },
        { key: 'g_lcm', label: 'CM', position: 'MID', top: 58, left: 30, team: 'green' },
        { key: 'g_rcm', label: 'CM', position: 'MID', top: 58, left: 70, team: 'green' },
        { key: 'g_lw', label: 'LW', position: 'FWD', top: 46, left: 18, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 44, left: 50, team: 'green' },
        { key: 'g_rw', label: 'RW', position: 'FWD', top: 46, left: 82, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 10, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 24, left: 86, team: 'blue' },
        { key: 'b_lcb', label: 'CB', position: 'DEF', top: 22, left: 62, team: 'blue' },
        { key: 'b_rcb', label: 'CB', position: 'DEF', top: 22, left: 38, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 24, left: 14, team: 'blue' },
        { key: 'b_dm', label: 'DM', position: 'MID', top: 34, left: 50, team: 'blue' },
        { key: 'b_lcm', label: 'CM', position: 'MID', top: 42, left: 70, team: 'blue' },
        { key: 'b_rcm', label: 'CM', position: 'MID', top: 42, left: 30, team: 'blue' },
        { key: 'b_lw', label: 'LW', position: 'FWD', top: 54, left: 82, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 56, left: 50, team: 'blue' },
        { key: 'b_rw', label: 'RW', position: 'FWD', top: 54, left: 18, team: 'blue' },
      ],
    },
  },
  '11v11-4-2-3-1': {
    label: '11v11 (4-2-3-1 Modern Standard)',
    category: '11v11',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 90, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 76, left: 14, team: 'green' },
        { key: 'g_lcb', label: 'CB', position: 'DEF', top: 78, left: 38, team: 'green' },
        { key: 'g_rcb', label: 'CB', position: 'DEF', top: 78, left: 62, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 76, left: 86, team: 'green' },
        { key: 'g_ldm', label: 'DM', position: 'MID', top: 66, left: 36, team: 'green' },
        { key: 'g_rdm', label: 'DM', position: 'MID', top: 66, left: 64, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 55, left: 18, team: 'green' },
        { key: 'g_cam', label: 'CAM', position: 'MID', top: 53, left: 50, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 55, left: 82, team: 'green' },
        { key: 'g_st', label: 'ST', position: 'FWD', top: 43, left: 50, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 10, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 24, left: 86, team: 'blue' },
        { key: 'b_lcb', label: 'CB', position: 'DEF', top: 22, left: 62, team: 'blue' },
        { key: 'b_rcb', label: 'CB', position: 'DEF', top: 22, left: 38, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 24, left: 14, team: 'blue' },
        { key: 'b_ldm', label: 'DM', position: 'MID', top: 34, left: 64, team: 'blue' },
        { key: 'b_rdm', label: 'DM', position: 'MID', top: 34, left: 36, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 45, left: 82, team: 'blue' },
        { key: 'b_cam', label: 'CAM', position: 'MID', top: 47, left: 50, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 45, left: 18, team: 'blue' },
        { key: 'b_st', label: 'ST', position: 'FWD', top: 57, left: 50, team: 'blue' },
      ],
    },
  },
  '11v11-4-4-2': {
    label: '11v11 (4-4-2 Classic Dual)',
    category: '11v11',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 90, left: 50, team: 'green' },
        { key: 'g_lb', label: 'LB', position: 'DEF', top: 76, left: 14, team: 'green' },
        { key: 'g_lcb', label: 'CB', position: 'DEF', top: 78, left: 38, team: 'green' },
        { key: 'g_rcb', label: 'CB', position: 'DEF', top: 78, left: 62, team: 'green' },
        { key: 'g_rb', label: 'RB', position: 'DEF', top: 76, left: 86, team: 'green' },
        { key: 'g_lm', label: 'LM', position: 'MID', top: 60, left: 16, team: 'green' },
        { key: 'g_lcm', label: 'CM', position: 'MID', top: 62, left: 38, team: 'green' },
        { key: 'g_rcm', label: 'CM', position: 'MID', top: 62, left: 62, team: 'green' },
        { key: 'g_rm', label: 'RM', position: 'MID', top: 60, left: 84, team: 'green' },
        { key: 'g_lf', label: 'LF', position: 'FWD', top: 45, left: 34, team: 'green' },
        { key: 'g_rf', label: 'RF', position: 'FWD', top: 45, left: 66, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 10, left: 50, team: 'blue' },
        { key: 'b_lb', label: 'LB', position: 'DEF', top: 24, left: 86, team: 'blue' },
        { key: 'b_lcb', label: 'CB', position: 'DEF', top: 22, left: 62, team: 'blue' },
        { key: 'b_rcb', label: 'CB', position: 'DEF', top: 22, left: 38, team: 'blue' },
        { key: 'b_rb', label: 'RB', position: 'DEF', top: 24, left: 14, team: 'blue' },
        { key: 'b_lm', label: 'LM', position: 'MID', top: 40, left: 84, team: 'blue' },
        { key: 'b_lcm', label: 'CM', position: 'MID', top: 38, left: 62, team: 'blue' },
        { key: 'b_rcm', label: 'CM', position: 'MID', top: 38, left: 38, team: 'blue' },
        { key: 'b_rm', label: 'RM', position: 'MID', top: 40, left: 16, team: 'blue' },
        { key: 'b_lf', label: 'LF', position: 'FWD', top: 55, left: 66, team: 'blue' },
        { key: 'b_rf', label: 'RF', position: 'FWD', top: 55, left: 34, team: 'blue' },
      ],
    },
  },
  '11v11-3-5-2': {
    label: '11v11 (3-5-2 Wingbacks)',
    category: '11v11',
    slots: {
      green: [
        { key: 'g_gk', label: 'GK', position: 'GK', top: 90, left: 50, team: 'green' },
        { key: 'g_lcb', label: 'CB', position: 'DEF', top: 78, left: 24, team: 'green' },
        { key: 'g_cb', label: 'CB', position: 'DEF', top: 80, left: 50, team: 'green' },
        { key: 'g_rcb', label: 'CB', position: 'DEF', top: 78, left: 76, team: 'green' },
        { key: 'g_lwb', label: 'LWB', position: 'MID', top: 62, left: 12, team: 'green' },
        { key: 'g_lcm', label: 'CM', position: 'MID', top: 64, left: 34, team: 'green' },
        { key: 'g_cm', label: 'CAM', position: 'MID', top: 56, left: 50, team: 'green' },
        { key: 'g_rcm', label: 'CM', position: 'MID', top: 64, left: 66, team: 'green' },
        { key: 'g_rwb', label: 'RWB', position: 'MID', top: 62, left: 88, team: 'green' },
        { key: 'g_lf', label: 'LF', position: 'FWD', top: 45, left: 34, team: 'green' },
        { key: 'g_rf', label: 'RF', position: 'FWD', top: 45, left: 66, team: 'green' },
      ],
      blue: [
        { key: 'b_gk', label: 'GK', position: 'GK', top: 10, left: 50, team: 'blue' },
        { key: 'b_lcb', label: 'CB', position: 'DEF', top: 22, left: 76, team: 'blue' },
        { key: 'b_cb', label: 'CB', position: 'DEF', top: 20, left: 50, team: 'blue' },
        { key: 'b_rcb', label: 'CB', position: 'DEF', top: 22, left: 24, team: 'blue' },
        { key: 'b_lwb', label: 'LWB', position: 'MID', top: 38, left: 88, team: 'blue' },
        { key: 'b_lcm', label: 'CM', position: 'MID', top: 36, left: 66, team: 'blue' },
        { key: 'b_cm', label: 'CAM', position: 'MID', top: 44, left: 50, team: 'blue' },
        { key: 'b_rcm', label: 'CM', position: 'MID', top: 36, left: 34, team: 'blue' },
        { key: 'b_rwb', label: 'RWB', position: 'MID', top: 38, left: 12, team: 'blue' },
        { key: 'b_lf', label: 'LF', position: 'FWD', top: 55, left: 66, team: 'blue' },
        { key: 'b_rf', label: 'RF', position: 'FWD', top: 55, left: 34, team: 'blue' },
      ],
    },
  },
};

// Helper to normalize formation keys from legacy values (e.g. '2-3-1' -> '7v7-2-3-1')
const getNormalizedFormationKey = (key?: string): string => {
  if (!key) return '7v7-2-3-1';
  if (FORMATIONS[key]) return key;
  if (key === '2-3-1') return '7v7-2-3-1';
  if (key === '3-2-1') return '7v7-3-2-1';
  if (key === '1-2-1') return '5v5-1-2-1';
  if (key === '4-3-3') return '11v11-4-3-3';
  return '7v7-2-3-1';
};

export const TacticalPitchFormation: React.FC<TacticalPitchFormationProps> = ({
  match,
  onUpdateTactical,
  isHostOrAdmin,
}) => {
  const [formationKey, setFormationKey] = useState<string>(
    getNormalizedFormationKey(match.formationGreen)
  );
  const [assignments, setAssignments] = useState<Record<string, string>>(
    match.tacticalAssignments || {}
  );
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'green' | 'blue'>('full');

  const formation = FORMATIONS[formationKey] || FORMATIONS['7v7-2-3-1'];
  const greenPlayers = match.roster.filter((p) => p.team === 'green');
  const bluePlayers = match.roster.filter((p) => p.team === 'blue');

  const handleSlotClick = (slotKey: string) => {
    if (!isHostOrAdmin) return;
    if (selectedSlotKey === slotKey) {
      setSelectedSlotKey(null);
    } else {
      setSelectedSlotKey(slotKey);
    }
  };

  const handleAssignPlayer = (slotKey: string, userId: string) => {
    const next = { ...assignments, [slotKey]: userId };
    setAssignments(next);
    setSelectedSlotKey(null);
    onUpdateTactical?.(formationKey, formationKey, next);
  };

  const handleClearSlot = (slotKey: string) => {
    const next = { ...assignments };
    delete next[slotKey];
    setAssignments(next);
    setSelectedSlotKey(null);
    onUpdateTactical?.(formationKey, formationKey, next);
  };

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

  // Render Slot Marker
  const renderSlot = (slot: SlotDefinition) => {
    const assignedUserId = assignments[slot.key];
    const assignedPlayer = match.roster.find((p) => p.userId === assignedUserId);
    const isSelected = selectedSlotKey === slot.key;
    const isGreen = slot.team === 'green';

    return (
      <div
        key={slot.key}
        onClick={() => handleSlotClick(slot.key)}
        style={{
          top: `${slot.top}%`,
          left: `${slot.left}%`,
          transform: 'translate(-50%, -50%)',
        }}
        className={`absolute z-20 cursor-pointer flex flex-col items-center group transition-all duration-200 ${
          isSelected ? 'scale-125 z-40' : 'hover:scale-110'
        }`}
      >
        {/* Player Avatar or Position Circle */}
        <div
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
            assignedPlayer
              ? isGreen
                ? 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-900/50'
                : 'bg-blue-600 border-blue-300 text-white shadow-blue-900/50'
              : isGreen
              ? 'bg-emerald-950/80 border-dashed border-emerald-400/80 text-emerald-300'
              : 'bg-blue-950/80 border-dashed border-blue-400/80 text-blue-300'
          } ${isSelected ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-2xl' : ''}`}
        >
          {assignedPlayer?.avatarUrl ? (
            <img
              src={assignedPlayer.avatarUrl}
              alt={assignedPlayer.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="font-extrabold text-[10px] sm:text-[11px] tracking-tighter">
              {assignedPlayer ? assignedPlayer.name.substring(0, 2).toUpperCase() : slot.label}
            </span>
          )}
        </div>

        {/* Name / Position Tag */}
        <div
          className={`mt-0.5 px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold tracking-tight shadow-md max-w-[65px] sm:max-w-[80px] truncate text-center transition-all ${
            assignedPlayer
              ? 'bg-slate-950/90 text-white border border-slate-700'
              : isGreen
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800'
              : 'bg-blue-950/90 text-blue-300 border border-blue-800'
          }`}
        >
          {assignedPlayer ? assignedPlayer.name.split(' ')[0] : slot.label}
        </div>
      </div>
    );
  };

  const selectedSlot = [...formation.slots.green, ...formation.slots.blue].find(
    (s) => s.key === selectedSlotKey
  );
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
    <div className="space-y-4">
      {/* Controls Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B1120] p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Formation:</label>
          <div className="relative">
            <select
              value={formationKey}
              onChange={(e) => {
                const key = e.target.value;
                setFormationKey(key);
                onUpdateTactical?.(key, key, assignments);
              }}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer shadow-sm transition-all"
            >
              {categories.map((cat) => (
                <optgroup key={cat} label={`─── ${cat} FORMATS ───`} className="bg-slate-900 font-bold text-emerald-400">
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

        <div className="flex items-center gap-2.5 flex-wrap">
          {isHostOrAdmin && (
            <button
              onClick={handleAutoFillFormation}
              className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              title="Auto-place confirmed roster players onto tactical pitch slots"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Auto-Fill Lineup
            </button>
          )}

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'full'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Full Pitch
            </button>
            <button
              onClick={() => setViewMode('green')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'green'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              Green
            </button>
            <button
              onClick={() => setViewMode('blue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'blue'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-blue-300'
              }`}
            >
              Blue
            </button>
          </div>
        </div>
      </div>

      {/* Selected Slot Assignment Drawer */}
      {selectedSlot && isHostOrAdmin && (
        <div className="bg-slate-900 border border-amber-500/60 rounded-2xl p-4 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  selectedSlot.team === 'green' ? 'bg-emerald-400' : 'bg-blue-400'
                }`}
              />
              Assign Player to {selectedSlot.team === 'green' ? 'Team Green' : 'Team Blue'} - {selectedSlot.label} ({selectedSlot.position})
            </div>
            {assignments[selectedSlot.key] && (
              <button
                onClick={() => handleClearSlot(selectedSlot.key)}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
              >
                Clear Slot
              </button>
            )}
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
                  onClick={() => handleAssignPlayer(selectedSlot.key, player.userId)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-md'
                      : isAssignedElsewhere
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
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
              <div className="text-xs text-slate-400 py-1">No players confirmed on this team roster yet.</div>
            )}
          </div>
        </div>
      )}

      {/* 2D Realistic Grass Soccer Pitch */}
      <div className="relative w-full aspect-[4/5] sm:aspect-[16/11] bg-gradient-to-b from-[#14532d] via-[#166534] to-[#14532d] rounded-3xl border-4 border-[#0f391f] shadow-2xl overflow-hidden select-none">
        {/* Turf Stripes Pattern */}
        <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(0deg,#000,#000_30px,transparent_30px,transparent_60px)] pointer-events-none" />

        {/* Pitch Boundary Lines */}
        <div className="absolute inset-4 sm:inset-6 border-2 border-white/75 pointer-events-none rounded-sm">
          {/* Halfway Line */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/75 -translate-y-1/2" />

          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 w-24 h-24 sm:w-32 sm:h-32 border-2 border-white/75 rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            {/* Center Spot */}
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>

          {/* Top Penalty Area (Blue Defends) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-20 sm:h-28 border-b-2 border-x-2 border-white/75">
            {/* 6-Yard Box */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-10 sm:h-12 border-b-2 border-x-2 border-white/75" />
            {/* Penalty Spot */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
          </div>

          {/* Bottom Penalty Area (Green Defends) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-20 sm:h-28 border-t-2 border-x-2 border-white/75">
            {/* 6-Yard Box */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-10 sm:h-12 border-t-2 border-x-2 border-white/75" />
            {/* Penalty Spot */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
          </div>

          {/* Team Side Badges */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-blue-950/90 border border-blue-400/60 text-[10px] sm:text-xs font-black tracking-wider text-blue-200 shadow">
            TEAM BLUE
          </div>
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-400/60 text-[10px] sm:text-xs font-black tracking-wider text-emerald-200 shadow">
            TEAM GREEN
          </div>
        </div>

        {/* Tactical Player Slots Render */}
        {(viewMode === 'full' || viewMode === 'blue') &&
          formation.slots.blue.map((slot) => renderSlot(slot))}
        {(viewMode === 'full' || viewMode === 'green') &&
          formation.slots.green.map((slot) => renderSlot(slot))}
      </div>

      {/* Roster Bench Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Team Green Bench */}
        <div className="bg-[#0B1120] p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2.5">
            <span>Team Green Roster ({greenPlayers.length})</span>
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-semibold">{player.name}</span>
                  {slotDef ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {slotDef.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">Bench</span>
                  )}
                </div>
              );
            })}
            {greenPlayers.length === 0 && (
              <span className="text-xs text-slate-500">No players assigned to Green yet.</span>
            )}
          </div>
        </div>

        {/* Team Blue Bench */}
        <div className="bg-[#0B1120] p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-blue-400 mb-2.5">
            <span>Team Blue Roster ({bluePlayers.length})</span>
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="font-semibold">{player.name}</span>
                  {slotDef ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800">
                      {slotDef.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">Bench</span>
                  )}
                </div>
              );
            })}
            {bluePlayers.length === 0 && (
              <span className="text-xs text-slate-500">No players assigned to Blue yet.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
