// Export the main app state for use in notification helpers
import DB from './db.js';
import { currentUser } from '../auth/auth.js';

export const state = {
  user: null,
  queue: [],
  qIndex: 0,
  pageSize: 5,
  page: 1,
  forceLogin: false
};

// Always refresh user from Supabase (or local DB for local mode)
// Supabase manages its own session persistence, so sessionStorage is not needed for remote users
export async function refreshUser() {
  state.user = await currentUser(DB);
}