# Changelog

## [2025-08-25]
### Features & Improvements
- Added lyrics display for posts.
- Increased post length limit to 500 characters.
- Added support for post thumbnails and click-to-play on thumbnails.
- Implemented lazyloading for improved performance.
- Announcements now appear under the header.
- Sliding screen effect for mobile tabs.
- Composer is blurred when on cooldown.
- Improved messages for guests in composer bottom.
- Updated favicon.
- Various UI tweaks and text improvements.
- Removed redundant message at the top of the page.
- Minor code and UI/UX improvements.

- YouTube & embed fixes: mobile-friendly YouTube/player tweaks to avoid scrollbars and improve tap handling; several embed-related fixes for better playback behavior on mobile.
- Spotify improvements: fetch and display Spotify thumbnails where available and tweak Spotify mobile embeds.
- Docked player/mobile: fixes to ensure the docked player shows reliably on mobile, stays on top when docked, and handles stop/close correctly.
- Scrolling & autoload: autoscroll/autoload and infinite-scroll/pager fixes to improve loading behavior and avoid visual glitches.
- Mobile navigation & swipe gestures: fixes for mobile tab navigation, swipe-to-change-tabs, and preventing headers from getting stuck while scrolling.
- Small formatting and content fixes: post formatting improvements and various small fixes surfaced by recent commits.


## [2025-08-24]
### UI/UX & Post Composer Improvements
- Double-click to like now only works on the main feed area, not in comments or edit fields (prevents accidental likes).
- Audio file upload button in the post composer is now minimalistic and modern.
- When a file is chosen for upload, the URL field is hidden for a cleaner experience.
- If the file input is cleared, the URL field reappears.
- Post composer file input and label are now accessible and visually improved.
- Tag highlighting in the feed is more consistent and visually clear.
- Improved provider detection for direct audio uploads (Supabase public audio URLs).
- Minor bug fixes and code cleanup in post creation and edit logic.

## [2025-08-23]
### General Improvements
- Major UI/UX overhaul for mobile and desktop (tabbed navigation, header, tag cloud, notification system)
- Improved accessibility and visual consistency across devices
- Leaderboard redesign and profile tab updates for guests
- Enhanced tag sorting, selection logic, and accent color usage
- Added confirmation popups for deleting comments, posts, and duplicates
- Improved last.fm formatting and social links integration
- Login now persists across browser restarts
- Bug fixes, performance tweaks, and other minor feature updates

## [2025-08-22]
### Features & Improvements
- Notification system redesign and multiple improvements (UI, logic, auto-hide, post activity alerts)
- Leaderboard and email tweaks
- Autofill and messaging improvements
- Tagline, hashtag helper, and database fixes
- Security enhancements and bcryptjs integration
- Automoderation improvements
- UI/UX tweaks: login page, header countdown, placeholders, account deletion confirmation
- Authentication, login, and logout fixes

## [2025-08-21]
### Features
- Profile and account management features (delete, logout, avatars)
- Email confirmation and registration improvements
- Tag cloud, YouTube link fixes, and demo reseed
- Social links, help text, and automod features
- Login prompt and branding improvements
- Modularization of JS and CSS
- Responsive updates and UI tweaks

## [2025-08-20]
### Features & Improvements
- Mobile and desktop header versions
- Header layout and fit improvements
- Mobile scrolling and layout fixes
- Helper hashtags and about me tweaks
- Upload features and directory cleanup
- Composer, captcha, and feed improvements
- Favicons and logo updates
- Modularized app.js and CSS
- Improved branding and tagline

## [2025-08-19]
### Initial Uploads & Setup
- Initial project files and structure uploaded
- Added core assets, JS, and CSS
- Early layout and feature groundwork

---

For a full commit-by-commit history, see the project repository's commit log.


# Changelog Summary

This file summarizes the major changes and improvements throughout the history of the project. For a full commit-by-commit history, see the project repository's commit log.

---

## Highlights
- Major updates to layout, responsiveness, and design (headers, menus, compose, profile, tag cloud, etc.)
- Improved mobile and desktop experiences, animations, and visual tweaks
- Added and updated favicons, branding, and taglines
- Leaderboard improvements, post limits, and countdown timers
- Social links, hashtags, and helper utilities
- Account and post management features (edit, delete, confirm, etc.)
- Automoderation and security enhancements
- Refactoring and modularization of core logic and state management
- Database refresh and fixes
- Code cleanup, bug fixes, and improved maintainability
- Added and updated README and help texts
- Added upload features, default avatars, and improved accessibility
- Various tweaks to autofill, placeholders, and input handling
- Multiple "Add files via upload" and directory cleanup commits

---

## [2025-08-01]
### Initial Release
- Project initialized: basic layout, authentication, and core features established
- Initial mobile and desktop UI
- Basic post, tag, and profile functionality
- Early database and state management setup


