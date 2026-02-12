/**
 * Central configuration for the Mandai Games project.
 * All game constants, enums, and type definitions live here.
 */

/** Scene key identifiers used throughout the application */
export enum SceneKeys {
  Menu = 'Menu',
  MatchPenguin = 'MatchPenguin',
  CatchFish = 'CatchFish',
  PaddleFood = 'PaddleFood',
  PinkParents = 'PinkParents',
}

/** URL route paths mapped to each game */
export enum RoutePaths {
  MatchPenguin = '/match-penguin',
  CatchFish = '/catch-fish',
  PaddleFood = '/paddle-food',
  PinkParents = '/pink-parents',
}

/** Route-to-scene mapping entry */
export interface RouteEntry {
  path: RoutePaths;
  sceneKey: SceneKeys;
  label: string;
}

/** Configuration for a reusable button */
export interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize?: number;
  backgroundColor?: number;
  hoverColor?: number;
  textColor?: string;
  cornerRadius?: number;
  onClick: () => void;
}

/** Configuration for the popup overlay */
export interface PopupConfig {
  title: string;
  message: string;
  buttonText: string;
  onClose: () => void;
}

/** Configuration for a progress bar */
export interface ProgressBarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: number;
  backgroundColor?: number;
  borderColor?: number;
}

/** Holds the progress bar game objects for updating */
export interface ProgressBarHandle {
  background: Phaser.GameObjects.Graphics;
  fill: Phaser.GameObjects.Graphics;
  border: Phaser.GameObjects.Graphics;
  config: Required<ProgressBarConfig>;
  update: (ratio: number) => void;
  destroy: () => void;
}

/** Holds counter display objects */
export interface CounterHandle {
  text: Phaser.GameObjects.Text;
  update: (current: number, total: number) => void;
  destroy: () => void;
}

/** Penguin accessory color palette */
export const PENGUIN_COLORS: readonly number[] = [
  0xe74c3c, // Red
  0x3498db, // Blue
  0x2ecc71, // Green
] as const;

/** Fish color palette */
export const FISH_COLORS: readonly number[] = [
  0xff6b6b,
  0xffd93d,
  0x6bcb77,
  0x4d96ff,
  0xff6f91,
  0xc490e4,
] as const;

/** Game design resolution (portrait) */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;

/** Route table used by the Router */
export const ROUTE_TABLE: readonly RouteEntry[] = [
  { path: RoutePaths.MatchPenguin, sceneKey: SceneKeys.MatchPenguin, label: 'Match Penguin' },
  { path: RoutePaths.CatchFish, sceneKey: SceneKeys.CatchFish, label: 'Catch Fish' },
  { path: RoutePaths.PaddleFood, sceneKey: SceneKeys.PaddleFood, label: 'Paddle Food' },
  { path: RoutePaths.PinkParents, sceneKey: SceneKeys.PinkParents, label: 'Pink Parents' },
] as const;

/** Per-scene instruction layout (position + style overrides) */
export interface InstructionConfig {
  position: { title: number; instruction: number };
  style: {
    title: Phaser.Types.GameObjects.Text.TextStyle;
    instruction: Phaser.Types.GameObjects.Text.TextStyle;
  };
}

/** Shared text style defaults */
export const TEXT_STYLES = {
  title: {
    fontFamily: "'MandaiValueSerif'",
    fontSize: '32px',
    color: '#333333',
    fontStyle: 'bold',
  } as Phaser.Types.GameObjects.Text.TextStyle,

  subtitle: {
    fontFamily: "'MandaiValueSerif'",
    fontSize: '22px',
    color: '#333333',
  } as Phaser.Types.GameObjects.Text.TextStyle,

  body: {
    fontFamily: "'MandaiValueSerif'",
    fontSize: '16px',
    color: '#333333',
    wordWrap: { width: 320, useAdvancedWrap: true },
    align: 'center',
  } as Phaser.Types.GameObjects.Text.TextStyle,

  button: {
    fontFamily: "'MandaiValueSerif'",
    fontSize: '20px',
    color: '#ffffff',
    fontStyle: 'bold',
  } as Phaser.Types.GameObjects.Text.TextStyle,

  popupTitle: {
    fontFamily: "'MandaiValueSerif'",
    fontSize: '28px',
    color: '#333333',
    fontStyle: 'bold',
  } as Phaser.Types.GameObjects.Text.TextStyle,

  popupMessage: {
    fontFamily: "'MandaiValueSerif'",
    fontSize: '20px',
    color: '#555555',
    wordWrap: { width: 280 },
    align: 'center',
  } as Phaser.Types.GameObjects.Text.TextStyle,

  counter: {
    fontFamily: "'MandaiValueSerif'",
    fontSize: '24px',
    color: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  } as Phaser.Types.GameObjects.Text.TextStyle,
} as const;

/** Per-scene instruction configs (position + style) */
export const SCENE_INSTRUCTIONS: Record<string, InstructionConfig> = {
  [SceneKeys.MatchPenguin]: {
    position: { title: 100, instruction: 150 },
    style: {
      title: {
        fontFamily: "'MandaiValueSerif'",
        fontSize: '32px',
        color: '#333333',
        fontStyle: 'bold',
      },
      instruction: {
        fontFamily: "'MandaiValueSerif'",
        fontSize: '16px',
        color: '#333333',
        wordWrap: { width: 320, useAdvancedWrap: true },
        align: 'center',
      },
    },
  },
  [SceneKeys.CatchFish]: {
    position: { title: 110, instruction: 140 },
    style: {
      title: {
        fontFamily: "'MandaiValueSerif'",
        fontSize: '32px',
        color: '#00437B',
        fontStyle: 'bold',
      },
      instruction: {
        fontFamily: "'MandaiValueSerif'",
        fontSize: '16px',
        color: '#515151',
        wordWrap: { width: 320, useAdvancedWrap: true },
        align: 'center',
      },
    },
  },
  [SceneKeys.PaddleFood]: {
    position: { title: 100, instruction: 150 },
    style: {
      title: {
        fontFamily: "'MandaiValueSerif'",
        fontSize: '32px',
        color: '#00437B',
        fontStyle: 'bold',
      },
      instruction: {
        fontFamily: "'MandaiValueSerif'",
        fontSize: '16px',
        color: '#515151',
        wordWrap: { width: 300, useAdvancedWrap: true },
        align: 'center',
      },
    },
  },
  [SceneKeys.PinkParents]: {
    position: { title: 100, instruction: 150 },
    style: {
      title: {
        fontFamily: "'MandaiValueSerif'",
        fontSize: '32px',
        color: '#333333',
        fontStyle: 'bold',
      },
      instruction: {
        fontFamily: "'MandaiValueSerif'",
        fontSize: '16px',
        color: '#333333',
        wordWrap: { width: 320, useAdvancedWrap: true },
        align: 'center',
      },
    },
  },
};

/** UI sizing constants for mobile-friendly touch targets */
export const UI = {
  BUTTON_MIN_HEIGHT: 52,
  BUTTON_PADDING: 16,
  POPUP_WIDTH: 360,
  POPUP_HEIGHT: 280,
  POPUP_CORNER_RADIUS: 20,
  PROGRESS_BAR_HEIGHT: 24,
  SAFE_MARGIN: 20,
} as const;

/** Color palette for UI elements */
export const COLORS = {
  primaryButton: 0x4caf50,
  primaryButtonHover: 0x66bb6a,
  dangerButton: 0xe74c3c,
  panelBackground: 0xffffff,
  overlayBlack: 0x000000,
  overlayAlpha: 0.6,
  progressFill: 0x4caf50,
  progressBackground: 0x333333,
  progressBorder: 0xffffff,
  successGreen: 0x27ae60,
  errorRed: 0xe74c3c,
} as const;
