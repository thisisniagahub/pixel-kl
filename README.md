# PIXEL

Starter monorepo for a browser-based, top-down pixel multiplayer project inspired by Kuala Lumpur.

## Stack

- client: Phaser + TypeScript + Vite
- server: Colyseus + Node.js + TypeScript
- shared: typed contracts and world constants
- ai: OpenClaw adapter interface with a mock fallback

## Repo layout

```text
apps/
  client/
  server/
packages/
  ai-adapter/
  shared/
```

## Prerequisites

- Node.js 20 LTS
- Bun 1.3.6 or newer

## Getting Started

1. Install dependencies from the repo root:

```bash
bun install
```

2. Run the server in one terminal:

```bash
npm run dev:server
```

3. Run the client in another terminal:

```bash
npm run dev:client
```

4. Open the client in your browser and confirm the server health route:

```text
http://localhost:5173
http://localhost:2567/health
```

## Development Commands

- `npm run dev:server` starts the Colyseus + Express backend in watch mode
- `npm run dev:client` builds shared code, then starts the Vite client
- `npm run typecheck` validates TypeScript across all workspaces
- `npm run build` produces distributable output for shared, AI adapter, server, and client

## Controls

- `Arrow keys` or `WASD` to move
- `E` to talk to nearby NPCs and advance dialogue
- `1` cycle skin tone
- `2` cycle hair style
- `3` cycle top
- `4` cycle bottom

## Current status

- client boots into a pixel-grid hero district with local movement, multiplayer room join, and live character customization
- five interactable NPCs are placed in the district with unique personas, idle animations, and dialogue loops
- server exposes a health route and an authoritative `world` room for presence, movement sync, and customization sync
- shared package centralizes room names, event names, world sizes, movement contracts, and customization options
- AI package exposes a mockable OpenClaw adapter interface while NPC dialogue remains hand-written for now

## CI

GitHub Actions runs `bun install --frozen-lockfile`, `npm run typecheck`, and `npm run build` on pushes to `main` and on pull requests.

## Suggested Next Step

Add chat bubbles over players and NPCs, then introduce a lightweight interaction queue for props and mission hooks.
