import { createClient } from '@supabase/supabase-js';

// Supabase konfiguration från miljövariabler
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ompjkiiabyuegytncbwq.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tcGpraWlhYnl1ZWd5dG5jYndxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDg2MjYsImV4cCI6MjA2ODQyNDYyNn0.z9j2pwMfKjfR9Fs__fHkzwj9fjgiNOUQZ5Z9zv5FD6Q';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL och anon key måste vara konfigurerade i .env filen');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Hjälpfunktioner för autentisering
export const authHelpers = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
};