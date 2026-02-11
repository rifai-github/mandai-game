/**
 * Procedural asset generator for placeholder game graphics.
 * Generates textures using Phaser's Graphics.generateTexture() so that
 * sprites can be created from them with proper hit-areas and transforms.
 *
 * Each generate* method is idempotent: it skips if the texture key already exists.
 */

import Phaser from 'phaser';

export class AssetLoader {
  /* ------------------------------------------------------------------ */
  /*  Match Penguin assets                                               */
  /* ------------------------------------------------------------------ */

  /** Generate a parent penguin texture with a colored scarf */
  static generatePenguin(scene: Phaser.Scene, key: string, scarfColor: number): void {
    if (scene.textures.exists(key)) return;

    const w = 90;
    const h = 130;
    const cx = w / 2;
    const g = scene.add.graphics();

    // Feet
    g.fillStyle(0xff8c00);
    g.fillEllipse(cx - 15, h - 8, 20, 12);
    g.fillEllipse(cx + 15, h - 8, 20, 12);

    // Body
    g.fillStyle(0x1a1a1a);
    g.fillEllipse(cx, h / 2 + 10, 60, 80);

    // Belly
    g.fillStyle(0xf0f0f0);
    g.fillEllipse(cx, h / 2 + 14, 38, 54);

    // Head
    g.fillStyle(0x1a1a1a);
    g.fillCircle(cx, 30, 24);

    // Eyes
    g.fillStyle(0xffffff);
    g.fillCircle(cx - 9, 26, 6);
    g.fillCircle(cx + 9, 26, 6);
    g.fillStyle(0x000000);
    g.fillCircle(cx - 9, 26, 3);
    g.fillCircle(cx + 9, 26, 3);

    // Beak
    g.fillStyle(0xff8c00);
    g.fillTriangle(cx - 5, 38, cx + 5, 38, cx, 46);

    // Scarf (accessory for identification)
    g.fillStyle(scarfColor);
    g.fillRoundedRect(cx - 22, 48, 44, 10, 3);
    g.fillRoundedRect(cx + 14, 48, 10, 22, 3);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  /** Generate a chick texture with a colored hat/tuft matching a parent */
  static generateChick(scene: Phaser.Scene, key: string, hatColor: number): void {
    if (scene.textures.exists(key)) return;

    const w = 60;
    const h = 70;
    const cx = w / 2;
    const cy = h / 2 + 5;
    const g = scene.add.graphics();

    // Body (fluffy gray)
    g.fillStyle(0xb0b0b0);
    g.fillCircle(cx, cy, 22);

    // Head fluff
    g.fillStyle(0xc0c0c0);
    g.fillCircle(cx, cy - 16, 16);

    // Eyes
    g.fillStyle(0x000000);
    g.fillCircle(cx - 6, cy - 18, 3);
    g.fillCircle(cx + 6, cy - 18, 3);

    // Beak
    g.fillStyle(0xff8c00);
    g.fillTriangle(cx - 4, cy - 10, cx + 4, cy - 10, cx, cy - 4);

    // Hat / tuft (matches parent scarf color)
    g.fillStyle(hatColor);
    g.fillCircle(cx, cy - 30, 7);
    g.fillTriangle(cx - 7, cy - 30, cx + 7, cy - 30, cx, cy - 40);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  /* ------------------------------------------------------------------ */
  /*  Catch Fish assets                                                  */
  /* ------------------------------------------------------------------ */

  /** Generate a fish texture with given body color */
  static generateFish(scene: Phaser.Scene, key: string, bodyColor: number): void {
    if (scene.textures.exists(key)) return;

    const w = 80;
    const h = 44;
    const cx = w / 2 - 5;
    const cy = h / 2;
    const g = scene.add.graphics();

    // Tail
    g.fillStyle(bodyColor);
    g.fillTriangle(cx + 30, cy, cx + 45, cy - 14, cx + 45, cy + 14);

    // Body
    g.fillStyle(bodyColor);
    g.fillEllipse(cx, cy, 52, 30);

    // Dorsal fin
    const darker = Phaser.Display.Color.ValueToColor(bodyColor).darken(20).color;
    g.fillStyle(darker);
    g.fillTriangle(cx - 5, cy - 14, cx + 10, cy - 14, cx + 2, cy - 26);

    // Eye
    g.fillStyle(0xffffff);
    g.fillCircle(cx - 14, cy - 3, 6);
    g.fillStyle(0x000000);
    g.fillCircle(cx - 14, cy - 3, 3);

    // Mouth
    g.lineStyle(2, 0x000000, 0.6);
    g.beginPath();
    g.arc(cx - 22, cy + 2, 4, 0, Math.PI * 0.7);
    g.strokePath();

    g.generateTexture(key, w, h);
    g.destroy();
  }

  /** Generate a splash/ripple effect texture */
  static generateSplash(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;

    const size = 60;
    const c = size / 2;
    const g = scene.add.graphics();

    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeCircle(c, c, 12);
    g.lineStyle(2, 0xadd8e6, 0.5);
    g.strokeCircle(c, c, 22);
    g.lineStyle(1, 0xadd8e6, 0.3);
    g.strokeCircle(c, c, 28);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  /* ------------------------------------------------------------------ */
  /*  Paddle Food assets                                                 */
  /* ------------------------------------------------------------------ */

  /** Generate a duck texture */
  static generateDuck(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;

    const w = 90;
    const h = 80;
    const cx = w / 2;
    const cy = h / 2 + 5;
    const g = scene.add.graphics();

    // Body
    g.fillStyle(0xdaa520);
    g.fillEllipse(cx, cy, 64, 44);

    // Wing
    g.fillStyle(0xc49418);
    g.fillEllipse(cx + 5, cy - 2, 40, 28);

    // Head
    g.fillStyle(0x228b22);
    g.fillCircle(cx - 24, cy - 20, 18);

    // White neck ring
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeCircle(cx - 24, cy - 20, 18);

    // Eye
    g.fillStyle(0xffffff);
    g.fillCircle(cx - 30, cy - 24, 4);
    g.fillStyle(0x000000);
    g.fillCircle(cx - 30, cy - 24, 2);

    // Beak
    g.fillStyle(0xffa500);
    g.fillTriangle(cx - 42, cy - 22, cx - 42, cy - 14, cx - 54, cy - 18);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  /** Generate a foot/paddle texture */
  static generateFoot(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;

    const w = 40;
    const h = 30;
    const g = scene.add.graphics();

    g.fillStyle(0xffa500);
    g.fillTriangle(5, 0, 20, h, 35, 0);
    g.fillEllipse(20, 6, 32, 14);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  /** Generate a bread / food texture */
  static generateBread(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;

    const size = 50;
    const c = size / 2;
    const g = scene.add.graphics();

    // Bread crust
    g.fillStyle(0xd2691e);
    g.fillCircle(c, c, 22);

    // Inner bread
    g.fillStyle(0xf5deb3);
    g.fillCircle(c, c, 16);

    // Crumb details
    g.fillStyle(0xd2b48c);
    g.fillCircle(c - 5, c - 3, 3);
    g.fillCircle(c + 4, c + 4, 2);
    g.fillCircle(c + 2, c - 6, 2);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  /* ------------------------------------------------------------------ */
  /*  Pink Parents assets                                                */
  /* ------------------------------------------------------------------ */

  /** Generate a color swatch rectangle texture */
  static generateSwatch(scene: Phaser.Scene, key: string, color: number, size: number): void {
    if (scene.textures.exists(key)) return;

    const g = scene.add.graphics();

    g.fillStyle(color);
    g.fillRoundedRect(0, 0, size, size, 12);

    // Border
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeRoundedRect(0, 0, size, size, 12);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  /* ------------------------------------------------------------------ */
  /*  Shared / generic                                                   */
  /* ------------------------------------------------------------------ */

  /** Generate a simple star/sparkle for win effects */
  static generateStar(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;

    const size = 30;
    const c = size / 2;
    const g = scene.add.graphics();

    g.fillStyle(0xffd700);
    const points: number[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? 13 : 6;
      points.push(c + Math.cos(angle) * radius);
      points.push(c + Math.sin(angle) * radius);
    }
    g.fillPoints(points, true);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  /** Destroy a texture key if it exists (for cleanup on scene restart) */
  static removeTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }
  }
}
