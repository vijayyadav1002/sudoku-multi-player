# Sudoku Battle

A real-time multiplayer Sudoku app. Up to ten players compete in the same room, each solving the same puzzle independently. First to finish wins. Includes solo mode, a global leaderboard, personal game history, live public room browser, and Google sign-in — all optionally backed by Supabase.

Installable as a PWA on desktop and mobile.

---

## Features

- **Multiplayer battle** — up to 10 players, same puzzle, live progress bars for every opponent
- **Solo mode** — single-player with timer and personal history
- **Public / private rooms** — public rooms appear in the live lobby browser on the home page
- **Real-time stats** — live "online now" count, matches played today, average solve time
- **Global leaderboard** — Most Wins (battle) and Best Times (solo) tabs with tier badges
- **Game history** — personal history saved to localStorage; synced to Supabase when signed in
- **Google sign-in** — via Supabase OAuth (optional; app fully works without it)
- **PWA** — installable, service worker caches assets, API calls always go to the network
- **Emotes** — in-game emoji reactions
- **Difficulty levels** — easy / medium / hard (35 / 45 / 52 cells removed)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Styling | CSS (custom design system) |
| Real-time | Socket.IO (client + server) |
| Backend | Node.js, Express |
| Database / Auth | Supabase (optional) |
| Client deploy | Vercel |
| Server deploy | Railway |
| PWA | vite-plugin-pwa (Workbox) |

---

## Local Development

### Prerequisites

- Node.js 18+
- npm

### 1. Clone and install

```bash
git clone <your-repo-url>
cd sudoku-multi-player

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure environment variables

**Server** — copy and edit:
```bash
cd server
cp .env.example .env
```

`.env` contents:
```env
PORT=3001
CLIENT_URL=http://localhost:5173

# Optional — leave blank to disable auth and game history saving
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Client** — copy and edit:
```bash
cd client
cp .env.example .env
```

`.env` contents:
```env
VITE_SOCKET_URL=http://localhost:3001

# Optional — leave blank to disable Google sign-in and leaderboard
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> The app runs fully without Supabase — multiplayer and solo both work. Auth, leaderboard, and game history saving are silently disabled when the env vars are absent.

### 3. Run

Open two terminals:

```bash
# Terminal 1 — server (auto-restarts on changes)
cd server && npm run dev

# Terminal 2 — client (Vite HMR)
cd client && npm run dev
```

Client: http://localhost:5173  
Server: http://localhost:3001

---

## Supabase Setup (Optional)

Skip this section if you don't need Google sign-in, leaderboard, or game history persistence.

### Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Note your **Project URL**, **anon key**, and **service role key** from **Project Settings → API**

### Step 2 — Create the database schema

Open the **SQL Editor** in your Supabase dashboard and run:

```sql
-- Games table: one row per completed game
create table games (
  id           bigserial primary key,
  mode         text not null check (mode in ('solo', 'battle')),
  difficulty   text not null check (difficulty in ('easy', 'medium', 'hard')),
  player_count integer,
  winner_nickname text,
  total_duration_seconds integer,
  created_at   timestamptz default now()
);

-- Game players: one row per player per game
create table game_players (
  id               bigserial primary key,
  game_id          bigint references games(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete set null,
  nickname         text not null,
  outcome          text check (outcome in ('win', 'loss', 'completed')),
  rank             integer,
  progress         integer default 0,   -- 0–100
  duration_seconds integer,
  created_at       timestamptz default now()
);

-- Indexes for leaderboard queries
create index on game_players(outcome);
create index on game_players(progress);
create index on game_players(user_id);
create index on games(created_at);
```

### Step 3 — Create leaderboard RPC functions

Still in the SQL Editor, run:

```sql
-- Most wins leaderboard (battle mode, only fully-played games)
create or replace function leaderboard_wins()
returns table (
  nickname text,
  wins     bigint,
  games    bigint,
  losses   bigint
)
language sql
as $$
  select
    gp.nickname,
    count(*) filter (where gp.outcome = 'win')  as wins,
    count(*)                                      as games,
    count(*) filter (where gp.outcome = 'loss') as losses
  from game_players gp
  join games g on g.id = gp.game_id
  where g.mode = 'battle'
  group by gp.nickname
  having count(*) filter (where gp.outcome = 'win') > 0
  order by wins desc
  limit 100;
$$;

-- Best times leaderboard (solo mode, only fully completed puzzles)
create or replace function leaderboard_times()
returns table (
  nickname   text,
  difficulty text,
  best_time  integer
)
language sql
as $$
  select
    gp.nickname,
    g.difficulty,
    min(gp.duration_seconds) as best_time
  from game_players gp
  join games g on g.id = gp.game_id
  where g.mode = 'solo'
    and gp.progress = 100
    and gp.duration_seconds is not null
  group by gp.nickname, g.difficulty
  order by g.difficulty, best_time;
$$;
```

### Step 4 — Enable Row Level Security (recommended)

```sql
alter table games        enable row level security;
alter table game_players enable row level security;

-- Anyone can read (leaderboard, history)
create policy "public read games"        on games        for select using (true);
create policy "public read game_players" on game_players for select using (true);

-- Only the server (service role key) can write — no client-side insert needed
```

### Step 5 — Set up Google OAuth

#### Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID** (type: Web application)
3. Under **Authorised JavaScript origins** add:
   - `http://localhost:5173`
   - `https://your-app.vercel.app` (add after Vercel deploy)
4. Under **Authorised redirect URIs** add:
   - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
5. Copy the **Client ID** and **Client Secret**

#### Supabase dashboard

1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google and paste the Client ID and Client Secret from above
3. Go to **Authentication** → **URL Configuration**:
   - **Site URL**: `https://your-app.vercel.app` (or `http://localhost:5173` for local-only)
   - **Redirect URLs**: add both `https://your-app.vercel.app` and `http://localhost:5173`
4. Save

No additional env vars needed — Supabase handles the entire OAuth exchange.

---

## Deployment

### Server → Railway

The backend uses Socket.IO (persistent WebSocket connections) so it must run on a long-lived process, not a serverless platform.

**1. Install the Railway CLI and log in:**
```bash
npm install -g @railway/cli
railway login
```

**2. Initialise and deploy:**
```bash
cd server
railway init        # name it e.g. sudoku-server
railway up
```

**3. Set environment variables in the Railway dashboard** (your project → Variables):

| Variable | Value |
|---|---|
| `CLIENT_URL` | `https://your-app.vercel.app` (set after client deploy) |
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key (**keep secret**) |

**4. Note your server URL** — e.g. `https://sudoku-server-production.up.railway.app`

---

### Client → Vercel

**1. Install the Vercel CLI and log in:**
```bash
npm install -g vercel
vercel login
```

**2. Deploy (first time):**
```bash
cd client
vercel
```

Vercel auto-detects Vite. Accept the defaults: build command `npm run build`, output directory `dist`.

**3. Set environment variables:**
```bash
vercel env add VITE_SOCKET_URL production
# Paste your Railway server URL: https://sudoku-server-production.up.railway.app

vercel env add VITE_SUPABASE_URL production
# Paste your Supabase project URL

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste your Supabase anon key
```

**4. Deploy to production:**
```bash
vercel --prod
```

Note your Vercel URL — e.g. `https://sudoku-battle.vercel.app`

---

### Wire them together

Once both are live, update the Railway `CLIENT_URL` to your Vercel URL so CORS is configured correctly:

1. Railway dashboard → your project → **Variables**
2. Set `CLIENT_URL` = `https://sudoku-battle.vercel.app`
3. Railway auto-redeploys

Update `CLIENT_URL` in your Supabase auth settings too (Authentication → URL Configuration → Site URL).

---

### Redeployment

| What changed | Command |
|---|---|
| Server code | `cd server && railway up` |
| Client code | `cd client && vercel --prod` |
| Server env vars | Update in Railway dashboard (auto-redeploys) |
| Client env vars | `vercel env add VAR_NAME production` then `vercel --prod` |

---

## Environment Variables Reference

### Client (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SOCKET_URL` | Yes | URL of the backend server |
| `VITE_SUPABASE_URL` | No | Supabase project URL — enables auth + leaderboard |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon key — required with `VITE_SUPABASE_URL` |

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP/Socket.IO port (default: `3001`) |
| `CLIENT_URL` | Yes | Allowed CORS origin — your Vercel URL in production |
| `SUPABASE_URL` | No | Supabase project URL — enables game history saving |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key — **never commit or expose** |

---

## Project Structure

```
sudoku-multi-player/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── pages/           # Home, Room, Game, Result, Solo, History, Leaderboard
│   │   ├── components/      # SudokuBoard, SudokuCell, NumberPad, Timer, PlayerStatus, …
│   │   ├── context/         # SocketContext, AuthContext
│   │   └── lib/             # sudokuHelpers, supabase, api, players
│   ├── public/              # PWA icons, favicon
│   └── vercel.json          # SPA rewrite rules
│
└── server/                  # Express + Socket.IO backend
    ├── src/
    │   ├── index.js          # Server entry — Express + Socket.IO setup
    │   ├── routes/
    │   │   ├── games.js      # POST /api/games, GET /api/games/leaderboard, GET /api/games/stats
    │   │   └── rooms.js      # GET /api/rooms/puzzle, GET /api/rooms/:id
    │   ├── socket/
    │   │   └── gameHandlers.js  # All Socket.IO event handlers
    │   └── game/
    │       ├── roomManager.js   # In-memory room and player state
    │       └── sudokuGenerator.js  # Puzzle generation with uniqueness check
    └── railway.json          # Railway start command config
```
