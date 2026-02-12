/**
 * Paddle to Food Mini-Game
 *
 * Gameplay:
 * - Duck sits centered on screen (fixed position).
 * - Two tap zones at the bottom with duck-foot icons (Left / Right).
 * - Player must alternate taps: left → right → left → right …
 * - Correct alternating taps scroll track assets DOWNWARD, giving the
 *   illusion the duck swims forward through the water.
 * - Assets scale up as they approach the duck (pseudo-3D depth effect).
 * - Wrong-order taps flash the zone red only (no progress penalty).
 * - finish-spot approaches from above; arriving at duck level triggers win.
 */

import { BaseScene } from './BaseScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, ProgressBarHandle } from '../core/Config';

import bgUrl from '../assets/images/PaddleFood/background.png';
import duckIdleUrl from '../assets/images/PaddleFood/duck-idle.png';
import duckSwimUrl from '../assets/images/PaddleFood/duck-swim.png';
import duckFootUrl from '../assets/images/PaddleFood/duck-foot.png';
import firstLandUrl from '../assets/images/PaddleFood/first-land.png';
import asset1Url from '../assets/images/PaddleFood/asset1.png';
import asset2Url from '../assets/images/PaddleFood/asset2.png';
import finishSpotUrl from '../assets/images/PaddleFood/finish-spot.png';

/* ------------------------------------------------------------------ */
/*  Texture keys                                                       */
/* ------------------------------------------------------------------ */
const TEX_BG = 'pf-bg';
const TEX_DUCK_IDLE = 'pf-duck-idle';
const TEX_DUCK_SWIM = 'pf-duck-swim';
const TEX_DUCK_FOOT = 'pf-duck-foot';
const TEX_FIRST_LAND = 'pf-first-land';
const TEX_ASSET1 = 'pf-asset1';
const TEX_ASSET2 = 'pf-asset2';
const TEX_FINISH = 'pf-finish';

/* ------------------------------------------------------------------ */
/*  Enums                                                              */
/* ------------------------------------------------------------------ */
enum PaddleSide {
  Left = 'left',
  Right = 'right',
}

enum GameState {
  Idle,
  Swimming,
  Finished,
}

/* ------------------------------------------------------------------ */
/*  Layout / tuning constants                                          */
/* ------------------------------------------------------------------ */

/** Base scale for all in-world sprites (duck, assets, finish, first-land) */
const ASSET_SCALE = 0.25;

/** Foot button scale – left foot uses negative scaleX to mirror */
const FOOT_SCALE = 0.25;

/** Duck is horizontally centred and vertically fixed */
const DUCK_X = GAME_WIDTH / 2;
const DUCK_Y = 430;

/** Height of the bottom tap-zone strip */
const ZONE_HEIGHT = 180;

/** Progress advances by BASE_STEP per correct tap */
const BASE_STEP = 5;
const MAX_PROGRESS = 100;
/** Total correct taps required to win */
const MAX_TAPS = MAX_PROGRESS / BASE_STEP;   // 20

/**
 * Pixels the track scrolls per correct tap.
 * finish-spot starts at DUCK_Y − (MAX_TAPS × SCROLL_PER_TAP),
 * so it arrives exactly at DUCK_Y on the winning tap.
 */
const SCROLL_PER_TAP = 50;
const TOTAL_SCROLL = MAX_TAPS * SCROLL_PER_TAP;  // 1600 px

/** Initial Y positions — tweak these to adjust spawn locations */
const FINISH_Y0 = DUCK_Y - TOTAL_SCROLL;   // finish-spot start Y (scroll-math driven)
const FIRST_LAND_Y0 = DUCK_Y + 50;             // first-land start Y (just below duck)
const LANE_SPAWN_TOP = 200;                     // lane assets top-most spawn Y (≈ centre of screen)
const LANE_SPAWN_BOT = DUCK_Y - 80;            // lane assets bottom-most spawn Y

/* Pseudo-3D scale model ─────────────────────────────────────────── */
/** scale = 0 at SCALE_Y_TOP, grows to max at SCALE_Y_BOT (duck level) */
const ASSET_MIN_SCALE = 0;
const SCALE_Y_TOP = LANE_SPAWN_TOP;          // scale = 0 at spawn
const SCALE_Y_BOT = DUCK_Y;                  //  430  → full scale
/** Lane assets (asset1/asset2) scale up to 1.2× the base scale */
const LANE_MAX_SCALE = ASSET_SCALE * 1.2;         //  0.30

/* Depth layers (back → front) ────────────────────────────────────── */
const DEPTH_BG = 0;
const DEPTH_FIRST_LAND = 8;
const DEPTH_ASSETS = 10;
const DEPTH_FINISH = 12;
const DEPTH_DUCK = 20;
const DEPTH_ZONE = 100;
const DEPTH_FOOT = 101;
const DEPTH_FLASH = 110;

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

export class PaddleFoodScene extends BaseScene {
  protected get backgroundColor(): number { return 0x5ab3d8; }

  /* ── State ─────────────────────────────────────────────────────── */
  private progress = 0;
  private expectedSide: PaddleSide = PaddleSide.Left;
  private gameState: GameState = GameState.Idle;
  private tapCount = 0;

  /* ── Display objects ────────────────────────────────────────────── */
  private duck!: Phaser.GameObjects.Image;
  private firstLand!: Phaser.GameObjects.Image;
  private finishSpot!: Phaser.GameObjects.Image;
  private laneAssets: Phaser.GameObjects.Image[] = [];
  private bobTween: Phaser.Tweens.Tween | null = null;

  private leftFoot!: Phaser.GameObjects.Image;
  private rightFoot!: Phaser.GameObjects.Image;
  private progressBar!: ProgressBarHandle;

  constructor() {
    super({ key: SceneKeys.PaddleFood });
  }

  /* ────────────────────────── preload ───────────────────────────── */

  preload(): void {
    this.load.image(TEX_BG, bgUrl);
    this.load.image(TEX_DUCK_IDLE, duckIdleUrl);
    this.load.image(TEX_DUCK_SWIM, duckSwimUrl);
    this.load.image(TEX_DUCK_FOOT, duckFootUrl);
    this.load.image(TEX_FIRST_LAND, firstLandUrl);
    this.load.image(TEX_ASSET1, asset1Url);
    this.load.image(TEX_ASSET2, asset2Url);
    this.load.image(TEX_FINISH, finishSpotUrl);
  }

  /* ────────────────────────── create ────────────────────────────── */

  create(): void {
    super.create();
    this.resetState();
    this.createBackground();
    this.createTrack();
    this.createDuck();
    this.createUI();
    this.createTapZones();
  }

  /* ────────────────────────── update ────────────────────────────── */

  update(): void {
    /* Keep pseudo-3D depth scale in sync with each asset's live Y */
    for (const img of this.laneAssets) {
      this.applyDepthScale(img, LANE_MAX_SCALE);
    }
    this.applyDepthScale(this.finishSpot);
  }

  /* ────────────────────────── reset ─────────────────────────────── */

  private resetState(): void {
    this.progress = 0;
    this.expectedSide = PaddleSide.Left;
    this.gameState = GameState.Idle;
    this.tapCount = 0;
    this.laneAssets = [];
    this.bobTween = null;
  }

  /* ────────────────────────── background ────────────────────────── */

  private createBackground(): void {
    const bg = this.add.image(0, 0, TEX_BG);
    bg.setOrigin(0, 0);
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    bg.setDepth(DEPTH_BG);
  }

  /* ────────────────────────── track / lane assets ───────────────── */

  private createTrack(): void {
    /* first-land: starting platform – full screen width, anchored top-centre,
       positioned just below the duck so it covers the lower half of screen */
    this.firstLand = this.add.image(DUCK_X, FIRST_LAND_Y0, TEX_FIRST_LAND);
    this.firstLand.setOrigin(0.5, 0);
    this.firstLand.setData('targetY', FIRST_LAND_Y0);
    /* Scale uniformly so the image width equals the full game width */
    const landScale = GAME_WIDTH / this.firstLand.width;
    this.firstLand.setScale(landScale);
    this.firstLand.setDepth(DEPTH_FIRST_LAND);

    /* finish-spot: centered X, tiny at game start, grows as it arrives */
    this.finishSpot = this.add.image(DUCK_X, FINISH_Y0, TEX_FINISH);
    this.finishSpot.setOrigin(0.5);
    this.finishSpot.setData('targetY', FINISH_Y0);
    this.finishSpot.setDepth(DEPTH_FINISH);
    this.applyDepthScale(this.finishSpot);

    /* Lane assets: 3× asset1 + 3× asset2 evenly spread along the track */
    const POOL = 2;
    const step = (LANE_SPAWN_BOT - LANE_SPAWN_TOP) / (POOL * 2 - 1);

    for (let i = 0; i < POOL * 2; i++) {
      const key = (i % 2 === 0) ? TEX_ASSET1 : TEX_ASSET2;
      const startY = LANE_SPAWN_TOP + step * i;
      const img = this.add.image(this.randomLaneX(), startY, key);
      img.setOrigin(0.5);
      img.setData('targetY', startY);
      img.setDepth(DEPTH_ASSETS);
      this.applyDepthScale(img, LANE_MAX_SCALE);
      this.laneAssets.push(img);
    }
  }

  /**
   * Returns a random X coordinate that is on the LEFT or RIGHT side,
   * never close to centre so the duck is never obscured.
   */
  private randomLaneX(): number {
    const margin = 0;   // screen-edge buffer (closer to edge)
    const clearance = 150; // gap from centre each side (further from duck)
    return Phaser.Math.Between(0, 1) === 0
      ? Phaser.Math.Between(margin, DUCK_X - clearance)
      : Phaser.Math.Between(DUCK_X + clearance, GAME_WIDTH - margin);
  }

  /**
   * Sets an image's scale linearly based on its Y position,
   * creating a pseudo-3D "approaching from the horizon" effect.
   */
  private applyDepthScale(img: Phaser.GameObjects.Image, maxScale = ASSET_SCALE): void {
    const t = Phaser.Math.Clamp(
      (img.y - SCALE_Y_TOP) / (SCALE_Y_BOT - SCALE_Y_TOP),
      0, 1,
    );
    img.setScale(ASSET_MIN_SCALE + (maxScale - ASSET_MIN_SCALE) * t);
  }

  /* ────────────────────────── duck ──────────────────────────────── */

  private createDuck(): void {
    this.duck = this.add.image(DUCK_X, DUCK_Y, TEX_DUCK_IDLE);
    this.duck.setOrigin(0.5);
    this.duck.setScale(ASSET_SCALE);
    this.duck.setDepth(DEPTH_DUCK);
  }

  private startSwimming(): void {
    this.gameState = GameState.Swimming;
    this.duck.setTexture(TEX_DUCK_SWIM);
    this.bobTween = this.tweens.add({
      targets: this.duck,
      y: DUCK_Y + 7,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopSwimming(): void {
    this.bobTween?.stop();
    this.bobTween = null;
    this.duck.setY(DUCK_Y);
    this.duck.setTexture(TEX_DUCK_IDLE);
  }

  /* ────────────────────────── UI / progress bar ─────────────────── */

  private createUI(): void {
    this.createInstructionUI('Paddle to the Food', 'Tap the screen to help the duck paddle towards the food.');
    this.progressBar = this.uiManager.createProgressBar({
      x: 40, y: GAME_HEIGHT - ZONE_HEIGHT - 40, width: GAME_WIDTH - 80, height: 22,
    });
    this.progressBar.background.setDepth(DEPTH_FOOT + 1);
    this.progressBar.fill.setDepth(DEPTH_FOOT + 2);
    this.progressBar.border.setDepth(DEPTH_FOOT + 3);
  }

  /* ────────────────────────── tap zones ─────────────────────────── */

  private createTapZones(): void {
    const halfW = GAME_WIDTH / 2;
    const zoneTop = GAME_HEIGHT - ZONE_HEIGHT;
    const zoneY = GAME_HEIGHT - ZONE_HEIGHT / 2;

    /* Zone backgrounds */
    const leftGfx = this.add.graphics().setDepth(DEPTH_ZONE);
    leftGfx.fillStyle(0x1976d2, 0.4);
    leftGfx.fillRect(0, zoneTop, halfW, ZONE_HEIGHT);
    leftGfx.lineStyle(1, 0xffffff, 0.2);
    leftGfx.strokeRect(0, zoneTop, halfW, ZONE_HEIGHT);

    const rightGfx = this.add.graphics().setDepth(DEPTH_ZONE);
    rightGfx.fillStyle(0x0d47a1, 0.4);
    rightGfx.fillRect(halfW, zoneTop, halfW, ZONE_HEIGHT);
    rightGfx.lineStyle(1, 0xffffff, 0.2);
    rightGfx.strokeRect(halfW, zoneTop, halfW, ZONE_HEIGHT);

    /* Centre separator */
    const sep = this.add.graphics().setDepth(DEPTH_ZONE);
    sep.lineStyle(2, 0xffffff, 0.4);
    sep.lineBetween(halfW, zoneTop, halfW, GAME_HEIGHT);

    /* Duck-foot icons: left foot is mirrored (negative scaleX) */
    this.leftFoot = this.add.image(halfW / 2, zoneY, TEX_DUCK_FOOT);
    this.leftFoot.setOrigin(0.5);
    this.leftFoot.setScale(-FOOT_SCALE, FOOT_SCALE);
    this.leftFoot.setDepth(DEPTH_FOOT);

    this.rightFoot = this.add.image(halfW + halfW / 2, zoneY, TEX_DUCK_FOOT);
    this.rightFoot.setOrigin(0.5);
    this.rightFoot.setScale(FOOT_SCALE);
    this.rightFoot.setDepth(DEPTH_FOOT);

    this.updateHighlight();

    /* Invisible interactive tap areas */
    this.inputManager.createTapZone(
      halfW / 2, zoneY, halfW, ZONE_HEIGHT,
      () => this.onTap(PaddleSide.Left),
    );
    this.inputManager.createTapZone(
      halfW + halfW / 2, zoneY, halfW, ZONE_HEIGHT,
      () => this.onTap(PaddleSide.Right),
    );
  }

  /* ────────────────────────── gameplay ──────────────────────────── */

  private onTap(side: PaddleSide): void {
    if (this.gameState === GameState.Finished) return;
    if (this.uiManager.hasActivePopup()) return;

    if (side === this.expectedSide) {
      this.handleCorrectTap(side);
    } else {
      /* Wrong side – flash red only, no penalty */
      this.flashZone(side, 0xe74c3c);
    }

    this.progressBar.update(this.progress / MAX_PROGRESS);
    this.updateHighlight();
  }

  private handleCorrectTap(side: PaddleSide): void {
    this.progress = Math.min(MAX_PROGRESS, this.progress + BASE_STEP);
    this.expectedSide = side === PaddleSide.Left ? PaddleSide.Right : PaddleSide.Left;
    this.tapCount++;

    /* First tap → switch duck to swim mode */
    if (this.gameState === GameState.Idle) this.startSwimming();

    this.animateFoot(side);
    this.flashZone(side, 0x4caf50);
    this.scrollTrack();

    /* Spawn a new lane asset every 2 correct taps */
    if (this.tapCount % 2 === 0) this.spawnLaneAsset();

    if (this.progress >= MAX_PROGRESS) {
      this.gameState = GameState.Finished;
      this.time.delayedCall(380, () => this.handleWin());
    }
  }

  /* ────────────────────────── scroll ────────────────────────────── */

  private scrollTrack(): void {
    const targets = [this.firstLand, this.finishSpot, ...this.laneAssets];
    for (const img of targets) {
      const newY = (img.getData('targetY') as number) + SCROLL_PER_TAP;
      img.setData('targetY', newY);
      this.tweens.add({
        targets: img,
        y: newY,
        duration: 220,
        ease: 'Power2',
        onComplete: () => this.maybeDestroy(img),
      });
    }
  }

  /** Spawn a fresh lane asset at the top (scale = 0, grows as it scrolls) */
  private spawnLaneAsset(): void {
    const key = Phaser.Math.Between(0, 1) === 0 ? TEX_ASSET1 : TEX_ASSET2;
    const img = this.add.image(this.randomLaneX(), LANE_SPAWN_TOP, key);
    img.setOrigin(0.5);
    img.setData('targetY', LANE_SPAWN_TOP);
    img.setDepth(DEPTH_ASSETS);
    this.applyDepthScale(img, LANE_MAX_SCALE);
    this.laneAssets.push(img);
  }

  /**
   * Destroys a lane asset once it scrolls past the duck.
   * first-land and finish-spot are never destroyed.
   */
  private maybeDestroy(img: Phaser.GameObjects.Image): void {
    if (img === this.firstLand || img === this.finishSpot) return;
    if (img.y > GAME_HEIGHT + 80) {
      img.destroy();
      this.laneAssets = this.laneAssets.filter(a => a !== img);
    }
  }

  /* ────────────────────────── visual feedback ───────────────────── */

  private animateFoot(side: PaddleSide): void {
    const foot = side === PaddleSide.Left ? this.leftFoot : this.rightFoot;
    const dir = side === PaddleSide.Left ? -1 : 1;

    this.tweens.add({
      targets: foot,
      scaleX: dir * FOOT_SCALE * 1.45,
      scaleY: FOOT_SCALE * 1.45,
      angle: side === PaddleSide.Left ? 22 : -22,
      duration: 120,
      yoyo: true,
      onComplete: () => {
        foot.setScale(dir * FOOT_SCALE, FOOT_SCALE);
        foot.setAngle(0);
        this.updateHighlight();
      },
    });
  }

  private flashZone(side: PaddleSide, color: number): void {
    const halfW = GAME_WIDTH / 2;
    const gfx = this.add.graphics().setDepth(DEPTH_FLASH);
    gfx.fillStyle(color, 0.3);
    if (side === PaddleSide.Left) {
      gfx.fillRect(0, GAME_HEIGHT - ZONE_HEIGHT, halfW, ZONE_HEIGHT);
    } else {
      gfx.fillRect(halfW, GAME_HEIGHT - ZONE_HEIGHT, halfW, ZONE_HEIGHT);
    }
    this.tweens.add({
      targets: gfx, alpha: 0, duration: 220,
      onComplete: () => gfx.destroy(),
    });
  }

  /** Dim the foot that is NOT expected next, brighten the one that is */
  private updateHighlight(): void {
    this.leftFoot.setAlpha(this.expectedSide === PaddleSide.Left ? 1.0 : 0.35);
    this.rightFoot.setAlpha(this.expectedSide === PaddleSide.Right ? 1.0 : 0.35);
  }

  /* ────────────────────────── win ───────────────────────────────── */

  private handleWin(): void {
    this.stopSwimming();

    /* Colourful celebration burst */
    const colors = [0xffd700, 0xff6b6b, 0x6bcb77, 0x4d96ff, 0xff6f91, 0xc490e4];
    for (let i = 0; i < 14; i++) {
      this.time.delayedCall(i * 50, () => {
        const star = this.add.graphics().setDepth(300);
        star.fillStyle(colors[i % colors.length], 1);
        star.fillCircle(0, 0, Phaser.Math.Between(5, 10));
        star.setPosition(
          Phaser.Math.Between(60, GAME_WIDTH - 60),
          Phaser.Math.Between(180, 520),
        );
        this.tweens.add({
          targets: star, y: star.y - 100, alpha: 0,
          angle: Phaser.Math.Between(-180, 180), duration: 780,
          ease: 'Power2', onComplete: () => star.destroy(),
        });
      });
    }

    this.time.delayedCall(950, () => {
      this.uiManager.showPopup({
        title: 'Well Done!',
        message: 'The duck reached the food!',
        buttonText: 'Play Again',
        onClose: () => this.scene.restart(),
      });
    });
  }
}
