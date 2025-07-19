import { createClient } from '@supabase/supabase-js';

// Tillfällig konfiguration för utveckling - ersätt med dina riktiga uppgifter
const supabaseUrl = 'https://demo.supabase.co';
const supabaseKey = 'demo-key';

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