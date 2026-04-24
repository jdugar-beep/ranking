# Roshni Ranks

A Vercel-ready React + Supabase app for ranking anything and sharing rankings with accepted friends.

## Upload to GitHub

Upload these files directly into your GitHub repo root:

- package.json
- index.html
- src/
- supabase-schema.sql
- README.md

## Supabase setup

1. Create a Supabase project.
2. Go to SQL Editor.
3. Paste and run `supabase-schema.sql`.
4. Go to Project Settings → API.
5. Copy:
   - Project URL
   - anon public key

## Vercel setup

In Vercel project settings, add environment variables:

VITE_SUPABASE_URL = your Supabase Project URL  
VITE_SUPABASE_ANON_KEY = your Supabase anon public key

Then redeploy.

## Local dev

npm install  
npm run dev
