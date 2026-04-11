import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://eaqdzryrxlyjmerkygbe.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhcWR6cnlyeGx5am1lcmt5Z2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDc5MTMsImV4cCI6MjA5MTQyMzkxM30.zMyOjSx6r1i8MTYqgjNBgLAboddMBlSzPjubBqFF00w";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);