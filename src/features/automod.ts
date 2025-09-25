// Port of js/features/automod.js

const BANNED_PATTERNS: RegExp[] = [
  /\bf+u+c+k+\b/i,
  /\bs+h+i+t+\b/i,
  /\bb+i+t+c+h+\b/i,
  /\ba+s+s+h*o*l*e*\b/i,
  /\bb+a+s+t+a*r*d+\b/i,
  /\bd+i+c+k+\b/i,
  /\bc+u+n+t+\b/i,
  /\bp+i+s+s+\b/i,
  /\bc+o+c+k+\b/i,
  /\bp+u+s+s+y+\b/i,
  /\bf+a+g+\b/i,
  /\bs+l+u+t+\b/i,
  /\bw+h*o+r*e*\b/i,
  /\bn+i+g+g*(a|e*r*)\b/i,
  /\bk+i+k+e+\b/i,
  /\bc+h+i+n+k+\b/i,
  /\bg+o+o+k+\b/i,
  /\bs+p+i+c+\b/i,
  /\bw+e+t+b+a+c+k+\b/i,
  /\bf+a+g+g*o*t*\b/i,
  /\bt+r+a+n+n*y*\b/i,
  /\br+e+t+a+r+d+\b/i,
  /\bd+y+k+e+\b/i,
  /\bc+o+o+n+\b/i,
  /free\s*money/i,
  /work\s*from\s*home/i,
  /viagra/i,
  /cialis/i,
  /loan/i,
  /credit\s*score/i,
  /casino/i,
  /betting/i,
  /http:\/\/(bit\.ly|tinyurl)/i,
  /buy\s*now/i,
  /click\s*here/i,
  /subscribe/i,
  /earn\s*\$/i
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5]/g, 's')
    .replace(/[7]/g, 't');
}

export function containsBannedWords(text?: string): boolean {
  if (!text) return false;
  const norm = normalize(text);
  return BANNED_PATTERNS.some(pattern => pattern.test(text) || pattern.test(norm));
}

export function looksLikeSpam(text?: string): boolean {
  if (!text) return false;
  const linkCount = (text.match(/https?:\/\//g) || []).length;
  if (linkCount > 4) return true;
  if ((text.match(/[^\x00-\x7F]/g) || []).length > 20) return true;
  if (text.length > 1200) return true;
  return false;
}

export function checkPostModeration({ title, artist, body, tags }: any): string | null {
  if (
    containsBannedWords(title) ||
    containsBannedWords(artist) ||
    containsBannedWords(body) ||
    (tags && tags.some && tags.some(containsBannedWords))
  ) {
    return 'Your post contains banned words.';
  }
  if (
    looksLikeSpam(title) ||
    looksLikeSpam(artist) ||
    looksLikeSpam(body)
  ) {
    return 'Your post looks like spam.';
  }
  return null;
}
