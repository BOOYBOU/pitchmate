import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase
const envObj = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const supabaseUrl = envObj.VITE_SUPABASE_URL || '';
const supabaseAnonKey = envObj.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://xyzcompany.supabase.co' && 
  !supabaseUrl.includes('xyzcompany')
);

export let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    supabase = null;
  }
}

/**
 * SQL Schema script to set up tables in Supabase for PitchMate
 */
export const SUPABASE_SETUP_SQL = `-- PitchMate Database Schema
-- Run this in your Supabase SQL Editor:

-- 1. Create Matches Table
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date_time TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 90,
  location_venue TEXT NOT NULL,
  location_address TEXT NOT NULL,
  location_city TEXT,
  location_lat NUMERIC NOT NULL,
  location_lng NUMERIC NOT NULL,
  location_maps_url TEXT,
  location_pitch_no TEXT,
  format TEXT NOT NULL DEFAULT '7v7',
  max_players INT NOT NULL DEFAULT 14,
  surface TEXT NOT NULL DEFAULT 'Turf',
  price_per_player NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Rosters / Participations Table
CREATE TABLE IF NOT EXISTS rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT REFERENCES matches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team TEXT NOT NULL DEFAULT 'unassigned',
  position TEXT,
  jersey_number INT,
  is_host BOOLEAN DEFAULT false,
  is_waitlist BOOLEAN DEFAULT false,
  UNIQUE(match_id, user_id)
);

-- 3. Create Users Table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  preferred_position TEXT DEFAULT 'MID',
  preferred_foot TEXT DEFAULT 'Right',
  jersey_number INT DEFAULT 10,
  phone TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT false,
  matches_played INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Match Comments Table
CREATE TABLE IF NOT EXISTS match_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT REFERENCES matches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_avatar TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Realtime
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_comments ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for PitchMate players
CREATE POLICY "Public full access matches" ON matches FOR ALL USING (true);
CREATE POLICY "Public full access rosters" ON rosters FOR ALL USING (true);
CREATE POLICY "Public full access profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Public full access comments" ON match_comments FOR ALL USING (true);

-- Enable realtime publications
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE rosters;
ALTER PUBLICATION supabase_realtime ADD TABLE match_comments;
`;
