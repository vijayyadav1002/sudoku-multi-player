# Deployment Guide

Client → Vercel | Server → Railway

---

## Prerequisites

```bash
npm install -g @railway/cli
npm install -g vercel
```

---

## Supabase (optional — auth + game history)

Auth and game history persistence are disabled gracefully when Supabase env vars are absent. To enable:

**1. Create a project at [supabase.com](https://supabase.com) and run the schema migrations.**

**2. Note your project credentials:**
- Project URL → `VITE_SUPABASE_URL` (client) and `SUPABASE_URL` (server)
- Anon key → `VITE_SUPABASE_ANON_KEY` (client)
- Service role key → `SUPABASE_SERVICE_ROLE_KEY` (server — **keep secret, never commit**)

**3. Set these as env vars in Railway (server) and Vercel (client) per the sections below.**

---

## Google Auth (optional — requires Supabase)

The app uses Supabase's OAuth flow with Google. Auth is triggered client-side via `supabase.auth.signInWithOAuth({ provider: 'google' })` and redirects back to `window.location.origin` after sign-in.

### Step 1 — Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. Create an **OAuth 2.0 Client ID** (type: Web application)
3. Add to **Authorised JavaScript origins**:
   - `http://localhost:5173` (local dev)
   - `https://your-app.vercel.app` (production)
4. Add to **Authorised redirect URIs**:
   - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
5. Copy the **Client ID** and **Client Secret**

### Step 2 — Supabase dashboard

1. Go to your Supabase project → **Authentication** → **Providers** → **Google**
2. Enable Google, paste the **Client ID** and **Client Secret** from above
3. Under **Authentication** → **URL Configuration**, set:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: add `https://your-app.vercel.app` and `http://localhost:5173`
4. Save

No extra env vars needed beyond the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — Supabase handles the OAuth exchange internally.

---

## Server — Railway

The server uses Express + Socket.IO and requires a persistent process (not serverless).

**1. Login and initialize:**
```bash
cd server
railway login
railway init       # name it e.g. sudoku-server
```

**2. Deploy:**
```bash
railway up
```

**3. Set environment variables in the Railway dashboard:**
| Variable | Value |
|---|---|
| `CLIENT_URL` | `https://your-app.vercel.app` (update after client deploy) |
| `SUPABASE_URL` | your Supabase project URL (optional) |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key (optional, **keep secret**) |

**4. Note your server URL** from the Railway dashboard — e.g. `https://sudoku-project-production.up.railway.app`

> `railway.json` configures the start command and restart policy. The `build.builder` field is omitted — Railway auto-detects Node.js.

---

## Client — Vercel

The client is a Vite + React PWA. `client/vercel.json` handles SPA routing rewrites.

**1. Login and deploy:**
```bash
cd client
vercel
```

During prompts: framework is auto-detected as Vite, build command is `npm run build`, output dir is `dist`.

**2. Set environment variables:**
```bash
vercel env add VITE_SOCKET_URL production
# Enter your Railway server URL: https://sudoku-project-production.up.railway.app

vercel env add VITE_SUPABASE_URL production        # optional
vercel env add VITE_SUPABASE_ANON_KEY production   # optional
```

**3. Deploy to production:**
```bash
vercel --prod
```

---

## Wiring Them Together

Once both are deployed, update Railway's `CLIENT_URL` to your Vercel URL so CORS is correctly configured:

1. Railway dashboard → your project → Variables
2. Set `CLIENT_URL` = `https://your-app.vercel.app`
3. Railway auto-redeploys with the new value

---

## Redeployment

| What changed | Command |
|---|---|
| Server code | `cd server && railway up` |
| Client code | `cd client && vercel --prod` |
| Server env vars | Update in Railway dashboard (auto-redeploys) |
| Client env vars | `vercel env add VITE_SOCKET_URL production` then `vercel --prod` |

---

## Current URLs

- **Server**: `https://sudoku-project-production.up.railway.app`
- **Client**: *([add your Vercel URL here after first deploy](https://sudoku-client-beta.vercel.app))*
