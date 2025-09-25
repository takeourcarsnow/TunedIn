// Prefer runtime environment variables. Next.js exposes client vars that start with NEXT_PUBLIC_.
const _env = (globalThis as any).process?.env || (globalThis as any).__ENV || {};

export const USE_SUPABASE = _env.NEXT_PUBLIC_USE_SUPABASE ? _env.NEXT_PUBLIC_USE_SUPABASE === 'true' : true;
export const SUPABASE_URL = _env.NEXT_PUBLIC_SUPABASE_URL || 'https://ykwbnqaobcirrpunnkkn.supabase.co';
export const SUPABASE_ANON_KEY = _env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd2JucWFvYmNpcnJwdW5ua2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDcwMjcsImV4cCI6MjA3MTE4MzAyN30.qoZg10-v6rmqW6RZDj9SGYio_DblzSfP3RTPBMoJBuM';
