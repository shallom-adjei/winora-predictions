import { createClient } from "@supabase/supabase-js";

// Temporary hardcoded keys – we know they work from the console test
const supabaseUrl = "https://qvoauycyibdfxzspjgpb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2b2F1eWN5aWJkZnh6c3BqZ3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MTAyMzEsImV4cCI6MjA5NTQ4NjIzMX0.WK7yPZnBh4qzqMOYx1q7768mMp58gPiEI-1zdjU40Kk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);