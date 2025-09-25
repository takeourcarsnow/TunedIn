
import { safeClone } from './utils.js';

// Expanded list of common disposable email domains (update as needed)
// Source: https://github.com/disposable/disposable-email-domains (partial)
const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'tempmail.com',
  'yopmail.com', 'trashmail.com', 'getnada.com', 'dispostable.com', 'maildrop.cc',
  'fakeinbox.com', 'mintemail.com', 'mytemp.email', 'throwawaymail.com',
  'sharklasers.com', 'spamgourmet.com', 'mailnesia.com', 'temp-mail.org',
  'emailondeck.com', 'moakt.com', 'mailcatch.com', 'mailnull.com',
  '33mail.com', 'mailtemp.net', 'tempail.com', 'tempmail.net', 'tempmailaddress.com',
  'tempmailbox.com', 'tempmails.net', 'trashmail.de', 'maildrop.cc', 'disposablemail.com',
  'spambog.com', 'spambog.de', 'spambog.ru', 'spambog.xyz', 'spambog.pl',
  'spambog.com', 'spambog.de', 'spambog.ru', 'spambog.xyz', 'spambog.pl',
  'spam4.me', 'spamex.com', 'spaml.com', 'spammail.de', 'spammail.net',
  'spammail.org', 'spamobox.com', 'spamspot.com', 'spamwc.com',
  // ...add more as needed
];

// Checks if the email domain or any of its parent domains is in the blocklist
function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  // Check direct match and parent domains (subdomain blocking)
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const checkDomain = parts.slice(i).join('.');
    if (DISPOSABLE_EMAIL_DOMAINS.includes(checkDomain)) return true;
  }
  return false;
}
// bcrypt is loaded globally from CDN in index.html

import { SUPABASE_URL, SUPABASE_ANON_KEY, USE_SUPABASE } from './config.js';
import { safeGetUser } from './auth_helpers.js';

const DB_KEY_V2 = 'TunedIn.space/db@v2';
const DB_KEY_V1 = 'TunedIn.space/v1';

const defaultDB = { users:[], posts:[], createdAt: Date.now(), version: 2 };

class LocalAdapter {
  async deleteUser(id) {
    await this.init();
    const i = (this.cache.users || []).findIndex(u => u.id === id);
    if (i < 0) return false;
    this.cache.users.splice(i, 1);
    // Optionally, delete user's posts too:
    this.cache.posts = (this.cache.posts || []).filter(p => p.userId !== id);
    await this._save();
    return true;
  }
  constructor(){ this.cache = null; this.isRemote = false; }

  async init(){
    if(this.cache) return this.cache;
    const v2 = localStorage.getItem(DB_KEY_V2);
    if(v2){
      try { this.cache = JSON.parse(v2); }
      catch { this.cache = safeClone(defaultDB); }
      return this.cache;
    }
    const v1 = localStorage.getItem(DB_KEY_V1);
    if(v1){
      try{
        const old = JSON.parse(v1);
        this.cache = { ...defaultDB, ...old, version:2 };
        await this._save();
      }catch{
        this.cache = safeClone(defaultDB);
      }
      return this.cache;
    }
    this.cache = safeClone(defaultDB);
    return this.cache;
  }
  getAll(){ return this.cache || defaultDB; }
  async refresh(){ return this.cache; }
  async _save(){ try{ localStorage.setItem(DB_KEY_V2, JSON.stringify(this.cache)); }catch{} }

  async ensureUser(name, email, password) {
    await this.init();
    // Enforce required fields for local users
    if (!email || !password || password.length < 6) {
      throw new Error('Email and password (min 6 chars) are required.');
    }
    if (isDisposableEmail(email)) {
      throw new Error('Disposable (temporary) email addresses are not allowed.');
    }
    let u = this.cache.users.find(x => x.name.toLowerCase() === name.toLowerCase() || (email && x.email === email));
    if (!u) {
      // Hash the password before storing
      const salt = window.bcrypt.genSaltSync(10);
      const hash = window.bcrypt.hashSync(password, salt);
      u = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'u_' + Math.random().toString(36).slice(2),
        name: name.trim(),
        email: email,
        password: hash, // store hash
  about: '',
  facebook: '',
  instagram: '',
  twitter: '',
  bandcamp: '',
  soundcloud: '',
  youtube: '',
  lastfm: '',
        createdAt: Date.now()
      };
      this.cache.users.push(u); await this._save();
    }
    return u;
  }

  async loginUser(email, password) {
    await this.init();
    if (!email || !password || password.length < 6) return null;
    const user = this.cache.users.find(u => u.email === email);
    if (!user) return null;
    // Only allow login if user has a non-empty password hash
    if (!user.password || user.password.length < 6) return null;
    // Compare password with hash
  const isMatch = window.bcrypt.compareSync(password, user.password);
    return isMatch ? user : null;
  }
  getUserById(id){ return (this.cache?.users || []).find(u=>u.id===id) || null; }

  async createPost(p){ await this.init(); this.cache.posts.push(p); await this._save(); return p; }
  async updatePost(id, patch){
    await this.init();
    const i = this.cache.posts.findIndex(x=>x.id===id);
    if(i<0) return null;
    this.cache.posts[i] = { ...this.cache.posts[i], ...patch };
    await this._save();
    return this.cache.posts[i];
  }
  async deletePost(id){
    await this.init();
    const i = this.cache.posts.findIndex(x=>x.id===id);
    if(i<0) return;
    this.cache.posts.splice(i,1);
    await this._save();
  }
  async toggleLike(id, userId){
    await this.init();
    const p = this.cache.posts.find(x=>x.id===id);
    if(!p) return null;
    p.likes = p.likes || [];
    const i = p.likes.indexOf(userId);
    if(i>=0) p.likes.splice(i,1); else p.likes.push(userId);
    await this._save();
    return p;
  }
  async addComment(id, c){
    await this.init();
    const p = this.cache.posts.find(x=>x.id===id);
    if(!p) return null;
    p.comments = p.comments || [];
    p.comments.push(c);
    await this._save();
    return p.comments;
  }
  async deleteComment(postId, commentId){
    await this.init();
    const p = this.cache.posts.find(x=>x.id===postId);
    if(!p) return null;
    p.comments = (p.comments || []).filter(c => c.id !== commentId);
    await this._save();
    return p.comments;
  }

  async updateUser(id, patch){
    await this.init();
    const i = (this.cache.users || []).findIndex(u => u.id === id);
    if(i < 0) return null;
    this.cache.users[i] = { ...this.cache.users[i], ...patch };
    await this._save();
    return this.cache.users[i];
  }

  async replaceAll(data){
    this.cache = { version:2, createdAt: Date.now(), users: data.users||[], posts: data.posts||[] };
    await this._save();
  }
  exportJSON(){
    return JSON.stringify(this.cache || defaultDB, null, 2);
  }
}

class SupabaseAdapter {
  async deleteUser(id) {
    // Delete user posts first
    const { error: postError } = await this.supabase.from('posts').delete().eq('user_id', id);
    if (postError) console.error('deleteUser posts error', postError);
    // Delete user
    const { error: userError } = await this.supabase.from('users').delete().eq('id', id);
    if (userError) console.error('deleteUser user error', userError);
    await this.refresh();
    return !userError;
  }
  constructor(url, key){
    this.isRemote = true;
    this.supabase = null;
    this.cache = { ...defaultDB };
    this.url = url;
    this.key = key;
  }
  async init(){
    if(!this.supabase){
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      this.supabase = createClient(this.url, this.key);
    }
    await this.refresh();
    return this.cache;
  }
  mapRowToPost(row){
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
  mapPostToRow(p){
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
  mapRowToUser(row){
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

  async refresh(){
    const [uRes, pRes] = await Promise.all([
      this.supabase.from('users').select('*').order('created_at', { ascending: true }),
      this.supabase.from('posts').select('*').order('created_at', { ascending: false }),
    ]);
    if(uRes.error) console.warn('Supabase users error', uRes.error);
    if(pRes.error) console.warn('Supabase posts error', pRes.error);
    const users = (uRes.data||[]).map(r=>this.mapRowToUser(r));
    const posts = (pRes.data||[]).map(r=>this.mapRowToPost(r));
    this.cache = { version:2, createdAt: this.cache.createdAt || Date.now(), users, posts };
    return this.cache;
  }
  getAll(){ return this.cache; }

  async ensureUser(name) {
    // Always use the current authenticated user's UID as id
    let userId = null;
    if (this.supabase && this.supabase.auth && this.supabase.auth.getUser) {
      const u = await safeGetUser(this.supabase);
      userId = u?.id || null;
    }
    if (!userId) throw new Error('No authenticated user');
    const existing = this.cache.users.find(u => u.id === userId || u.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const user = {
      id: userId,
      name: name.trim(),
      about: '',
      createdAt: Date.now()
    };
    const { error } = await this.supabase.from('users').insert({
      id: user.id, name: user.name, about: user.about, created_at: new Date(user.createdAt).toISOString()
    });
    if (error) console.warn('ensureUser insert failed', error);
    this.cache.users.push(user);
    return user;
  }
  getUserById(id){ return this.cache.users.find(u=>u.id===id) || null; }

  async createPost(post){
    // Always use the current authenticated user's UID as userId
    let userId = null;
    if (this.supabase && this.supabase.auth && this.supabase.auth.getUser) {
      const u = await safeGetUser(this.supabase);
      userId = u?.id || null;
    }
    if (!userId) throw new Error('No authenticated user');
    const row = { ...this.mapPostToRow(post), user_id: userId };
    const { error } = await this.supabase.from('posts').insert(row);
    if(error) console.error('createPost error', error);
    await this.refresh();
    return this.cache.posts.find(p=>p.id===post.id);
  }
  async updatePost(id, patch){
    const cur = this.cache.posts.find(p=>p.id===id);
    if(!cur) return null;
    const next = { ...cur, ...patch };
    const row = this.mapPostToRow(next);
    const { error } = await this.supabase.from('posts').update(row).eq('id', id);
    if(error) console.error('updatePost error', error);
    await this.refresh();
    return this.cache.posts.find(p=>p.id===id);
  }
  async deletePost(id){
    const { error } = await this.supabase.from('posts').delete().eq('id', id);
    if(error) console.error('deletePost error', error);
    await this.refresh();
  }
  async toggleLike(id, userId){
    const cur = this.cache.posts.find(p=>p.id===id);
    if(!cur) return null;
    const likes = Array.isArray(cur.likes) ? [...cur.likes] : [];
    const i = likes.indexOf(userId);
    if(i>=0) likes.splice(i,1); else likes.push(userId);
    const { error } = await this.supabase.from('posts').update({ likes }).eq('id', id);
    if(error) console.error('toggleLike error', error);
    await this.refresh();
    return this.cache.posts.find(p=>p.id===id);
  }
  async addComment(id, c){
    const cur = this.cache.posts.find(p=>p.id===id);
    if(!cur) return null;
    const comments = Array.isArray(cur.comments) ? [...cur.comments] : [];
    comments.push(c);
    const { error } = await this.supabase.from('posts').update({ comments }).eq('id', id);
    if(error) console.error('addComment error', error);
    await this.refresh();
    const p = this.cache.posts.find(p=>p.id===id);
    return p ? p.comments : comments;
  }
  async deleteComment(id, commentId){
    const cur = this.cache.posts.find(p=>p.id===id);
    if(!cur) return null;
    const comments = (cur.comments || []).filter(c => c.id !== commentId);
    const { error } = await this.supabase.from('posts').update({ comments }).eq('id', id);
    if(error) console.error('deleteComment error', error);
    await this.refresh();
    const p = this.cache.posts.find(p=>p.id===id);
    return p ? p.comments : comments;
  }

  async updateUser(id, patch){
    // Always use the current authenticated user's UID for update
    let userId = null;
    if (this.supabase && this.supabase.auth && this.supabase.auth.getUser) {
      const u = await safeGetUser(this.supabase);
      userId = u?.id || null;
    }
    if (!userId) throw new Error('No authenticated user');
    const update = {};
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
    const { error } = await this.supabase.from('users').update(update).eq('id', userId);
    if(error) console.error('updateUser error', error);
    await this.refresh();
    return this.getUserById(userId);
  }

  async replaceAll(data){
    // Dangerous: clears all data. Intended for import/replace.
    await this.supabase.from('posts').delete().neq('id','');
    await this.supabase.from('users').delete().neq('id','');

    const users = (data.users||[]).map(u => ({
      id: u.id,
      name: u.name,
      about: u.about || null, // NEW
      created_at: new Date(u.createdAt||Date.now()).toISOString()
    }));
    if(users.length){
      const { error } = await this.supabase.from('users').upsert(users);
      if(error) console.error('replaceAll users error', error);
    }

    const posts = (data.posts||[]).map(p => ({
      ...this.mapPostToRow(p)
    }));
    if(posts.length){
      const { error } = await this.supabase.from('posts').upsert(posts);
      if(error) console.error('replaceAll posts error', error);
    }

    await this.refresh();
  }
  exportJSON(){
    return JSON.stringify(this.cache, null, 2);
  }
}

const DB = (USE_SUPABASE && SUPABASE_URL && SUPABASE_ANON_KEY)
  ? new SupabaseAdapter(SUPABASE_URL, SUPABASE_ANON_KEY)
  : new LocalAdapter();

export default DB;