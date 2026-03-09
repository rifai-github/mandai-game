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
} from '../core/Config';
import { AssetLoader } from '../systems/AssetLoader';

/* ------------------------------------------------------------------ */
/*  Asset imports (resolved by Vite)                                   */
/* ------------------------------------------------------------------ */

import increaseUrl from '../assets/images/WingOfAsia/increase.png';
import progressBgUrl from '../assets/images/WingOfAsia/background-total.png';
import bgVideoUrl from '../assets/videos/WingOfAsia/Background Gameplay.mp4';
import asset1Url from '../assets/images/WingOfAsia/asset1.png';
import asset2Url from '../assets/images/WingOfAsia/asset2.png';
import asset3Url from '../assets/images/WingOfAsia/asset3.png';
import waterUrl from '../assets/images/WingOfAsia/air.png';

/* Bird + Fish combined animation atlases (7 atlas pairs) */
const birdFishPngs = import.meta.glob('../assets/images/WingOfAsia/Sequence/bird-fish/texture-*.png', { eager: true, import: 'default' }) as Record<string, string>;
const birdFishJsons = import.meta.glob('../assets/images/WingOfAsia/Sequence/bird-fish/texture-*.json', { eager: true, import: 'default' }) as Record<string, object>;

/** Sort glob-imported atlas pairs by texture index (texture-0, texture-1, …) */
function sortedAtlasPairs(
  pngs: Record<string, string>,
  jsons: Record<string, object>,
): Array<{ png: string; json: object }> {
  const idx = (p: string) => parseInt(p.match(/texture-(\d+)\./)?.[1] ?? '0', 10);
  return Object.keys(pngs)
    .sort((a, b) => idx(a) - idx(b))
    .map((pngPath) => ({
      png: pngs[pngPath],
      json: jsons[pngPath.replace('.png', '.json')],
    }));
}

/* ------------------------------------------------------------------ */
/*  Texture keys                                                       */
/* ------------------------------------------------------------------ */

const VID_BG = 'cf-bg-video';
const TEX_INCREASE = 'cf-increase';
const TEX_PROGRESS_BG = 'cf-progress-bg';
const TEX_WATER = 'cf-water';

/* Combined bird-fish atlas key prefix (7 atlases) */
const TEX_BF_PREFIX = 'cf-bf-';
const ANIM_FISH = 'cf-fish-swim';
const ANIM_FISH2 = 'cf-fish2-swim';
const ANIM_BIRD_IDLE = 'cf-bird-idle';
const ANIM_BIRD_CATCH = 'cf-bird-catch';
const ANIM_BIRD_FLY = 'cf-bird-fly';
const BIRD_ANIM_FRAMERATE = 24;

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

/* Bird (player anchor, center of gameplay) */
/* Each bird state has its own game object so positions & scale can be tuned independently */

/* Bird-idle */
const BIRD_IDLE_SCALE = 0.5 * scaleByHeight;
const BIRD_IDLE_X_OFFSET = 0;   // relative to this.cx
const BIRD_IDLE_Y = GAME_HEIGHT / 2;

/* Bird-catch */
const BIRD_CATCH_SCALE = 1 * scaleByHeight;
const BIRD_CATCH_X_OFFSET = -35;  // relative to this.cx
const BIRD_CATCH_Y = GAME_HEIGHT / 2;

/* Bird-fly */
const BIRD_FLY_SCALE = 0.8 * scaleByHeight;
const BIRD_FLY_X_OFFSET = 0;    // relative to this.cx
const BIRD_FLY_Y = GAME_HEIGHT / 2;

/* Fish spawning (spread across game area) */
/* Fish atlas frames are 335×120 → 0.25 yields ~84×30 display */
const FISH_SCALE = 0.5 * scaleByHeight;
/* Fish2 atlas frames are 600×623 → 0.14 yields ~84×87 display (comparable width) */
const FISH2_SCALE = 0.40 * scaleByHeight;
const FISH_ANIM_FRAMERATE = 24;
/* Fish2 has 121 frames — use higher fps so full animation plays within FISH_LIFETIME (1.5s) */
const FISH2_ANIM_FRAMERATE = 81;
const FISH_SPAWN_RADIUS = 80;
const FISH_SPAWN_X_MARGIN = 40 * scaleByWidth;
const FISH_SPAWN_Y_MIN = 350 * scaleByHeight;
const FISH_SPAWN_Y_MAX = GAME_HEIGHT - 60 * scaleByHeight;
const FISH_MIN_SPACING = 90;
const FISH_SPAWN_MAX_ATTEMPTS = 15;

/* Water surface (centered horizontally, adjustable Y) */
const WATER_Y = (BIRD_IDLE_Y + 160);
const WATER_SCALE = 0.25 * scaleByHeight;
const DEPTH_WATER = 25;

/* Decorative assets */
const DECOR_SCALE = 0.25 * scaleByHeight;
const DECOR_DEPTH = 5;
const DECOR_POSITIONS = [
  { key: 'cf-asset1-1', x: 60 * scaleByWidth, y: 720 * scaleByHeight },
  { key: 'cf-asset1-2', x: 420 * scaleByWidth, y: 750 * scaleByHeight },
  { key: 'cf-asset1-3', x: 240 * scaleByWidth, y: 680 * scaleByHeight },
  { key: 'cf-asset2-1', x: 100 * scaleByWidth, y: 200 * scaleByHeight },
  { key: 'cf-asset2-2', x: 380 * scaleByWidth, y: 270 * scaleByHeight },
  { key: 'cf-asset2-3', x: 50 * scaleByWidth, y: 400 * scaleByHeight },
  { key: 'cf-asset3-1', x: 400 * scaleByWidth, y: 370 * scaleByHeight },
  { key: 'cf-asset3-2', x: 440 * scaleByWidth, y: 500 * scaleByHeight },
  { key: 'cf-asset3-3', x: 30 * scaleByWidth, y: 550 * scaleByHeight },
];

/* Progress display (top-right) */
/* background-total.png is 568×144 — use setDisplaySize for pixel-precise UI like MatchPenguin */
const PROGRESS_BG_X = GAME_WIDTH - (100 * scaleByWidth);
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
const SPAWN_INTERVAL_MAX = 2000;
const FISH_LIFETIME = 1500;


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
  private activeFish: Phaser.GameObjects.Sprite[] = [];
  private isGameOver = false;
  private birdIdle!: Phaser.GameObjects.Sprite;
  private birdCatch!: Phaser.GameObjects.Sprite;
  private birdFly!: Phaser.GameObjects.Sprite;
  private water!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: SceneKeys.CatchFish });
  }

  /* ------------------------------------------------------------------ */
  /*  Asset loading                                                      */
  /* ------------------------------------------------------------------ */

  preload(): void {
    super.preload();
    this.load.video(VID_BG, bgVideoUrl);
    this.load.image(TEX_INCREASE, increaseUrl);
    this.load.image(TEX_PROGRESS_BG, progressBgUrl);
    const assetUrls: Record<string, string> = {
      'cf-asset1-1': asset1Url, 'cf-asset1-2': asset1Url, 'cf-asset1-3': asset1Url,
      'cf-asset2-1': asset2Url, 'cf-asset2-2': asset2Url, 'cf-asset2-3': asset2Url,
      'cf-asset3-1': asset3Url, 'cf-asset3-2': asset3Url, 'cf-asset3-3': asset3Url,
    };
    DECOR_POSITIONS.forEach(({ key }) => this.load.image(key, assetUrls[key]));
    this.load.image(TEX_WATER, waterUrl);

    /* Bird + Fish combined atlases */
    sortedAtlasPairs(birdFishPngs, birdFishJsons).forEach((pair, i) => {
      this.load.atlas(`${TEX_BF_PREFIX}${i}`, pair.png, pair.json);
    });
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
    this.createFishAnims();
    this.createBirdAnims();
    this.drawBackground();
    this.createWater();
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
  /*  Fish sprite animations                                             */
  /* ------------------------------------------------------------------ */

  /** Collect frames from the combined bird-fish atlases, filtered by name prefix, sorted globally by frame number. */
  private buildFilteredFrames(filter: string): Phaser.Types.Animations.AnimationFrame[] {
    const atlasCount = Object.keys(birdFishPngs).length;
    const collected: { key: string; frame: string }[] = [];
    for (let i = 0; i < atlasCount; i++) {
      const key = `${TEX_BF_PREFIX}${i}`;
      const names = this.textures.get(key).getFrameNames()
        .filter((n) => n !== '__BASE' && n.includes(filter));
      names.forEach((name) => collected.push({ key, frame: name }));
    }
    /* Sort globally by the numeric suffix in the frame name */
    collected.sort((a, b) => {
      const numA = parseInt(a.frame.match(/(\d+)\.png$/)?.[1] ?? '0', 10);
      const numB = parseInt(b.frame.match(/(\d+)\.png$/)?.[1] ?? '0', 10);
      return numA - numB;
    });
    return collected;
  }

  private createFishAnims(): void {
    if (!this.anims.exists(ANIM_FISH)) {
      this.anims.create({
        key: ANIM_FISH,
        frames: this.buildFilteredFrames('Fish/Fish_'),
        frameRate: FISH_ANIM_FRAMERATE,
        repeat: -1,
      });
    }

    if (!this.anims.exists(ANIM_FISH2)) {
      this.anims.create({
        key: ANIM_FISH2,
        frames: this.buildFilteredFrames('Fish/Fish 2_'),
        frameRate: FISH2_ANIM_FRAMERATE,
        repeat: -1,
      });
    }
  }

  private createBirdAnims(): void {
    if (!this.anims.exists(ANIM_BIRD_IDLE)) {
      this.anims.create({
        key: ANIM_BIRD_IDLE,
        frames: this.buildFilteredFrames('Bird/Idle_'),
        frameRate: BIRD_ANIM_FRAMERATE,
        repeat: -1,
      });
    }

    if (!this.anims.exists(ANIM_BIRD_CATCH)) {
      this.anims.create({
        key: ANIM_BIRD_CATCH,
        frames: this.buildFilteredFrames('Bird/Catch_'),
        frameRate: BIRD_ANIM_FRAMERATE,
        repeat: 0,
      });
    }

    if (!this.anims.exists(ANIM_BIRD_FLY)) {
      this.anims.create({
        key: ANIM_BIRD_FLY,
        frames: this.buildFilteredFrames('Bird/Fly_'),
        frameRate: BIRD_ANIM_FRAMERATE,
        repeat: 0,
      });
    }
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
  /*  Water surface                                                      */
  /* ------------------------------------------------------------------ */

  private createWater(): void {
    this.water = this.add.image(this.cx, WATER_Y, TEX_WATER);
    this.water.setOrigin(0.5);
    this.water.setScale(WATER_SCALE);
    this.water.setDepth(DEPTH_WATER);
  }

  /* ------------------------------------------------------------------ */
  /*  Decorative assets                                                  */
  /* ------------------------------------------------------------------ */

  private createDecorAssets(): void {
    DECOR_POSITIONS.forEach(({ key, x, y }, i) => {
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
    const atlasKey = `${TEX_BF_PREFIX}0`;

    /* Idle — visible by default */
    this.birdIdle = this.add.sprite(this.cx + BIRD_IDLE_X_OFFSET, BIRD_IDLE_Y, atlasKey);
    this.birdIdle.setOrigin(0.5);
    this.birdIdle.setScale(BIRD_IDLE_SCALE);
    this.birdIdle.setDepth(DEPTH_BIRD);
    this.birdIdle.play(ANIM_BIRD_IDLE);

    /* Catch — hidden until a fish is caught */
    this.birdCatch = this.add.sprite(this.cx + BIRD_CATCH_X_OFFSET, BIRD_CATCH_Y, atlasKey);
    this.birdCatch.setOrigin(0.5);
    this.birdCatch.setScale(BIRD_CATCH_SCALE);
    this.birdCatch.setDepth(DEPTH_BIRD);
    this.birdCatch.setVisible(false);

    /* Fly — hidden until win */
    this.birdFly = this.add.sprite(this.cx + BIRD_FLY_X_OFFSET, BIRD_FLY_Y, atlasKey);
    this.birdFly.setOrigin(0.5);
    this.birdFly.setScale(BIRD_FLY_SCALE);
    this.birdFly.setDepth(DEPTH_BIRD);
    this.birdFly.setVisible(false);
  }

  /* ------------------------------------------------------------------ */
  /*  Progress display (background-total.png + text)                     */
  /* ------------------------------------------------------------------ */

  private createProgress(): void {
    const progressBg = this.add.image(PROGRESS_BG_X, PROGRESS_BG_Y, TEX_PROGRESS_BG);
    progressBg.setOrigin(0.5);
    progressBg.setDisplaySize(PROGRESS_BG_DISPLAY_W * scaleByHeight, PROGRESS_BG_DISPLAY_H * scaleByHeight);
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
    this.progressText.setScale(scaleByHeight);
    this.progressText.setOrigin(0.5);
    this.progressText.setDepth(2);
    this.progressText.setResolution(2);
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

    let x = 0;
    let y = 0;
    let placed = false;

    for (let attempt = 0; attempt < FISH_SPAWN_MAX_ATTEMPTS; attempt++) {
      x = Phaser.Math.Between(FISH_SPAWN_X_MARGIN, GAME_WIDTH - FISH_SPAWN_X_MARGIN);
      y = Phaser.Math.Between(FISH_SPAWN_Y_MIN, FISH_SPAWN_Y_MAX);

      if (!this.isOverlappingFish(x, y)) {
        placed = true;
        break;
      }
    }

    if (!placed) return;

    /* Randomly pick Fish or Fish2 animation */
    const useFish2 = Phaser.Math.Between(0, 1) === 1;
    const animKey = useFish2 ? ANIM_FISH2 : ANIM_FISH;
    const atlasKey = `${TEX_BF_PREFIX}0`;
    const targetScale = useFish2 ? FISH2_SCALE : FISH_SCALE;

    const fish = this.add.sprite(x, y, atlasKey);
    fish.setOrigin(0.5);
    fish.setScale(0);
    fish.setDepth(DEPTH_FISH);
    fish.setInteractive({ useHandCursor: true });
    fish.play(animKey);

    if (Phaser.Math.Between(0, 1) === 0) {
      fish.setFlipX(true);
    }

    this.tweens.add({
      targets: fish,
      scale: targetScale,
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

  private catchFish(fish: Phaser.GameObjects.Sprite): void {
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

    /* Show bird-catch, hide bird-idle + water; on complete reverse */
    this.birdIdle.setVisible(false);
    this.water.setVisible(false);
    this.birdCatch.setVisible(true);
    this.birdCatch.play(ANIM_BIRD_CATCH);
    this.birdCatch.once('animationcomplete', () => {
      this.birdCatch.setVisible(false);
      if (!this.isGameOver) {
        this.birdIdle.setVisible(true);
        this.water.setVisible(true);
      }
    });

    if (this.caughtCount >= TARGET_CATCH) {
      this.handleWin();
    }
  }

  private escapeFish(fish: Phaser.GameObjects.Sprite): void {
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

  private removeFishFromActive(fish: Phaser.GameObjects.Sprite): void {
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
    toast.setDisplaySize(30 * scaleByHeight, 30 * scaleByHeight);
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

    this.spawnCelebration(this.birdFly.x, this.birdFly.y);
    this.showFloatingText(this.birdFly.x, this.birdFly.y - 40, 'All Caught!', '#ffffff');

    /* Show bird-fly, hide the others + water; on complete notify */
    this.birdIdle.setVisible(false);
    this.water.setVisible(false);
    this.birdCatch.setVisible(false);
    this.birdFly.setVisible(true);
    this.birdFly.play(ANIM_BIRD_FLY);
    this.birdFly.once('animationcomplete', () => {
      this.notifyGameCompleted();
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
