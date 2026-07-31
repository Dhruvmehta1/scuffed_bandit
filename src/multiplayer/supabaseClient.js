import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fdafaaozhnoymppohicf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkYWZhYW96aG5veW1wcG9oaWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MTY1MDYsImV4cCI6MjEwMTA5MjUwNn0.pwb7PSkPuDeOt_ghMa8ydyIa-wdTt6h33OPy82eyoPI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const isSupabaseConfigured = true;
