# Common Ground

A tiny, static Wordle clone for playing with your people. It uses plain HTML, CSS, and JavaScript, so it can be hosted directly on GitHub Pages.

## Run it

Open `index.html` directly, or serve the folder locally:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

The game works without any setup. It uses a built-in daily word list and saves your current game, stats, local group, and local leaderboard in `localStorage`.

## Connect Supabase

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase-schema.sql`](./supabase-schema.sql).
3. In Supabase Authentication → Sign In / Providers, enable **Anonymous Sign-Ins**.
4. In `app.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the project URL and public publishable key. Never put a Supabase secret/service-role key in this repo.
5. Push the repository and turn on GitHub Pages for the `main` branch / root folder.

The frontend talks to Supabase directly. Supabase handles anonymous player identities and the database; GitHub Pages only serves the static files, so there is no need for a separate backend host for this scope.

## Optional word source

Set `WORD_SOURCE_URL` in `app.js` to a JSON endpoint that returns `{ "word": "stare" }` or `{ "answer": "stare" }`. The app falls back to its built-in list if the endpoint is empty, unavailable, blocked by CORS, or returns an invalid word. This keeps the daily puzzle playable even when an external endpoint changes.

## Notes

- Local groups are intentionally browser-local. Cross-device groups and persisted leaderboards require Supabase plus the schema above.
- Supabase anonymous players do not need email or passwords, but their identity is lost if they sign out, clear browser data, or switch devices. Supabase recommends CAPTCHA/rate limiting for public anonymous sign-in to prevent abuse.
- The public Supabase URL and anon key are expected in a static frontend; Row Level Security is what protects the tables.
- No framework, bundler, npm install, or server-side runtime is required.
