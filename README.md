# TunedIn

TunedIn is a lightweight, client-driven social app built with Next.js and Supabase. It focuses on short, intentional posts and integrates media providers like YouTube, SoundCloud and Spotify.

This repository hosts the web frontend and client-side app bootstrap. The UI is rendered into a single DOM root via a `bootApp` routine rather than being a traditional React SPA made up of many React components.

## Tech stack

- Next.js 14 (app router)
- React 18
- TypeScript
- Supabase (JS client)

## Quick start

Prerequisites

- Node.js (recommend v18+ or the version supported by your environment)
- npm (bundled with Node)

Install dependencies

```powershell
npm install
```

The project has a `postinstall` script that copies static assets. After `npm install` you can run the dev server:

```powershell
npm run dev
```

Build for production

```powershell
npm run build
npm start
```

## Environment configuration

This project currently ships a default Supabase URL and anon key inside `src/core/config.ts`. For security you should NOT keep production keys in source. Instead create a `.env.local` at the project root and set these variables (Next.js will expose `NEXT_PUBLIC_` vars to the client):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_USE_SUPABASE=true
```

After adding `.env.local`, restart the dev server.

Notes

- The repository still contains a hard-coded Supabase anon key in `src/core/config.ts` as a fallback. Rotate that key and move secrets to environment variables before deploying.
- A `postinstall` script (`scripts/copy_static.cjs`) runs after install to copy static assets into `public/`.

## Notable files and folders

- `app/` — Next.js app entry points. `app/page.tsx` calls `bootApp()` to initialize the client-driven UI.
- `src/bootstrap/boot.ts` — Main client bootstrapper that initializes the local DB, loads state, and renders the app into the `#app` element.
- `src/core/` — Core utilities (DB, state, supabase client, ticker, etc.).
- `src/features/` — App features (queue, posts, providers, etc.).
- `src/views/` — UI renderers used by the bootstrapper.

## Development notes

- The UI is not built as a typical React component tree. Instead, `bootApp` renders the UI by calling rendering helpers from `src/views` and `src/core/header`. When editing UI code, search for `renderMain`, `renderHeader`, and `renderLogin`.
- There is a small local DB abstraction used to persist posts and queue state in `src/core/db.ts`.
- Tests and harnesses exist under `src/tests/`, e.g. `queue_harness.ts`.

## Security

- The repo currently contains a Supabase anon key in `src/core/config.ts`. Anon keys are usable from the client but should still be rotated if exposed publicly. For production, move keys to environment variables and restrict Supabase Row Level Security (RLS) policies.

## Suggested next steps

- Move secrets to a `.env.local` and remove hard-coded keys from source.
- Add a `.env.example` to show required variables without secrets.
- Add CI (GitHub Actions) to run `npm run build` and `npm run lint` on pushes.
- Add lightweight unit/integration tests for core modules (DB, queue, providers).

## Contact / Contributing

Feel free to open issues or pull requests. For substantial changes, open an issue first to discuss the design.
