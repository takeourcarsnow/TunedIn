// automod.js - simple automoderation utilities

// List of banned words/phrases and regex patterns (expanded)
const BANNED_PATTERNS = [
  // Profanity and variants (word boundaries, leetspeak, spacing)
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
  // Hate speech / slurs (word boundaries)
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
  // Spammy terms/phrases
  /free\s*money/i,
  /work\s*from\s*home/i,
  /viagra/i,
  /cialis/i,
  /loan/i,
  /credit\s*score/i,
  /casino/i,
  /betting/i,
  // /porn/i, // Disabled: too broad, causes false positives (e.g., 'profile picture')
  // /x{2,}/i, // Disabled: too broad, causes false positives (e.g., 'about me')
  // Obvious spam patterns
  /http:\/\/(bit\.ly|tinyurl)/i,
  /buy\s*now/i,
  /click\s*here/i,
  /subscribe/i,
  /earn\s*\$/i,
  // Placeholder for more
  // /spamword1/i, // Placeholder, not used
  // /offensiveword/i, // Placeholder, not used
  // /badword/i // Placeholder, not used
];

// Normalize text for better matching (remove spaces, leetspeak, etc.)
function normalize(text) {
  // Only normalize leetspeak, not all spaces, to avoid over-matching benign phrases
  return text
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5]/g, 's')
    .replace(/[7]/g, 't');
    // .replace(/\s+/g, ''); // Disabled: don't remove spaces, prevents false positives
}

// Returns true if content contains a banned word or pattern
export function containsBannedWords(text) {
  if (!text) return false;
  const norm = normalize(text);
  return BANNED_PATTERNS.some(pattern => pattern.test(text) || pattern.test(norm));
}

// Improved spam detection
export function looksLikeSpam(text) {
  if (!text) return false;
  // Too many links
  const linkCount = (text.match(/https?:\/\//g) || []).length;
  if (linkCount > 4) return true; // allow up to 4 links
  // Repeated characters or words checks disabled to avoid false positives for normal sentences
  // Excessive non-ASCII or symbols
  if ((text.match(/[^\x00-\x7F]/g) || []).length > 20) return true;
  // Excessive length (more generous)
  if (text.length > 1200) return true;
  return false;
}

// Main moderation check: returns error message or null
export function checkPostModeration({ title, artist, body, tags }) {
  if (
    containsBannedWords(title) ||
    containsBannedWords(artist) ||
    containsBannedWords(body) ||
    (tags && tags.some(containsBannedWords))
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
