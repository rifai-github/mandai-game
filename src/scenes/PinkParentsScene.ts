/**
 * Pink Parents Mini-Game (Asset-Based Sequential Flamingo Matching)
 *
 * Gameplay:
 * - 3 color swatches displayed at the bottom as choices (always visible).
 * - Flamingos appear ONE BY ONE at the center area.
 * - The player clicks a color swatch to match it to the current flamingo.
 * - Correct: toast shown, flamingo slides left, next flamingo slides in.
 * - Wrong: try-again toast shown, player can try again.
 * - Color swatches are NEVER disabled after a correct match.
 * - All 3 matched: celebration and restart option.
 */

import { BaseScene } from './BaseScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, scaleByWidth, scaleByHeight, multiplierResolution } from '../core/Config';
import { AssetLoader } from '../systems/AssetLoader';

/* ------------------------------------------------------------------ */
/*  Asset imports (resolved by Vite)                                   */
/* ------------------------------------------------------------------ */

import bgVideoUrl from '../assets/videos/PinkParents/Background Gameplay.mp4';
import selectBgUrl from '../assets/images/PinkParents/background-selection.png';
import correctUrl from '../assets/images/PinkParents/correct.png';
import tryAgainUrl from '../assets/images/PinkParents/try-again.png';
import flamingo1TextureUrl from '../assets/images/PinkParents/flamingo/flamingo-1/texture.png';
import flamingo1Json from '../assets/images/PinkParents/flamingo/flamingo-1/texture.json';
import flamingo2TextureUrl from '../assets/images/PinkParents/flamingo/flamingo-2/texture.png';
import flamingo2Json from '../assets/images/PinkParents/flamingo/flamingo-2/texture.json';
import flamingo3TextureUrl from '../assets/images/PinkParents/flamingo/flamingo-3/texture.png';
import flamingo3Json from '../assets/images/PinkParents/flamingo/flamingo-3/texture.json';
import color1Url from '../assets/images/PinkParents/color/pink-1.png';
import color2Url from '../assets/images/PinkParents/color/pink-2.png';
import color3Url from '../assets/images/PinkParents/color/pink-3.png';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

enum MatchState {
  Idle,
  Animating,
  Finished,
}

type FlamingoId = '1' | '2' | '3';

interface ColorSwatch {
  id: FlamingoId;
  sprite: Phaser.GameObjects.Image;
}

interface FlamingoEntry {
  id: FlamingoId;
  targetColorId: FlamingoId;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FLAMINGO_IDS: readonly FlamingoId[] = ['1', '2', '3'];

const FLAMINGO_ATLAS: Record<FlamingoId, { texture: string; json: object }> = {
  '1': { texture: flamingo1TextureUrl, json: flamingo1Json },
  '2': { texture: flamingo2TextureUrl, json: flamingo2Json },
  '3': { texture: flamingo3TextureUrl, json: flamingo3Json },
};

const COLOR_URLS: Record<FlamingoId, string> = {
  '1': color1Url,
  '2': color2Url,
  '3': color3Url,
};

/* Texture keys */
const VID_BG = 'pp-bg-video';
const TEX_SELECT_BG = 'pp-select-bg';
const TEX_CORRECT = 'pp-correct';
const TEX_TRY_AGAIN = 'pp-try-again';
const TEX_FLAMINGO_PREFIX = 'pp-flamingo-';
const TEX_COLOR_PREFIX = 'pp-color-';

/* Layout */
const FLAMINGO_SCALE = 0.66 * multiplierResolution;
const FLAMINGO_CENTER_Y = 450 * scaleByHeight;
const FLAMINGO_OFFSCREEN_PADDING = 150 * scaleByWidth;
const SELECT_BG_Y = 760 * scaleByHeight;
const SELECT_BG_DISPLAY_W = 337 * scaleByWidth;
const SELECT_BG_DISPLAY_H = 132 * scaleByHeight;
const SELECT_TEXT_Y = SELECT_BG_Y - 80;
const COLOR_SCALE = 0.25 * multiplierResolution;
const COLOR_ROW_Y = SELECT_BG_Y + 40;
const COLOR_MARGIN_X = 140 * scaleByWidth;

/* Depth layers (back → front) */
const DEPTH_FLAMINGO = 30;

/* Flamingo animation keys */
const ANIM_FLAMINGO: Record<FlamingoId, string> = {
  '1': 'pp-flamingo-1-idle',
  '2': 'pp-flamingo-2-idle',
  '3': 'pp-flamingo-3-idle',
};

/* Animation */
const SLIDE_DURATION = 500;
const SLIDE_EASE = 'Cubic.easeOut';
const SLIDE_OUT_DELAY = 200;
const TOAST_FLOAT_OFFSET = 40;
const TOAST_DEPTH = 500;
const TOAST_Y_OFFSET = 230 * scaleByHeight;
const CELEBRATION_STAR_COUNT = 8;
const CELEBRATION_DURATION = 600;
const CELEBRATION_DEPTH = 200;


/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

export class PinkParentsScene extends BaseScene {
  protected get backgroundColor(): number {
    return 0xfce4ec;
  }

  private matchState: MatchState = MatchState.Idle;
  private colorSwatches: ColorSwatch[] = [];
  private flamingoQueue: FlamingoEntry[] = [];
  private activeFlamingoIndex = 0;
  private activeFlamingoSprite: Phaser.GameObjects.Sprite | null = null;

  constructor() {
    super({ key: SceneKeys.PinkParents });
  }

  /* ------------------------------------------------------------------ */
  /*  Asset loading                                                      */
  /* ------------------------------------------------------------------ */

  preload(): void {
    super.preload();
    this.load.video(VID_BG, bgVideoUrl);
    this.load.image(TEX_SELECT_BG, selectBgUrl);
    this.load.image(TEX_CORRECT, correctUrl);
    this.load.image(TEX_TRY_AGAIN, tryAgainUrl);

    for (const id of FLAMINGO_IDS) {
      const atlas = FLAMINGO_ATLAS[id];
      this.load.atlas(TEX_FLAMINGO_PREFIX + id, atlas.texture, atlas.json as object);
      this.load.image(TEX_COLOR_PREFIX + id, COLOR_URLS[id]);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Scene lifecycle                                                    */
  /* ------------------------------------------------------------------ */

  create(): void {
    super.create();
    this.createFlamingoAnims();
    this.initState();
    this.createBackground();
    this.createColorSwatches();
    this.buildFlamingoQueue();
    this.spawnNextFlamingo();
  }

  private createFlamingoAnims(): void {
    for (const id of FLAMINGO_IDS) {
      if (this.anims.exists(ANIM_FLAMINGO[id])) continue;
      this.anims.create({
        key: ANIM_FLAMINGO[id],
        frames: this.anims.generateFrameNames(TEX_FLAMINGO_PREFIX + id, {
          prefix: `flamingo-${id}_`,
          start: 0,
          end: 59,
          zeroPad: 5,
          suffix: '.png',
        }),
        frameRate: 24,
        repeat: -1,
      });
    }
  }

  private initState(): void {
    this.matchState = MatchState.Idle;
    this.colorSwatches = [];
    this.flamingoQueue = [];
    this.activeFlamingoIndex = 0;
    this.activeFlamingoSprite = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Background & static UI                                             */
  /* ------------------------------------------------------------------ */

  private createBackground(): void {
    const bg = this.add.video(0, 0, VID_BG);
    bg.setOrigin(0, 0);
    bg.setLoop(true);
    if (bg.video) { bg.video.muted = true; bg.video.playsInline = true; }
    bg.play();
    bg.once('play', () => {
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    });

    this.createInstructionUI(
      'Find the Pink Parents',
      'Click to match the correct shade of pink to each bird. ',
    );

    /* Selection area background */
    const selectBg = this.add.image(this.cx, SELECT_BG_Y, TEX_SELECT_BG);
    selectBg.setDisplaySize(SELECT_BG_DISPLAY_W, SELECT_BG_DISPLAY_H);

    /* Instruction text inside selection area */
    this.add
      .text(this.cx, SELECT_TEXT_Y, 'Select the shade of pink below that matches\nthe bird\'s feather.', {
        fontFamily: "'MandaiValueSerif'",
        fontSize: '13px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 4,
      })
      .setScale(2)
      .setOrigin(0.5)
      .setResolution(2);
  }

  /* ------------------------------------------------------------------ */
  /*  Color swatches (always-visible choices)                            */
  /* ------------------------------------------------------------------ */

  private createColorSwatches(): void {
    const shuffled = Phaser.Utils.Array.Shuffle([...FLAMINGO_IDS]) as FlamingoId[];

    const positions = [
      { x: COLOR_MARGIN_X, y: COLOR_ROW_Y },
      { x: GAME_WIDTH / 2, y: COLOR_ROW_Y },
      { x: GAME_WIDTH - COLOR_MARGIN_X, y: COLOR_ROW_Y },
    ];

    this.colorSwatches = shuffled.map((id, i) => {
      const pos = positions[i];
      const sprite = this.add.image(pos.x, pos.y, TEX_COLOR_PREFIX + id);
      sprite.setOrigin(0.5);
      sprite.setScale(COLOR_SCALE);
      sprite.setInteractive({ useHandCursor: true });

      const swatch: ColorSwatch = { id, sprite };

      sprite.on('pointerdown', () => {
        this.handleColorClick(swatch);
      });

      return swatch;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Flamingo queue                                                     */
  /* ------------------------------------------------------------------ */

  private buildFlamingoQueue(): void {
    const order = Phaser.Utils.Array.Shuffle([...FLAMINGO_IDS]) as FlamingoId[];

    this.flamingoQueue = order.map((id) => ({
      id,
      targetColorId: id,
    }));
  }

  /* ------------------------------------------------------------------ */
  /*  Flamingo spawning                                                  */
  /* ------------------------------------------------------------------ */

  private spawnNextFlamingo(): void {
    if (this.activeFlamingoIndex >= FLAMINGO_IDS.length) {
      this.handleAllMatched();
      return;
    }

    const flamingoData = this.flamingoQueue[this.activeFlamingoIndex];

    this.matchState = MatchState.Animating;

    const startX = GAME_WIDTH + FLAMINGO_OFFSCREEN_PADDING;

    /* Flamingo: slides in from right */
    const flamingoSprite = this.add.sprite(
      startX,
      FLAMINGO_CENTER_Y,
      TEX_FLAMINGO_PREFIX + flamingoData.id,
    );
    flamingoSprite.setOrigin(0.5);
    flamingoSprite.setScale(FLAMINGO_SCALE);
    flamingoSprite.setDepth(DEPTH_FLAMINGO);
    flamingoSprite.play(ANIM_FLAMINGO[flamingoData.id]);
    this.activeFlamingoSprite = flamingoSprite;

    /* Slide in */
    this.tweens.add({
      targets: flamingoSprite,
      x: this.cx,
      duration: SLIDE_DURATION,
      ease: SLIDE_EASE,
      onComplete: () => {
        this.matchState = MatchState.Idle;
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Click handling                                                     */
  /* ------------------------------------------------------------------ */

  private handleColorClick(swatch: ColorSwatch): void {
    if (this.matchState !== MatchState.Idle) return;
    if (!this.activeFlamingoSprite) return;

    const flamingoData = this.flamingoQueue[this.activeFlamingoIndex];

    if (swatch.id === flamingoData.targetColorId) {
      this.handleCorrectMatch(swatch);
    } else {
      this.handleWrongMatch();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Match handlers                                                     */
  /* ------------------------------------------------------------------ */

  private handleCorrectMatch(swatch: ColorSwatch): void {
    const flamingo = this.activeFlamingoSprite;
    if (!flamingo) return;

    this.matchState = MatchState.Animating;

    /* 1. Toast */
    this.showToast(TEX_CORRECT, flamingo.x, flamingo.y + TOAST_Y_OFFSET);

    /* 2. Brief press feedback on the swatch */
    this.tweens.add({
      targets: swatch.sprite,
      scale: COLOR_SCALE * 0.85,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });

    /* 3. Celebration */
    this.spawnCelebration(flamingo.x, flamingo.y);

    /* 4. Slide flamingo left */
    this.tweens.add({
      targets: flamingo,
      x: -flamingo.displayWidth,
      duration: SLIDE_DURATION,
      ease: SLIDE_EASE,
      delay: SLIDE_OUT_DELAY,
      onComplete: () => {
        this.destroyActiveFlamingo();
        this.activeFlamingoIndex++;
        this.spawnNextFlamingo();
      },
    });
  }

  private handleWrongMatch(): void {
    if (!this.activeFlamingoSprite) return;

    /* Toast */
    this.showToast(
      TEX_TRY_AGAIN,
      this.activeFlamingoSprite.x,
      this.activeFlamingoSprite.y + TOAST_Y_OFFSET,
    );

  }

  /* ------------------------------------------------------------------ */
  /*  Cleanup helpers                                                    */
  /* ------------------------------------------------------------------ */

  private destroyActiveFlamingo(): void {
    if (this.activeFlamingoSprite) {
      this.activeFlamingoSprite.destroy();
      this.activeFlamingoSprite = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  All matched                                                        */
  /* ------------------------------------------------------------------ */

  private handleAllMatched(): void {
    this.matchState = MatchState.Finished;

    this.spawnCelebration(this.cx, this.h / 2);

    this.notifyGameCompleted();
  }

  /* ------------------------------------------------------------------ */
  /*  Toast                                                              */
  /* ------------------------------------------------------------------ */

  private showToast(textureKey: string, x: number, y: number): void {
    const toast = this.add.image(x, y, textureKey);
    toast.setOrigin(0.5);
    toast.setDisplaySize(109 * multiplierResolution, 34 * multiplierResolution);
    toast.setDepth(TOAST_DEPTH);

    /* Phase 1: slide up */
    this.tweens.add({
      targets: toast,
      y: y - TOAST_FLOAT_OFFSET,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        /* Phase 2: hold, then fade out */
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
  /*  Celebration                                                        */
  /* ------------------------------------------------------------------ */

  private spawnCelebration(x: number, y: number): void {
    AssetLoader.generateStar(this, 'star');

    for (let i = 0; i < CELEBRATION_STAR_COUNT; i++) {
      const star = this.add.sprite(x, y, 'star');
      star.setDepth(CELEBRATION_DEPTH);
      const angle = (i / CELEBRATION_STAR_COUNT) * Math.PI * 2;
      const dist = Phaser.Math.Between(40, 90);
      this.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: { from: 1.2, to: 0.3 },
        duration: CELEBRATION_DURATION,
        ease: 'Power2',
        onComplete: () => star.destroy(),
      });
    }
  }
}
