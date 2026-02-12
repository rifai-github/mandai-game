/**
 * Catch Fish Mini-Game
 *
 * Gameplay:
 * - Fish spawn at random positions around the bird (player anchor).
 * - Each fish is static — no idle animation or wobble.
 * - Tapping a fish catches it, plays a splash animation, and shows
 *   an image-based toast (increase.png) near the bird.
 * - The goal is to catch 10 fish.
 * - On reaching 10, a win celebration and popup are displayed.
 * - Auto-restart via popup button.
 */

import { BaseScene } from './BaseScene';
import {
  SceneKeys,
  TEXT_STYLES,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../core/Config';
import { AssetLoader } from '../systems/AssetLoader';

/* ------------------------------------------------------------------ */
/*  Asset imports (resolved by Vite)                                   */
/* ------------------------------------------------------------------ */

import birdUrl from '../assets/images/CatchFish/bird.png';
import fishUrl from '../assets/images/CatchFish/fish.png';
import increaseUrl from '../assets/images/CatchFish/increase.png';
import progressBgUrl from '../assets/images/CatchFish/background-total.png';
import bgUrl from '../assets/images/CatchFish/background.png';

/* ------------------------------------------------------------------ */
/*  Texture keys                                                       */
/* ------------------------------------------------------------------ */

const TEX_BG = 'cf-bg';
const TEX_BIRD = 'cf-bird';
const TEX_FISH = 'cf-fish';
const TEX_INCREASE = 'cf-increase';
const TEX_PROGRESS_BG = 'cf-progress-bg';

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

/* Bird (player anchor, center of gameplay) */
/* bird.png is 1196×604 → 0.18 yields ~215×109, ≈45% of game width (matches ice at ≈46%) */
const BIRD_SCALE = 0.25;
const BIRD_CENTER_Y = 480;

/* Fish spawning (relative to bird) */
/* fish.png is 324×116 → 0.25 yields ~81×29 display */
const FISH_SCALE = 0.25;
const FISH_SPAWN_RADIUS_MIN = 100;
const FISH_SPAWN_RADIUS_MAX = 200;
const FISH_SPAWN_X_MARGIN = 60;
const FISH_SPAWN_Y_MIN = 220;
const FISH_MIN_SPACING = 90;
const FISH_SPAWN_MAX_ATTEMPTS = 15;

/* Progress display (top-right) */
/* background-total.png is 568×144 — use setDisplaySize for pixel-precise UI like MatchPenguin */
const PROGRESS_BG_X = GAME_WIDTH - 100;
const PROGRESS_BG_Y = 60;
const PROGRESS_BG_DISPLAY_W = 137;
const PROGRESS_BG_DISPLAY_H = 36;

/* ------------------------------------------------------------------ */
/*  Depth layers (back → front)                                        */
/* ------------------------------------------------------------------ */

const DEPTH_BIRD = 20;
const DEPTH_FISH = 10;
const DEPTH_SPLASH = 50;
const CELEBRATION_DEPTH = 200;
const TOAST_DEPTH = 500;

/* ------------------------------------------------------------------ */
/*  Toast animation                                                    */
/* ------------------------------------------------------------------ */

const TOAST_FLOAT_OFFSET = 40;
const TOAST_X_OFFSET = -80;
const TOAST_Y_OFFSET = -30;

/* ------------------------------------------------------------------ */
/*  Game constants                                                     */
/* ------------------------------------------------------------------ */

const TARGET_CATCH = 10;
const SPAWN_INTERVAL_MIN = 800;
const SPAWN_INTERVAL_MAX = 1800;
const FISH_LIFETIME = 3000;
const FINISH_POPUP_DELAY = 1200;

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

export class CatchFishScene extends BaseScene {
  protected get backgroundColor(): number {
    return 0x1565c0;
  }

  private caughtCount = 0;
  private progressText!: Phaser.GameObjects.Text;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private activeFish: Phaser.GameObjects.Image[] = [];
  private isGameOver = false;
  private birdSprite!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: SceneKeys.CatchFish });
  }

  /* ------------------------------------------------------------------ */
  /*  Asset loading                                                      */
  /* ------------------------------------------------------------------ */

  preload(): void {
    this.load.image(TEX_BG, bgUrl);
    this.load.image(TEX_BIRD, birdUrl);
    this.load.image(TEX_FISH, fishUrl);
    this.load.image(TEX_INCREASE, increaseUrl);
    this.load.image(TEX_PROGRESS_BG, progressBgUrl);
  }

  /* ------------------------------------------------------------------ */
  /*  Scene lifecycle                                                    */
  /* ------------------------------------------------------------------ */

  create(): void {
    super.create();

    this.caughtCount = 0;
    this.activeFish = [];
    this.isGameOver = false;

    this.generateEffectAssets();
    this.drawBackground();
    this.createUI();
    this.createBird();
    this.createProgress();
    this.startSpawning();
  }

  /* ------------------------------------------------------------------ */
  /*  Effect asset generation (procedural — splash & stars only)         */
  /* ------------------------------------------------------------------ */

  private generateEffectAssets(): void {
    AssetLoader.generateSplash(this, 'splash');
    AssetLoader.generateStar(this, 'star');
  }

  /* ------------------------------------------------------------------ */
  /*  Background                                                         */
  /* ------------------------------------------------------------------ */

  private drawBackground(): void {
    const bg = this.add.image(0, 0, TEX_BG);
    bg.setOrigin(0, 0);
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
  }

  /* ------------------------------------------------------------------ */
  /*  UI (title + instructions — matches MatchPenguin format)            */
  /* ------------------------------------------------------------------ */

  private createUI(): void {
    this.createInstructionUI(
      'Catch the Fish',
      'Tap the fish to help the shoebill catch its food.',
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Bird (player anchor — similar to ice in MatchPenguin)              */
  /* ------------------------------------------------------------------ */

  private createBird(): void {
    this.birdSprite = this.add.image(this.cx, BIRD_CENTER_Y, TEX_BIRD);
    this.birdSprite.setOrigin(0.5);
    this.birdSprite.setScale(BIRD_SCALE);
    this.birdSprite.setDepth(DEPTH_BIRD);
  }

  /* ------------------------------------------------------------------ */
  /*  Progress display (background-total.png + text)                     */
  /* ------------------------------------------------------------------ */

  private createProgress(): void {
    const progressBg = this.add.image(PROGRESS_BG_X, PROGRESS_BG_Y, TEX_PROGRESS_BG);
    progressBg.setOrigin(0.5);
    progressBg.setDisplaySize(PROGRESS_BG_DISPLAY_W, PROGRESS_BG_DISPLAY_H);
    progressBg.setDepth(1);

    this.progressText = this.add.text(
      PROGRESS_BG_X,
      PROGRESS_BG_Y,
      `0/${TARGET_CATCH} fish caught`,
      {
        ...TEXT_STYLES.body,
        fontSize: '16px',
        color: '#333333',
        fontStyle: 'bold',
      } as Phaser.Types.GameObjects.Text.TextStyle,
    );
    this.progressText.setOrigin(0.5);
    this.progressText.setDepth(2);
  }

  private updateProgress(): void {
    this.progressText.setText(`${this.caughtCount}/${TARGET_CATCH} fish caught`);
  }

  /* ------------------------------------------------------------------ */
  /*  Spawning                                                           */
  /* ------------------------------------------------------------------ */

  private startSpawning(): void {
    this.scheduleNextSpawn();
  }

  private isOverlappingFish(x: number, y: number): boolean {
    return this.activeFish.some((fish) => {
      if (!fish.active) return false;
      const dx = fish.x - x;
      const dy = fish.y - y;
      return dx * dx + dy * dy < FISH_MIN_SPACING * FISH_MIN_SPACING;
    });
  }

  private scheduleNextSpawn(): void {
    if (this.isGameOver) return;

    const delay = Phaser.Math.Between(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);
    this.spawnTimer = this.time.delayedCall(delay, () => {
      this.spawnFish();
      this.scheduleNextSpawn();
    });
  }

  private spawnFish(): void {
    if (this.isGameOver) return;

    const birdX = this.birdSprite.x;
    const birdY = this.birdSprite.y;

    let x = 0;
    let y = 0;
    let placed = false;

    for (let attempt = 0; attempt < FISH_SPAWN_MAX_ATTEMPTS; attempt++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(FISH_SPAWN_RADIUS_MIN, FISH_SPAWN_RADIUS_MAX);
      x = Phaser.Math.Clamp(
        birdX + Math.cos(angle) * dist,
        FISH_SPAWN_X_MARGIN,
        GAME_WIDTH - FISH_SPAWN_X_MARGIN,
      );
      y = Phaser.Math.Clamp(
        birdY + Math.sin(angle) * dist,
        FISH_SPAWN_Y_MIN,
        GAME_HEIGHT - 60,
      );

      if (!this.isOverlappingFish(x, y)) {
        placed = true;
        break;
      }
    }

    if (!placed) return;

    const fish = this.add.image(x, y, TEX_FISH);
    fish.setOrigin(0.5);
    fish.setScale(0);
    fish.setDepth(DEPTH_FISH);
    fish.setInteractive({ useHandCursor: true });

    if (Phaser.Math.Between(0, 1) === 0) {
      fish.setFlipX(true);
    }

    this.tweens.add({
      targets: fish,
      scale: FISH_SCALE,
      duration: 200,
      ease: 'Back.easeOut',
    });

    fish.on('pointerdown', () => {
      this.catchFish(fish);
    });

    this.time.delayedCall(FISH_LIFETIME, () => {
      if (fish.active) {
        this.escapeFish(fish);
      }
    });

    this.activeFish.push(fish);
  }

  /* ------------------------------------------------------------------ */
  /*  Catch / escape                                                     */
  /* ------------------------------------------------------------------ */

  private catchFish(fish: Phaser.GameObjects.Image): void {
    if (!fish.active || this.isGameOver) return;

    fish.disableInteractive();
    this.removeFishFromActive(fish);

    const splash = this.add.sprite(fish.x, fish.y, 'splash');
    splash.setDepth(DEPTH_SPLASH);
    this.tweens.add({
      targets: splash,
      scale: { from: 0.5, to: 1.8 },
      alpha: { from: 1, to: 0 },
      duration: 400,
      onComplete: () => splash.destroy(),
    });

    this.tweens.add({
      targets: fish,
      scale: 0,
      alpha: 0,
      duration: 200,
      onComplete: () => fish.destroy(),
    });

    this.caughtCount++;
    this.updateProgress();

    this.showToast(TEX_INCREASE, this.birdSprite.x + TOAST_X_OFFSET, this.birdSprite.y + TOAST_Y_OFFSET);

    if (this.caughtCount >= TARGET_CATCH) {
      this.handleWin();
    }
  }

  private escapeFish(fish: Phaser.GameObjects.Image): void {
    if (!fish.active) return;

    fish.disableInteractive();
    this.removeFishFromActive(fish);

    this.tweens.add({
      targets: fish,
      alpha: 0,
      scale: 0.3,
      duration: 300,
      onComplete: () => fish.destroy(),
    });
  }

  private removeFishFromActive(fish: Phaser.GameObjects.Image): void {
    const idx = this.activeFish.indexOf(fish);
    if (idx !== -1) {
      this.activeFish.splice(idx, 1);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Toast (matches MatchPenguin feedback system)                       */
  /* ------------------------------------------------------------------ */

  private showToast(textureKey: string, x: number, y: number): void {
    const toast = this.add.image(x, y, textureKey);
    toast.setOrigin(0.5);
    toast.setDisplaySize(44, 44);
    toast.setDepth(TOAST_DEPTH);

    this.tweens.add({
      targets: toast,
      y: y - TOAST_FLOAT_OFFSET,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: toast,
          alpha: 0,
          duration: 300,
          delay: 600,
          ease: 'Power2',
          onComplete: () => toast.destroy(),
        });
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Win state                                                          */
  /* ------------------------------------------------------------------ */

  private handleWin(): void {
    this.isGameOver = true;

    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }

    this.activeFish.forEach((fish) => {
      if (fish.active) {
        this.tweens.add({
          targets: fish,
          alpha: 0,
          duration: 300,
          onComplete: () => fish.destroy(),
        });
      }
    });
    this.activeFish = [];

    this.spawnCelebration(this.birdSprite.x, this.birdSprite.y);
    this.showFloatingText(this.birdSprite.x, this.birdSprite.y - 40, 'All Caught!', '#ffffff');

    this.time.delayedCall(FINISH_POPUP_DELAY, () => {
      this.uiManager.showPopup({
        title: 'Well Done!',
        message: `You caught all ${TARGET_CATCH} fish!`,
        buttonText: 'Play Again',
        onClose: () => this.scene.restart(),
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Celebration                                                        */
  /* ------------------------------------------------------------------ */

  private spawnCelebration(x: number, y: number): void {
    const starCount = 8;
    for (let i = 0; i < starCount; i++) {
      const star = this.add.sprite(x, y, 'star');
      star.setDepth(CELEBRATION_DEPTH);
      const a = (i / starCount) * Math.PI * 2;
      const dist = Phaser.Math.Between(40, 90);
      this.tweens.add({
        targets: star,
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        alpha: 0,
        scale: { from: 1.2, to: 0.3 },
        duration: 600,
        ease: 'Power2',
        onComplete: () => star.destroy(),
      });
    }
  }
}
