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
  scaleByHeight,
  scaleByWidth,
  multiplierResolution,
} from '../core/Config';
import { AssetLoader } from '../systems/AssetLoader';

/* ------------------------------------------------------------------ */
/*  Asset imports (resolved by Vite)                                   */
/* ------------------------------------------------------------------ */

import birdUrl from '../assets/images/WingOfAsia/bird.png';
import fishUrl from '../assets/images/WingOfAsia/fish.png';
import increaseUrl from '../assets/images/WingOfAsia/increase.png';
import progressBgUrl from '../assets/images/WingOfAsia/background-total.png';
import bgVideoUrl from '../assets/videos/WingOfAsia/Background Gameplay.mp4';
import asset1Url from '../assets/images/WingOfAsia/asset1.png';
import asset2Url from '../assets/images/WingOfAsia/asset2.png';
import asset3Url from '../assets/images/WingOfAsia/asset3.png';

/* ------------------------------------------------------------------ */
/*  Texture keys                                                       */
/* ------------------------------------------------------------------ */

const VID_BG = 'cf-bg-video';
const TEX_BIRD = 'cf-bird';
const TEX_FISH = 'cf-fish';
const TEX_INCREASE = 'cf-increase';
const TEX_PROGRESS_BG = 'cf-progress-bg';
const TEX_ASSET1 = 'cf-asset1';
const TEX_ASSET2 = 'cf-asset2';
const TEX_ASSET3 = 'cf-asset3';

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

/* Bird (player anchor, center of gameplay) */
/* bird.png is 1196×604 → 0.18 yields ~215×109, ≈45% of game width (matches ice at ≈46%) */
const BIRD_SCALE = 0.25 * multiplierResolution;
const BIRD_CENTER_Y = 480 * scaleByHeight;

/* Fish spawning (relative to bird) */
/* fish.png is 324×116 → 0.25 yields ~81×29 display */
const FISH_SCALE = 0.25 * multiplierResolution;
const FISH_SPAWN_RADIUS_MIN = 200;
const FISH_SPAWN_RADIUS_MAX = 800;
const FISH_SPAWN_X_MARGIN = 60 * scaleByWidth;
const FISH_SPAWN_Y_MIN = 250 * scaleByHeight;
const FISH_MIN_SPACING = 90;
const FISH_SPAWN_MAX_ATTEMPTS = 15;

/* Decorative assets */
const DECOR_SCALE = 0.25 * multiplierResolution;
const DECOR_DEPTH = 5;
const ASSET1_X = 60 * scaleByWidth;
const ASSET1_Y = 720 * scaleByHeight;
const ASSET2_X = 100 * scaleByWidth;
const ASSET2_Y = 200 * scaleByHeight;
const ASSET3_X = 400 * scaleByWidth;
const ASSET3_Y = 280 * scaleByHeight;

/* Progress display (top-right) */
/* background-total.png is 568×144 — use setDisplaySize for pixel-precise UI like MatchPenguin */
const PROGRESS_BG_X = GAME_WIDTH - 200;
const PROGRESS_BG_Y = 50 * scaleByHeight;
const PROGRESS_BG_DISPLAY_W = 137;
const PROGRESS_BG_DISPLAY_H = 36;

/* ------------------------------------------------------------------ */
/*  Depth layers (back → front)                                        */
/* ------------------------------------------------------------------ */

const DEPTH_BIRD = 20;
const DEPTH_FISH = 4;
const DEPTH_SPLASH = 50;
const CELEBRATION_DEPTH = 200;
const TOAST_DEPTH = 500;

/* ------------------------------------------------------------------ */
/*  Toast animation                                                    */
/* ------------------------------------------------------------------ */

const TOAST_FLOAT_OFFSET = 50;


/* ------------------------------------------------------------------ */
/*  Game constants                                                     */
/* ------------------------------------------------------------------ */

const TARGET_CATCH = 10;
const SPAWN_INTERVAL_MIN = 800;
const SPAWN_INTERVAL_MAX = 1800;
const FISH_LIFETIME = 3000;


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
    super.preload();
    this.load.video(VID_BG, bgVideoUrl);
    this.load.image(TEX_BIRD, birdUrl);
    this.load.image(TEX_FISH, fishUrl);
    this.load.image(TEX_INCREASE, increaseUrl);
    this.load.image(TEX_PROGRESS_BG, progressBgUrl);
    this.load.image(TEX_ASSET1, asset1Url);
    this.load.image(TEX_ASSET2, asset2Url);
    this.load.image(TEX_ASSET3, asset3Url);
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
    this.createDecorAssets();
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
    const bg = this.add.video(0, 0, VID_BG);
    bg.setOrigin(0, 0);
    bg.setLoop(true);
    if (bg.video) { bg.video.muted = true; bg.video.playsInline = true; }
    bg.play();
    bg.once('play', () => {
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Decorative assets                                                  */
  /* ------------------------------------------------------------------ */

  private createDecorAssets(): void {
    const defs = [
      { key: TEX_ASSET1, x: ASSET1_X, y: ASSET1_Y },
      { key: TEX_ASSET2, x: ASSET2_X, y: ASSET2_Y },
      { key: TEX_ASSET3, x: ASSET3_X, y: ASSET3_Y },
    ];

    defs.forEach(({ key, x, y }, i) => {
      const img = this.add.image(x, y, key);
      img.setOrigin(0.5);
      img.setScale(DECOR_SCALE);
      img.setDepth(DECOR_DEPTH);

      this.tweens.add({
        targets: img,
        y: y - 8,
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: i * 400,
      });
    });
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
    progressBg.setDisplaySize(PROGRESS_BG_DISPLAY_W * multiplierResolution, PROGRESS_BG_DISPLAY_H * multiplierResolution);
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
    this.progressText.setScale(multiplierResolution);
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

    this.showToast(TEX_INCREASE, fish.x, fish.y);

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
    toast.setDisplaySize(30 * multiplierResolution, 30 * multiplierResolution);
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

    this.notifyGameCompleted();
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
