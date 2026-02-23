# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `npm run dev` (Vite, typically http://localhost:5173)
- **Build:** `npm run build` (runs `tsc && vite build`, output in `dist/`)
- **Preview production build:** `npm run preview`

No test runner or linter is configured.

## Architecture

Mandai Games is a collection of 5 mobile browser mini-games built with **Phaser 3** (WebGL renderer) and **TypeScript**, bundled with **Vite**. Design resolution is **480×854** (portrait-only, landscape shows a warning overlay).

### Layers

- **`src/core/`** — Config (enums, constants, text styles, UI sizes), Router (custom SPA router using History API `pushState`/`popstate`), GameController (Phaser init + scene registration)
- **`src/scenes/`** — Each game is a Phaser scene extending `BaseScene`. BaseScene provides UIManager/InputManager setup in `create()`, cleanup on `shutdown`, and query param access via `getQueryParam()`.
- **`src/systems/`** — Shared systems instantiated by BaseScene:
  - `UIManager` — factory methods for buttons, popups, progress bars, counters
  - `InputManager` — drag-and-drop (`makeDraggable`), tap zones, pointer handlers
  - `AssetLoader` — procedural texture generation via `Graphics.generateTexture()`

### Routing

Custom SPA router in `Router.ts` maps URL paths to Phaser scenes via `ROUTE_TABLE` in Config. No external routing library. Routes like `/match-penguin`, `/catch-fish`, `/paddle-food`, `/pink-parents`, `/count-egg`. Invalid routes go to Menu.

### Key Patterns

- **Asset imports:** Vite module imports (`import bgUrl from '../assets/images/Scene/bg.png'`) registered with Phaser's texture manager in `preload()`.
- **Procedural textures:** `AssetLoader.generateX(scene, key, color)` creates textures at runtime. Idempotent — checks if texture exists before generating.
- **Config centralization:** All scene keys (`SceneKeys` enum), route paths (`RoutePaths` enum), text styles (`TEXT_STYLES`), colors (`COLORS`), and UI dimensions live in `Config.ts`.
- **Path alias:** `@/*` maps to `src/*` (configured in both tsconfig.json and vite.config.ts).
- **Scene query params:** Scenes can read URL query params (e.g., `?total_egg=4` in CountEggScene) via `this.getQueryParam()`.

### Adding a New Game

1. Create a scene class extending `BaseScene` in `src/scenes/`
2. Add entries to `SceneKeys`, `RoutePaths`, and `ROUTE_TABLE` in Config.ts
3. Register the scene in `Game.ts`
4. Place image assets in `src/assets/images/<GameName>/`

## Deployment

Static SPA hosted on Netlify. `public/_redirects` handles SPA fallback routing. Games support iframe embedding with no CSP restrictions.
