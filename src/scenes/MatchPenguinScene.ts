/**
 * Match Penguin Mini-Game (Asset-Based Sequential Parent Matching)
 *
 * Gameplay:
 * - 3 baby penguins displayed at the bottom as choices (always visible).
 * - Parents appear ONE BY ONE at the center area.
 * - A drop-area target zone overlaps below each parent.
 * - The player drags a baby toward the drop area.
 *   Dragging creates a clone; the original dims to ~0.4 alpha.
 * - Correct: drop area hidden, child placed on parent at ~1.2 scale,
 *   parent + child slide left, next parent slides in from right.
 * - Wrong: clone destroyed, baby restored, toast shown.
 * - All 3 matched: celebration and restart option.
 */

import { BaseScene } from './BaseScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, scaleByHeight, multiplierResolution } from '../core/Config';
import { AssetLoader } from '../systems/AssetLoader';

/* ------------------------------------------------------------------ */
/*  Asset imports (resolved by Vite)                                   */
/* ------------------------------------------------------------------ */

import bgVideoUrl from '../assets/videos/MatchPenguin/Background Gameplay.mp4';
import childSelectBgUrl from '../assets/images/MatchPenguin/background-selection-child.png';
import dropAreaUrl from '../assets/images/MatchPenguin/drop-area.png';
import correctUrl from '../assets/images/MatchPenguin/correct.png';
import tryAgainUrl from '../assets/images/MatchPenguin/try-again.png';
/* Parent atlas imports (2 combined atlases, mixed Penguin-a/b/c via glob) */
const parentAtlasPngs = import.meta.glob('../assets/images/MatchPenguin/parent/Sequence/texture-*.png', { eager: true, import: 'default' }) as Record<string, string>;
const parentAtlasJsons = import.meta.glob('../assets/images/MatchPenguin/parent/Sequence/texture-*.json', { eager: true, import: 'default' }) as Record<string, object>;

/* Child atlas imports (1 combined atlas, mixed Penguin-a/b/c) */
import childAtlasPng from '../assets/images/MatchPenguin/child/Sequence/texture.png';
import childAtlasJson from '../assets/images/MatchPenguin/child/Sequence/texture.json';

/* Helper: sort glob-imported atlas pairs by texture index */
function sortedAtlasPairs(
  pngs: Record<string, string>,
  jsons: Record<string, object>,
): { png: string; json: object }[] {
  const idx = (p: string) => {
    const m = p.match(/texture-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  };
  const pngEntries = Object.entries(pngs).sort((a, b) => idx(a[0]) - idx(b[0]));
  const jsonEntries = Object.entries(jsons).sort((a, b) => idx(a[0]) - idx(b[0]));
  return pngEntries.map((e, i) => ({ png: e[1], json: jsonEntries[i][1] }));
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

enum MatchState {
  Idle,
  Dragging,
  Animating,
  Finished,
}

type PenguinId = 'a' | 'b' | 'c';

interface BabyPenguin {
  id: PenguinId;
  sprite: Phaser.GameObjects.Sprite;
  matched: boolean;
}

interface ParentPenguin {
  id: PenguinId;
  targetBabyId: PenguinId;
}

interface ActiveDrag {
  baby: BabyPenguin;
  clone: Phaser.GameObjects.Sprite;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PENGUIN_IDS: readonly PenguinId[] = ['a', 'b', 'c'];

/* Sorted parent atlas pairs */
const PARENT_ATLAS_PAIRS = sortedAtlasPairs(parentAtlasPngs, parentAtlasJsons);

/* Texture keys */
const VID_BG = 'mp-bg-video';
const TEX_CHILD_SELECT_BG = 'mp-child-select-bg';
const TEX_DROP_AREA = 'mp-drop-area';
const TEX_CORRECT = 'mp-correct';
const TEX_TRY_AGAIN = 'mp-try-again';
const TEX_PARENT_ATLAS_PREFIX = 'mp-parent-atlas-';
const TEX_CHILD_ATLAS = 'mp-child-atlas';

/* Animation keys */
const ANIM_PARENT: Record<PenguinId, string> = { a: 'mp-anim-parent-a', b: 'mp-anim-parent-b', c: 'mp-anim-parent-c' };
const ANIM_CHILD: Record<PenguinId, string> = { a: 'mp-anim-child-a', b: 'mp-anim-child-b', c: 'mp-anim-child-c' };
const PENGUIN_ANIM_FRAMERATE = 24;

/* Layout */
const PARENT_SCALE = 0.5 * multiplierResolution;
const PARENT_CENTER_Y = 380 * scaleByHeight;
const PARENT_OFFSCREEN_PADDING = 150 * multiplierResolution;
const DROP_AREA_SCALE = 0.35 * multiplierResolution;
const DROP_AREA_CENTER_Y = 520 * scaleByHeight;
const CHILD_SCALE = 0.5 * multiplierResolution;
const CHILD_ROW_Y = 740 * scaleByHeight;
const CHILD_MARGIN_X = 90 * multiplierResolution;
const CHILD_SELECT_BG_Y = 754 * scaleByHeight;
const CHILD_SELECT_BG_DISPLAY_H = 150 * scaleByHeight;

/* Depth layers (back → front) */
const DEPTH_DROP_AREA = 20;
const DEPTH_PARENT = 30;
const DEPTH_MATCHED_CHILD = 40;

/* Animation */
const SLIDE_DURATION = 500;
const SLIDE_EASE = 'Cubic.easeOut';
const SLIDE_OUT_DELAY = 200;
const SNAP_DURATION = 150;
const DRAGGING_ALPHA = 0.4;
const MATCHED_ALPHA = 0.4;
const TOAST_FLOAT_OFFSET = 40;
const TOAST_DEPTH = 500;
const TOAST_Y_OFFSET = PARENT_CENTER_Y - 480 * scaleByHeight;
const CLONE_DEPTH = 100;
const CELEBRATION_STAR_COUNT = 8;
const CELEBRATION_DURATION = 600;
const CELEBRATION_DEPTH = 200;


/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

export class MatchPenguinScene extends BaseScene {
  protected get backgroundColor(): number {
    return 0x87ceeb;
  }

  private matchState: MatchState = MatchState.Idle;
  private babies: BabyPenguin[] = [];
  private parentQueue: ParentPenguin[] = [];
  private activeParentIndex = 0;
  private activeParentSprite: Phaser.GameObjects.Sprite | null = null;
  private dropAreaSprite: Phaser.GameObjects.Image | null = null;
  private activeDrag: ActiveDrag | null = null;
  private pointerMoveHandler: ((p: Phaser.Input.Pointer) => void) | null = null;
  private pointerUpHandler: (() => void) | null = null;

  constructor() {
    super({ key: SceneKeys.MatchPenguin });
  }

  /* ------------------------------------------------------------------ */
  /*  Asset loading                                                      */
  /* ------------------------------------------------------------------ */

  preload(): void {
    super.preload();
    this.load.video(VID_BG, bgVideoUrl);
    this.load.image(TEX_CHILD_SELECT_BG, childSelectBgUrl);
    this.load.image(TEX_DROP_AREA, dropAreaUrl);
    this.load.image(TEX_CORRECT, correctUrl);
    this.load.image(TEX_TRY_AGAIN, tryAgainUrl);

    /* Parent atlases (2 combined, mixed Penguin-a/b/c) */
    PARENT_ATLAS_PAIRS.forEach((pair, i) => {
      this.load.atlas(`${TEX_PARENT_ATLAS_PREFIX}${i}`, pair.png, pair.json);
    });
    /* Child atlas (1 combined, mixed Penguin-a/b/c) */
    this.load.atlas(TEX_CHILD_ATLAS, childAtlasPng, childAtlasJson as object);
  }

  /* ------------------------------------------------------------------ */
  /*  Scene lifecycle                                                    */
  /* ------------------------------------------------------------------ */

  create(): void {
    super.create();
    this.initState();
    this.createBackground();
    this.createAnims();
    this.createChildren();
    this.buildParentQueue();
    this.spawnNextParent();
  }

  private initState(): void {
    this.matchState = MatchState.Idle;
    this.babies = [];
    this.parentQueue = [];
    this.activeParentIndex = 0;
    this.activeParentSprite = null;
    this.dropAreaSprite = null;
    this.activeDrag = null;
    this.pointerMoveHandler = null;
    this.pointerUpHandler = null;
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
      'Match the Parents',
      'Match the penguin chick to the correct adult penguin. Drag the penguin chick onto the adult to create a match.',
    );

    const selectBg = this.add.image(this.cx, CHILD_SELECT_BG_Y, TEX_CHILD_SELECT_BG);
    selectBg.setDisplaySize(GAME_WIDTH - 50, CHILD_SELECT_BG_DISPLAY_H);
  }

  /* ------------------------------------------------------------------ */
  /*  Animations                                                         */
  /* ------------------------------------------------------------------ */

  /** Collect frames from the combined parent atlases, filtered by name, sorted globally by frame number. */
  private buildParentFrames(filter: string): Phaser.Types.Animations.AnimationFrame[] {
    const collected: { key: string; frame: string }[] = [];
    for (let i = 0; i < PARENT_ATLAS_PAIRS.length; i++) {
      const key = `${TEX_PARENT_ATLAS_PREFIX}${i}`;
      const names = this.textures.get(key).getFrameNames()
        .filter((n) => n !== '__BASE' && n.includes(filter));
      names.forEach((name) => collected.push({ key, frame: name }));
    }
    collected.sort((a, b) => {
      const numA = parseInt(a.frame.match(/(\d+)\.png$/)?.[1] ?? '0', 10);
      const numB = parseInt(b.frame.match(/(\d+)\.png$/)?.[1] ?? '0', 10);
      return numA - numB;
    });
    return collected;
  }

  private createAnims(): void {
    for (const id of PENGUIN_IDS) {
      /* Parent animation (filtered from combined atlases) */
      this.anims.create({
        key: ANIM_PARENT[id],
        frames: this.buildParentFrames(`Penguin-${id}`),
        frameRate: PENGUIN_ANIM_FRAMERATE,
        repeat: -1,
      });

      /* Child animation (filtered from combined atlas, sorted by frame number) */
      const childNames = this.textures.get(TEX_CHILD_ATLAS).getFrameNames()
        .filter((n) => n !== '__BASE' && n.includes(`Penguin-${id}`))
        .sort((a, b) => {
          const numA = parseInt(a.match(/(\d+)\.png$/)?.[1] ?? '0', 10);
          const numB = parseInt(b.match(/(\d+)\.png$/)?.[1] ?? '0', 10);
          return numA - numB;
        });
      const childFrames = childNames.map((name) => ({ key: TEX_CHILD_ATLAS, frame: name }));
      this.anims.create({
        key: ANIM_CHILD[id],
        frames: childFrames,
        frameRate: PENGUIN_ANIM_FRAMERATE,
        repeat: -1,
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Children (always-visible choices)                                  */
  /* ------------------------------------------------------------------ */

  private createChildren(): void {
    const shuffled = Phaser.Utils.Array.Shuffle([...PENGUIN_IDS]) as PenguinId[];

    const positions = [
      { x: CHILD_MARGIN_X, y: CHILD_ROW_Y },
      { x: GAME_WIDTH / 2, y: CHILD_ROW_Y },
      { x: GAME_WIDTH - CHILD_MARGIN_X, y: CHILD_ROW_Y },
    ];

    this.babies = shuffled.map((id, i) => {
      const pos = positions[i];
      const sprite = this.add.sprite(pos.x, pos.y, TEX_CHILD_ATLAS);
      sprite.setOrigin(0.5);
      sprite.setScale(CHILD_SCALE);
      sprite.setInteractive({ useHandCursor: true });
      sprite.play(ANIM_CHILD[id]);

      const baby: BabyPenguin = { id, sprite, matched: false };

      sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.handleDragStart(baby, pointer);
      });

      return baby;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Parent queue                                                       */
  /* ------------------------------------------------------------------ */

  private buildParentQueue(): void {
    const order = Phaser.Utils.Array.Shuffle([...PENGUIN_IDS]) as PenguinId[];

    this.parentQueue = order.map((id) => ({
      id,
      targetBabyId: id,
    }));
  }

  /* ------------------------------------------------------------------ */
  /*  Parent + drop-area spawning                                        */
  /* ------------------------------------------------------------------ */

  private spawnNextParent(): void {
    if (this.activeParentIndex >= PENGUIN_IDS.length) {
      this.handleAllMatched();
      return;
    }

    const parentData = this.parentQueue[this.activeParentIndex];

    this.matchState = MatchState.Animating;

    const startX = GAME_WIDTH + PARENT_OFFSCREEN_PADDING;

    /* Drop-area: placed at center immediately (does NOT follow parent) */
    const dropArea = this.add.image(this.cx, DROP_AREA_CENTER_Y, TEX_DROP_AREA);
    dropArea.setOrigin(0.5);
    dropArea.setScale(DROP_AREA_SCALE);
    dropArea.setDepth(DEPTH_DROP_AREA);
    dropArea.setAlpha(0);
    this.dropAreaSprite = dropArea;

    /* Parent: slides in from right, stands on ice */
    const parentSprite = this.add.sprite(startX, PARENT_CENTER_Y, `${TEX_PARENT_ATLAS_PREFIX}0`);
    parentSprite.setOrigin(0.5);
    parentSprite.setScale(PARENT_SCALE);
    parentSprite.setDepth(DEPTH_PARENT);
    parentSprite.play(ANIM_PARENT[parentData.id]);
    this.activeParentSprite = parentSprite;

    /* Slide in parent */
    this.tweens.add({
      targets: parentSprite,
      x: this.cx,
      duration: SLIDE_DURATION,
      ease: SLIDE_EASE,
    });

    /* Fade in drop-area at center */
    this.tweens.add({
      targets: dropArea,
      alpha: 1,
      duration: SLIDE_DURATION,
      ease: SLIDE_EASE,
      onComplete: () => {
        this.matchState = MatchState.Idle;
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Drop-area hit test                                                 */
  /* ------------------------------------------------------------------ */

  private isOverDropArea(x: number, y: number): boolean {
    if (!this.dropAreaSprite || !this.dropAreaSprite.visible) return false;
    return this.dropAreaSprite.getBounds().contains(x, y);
  }

  /* ------------------------------------------------------------------ */
  /*  Drag handling (clone-based)                                        */
  /* ------------------------------------------------------------------ */

  private handleDragStart(baby: BabyPenguin, pointer: Phaser.Input.Pointer): void {
    if (this.matchState !== MatchState.Idle) return;
    if (baby.matched) return;

    this.matchState = MatchState.Dragging;

    baby.sprite.setAlpha(DRAGGING_ALPHA);

    const clone = this.add.sprite(pointer.x, pointer.y, TEX_CHILD_ATLAS);
    clone.setOrigin(0.5);
    clone.setScale(CHILD_SCALE * 1.8);
    clone.setDepth(CLONE_DEPTH);
    clone.play(ANIM_CHILD[baby.id]);

    this.activeDrag = { baby, clone };

    this.pointerMoveHandler = (p: Phaser.Input.Pointer) => {
      this.onPointerMove(p);
    };
    this.pointerUpHandler = () => {
      this.onPointerUp();
    };

    this.input.on('pointermove', this.pointerMoveHandler);
    this.input.on('pointerup', this.pointerUpHandler);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.activeDrag) return;
    this.activeDrag.clone.x = pointer.x;
    this.activeDrag.clone.y = pointer.y;
  }

  private onPointerUp(): void {
    if (!this.activeDrag) return;
    this.removePointerListeners();
    this.handleDrop();
  }

  private removePointerListeners(): void {
    if (this.pointerMoveHandler) {
      this.input.off('pointermove', this.pointerMoveHandler);
      this.pointerMoveHandler = null;
    }
    if (this.pointerUpHandler) {
      this.input.off('pointerup', this.pointerUpHandler);
      this.pointerUpHandler = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Drop detection                                                     */
  /* ------------------------------------------------------------------ */

  private handleDrop(): void {
    if (!this.activeDrag || !this.activeParentSprite) return;

    const { baby, clone } = this.activeDrag;
    const parentData = this.parentQueue[this.activeParentIndex];

    if (this.isOverDropArea(clone.x, clone.y)) {
      if (baby.id === parentData.targetBabyId) {
        this.handleCorrectMatch(baby, clone);
      } else {
        this.handleWrongMatch(baby, clone);
      }
    } else {
      this.handleMiss(baby, clone);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Match handlers                                                     */
  /* ------------------------------------------------------------------ */

  private handleCorrectMatch(
    baby: BabyPenguin,
    clone: Phaser.GameObjects.Sprite,
  ): void {
    const parent = this.activeParentSprite;
    if (!parent) return;

    this.matchState = MatchState.Animating;
    baby.matched = true;
    baby.sprite.setAlpha(MATCHED_ALPHA);
    baby.sprite.disableInteractive();
    this.activeDrag = null;

    /* 1. Hide drop-area & ice → only parent + child visible */
    if (this.dropAreaSprite) {
      this.dropAreaSprite.setVisible(false);
    }
    /* 2. Toast */
    this.showToast(TEX_CORRECT, parent.x, parent.y + TOAST_Y_OFFSET);

    /* 3. Snap clone to drop-area position at 1.8× child scale */
    clone.setScale(CHILD_SCALE * 1.8);
    clone.setDepth(DEPTH_MATCHED_CHILD);

    this.tweens.add({
      targets: clone,
      x: parent.x,
      y: DROP_AREA_CENTER_Y,
      duration: SNAP_DURATION,
      ease: 'Back.easeOut',
      onComplete: () => {
        /* 4. Celebration */
        this.spawnCelebration(parent.x, parent.y);

        /* 5. Slide parent + matched child left */
        this.tweens.add({
          targets: [parent, clone],
          x: -parent.displayWidth,
          duration: SLIDE_DURATION,
          ease: SLIDE_EASE,
          delay: SLIDE_OUT_DELAY,
          onComplete: () => {
            /* 6. Cleanup & next */
            this.destroyActiveParent();
            clone.destroy();
            this.activeParentIndex++;
            this.spawnNextParent();
          },
        });
      },
    });
  }

  private handleWrongMatch(
    baby: BabyPenguin,
    clone: Phaser.GameObjects.Sprite,
  ): void {
    baby.sprite.setAlpha(1);
    clone.destroy();
    this.activeDrag = null;
    this.matchState = MatchState.Idle;

    if (this.activeParentSprite) {
      this.showToast(TEX_TRY_AGAIN, this.activeParentSprite.x, this.activeParentSprite.y + TOAST_Y_OFFSET);
    }
  }

  private handleMiss(baby: BabyPenguin, clone: Phaser.GameObjects.Sprite): void {
    baby.sprite.setAlpha(1);
    clone.destroy();
    this.activeDrag = null;
    this.matchState = MatchState.Idle;
  }

  /* ------------------------------------------------------------------ */
  /*  Cleanup helpers                                                    */
  /* ------------------------------------------------------------------ */

  private destroyActiveParent(): void {
    if (this.activeParentSprite) {
      this.activeParentSprite.destroy();
      this.activeParentSprite = null;
    }
    if (this.dropAreaSprite) {
      this.dropAreaSprite.destroy();
      this.dropAreaSprite = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  All matched                                                        */
  /* ------------------------------------------------------------------ */

  private handleAllMatched(): void {
    this.matchState = MatchState.Finished;

    this.spawnCelebration(this.cx, this.h / 2);
    this.showFloatingText(this.cx, this.h / 2 - 40, 'All Matched!', '#ffffff');

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
