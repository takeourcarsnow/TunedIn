import { containsBannedWords, looksLikeSpam } from './automod';

const testCases = [
  'profile picture',
  'about me',
  'this is a test',
  'free money',
  'porn',
  'hello world',
  'asshole',
  'bastard',
  'buy now',
  'subscribe',
  `p.s. don't forget that you can add your profile picture and share some information about yourself (if you feel like it) in about me section`,
];

testCases.forEach(text => {
  const res = [containsBannedWords(text), looksLikeSpam(text)];
  // Keep quiet by default; developers can import and log if needed
});
