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

## Getting started

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

## Suggested next step

Add chat bubbles over players and NPCs, then introduce a lightweight interaction queue for props and mission hooks.
