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

## NYT Wordle source

NYT's Wordle endpoint does not include an `Access-Control-Allow-Origin` header, so a browser hosted on GitHub Pages cannot read it directly. The app therefore calls the small Supabase Edge Function in `supabase/functions/wordle`, which fetches the NYT response server-side and returns only the solution with CORS enabled.

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), log in, and deploy the function to the project configured by `SUPABASE_URL`:

```bash
supabase login
supabase link --project-ref meqqfuywvkcwbzqyqcyc
supabase functions deploy wordle --no-verify-jwt
```

The function is public but can only fetch a date-validated Wordle URL; it is not an open proxy. The frontend still falls back to its built-in daily list if the function or NYT is unavailable. `valid-wordle-words.txt` contains the accepted-guess list, so common words such as `plays` are valid while non-words are rejected.

## Notes

- Local groups are intentionally browser-local. Cross-device groups and persisted leaderboards require Supabase plus the schema above.
- Supabase anonymous players do not need email or passwords, but their identity is lost if they sign out, clear browser data, or switch devices. Supabase recommends CAPTCHA/rate limiting for public anonymous sign-in to prevent abuse.
- The public Supabase URL and anon key are expected in a static frontend; Row Level Security is what protects the tables.
- No framework, bundler, npm install, or server-side runtime is required.
