
## Help

**👋 Welcome to TunedIn.space!**

Your new favorite place to overshare your music taste. (We won't judge. Much.)

### Getting Started

- Scroll the feed and eavesdrop on what everyone else is jamming to.
- Smash **[ login / register ]** to join the party and drop your own bangers.
- Share links from YouTube, Spotify, Bandcamp, SoundCloud, or even that obscure .mp3 you found at 3am.
- Tag your posts (#vibes, #throwback, #2020) so fellow music nerds can find them.
- Hit **[ play all ]** to turn the feed into your personal radio station.


### How to Post

- Give us a title, an artist, and a legit music link. (No Rickrolls. Or... maybe just one.)
- Tags = discoverability. Don’t be shy.
- Optional: Tell us why this track slaps. Or just type "banger." We get it.
- **You can post once every 24 hours. Plan your pick and come back tomorrow to share again!**

### Listening & Queue

- Player controls up top: play, skip, shuffle, clear. DJ skills not required.
- The queue is just the current feed, so filter and sort to your heart’s content.

### Personalize

- Pick an accent color. Express yourself. (Sorry, no glitter... yet.)

### Tips & Tricks

- Click tags to filter the feed. Use [ clear tag ] to see everything again.
- Everything is keyboard accessible, so you can flex your shortcut skills.
- Be kind, have fun, and remember: one person’s guilty pleasure is another’s anthem.



# TunedIn.space — Minimal Music Threads Webapp

**TunedIn.space** is a modern, minimal web app for sharing and discussing music. Features include user authentication, music threads with tags, likes, comments, and a built-in playlist/queue. The app rocks a "monospace vibes" look and supports two modes:
- **Local mode:** All data is stored in the browser's LocalStorage.
- **Supabase mode:** Data is synced with a Supabase backend (cloud database).

---



## Highlights

- **Leaderboard Redesign:** Clean, simplified leaderboard with profile pictures, clickable usernames/avatars, and responsive scaling for all devices.
- **Notification System:** Improved notification dot, mobile support, and UI/UX tweaks for alerts and activity.
- **Auto-Refresh Feed:** Feed, likes, and comments update every 30 seconds, or instantly when you return to the tab. Playback is never interrupted.
- **Full Help Guide:** In-app help overlay with step-by-step instructions, posting tips, queue/player info, keyboard shortcuts, and accessibility.
- **UI & Accessibility:** Clean topbar, improved keyboard navigation, focus management, and live region for announcements.
- **Smart Composer:** Paste a YouTube or SoundCloud link to auto-fill title/artist using oEmbed and parsing.
- **Customization:** Pick your accent color, choose cozy or compact layout.
- **Data Management:** Export/import all data as JSON, with clear warnings and feedback.
- **Supabase Integration:** Seamless switching between local and Supabase modes, with all CRUD mirrored to the backend if enabled.
- **Modular Codebase:** Main logic split into focused modules for maintainability. See File Structure below.
- **Provider Detection:** Robust embedding for YouTube, Spotify, Bandcamp, SoundCloud, and direct audio files.
- **Queue & Player:** Play, shuffle, repeat, and auto-scroll queue, with keyboard shortcuts for all major actions.
- **Security:** Local mode is for demo/testing only; Supabase mode uses RLS for security.

---



## Features

- **Leaderboard:** See top contributors and most liked users, with profile pictures and direct profile/about access.
- **24-Hour Post Limit:** You can post once every 24 hours—come back daily to share your next favorite track!
- **User Authentication:** Register/login with email/password (Supabase or local).
- **Music Posts:** Share music links (YouTube, Spotify, Bandcamp, SoundCloud, direct audio).
- **Tags & Search:** Tag posts, filter/search by tags, title, artist, or body.
- **Likes & Comments:** Like posts and add comments.
- **Queue & Player:** Add posts to a queue, play embedded music, auto-advance, shuffle, repeat.
- **Import/Export:** Export/import all data as JSON.
- **Settings:** Accent color, density (cozy/compact), and storage info.
- **Keyboard Shortcuts:** For navigation, liking, playing, and more.
- **Accessibility:** Skip links, ARIA roles, live region, and full keyboard support.

---



## File Structure

- `index.html` — Main HTML entry point, includes help overlay and app shell.
- `css/` — Modular, dark, responsive CSS (base, layout, components, auth).

### JavaScript Modules


**js/core/**
	- `app.js` — App entry point; initializes app, manages global state, delegates to modules.
	- `config.js` — Supabase config (URL, anon key, toggle).
	- `constants.js` — App-wide constants.
	- `db.js` — Data layer: handles local and Supabase storage, CRUD for users/posts. See code comments for architecture and adapter interface.
	- `supabase_client.js` — Supabase client setup.
	- `utils.js` — Utility functions (DOM helpers, debounce, formatting, etc.).

**js/features/**
	- `actions.js` — Handles global and delegated UI actions/events.
	- `automod.js` — Auto-moderation logic.
	- `feed.js` — Feed rendering, post filtering, comment rendering.
	- `import_export.js` — Data import/export logic.
	- `oembed.js` — Fetches oEmbed metadata for supported providers.
	- `posts.js` — Post creation, editing, inline editing logic.
	- `providers.js` — Detects music provider from URL, builds embed players.
	- `queue.js` — Queue management and now playing logic.
	- `seed.js` — Demo data seeding.
	- `tagcloud_scroll.js` — Tag cloud scrolling logic.
	- `yt_title_parse.js` — Smart parsing of YouTube titles for artist/title extraction.

**js/views/**
	- `login_prompts.js` — Login prompt UI.
	- `login_view.js` — Login/register UI rendering.
	- `main_view.js` — Renders main UI (feed, profile, compose, tags, etc.).
	- `overlays.js` — Help overlay and modal overlays.
	- `profile.js` — User profile view.

**js/auth/**
	- `auth.js` — Auth logic.
	- `keyboard.js` — Keyboard shortcuts for auth.
	- `prefs.js` — User preferences for auth.
	- `session.js` — Session management for auth.
	- `theme.js` — Theme switching for auth.

---

---

---

## Data Model

- **User:** `{ id, name, email, password (local only), createdAt }`
- **Post:** `{ id, userId, title, artist, url, provider, tags, body, likes, comments, createdAt }`
- **Comment:** `{ id, userId, text, createdAt }`

---

## Supabase Integration

- If enabled, all users and posts are synced to Supabase tables.
- Uses Supabase Auth for user management.
- All CRUD operations are mirrored to the backend.

---

## Security & Privacy

- **Local mode:** All data is stored in the browser, not secure for production.
- **Supabase mode:** Uses public anon key, relies on Supabase RLS for security.
- **Passwords:** Only stored locally in demo mode, not secure.

---

## Accessibility

- Skip to content link, ARIA roles, live region for updates.
- Keyboard navigation and shortcuts.
- Focus management for forms and overlays.

---

## Customization

- **Accent Color:** User can pick from a palette.
- **Density:** Toggle between cozy and compact layouts.
- **Storage Info:** Shows local storage usage or Supabase sync status.

---

## Quick Start

1. **Register or log in** (Supabase or local).
2. **Post music links** with title, artist, tags, and description.
3. **Browse, search, and filter** posts.
4. **Like, comment, and queue** posts for playback.
5. **Export or import** your data as JSON.
6. **Customize** accent color and layout density.
7. **Use the help menu** for a full new user guide and keyboard shortcuts.

---

## Extending the App

- Add more music providers in `providers.js`.
- Enhance moderation, notifications, or analytics.
- Improve security for production use.
- Add mobile PWA support.
- For backend/data layer changes, see `js/core/db.js` for architecture, adapter interface, and extension points.

---
