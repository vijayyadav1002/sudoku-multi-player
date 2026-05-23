# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sudoku Battle is a real-time multiplayer Sudoku app. Two players compete in the same room, each solving the same puzzle independently. The first to complete it wins. There's also a solo mode with a local game history.

The app is a PWA (installable) built with React + Vite on the frontend, and an Express + Socket.IO server on the backend. No database — all room/game state lives in memory on the server.

## Testing & Linting

There are no tests and no linting configured in this project.

## Development Commands

Run each in their respective directories (`client/` or `server/`):

**Client** (`cd client`):
```bash
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # Production build to dist/
npm run preview  # Preview the production build
npm start        # Serve the production build (serve dist -s)
```

**Server** (`cd server`):
```bash
npm run dev      # Node with --watch (auto-restart on changes)
npm start        # Production start
```

## Environment Variables

**`client/.env`** (copy from `.env.example`):
- `VITE_SOCKET_URL` — URL of the backend server (default: `http://localhost:3001`)

**`server/.env`** (copy from `.env.example`):
- `PORT` — HTTP/Socket.IO port (default: `3001`)
- `CLIENT_URL` — allowed CORS origin (default: `http://localhost:5173`)

## Architecture

### Client (`client/src/`)

- **`main.jsx`** → **`App.jsx`**: Sets up `SocketProvider` (single shared socket instance) and React Router routes.
- **`context/SocketContext.jsx`**: Creates one `socket.io-client` instance for the entire app. All pages consume it via `useSocket()`.
- **`lib/sudokuHelpers.js`**: Pure helpers shared between multiplayer and solo — `isCellGiven`, `isCellCorrect`, `isCellWrong`, `calcClientProgress`, `formatDuration`.
- **`components/`**: Shared UI — `SudokuBoard`, `SudokuCell`, `NumberPad` (input), `PlayerStatus` (nickname + progress bar), `ProgressBar`, `Timer`.

**Pages and their roles:**
- `Home` — entry point; lets user set a nickname, choose to create/join a room or play solo
- `Room` — waiting lobby after creating a room; shows the 6-char room code and waits for `opponent-joined`
- `Game` — live multiplayer game; receives `opponent-progress` events and emits `cell-update`
- `Result` — post-game screen; shown after `game-over` or `opponent-disconnected`
- `Solo` — single-player mode; fetches a puzzle from `GET /api/rooms/puzzle`, tracks progress locally with `localStorage` history
- `History` — displays solo game history from `localStorage`

**State flow across pages** — game data (puzzle, solution, difficulty, nickname, opponentNickname) is passed via React Router `location.state` when navigating between Room → Game → Result. If `location.state` is missing the required puzzle data, pages redirect to `/`.

### Server (`server/src/`)

- **`index.js`**: Creates Express + Socket.IO server, mounts `/api/rooms` router, registers socket handlers.
- **`routes/rooms.js`**: Two REST endpoints — `GET /api/rooms/puzzle` (generates a puzzle for solo mode) and `GET /api/rooms/:id` (returns room metadata for join validation).
- **`socket/gameHandlers.js`**: All game socket events — `create-room`, `join-room`, `cell-update`, `leave-game`, `disconnect`.
- **`game/roomManager.js`**: In-memory `Map` of rooms. Each room holds the puzzle/solution arrays (flat 81-element), player list with their own board copies, and progress. Rooms are deleted 30s after a game ends.
- **`game/sudokuGenerator.js`**: Generates a valid, uniquely-solvable puzzle. Removes cells based on difficulty (`easy`: 35 removed, `medium`: 45, `hard`: 52), verifying unique solution after each removal via backtracking.

### Socket Event Contract

| Event (client→server) | Payload | Callback |
|---|---|---|
| `create-room` | `{ nickname, difficulty }` | `{ ok, roomId, puzzle, solution, difficulty }` |
| `join-room` | `{ roomId, nickname }` | `{ ok, roomId, puzzle, solution, difficulty, opponentNickname }` |
| `cell-update` | `{ roomId, index, value }` | — |
| `leave-game` | `{ roomId }` | — |

| Event (server→client) | Payload |
|---|---|
| `opponent-joined` | `{ opponentNickname, puzzle, solution, difficulty }` |
| `opponent-progress` | `{ progress }` (0–100, snapped to milestones 0/25/50/75/100 on client) |
| `game-over` | `{ winnerSocketId, winnerNickname, loserNickname, loserProgress, duration }` |
| `opponent-disconnected` | — |

### Board Representation

Both client and server represent the Sudoku grid as a flat 81-element array. Index `i` maps to row `Math.floor(i/9)`, column `i % 9`. `0` means empty. The `puzzle` array is the initial state (0s for blanks); `solution` is the complete answer. Each player keeps their own `board` copy server-side; the client also maintains its own copy locally.

### PWA / Service Worker

The Vite PWA plugin (workbox) caches all `js/css/html/svg` assets and uses `NetworkOnly` for `/api/*` routes — API calls always go to the network, never the cache. The SW auto-updates on new builds (`registerType: 'autoUpdate'`).

## Deployment

- Client deploys to Vercel (`client/vercel.json`) — configured for SPA routing.
- Server deploys to Railway (`server/railway.json`, `client/railway.json`).
