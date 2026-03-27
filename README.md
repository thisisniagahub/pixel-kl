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
- `npm run build:client` builds only the shared package and Vite client for Vercel

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

## Vercel Deployment

This repository should be deployed to Vercel as a frontend-only project. The Vite client can run on Vercel, but the Colyseus server in `apps/server` uses long-lived WebSocket connections and should be hosted on a platform that supports a persistent Node.js process.

The root `vercel.json` is already configured to:

- install dependencies with Bun
- build only the client via `npm run build:client`
- publish `apps/client/dist`

Set `VITE_WORLD_SERVER_URL` in the Vercel project environment variables to the public URL of your deployed game server. Use `apps/client/.env.example` as the local template.

To enable GitHub auto deploy:

1. Import this repository into Vercel as a new project
2. Keep the Production Branch as `main`
3. Add `VITE_WORLD_SERVER_URL` for Preview and Production environments
4. Create GitHub repository secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`
5. Push to GitHub and let Actions deploy preview branches and `main` automatically

The workflows live in:

- `.github/workflows/vercel-preview.yml`
- `.github/workflows/vercel-production.yml`

If this is a private GitHub organization repository, check your Vercel plan and team setup before relying on auto deploy.

## Render Deployment

The backend server is ready for Render via the root `render.yaml` Blueprint. It deploys `apps/server` as a Node web service, runs the health check on `/health`, and rebuilds automatically when server or shared backend files change.

Render uses:

- `npm install && npm run build:server` as the build command
- `npm --workspace @pixel/server run start` as the start command
- `render.yaml` build filters so frontend-only changes do not redeploy the backend unnecessarily

Deploy the backend with this Blueprint link:

```text
https://dashboard.render.com/blueprint/new?repo=https://github.com/thisisniagahub/pixel-kl
```

After Render creates the service, copy the public backend URL, for example `https://pixel-kl-server.onrender.com`, into Vercel as `VITE_WORLD_SERVER_URL` for Preview and Production.

## Suggested Next Step

Add chat bubbles over players and NPCs, then introduce a lightweight interaction queue for props and mission hooks.
