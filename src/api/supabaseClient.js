import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
function isSafeKey(value) {
  if (!value || /^(sb_secret_|service_role)/.test(value)) return false;
  if (value.startsWith('sb_publishable_')) return true;
  try { return JSON.parse(atob(value.split('.')[1])).role === 'anon'; } catch { return false; }
}
export const isConfigured = Boolean(url && /^https:\/\//.test(url) && isSafeKey(key));
export const supabase = isConfigured ? createClient(url, key) : null;
export function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured. Set the project URL and publishable key.');
  return supabase;
}
