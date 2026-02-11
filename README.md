# Mandai Games

A collection of 4 mobile browser mini-games built with **Phaser 3**, **TypeScript**, and **Vite**.

---

## Quick Start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

### Production Build

```bash
npm run build
npm run preview   # preview the production build locally
```

The output goes to the `dist/` directory.

---

## Games

| Route             | Scene              | Description                          |
| ----------------- | ------------------ | ------------------------------------ |
| `/match-penguin`  | MatchPenguinScene  | Drag a chick to its matching parent  |
| `/catch-fish`     | CatchFishScene     | Tap spawning fish to catch 10        |
| `/paddle-food`    | PaddleFoodScene    | Alternate left/right taps to paddle  |
| `/pink-parents`   | PinkParentsScene   | Match pink color shades              |

Navigate to any route directly (e.g. `http://localhost:5173/catch-fish`).
Invalid routes fall back to a menu screen with links to all games.

---

## Architecture

```
src/
  core/
    Config.ts        # Enums, interfaces, constants, shared styles
    Router.ts        # URL-based routing (History API)
    Game.ts          # Phaser game controller, scene registration
  scenes/
    BaseScene.ts     # Abstract base: orientation lock, UI/input lifecycle
    MatchPenguinScene.ts
    CatchFishScene.ts
    PaddleFoodScene.ts
    PinkParentsScene.ts
  systems/
    AssetLoader.ts   # Procedural placeholder graphic generator
    InputManager.ts  # Drag-and-drop, tap zones, pointer helpers
    UIManager.ts     # Buttons, popups, progress bars, counters
  assets/
    images/          # Static image assets (currently unused)
    audio/           # Static audio assets (currently unused)
  main.ts            # Entry point
```

### Routing System

Custom router using the browser History API (`pushState` / `popstate`).

- **Router.resolve()** reads `window.location.pathname` and returns the matching `SceneKeys` enum value.
- **Router.navigate(path)** pushes a new state and notifies the `GameController` to switch scenes.
- **popstate** listener handles browser back/forward buttons.
- Invalid routes resolve to `SceneKeys.Menu`, which shows a navigation screen.

No external routing library is used.

### Scene Management

1. All scenes are registered with Phaser via `game.scene.add()` at boot.
2. The `GameController.switchScene()` method stops the active scene and starts the target.
3. Each scene extends `BaseScene` which provides:
   - `UIManager` and `InputManager` instances, created in `create()`.
   - Automatic cleanup on `shutdown` (event listeners, managed objects).
   - Portrait orientation enforcement with a landscape warning overlay.
   - Helper methods: `showFloatingText()`, `shakeObject()`.
4. Scenes use `this.scene.restart()` for replaying the same game.

### Scaling

- Design resolution: **480 x 854** (portrait).
- Scale mode: `Phaser.Scale.FIT` with `CENTER_BOTH`.
- The canvas maintains its aspect ratio and fits within the viewport.
- A landscape orientation overlay blocks gameplay when the device is rotated.

### Asset System

All placeholder graphics are generated procedurally at runtime via `AssetLoader` using Phaser's `Graphics.generateTexture()`. No external image files are required.

To replace with real assets:
1. Add files to `src/assets/images/`.
2. Load them in a scene's `preload()` method using `this.load.image()`.
3. Use the same texture key that the scene expects.

---

## How to Add a New Game

1. **Create the scene** in `src/scenes/NewGameScene.ts`:
   - Extend `BaseScene`.
   - Implement the `backgroundColor` getter.
   - Call `super.create()` in `create()`.
   - Use `this.uiManager` and `this.inputManager` for UI/input.

2. **Register the route** in `src/core/Config.ts`:
   - Add a key to `SceneKeys`.
   - Add a path to `RoutePaths`.
   - Add an entry to `ROUTE_TABLE`.

3. **Register the scene** in `src/core/Game.ts`:
   - Import the scene class.
   - Add `game.scene.add(SceneKeys.NewGame, NewGameScene)` in `registerScenes()`.

4. **Generate assets** (optional) in `src/systems/AssetLoader.ts`:
   - Add static methods for any procedural textures the game needs.

That's it. The router and menu will pick up the new game automatically.

---

## Deployment

### Static Hosting (Netlify, Vercel, Cloudflare Pages)

1. `npm run build`
2. Deploy the `dist/` directory.
3. Configure the host to redirect all routes to `index.html` (SPA fallback).

**Netlify** — add `public/_redirects`:
```
/*    /index.html   200
```

**Vercel** — add `vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### iframe Embedding

```html
<iframe
  src="https://your-domain.com/match-penguin"
  style="width: 100%; height: 100%; border: none;"
  allow="autoplay"
></iframe>
```

The game is safe for iframe embedding. No `X-Frame-Options` or CSP restrictions are set by the client code.

---

## Tech Stack

| Tool       | Version  | Purpose                        |
| ---------- | -------- | ------------------------------ |
| Phaser     | ^3.80    | Game engine                    |
| TypeScript | ^5.4     | Type safety                    |
| Vite       | ^5.4     | Build tool and dev server      |

---

## License

Private project. All rights reserved.
