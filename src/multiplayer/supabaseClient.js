import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fdafaaozhnoymppohicf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkYWZhYW96aG5veW1wcG9oaWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MTY1MDYsImV4cCI6MjEwMTA5MjUwNn0.pwb7PSkPuDeOt_ghMa8ydyIa-wdTt6h33OPy82eyoPI';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
