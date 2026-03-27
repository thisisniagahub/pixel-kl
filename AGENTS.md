# Repository Guidelines

## Project Structure & Module Organization
This repo is a small npm workspace monorepo for a browser-based multiplayer game. Use `apps/client` for the Phaser + Vite frontend, `apps/server` for the Colyseus + Express backend, `packages/shared` for shared contracts/constants, and `packages/ai-adapter` for the OpenClaw adapter layer. Keep source edits inside `src/`; treat `dist/` and `node_modules/` as generated output. Examples: `apps/client/src/scenes/WorldScene.ts`, `apps/server/src/rooms/WorldRoom.ts`, `packages/shared/src/contracts.ts`.

## Build, Test, and Development Commands
Install dependencies from the repo root with `bun install`. Run `npm run dev:server` to start the backend with `tsx watch`, and `npm run dev:client` to build shared code first and then launch Vite. Use `npm run build` for a full workspace build and `npm run typecheck` to validate TypeScript across shared, adapter, server, and client packages. There is no root `test` script yet.

## Coding Style & Naming Conventions
The codebase uses strict TypeScript with ESM modules and 2-space indentation. Prefer `PascalCase` for scenes, rooms, and classes (`BootScene`, `MockOpenClawAdapter`), and `camelCase` for functions, variables, and helpers (`worldConnection`, `sanitizeCharacterCustomization`). Keep shared constants and event names centralized in `packages/shared`. No ESLint, Prettier, or Biome config is checked in, so match the existing style and keep imports explicit and tidy.

## Testing Guidelines
Automated tests are not configured yet, so every change should at minimum pass `npm run typecheck` and the relevant dev flow you touched. For gameplay or networking changes, smoke-test both `npm run dev:server` and `npm run dev:client`. When adding tests later, place them near the feature as `*.test.ts` files and prefer covering shared contracts, room behavior, and client networking logic first.

## Commit & Pull Request Guidelines
Git history is not included in this workspace snapshot, so no repository-specific commit convention can be verified here. Until project history is available, use short imperative subjects with an optional scope, such as `feat(client): add NPC chat bubbles` or `fix(server): clamp invalid movement`. PRs should include a brief summary, affected packages, local verification steps, linked issues, and screenshots or clips for visible client changes.

## Configuration Notes
Use Node.js 20 or newer, as required by the root `package.json`. Default local URLs and room/event constants live in `packages/shared/src/contracts.ts`; update shared contracts there before changing client/server protocol behavior.
