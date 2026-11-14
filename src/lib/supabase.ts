import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xdycspybjuawwxelrsvc.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_vdHcoKGNW573ojfyU6A-jA_PafjMbC6';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signInOrSignUp(email: string, password: string) {
  // נסה להתחבר תחילה
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // אם המשתמש לא קיים, צור אותו אוטומטית
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) throw signUpError;
    return signUpData;
  }
  return data;
}

export async function signOutUser() {
  await supabase.auth.signOut();
}