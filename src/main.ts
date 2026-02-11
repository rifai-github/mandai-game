/**
 * Application entry point.
 * Boots the GameController which initializes Phaser, registers
 * all scenes, and routes to the correct game based on the URL.
 */

import './fonts.css';
import { GameController } from './core/Game';

const controller = new GameController();

// Expose to window for debugging in dev mode
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>)['__gameController'] = controller;
}
