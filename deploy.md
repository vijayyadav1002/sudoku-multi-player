# Deployment Guide

Client → Vercel | Server → Railway

---

## Prerequisites

```bash
npm install -g @railway/cli
npm install -g vercel
```

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

**2. Set environment variable:**
```bash
vercel env add VITE_SOCKET_URL production
# Enter your Railway server URL: https://sudoku-project-production.up.railway.app
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
