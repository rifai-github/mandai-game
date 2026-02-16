# Mandai Games

A collection of **5 mobile browser mini-games** built with **Phaser 3**, **TypeScript**, and **Vite**.

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

| Route             | Scene              | Status | Description                              |
| ----------------- | ------------------ | ------ | ---------------------------------------- |
| `/match-penguin`  | MatchPenguinScene  | ✅     | Drag baby penguin to its matching parent |
| `/catch-fish`     | CatchFishScene     | ✅     | Tap spawning fish to help shoebill catch 10 |
| `/paddle-food`    | PaddleFoodScene    | ✅     | Alternate left/right taps to paddle duck |
| `/pink-parents`   | PinkParentsScene   | ✅     | Match pink color shades to flamingos     |
| `/count-egg`      | CountEggScene      | ✅     | Count eggs and submit answer via numpad  |

Navigate to any route directly (e.g. `http://localhost:5173/catch-fish`).
Invalid routes fall back to a menu screen with links to all games.

---

## Architecture

```
src/
├── core/
│   ├── Config.ts        # Enums, interfaces, constants, shared text styles
│   ├── Router.ts        # URL-based routing (History API)
│   └── Game.ts          # Phaser game controller, scene registration, MenuScene
├── scenes/
│   ├── BaseScene.ts     # Abstract base: orientation lock, UI/input lifecycle
│   ├── MatchPenguinScene.ts   # 565 lines - Drag & drop matching game
│   ├── CatchFishScene.ts      # 455 lines - Tap-to-catch game
│   ├── PaddleFoodScene.ts     # 495 lines - Alternating paddle game
│   ├── PinkParentsScene.ts    # 430 lines - Color matching game
│   └── CountEggScene.ts       # 490 lines - Number input game
├── systems/
│   ├── AssetLoader.ts   # Procedural texture generator (penguin, fish, duck, etc.)
│   ├── InputManager.ts  # Drag-and-drop, tap zones, pointer helpers
│   └── UIManager.ts     # Buttons, popups, progress bars, counters
├── assets/
│   ├── images/
│   │   ├── CatchFish/       # bird, fish, increase, progress-bg, background
│   │   ├── MatchPenguin/    # parents, children, ice, drop-area, toasts
│   │   ├── PaddleFood/      # duck sprites, foot, land, assets, finish
│   │   └── PinkParents/     # flamingos, colors, selection-bg, toasts
│   ├── audio/               # (reserved for future audio assets)
│   └── fonts/mandai/        # Custom MandaiValueSerif font
├── fonts.css            # @font-face declarations
├── main.ts              # Entry point
└── vite-env.d.ts        # Vite type definitions
```

---

## Core Modules

### Config.ts
Central configuration containing:
- **SceneKeys**: Enum for all scene identifiers
- **RoutePaths**: Enum mapping URL paths to scenes
- **ROUTE_TABLE**: Array of route entries with labels
- **SCENE_INSTRUCTIONS**: Per-scene title/instruction positioning and styling
- **TEXT_STYLES**: Shared typography (title, subtitle, body, button, popup, counter)
- **UI**: Sizing constants (button heights, popup dimensions, margins)
- **COLORS**: Color palette (primary buttons, overlays, progress bars)
- **GAME_WIDTH/HEIGHT**: Design resolution (480×854 portrait)

### Router.ts
Custom SPA router using History API:
- `resolve()`: Maps current pathname to SceneKeys
- `navigate(path)`: Updates URL and triggers scene change
- `setRouteChangeHandler(callback)`: Registers scene change listener
- Handles `popstate` for browser back/forward navigation

### Game.ts
Game controller responsibilities:
- Creates Phaser.Game instance with FIT scaling
- Registers all scenes including inline `MenuScene`
- Wires router to scene transitions via `switchScene()`
- Exposes `destroy()` for cleanup

---

## Scene Details

### BaseScene (Abstract)
All game scenes extend this class which provides:
- Background color setup via abstract `backgroundColor` getter
- `UIManager` and `InputManager` instantiation
- Portrait orientation enforcement with landscape warning overlay
- Convenience getters: `w`, `h`, `cx` (center-x)
- Helper methods: `createInstructionUI()`, `showFloatingText()`, `shakeObject()`
- Utility: `getQueryParam(param)` for reading URL query parameters
- Automatic cleanup on scene shutdown

### MatchPenguinScene
**Gameplay**: 3 baby penguins at bottom, parents appear sequentially in center. Drag baby to drop zone overlapping parent. Correct match slides parent+child left, next parent slides in from right.

**Key Features**:
- Drag creates clone; original dims to 40% alpha
- Toast images (correct.png / try-again.png) for feedback
- Star celebration animation on completion
- Image assets loaded via Vite imports

### CatchFishScene
**Gameplay**: Fish spawn around a shoebill bird. Tap fish to catch; goal is 10 fish.

**Key Features**:
- Fish spawn with collision avoidance (min spacing)
- Splash effect on catch
- Progress display with background-total.png
- increase.png toast near bird on catch

### PaddleFoodScene
**Gameplay**: Duck swims forward by alternating left/right foot taps. Track scrolls downward with pseudo-3D depth scaling.

**Key Features**:
- Two foot tap zones with duck-foot icons
- Lane assets scale up as they approach duck
- Progress bar tracks advancement
- Wrong-order taps flash zone red (no penalty)
- Finish spot triggers win when reaching duck level

### PinkParentsScene
**Gameplay**: 3 color swatches at bottom, flamingos appear sequentially. Click swatch to match flamingo's pink shade.

**Key Features**:
- Swatches never disabled after correct match
- Toast feedback (correct / try-again)
- Flamingo slides left on match, next slides in from right
- Star celebration on completion

### CountEggScene
**Gameplay**: Count eggs in an illustration and submit numeric answer via virtual keyboard overlay.

**Key Features**:
- Custom numpad overlay (0-9 + backspace) with image-based buttons
- Input field with error flash on wrong answer
- Cancel/Submit action buttons with image assets
- Header with instruction text on overlay
- Dynamic correct answer via query param: `?total_egg=4` (default: 4)
- Full image assets: background, bird, keyboard, buttons

---

## Systems

### UIManager
Factory methods for UI components:
- `createButton(config)`: Rounded button with hover/press states
- `showPopup(config)`: Modal popup with overlay, title, message, button
- `createProgressBar(config)`: Animated fill bar with border
- `createCounter(x, y, label, initial, total)`: Text-based counter display

### InputManager
Touch-optimized input handling:
- `makeDraggable(gameObject)`: Enables drag with depth management
- `createTapZone(x, y, w, h, callback)`: Invisible interactive zone
- `onTap(gameObject, callback)`: Pointer down handler
- Automatic cleanup of drag targets and tap zones

### AssetLoader
Procedural texture generation (idempotent):
- **Match Penguin**: `generatePenguin()`, `generateChick()`
- **Catch Fish**: `generateFish()`, `generateSplash()`
- **Paddle Food**: `generateDuck()`, `generateFoot()`, `generateBread()`
- **Pink Parents**: `generateSwatch()`
- **Shared**: `generateStar()` for celebrations

---

## Routing System

Custom router using the browser History API (`pushState` / `popstate`).

- **Router.resolve()** reads `window.location.pathname` and returns the matching `SceneKeys` enum value.
- **Router.navigate(path)** pushes a new state and notifies the `GameController` to switch scenes.
- **popstate** listener handles browser back/forward buttons.
- Invalid routes resolve to `SceneKeys.Menu`, which shows a navigation screen.

No external routing library is used.

---

## Scene Management

1. All scenes are registered with Phaser via `game.scene.add()` at boot.
2. The `GameController.switchScene()` method stops the active scene and starts the target.
3. Each scene extends `BaseScene` which provides:
   - `UIManager` and `InputManager` instances, created in `create()`.
   - Automatic cleanup on `shutdown` (event listeners, managed objects).
   - Portrait orientation enforcement with a landscape warning overlay.
   - Helper methods: `showFloatingText()`, `shakeObject()`.
4. Scenes use `this.scene.restart()` for replaying the same game.

---

## Scaling

- Design resolution: **480 x 854** (portrait).
- Scale mode: `Phaser.Scale.FIT` with `CENTER_BOTH`.
- The canvas maintains its aspect ratio and fits within the viewport.
- A landscape orientation overlay blocks gameplay when the device is rotated.

---

## Asset System

### Image Assets (per Scene)
Each scene loads its own assets via Vite imports in `preload()`:

| Scene | Assets |
|-------|--------|
| MatchPenguin | background, child-select-bg, drop-area, ice, correct, try-again, parent (a,b,c), child (a,b,c) |
| CatchFish | background, bird, fish, increase, progress-bg |
| PaddleFood | background, duck-idle, duck-swim, duck-foot, first-land, asset1, asset2, finish-spot |
| PinkParents | background, selection-bg, correct, try-again, flamingo (1,2,3), color (1,2,3) |
| CountEgg | background, bird, submit-button, input/ (background-keyboard, button-keyboard, Backspace, cancel-button, submit-button, inputfield, header-input) |

### Procedural Assets
`AssetLoader` generates placeholder textures at runtime using `Graphics.generateTexture()`:
- Penguins with colored scarves/hats
- Fish with body colors
- Ducks, feet, bread
- Color swatches
- Stars for celebrations
- Splash effects

### Custom Fonts
- **MandaiValueSerif**: Loaded via `fonts.css` from `src/assets/fonts/mandai/`

---

## How to Add a New Game

1. **Create the scene** in `src/scenes/NewGameScene.ts`:
   - Extend `BaseScene`.
   - Implement the `backgroundColor` getter.
   - Call `super.create()` in `create()`.
   - Use `this.uiManager` and `this.inputManager` for UI/input.
   - Load assets in `preload()` using Vite imports.

2. **Register the route** in `src/core/Config.ts`:
   - Add a key to `SceneKeys` enum.
   - Add a path to `RoutePaths` enum.
   - Add an entry to `ROUTE_TABLE` array.
   - (Optional) Add entry to `SCENE_INSTRUCTIONS` for custom title/instruction styling.

3. **Register the scene** in `src/core/Game.ts`:
   - Import the scene class.
   - Add `game.scene.add(SceneKeys.NewGame, NewGameScene)` in `registerScenes()`.

4. **Add assets** (optional):
   - Place images in `src/assets/images/NewGame/`.
   - Or add procedural generators in `AssetLoader.ts`.

That's it. The router and menu will pick up the new game automatically.

---

## Deployment

### Static Hosting (Netlify, Vercel, Cloudflare Pages)

1. `npm run build`
2. Deploy the `dist/` directory.
3. Configure the host to redirect all routes to `index.html` (SPA fallback).

**Netlify** — already configured via `public/_redirects`:
```
/*    /index.html   200
```

**Vercel** — add `vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

**Cloudflare Pages** — configure in dashboard or add `_redirects` file.

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
| Phaser     | ^3.80.1  | Game engine                    |
| TypeScript | ^5.4.0   | Type safety                    |
| Vite       | ^5.4.0   | Build tool and dev server      |

---

## Project Statistics

| Metric | Value |
|--------|-------|
| Total Scenes | 5 (+ Menu) |
| Lines of Code (scenes) | ~2,435 |
| Config Lines | ~296 |
| System Lines | ~700 |
| Design Resolution | 480×854 (portrait) |

---

## TODO / Known Issues

- [x] **CountEggScene**: Replace placeholder assets with image-based UI
- [x] **CountEggScene**: Implement dynamic correct answer via `?total_egg=` query param
- [ ] **Audio**: Add sound effects and background music
- [ ] **Accessibility**: Add screen reader support
- [ ] **Analytics**: Integrate game completion tracking

---

## License

Private project. All rights reserved.
