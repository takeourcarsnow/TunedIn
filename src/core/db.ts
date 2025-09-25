import { safeClone } from './utils';
import { SUPABASE_URL, SUPABASE_ANON_KEY, USE_SUPABASE } from './config';
import { safeGetUser } from './auth_helpers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DB_KEY_V2 = 'TunedIn.space/db@v2';
const DB_KEY_V1 = 'TunedIn.space/v1';

type Post = any;
type User = any;

const defaultDB = { users: [] as User[], posts: [] as Post[], createdAt: Date.now(), version: 2 };

class LocalAdapter {
  cache: any = null;
  isRemote = false;

  async deleteUser(id: string) {
    await this.init();
    const i = (this.cache.users || []).findIndex((u: any) => u.id === id);
    if (i < 0) return false;
    this.cache.users.splice(i, 1);
    this.cache.posts = (this.cache.posts || []).filter((p: any) => p.userId !== id);
    await this._save();
    return true;
  }

  async init() {
    if (this.cache) return this.cache;
    const v2 = localStorage.getItem(DB_KEY_V2);
    if (v2) {
      try { this.cache = JSON.parse(v2); }
      catch { this.cache = safeClone(defaultDB); }
      return this.cache;
    }
    const v1 = localStorage.getItem(DB_KEY_V1);
    if (v1) {
      try {
        const old = JSON.parse(v1);
        this.cache = { ...defaultDB, ...old, version: 2 };
        await this._save();
      } catch {
        this.cache = safeClone(defaultDB);
      }
      return this.cache;
    }
    this.cache = safeClone(defaultDB);
    return this.cache;
  }
  getAll() { return this.cache || defaultDB; }
  async refresh() { return this.cache; }
  async _save() { try { localStorage.setItem(DB_KEY_V2, JSON.stringify(this.cache)); } catch {} }

  async ensureUser(name: string, email?: string, password?: string) {
    await this.init();
    if (!email || !password || password.length < 6) {
      throw new Error('Email and password (min 6 chars) are required.');
    }
    let u = this.cache.users.find((x: any) => x.name.toLowerCase() === name.toLowerCase() || (email && x.email === email));
    if (!u) {
      const bcrypt = (window as any).bcrypt as typeof import('bcryptjs');
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      u = {
        id: (crypto as any).randomUUID ? (crypto as any).randomUUID() : 'u_' + Math.random().toString(36).slice(2),
        name: name.trim(),
        email,
        password: hash,
        about: '', facebook: '', instagram: '', twitter: '', bandcamp: '', soundcloud: '', youtube: '', lastfm: '',
        createdAt: Date.now()
      };
      this.cache.users.push(u); await this._save();
    }
    return u;
  }

  async loginUser(email: string, password: string) {
    await this.init();
    if (!email || !password || password.length < 6) return null;
    const user = this.cache.users.find((u: any) => u.email === email);
    if (!user) return null;
    if (!user.password || user.password.length < 6) return null;
    const bcrypt = (window as any).bcrypt as typeof import('bcryptjs');
    const isMatch = bcrypt.compareSync(password, user.password);
    return isMatch ? user : null;
  }
  getUserById(id: string) { return (this.cache?.users || []).find((u: any) => u.id === id) || null; }

  async createPost(p: any) { await this.init(); this.cache.posts.push(p); await this._save(); return p; }
  async updatePost(id: string, patch: any) {
    await this.init();
    const i = this.cache.posts.findIndex((x: any) => x.id === id);
    if (i < 0) return null;
    this.cache.posts[i] = { ...this.cache.posts[i], ...patch };
    await this._save();
    return this.cache.posts[i];
  }
  async deletePost(id: string) {
    await this.init();
    const i = this.cache.posts.findIndex((x: any) => x.id === id);
    if (i < 0) return;
    this.cache.posts.splice(i, 1);
    await this._save();
  }
  async toggleLike(id: string, userId: string) {
    await this.init();
    const p = this.cache.posts.find((x: any) => x.id === id);
    if (!p) return null;
    p.likes = p.likes || [];
    const i = p.likes.indexOf(userId);
    if (i >= 0) p.likes.splice(i, 1); else p.likes.push(userId);
    await this._save();
    return p;
  }
  async addComment(id: string, c: any) {
    await this.init();
    const p = this.cache.posts.find((x: any) => x.id === id);
    if (!p) return null;
    p.comments = p.comments || [];
    p.comments.push(c);
    await this._save();
    return p.comments;
  }
  async deleteComment(postId: string, commentId: string) {
    await this.init();
    const p = this.cache.posts.find((x: any) => x.id === postId);
    if (!p) return null;
    p.comments = (p.comments || []).filter((c: any) => c.id !== commentId);
    await this._save();
    return p.comments;
  }

  async updateUser(id: string, patch: any) {
    await this.init();
    const i = (this.cache.users || []).findIndex((u: any) => u.id === id);
    if (i < 0) return null;
    this.cache.users[i] = { ...this.cache.users[i], ...patch };
    await this._save();
    return this.cache.users[i];
  }

  async replaceAll(data: any) {
    this.cache = { version: 2, createdAt: Date.now(), users: data.users || [], posts: data.posts || [] };
    await this._save();
  }
  exportJSON() { return JSON.stringify(this.cache || defaultDB, null, 2); }
}

class SupabaseAdapter {
  isRemote = true;
  supabase: SupabaseClient | null = null;
  cache: any = { ...defaultDB };
  url: string;
  key: string;
  constructor(url: string, key: string) { this.url = url; this.key = key; }

  async deleteUser(id: string) {
    const { error: postError } = await (this.supabase as SupabaseClient).from('posts').delete().eq('user_id', id);
    if (postError) console.error('deleteUser posts error', postError);
    const { error: userError } = await (this.supabase as SupabaseClient).from('users').delete().eq('id', id);
    if (userError) console.error('deleteUser user error', userError);
    await this.refresh();
    return !userError;
  }

  async init() {
    if (!this.supabase) {
      this.supabase = createClient(this.url, this.key);
    }
    await this.refresh();
    return this.cache;
  }
  mapRowToPost(row: any) {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      artist: row.artist,
      url: row.url,
      provider: row.provider || null,
      tags: row.tags || [],
      body: row.body || '',
      lyrics: row.lyrics || '',
      likes: row.likes || [],
      comments: row.comments || [],
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    };
  }
  mapPostToRow(p: any) {
    return {
      id: p.id,
      user_id: p.userId,
      title: p.title,
      artist: p.artist || null,
      url: p.url,
      provider: p.provider || null,
      tags: p.tags || [],
      body: p.body || null,
      lyrics: p.lyrics || '',
      likes: p.likes || [],
      comments: p.comments || [],
      created_at: new Date(p.createdAt || Date.now()).toISOString(),
    };
  }
  mapRowToUser(row: any) {
    return {
      id: row.id,
      name: row.name,
      about: row.about || '',
      facebook: row.facebook || '',
      instagram: row.instagram || '',
      twitter: row.twitter || '',
      bandcamp: row.bandcamp || '',
      soundcloud: row.soundcloud || '',
      youtube: row.youtube || '',
      lastfm: row.lastfm || '',
      avatarUrl: row.avatarurl || '',
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  async refresh() {
    const [uRes, pRes] = await Promise.all([
      (this.supabase as SupabaseClient).from('users').select('*').order('created_at', { ascending: true }),
      (this.supabase as SupabaseClient).from('posts').select('*').order('created_at', { ascending: false }),
    ]);
    if ((uRes as any).error) console.warn('Supabase users error', (uRes as any).error);
    if ((pRes as any).error) console.warn('Supabase posts error', (pRes as any).error);
    const users = ((uRes as any).data || []).map((r: any) => this.mapRowToUser(r));
    const posts = ((pRes as any).data || []).map((r: any) => this.mapRowToPost(r));
    this.cache = { version: 2, createdAt: this.cache.createdAt || Date.now(), users, posts };
    return this.cache;
  }
  getAll() { return this.cache; }

  async ensureUser(name: string) {
    let userId: string | null = null;
    if (this.supabase && (this.supabase as any).auth && (this.supabase as any).auth.getUser) {
      const u = await safeGetUser(this.supabase);
      userId = (u as any)?.id || null;
    }
    if (!userId) throw new Error('No authenticated user');
    const existing = this.cache.users.find((u: any) => u.id === userId || u.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const user = { id: userId, name: name.trim(), about: '', createdAt: Date.now() };
    const { error } = await (this.supabase as SupabaseClient).from('users').insert({ id: user.id, name: user.name, about: user.about, created_at: new Date(user.createdAt).toISOString() });
    if (error) console.warn('ensureUser insert failed', error);
    this.cache.users.push(user);
    return user;
  }
  getUserById(id: string) { return this.cache.users.find((u: any) => u.id === id) || null; }

  async createPost(post: any) {
    let userId: string | null = null;
    if (this.supabase && (this.supabase as any).auth && (this.supabase as any).auth.getUser) {
      const u = await safeGetUser(this.supabase);
      userId = (u as any)?.id || null;
    }
    if (!userId) throw new Error('No authenticated user');
    const row = { ...this.mapPostToRow(post), user_id: userId };
    const { error } = await (this.supabase as SupabaseClient).from('posts').insert(row);
    if (error) console.error('createPost error', error);
    await this.refresh();
    return this.cache.posts.find((p: any) => p.id === post.id);
  }
  async updatePost(id: string, patch: any) {
    const cur = this.cache.posts.find((p: any) => p.id === id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    const row = this.mapPostToRow(next);
    const { error } = await (this.supabase as SupabaseClient).from('posts').update(row).eq('id', id);
    if (error) console.error('updatePost error', error);
    await this.refresh();
    return this.cache.posts.find((p: any) => p.id === id);
  }
  async deletePost(id: string) {
    const { error } = await (this.supabase as SupabaseClient).from('posts').delete().eq('id', id);
    if (error) console.error('deletePost error', error);
    await this.refresh();
  }
  async toggleLike(id: string, userId: string) {
    const cur = this.cache.posts.find((p: any) => p.id === id);
    if (!cur) return null;
    const likes = Array.isArray(cur.likes) ? [...cur.likes] : [];
    const i = likes.indexOf(userId);
    if (i >= 0) likes.splice(i, 1); else likes.push(userId);
    const { error } = await (this.supabase as SupabaseClient).from('posts').update({ likes }).eq('id', id);
    if (error) console.error('toggleLike error', error);
    await this.refresh();
    return this.cache.posts.find((p: any) => p.id === id);
  }
  async addComment(id: string, c: any) {
    const cur = this.cache.posts.find((p: any) => p.id === id);
    if (!cur) return null;
    const comments = Array.isArray(cur.comments) ? [...cur.comments] : [];
    comments.push(c);
    const { error } = await (this.supabase as SupabaseClient).from('posts').update({ comments }).eq('id', id);
    if (error) console.error('addComment error', error);
    await this.refresh();
    const p = this.cache.posts.find((p: any) => p.id === id);
    return p ? p.comments : comments;
  }
  async deleteComment(id: string, commentId: string) {
    const cur = this.cache.posts.find((p: any) => p.id === id);
    if (!cur) return null;
    const comments = (cur.comments || []).filter((c: any) => c.id !== commentId);
    const { error } = await (this.supabase as SupabaseClient).from('posts').update({ comments }).eq('id', id);
    if (error) console.error('deleteComment error', error);
    await this.refresh();
    const p = this.cache.posts.find((p: any) => p.id === id);
    return p ? p.comments : comments;
  }

  async updateUser(id: string, patch: any) {
    let userId: string | null = null;
    if (this.supabase && (this.supabase as any).auth && (this.supabase as any).auth.getUser) {
      const u = await safeGetUser(this.supabase);
      userId = (u as any)?.id || null;
    }
    if (!userId) throw new Error('No authenticated user');
    const update: any = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.about !== undefined) update.about = patch.about;
    if (patch.avatarUrl !== undefined) update.avatarurl = patch.avatarUrl;
    if (patch.facebook !== undefined) update.facebook = patch.facebook;
    if (patch.instagram !== undefined) update.instagram = patch.instagram;
    if (patch.twitter !== undefined) update.twitter = patch.twitter;
    if (patch.bandcamp !== undefined) update.bandcamp = patch.bandcamp;
    if (patch.soundcloud !== undefined) update.soundcloud = patch.soundcloud;
    if (patch.youtube !== undefined) update.youtube = patch.youtube;
    if (patch.lastfm !== undefined) update.lastfm = patch.lastfm;
    if (Object.keys(update).length === 0) return this.getUserById(userId);
    const { error } = await (this.supabase as SupabaseClient).from('users').update(update).eq('id', userId);
    if (error) console.error('updateUser error', error);
    await this.refresh();
    return this.getUserById(userId);
  }

  async replaceAll(data: any) {
    await (this.supabase as SupabaseClient).from('posts').delete().neq('id', '');
    await (this.supabase as SupabaseClient).from('users').delete().neq('id', '');
    const users = (data.users || []).map((u: any) => ({ id: u.id, name: u.name, about: u.about || null, created_at: new Date(u.createdAt || Date.now()).toISOString() }));
    if (users.length) {
      const { error } = await (this.supabase as SupabaseClient).from('users').upsert(users);
      if (error) console.error('replaceAll users error', error);
    }
    const posts = (data.posts || []).map((p: any) => ({ ...this.mapPostToRow(p) }));
    if (posts.length) {
      const { error } = await (this.supabase as SupabaseClient).from('posts').upsert(posts);
      if (error) console.error('replaceAll posts error', error);
    }
    await this.refresh();
  }
  exportJSON() { return JSON.stringify(this.cache, null, 2); }
}

const DB: any = (USE_SUPABASE && SUPABASE_URL && SUPABASE_ANON_KEY)
  ? new SupabaseAdapter(SUPABASE_URL, SUPABASE_ANON_KEY)
  : new LocalAdapter();

export default DB;
