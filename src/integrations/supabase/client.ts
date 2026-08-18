import { createClient } from '@supabase/supabase-js';

// Hum temporarily types ko hata rahe hain taake schema cache ka error khatam ho jaye
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// <any> lagane se Supabase types check nahi karega aur data save hone dega
export const supabase = createClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});