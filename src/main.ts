/**
 * Application entry point.
 * Boots the GameController which initializes Phaser, registers
 * all scenes, and routes to the correct game based on the URL.
 */

import './fonts.css';
import { GameController } from './core/Game';

// Wait for custom fonts to fully load before starting Phaser.
// Without this, Phaser renders text on canvas before the browser downloads
// the font file (browser only lazy-loads @font-face when a DOM element needs it,
// but Phaser uses WebGL/Canvas — so the font never gets triggered automatically).
Promise.all([
  document.fonts.load("400 16px 'MandaiValueSerif'"),
  document.fonts.load("700 16px 'MandaiValueSerif'"),
]).then(() => {
  const controller = new GameController();

  // Expose to window for debugging in dev mode
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>)['__gameController'] = controller;
  }
});
