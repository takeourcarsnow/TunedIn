export type Provider = 'youtube' | 'spotify' | 'soundcloud' | 'bandcamp' | null;

export function parseProvider(url: string): Provider {
  const u = (url || '').toLowerCase();
  if (!u) return null;
  if (/youtu\.be|youtube\.com/.test(u)) return 'youtube';
  if (/open\.spotify\.com/.test(u)) return 'spotify';
  if (/soundcloud\.com/.test(u)) return 'soundcloud';
  if (/bandcamp\.com/.test(u)) return 'bandcamp';
  return null;
}
