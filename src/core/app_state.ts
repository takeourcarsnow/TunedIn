import DB from './db';
import { currentUser } from '../auth/auth';

export interface AppState {
  user: { id: string; name: string; email?: string } | null;
  queue: string[];
  qIndex: number;
  pageSize: number;
  page: number;
  forceLogin: boolean;
  [key: string]: any;
}

export const state: AppState = {
  user: null,
  queue: [],
  qIndex: 0,
  pageSize: 5,
  page: 1,
  forceLogin: false
};

export async function refreshUser() {
  state.user = await currentUser(DB as any);
}
