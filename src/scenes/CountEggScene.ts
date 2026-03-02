/**
 * Count Egg Mini-Game
 *
 * Gameplay:
 * - Background image with a bird illustration in the centre.
 * - Tap "Submit Answer" to open the overlay.
 * - Inside the overlay: two rows of letter blocks (replacing the old input field),
 *   a header, a Cancel button, and a Submit button.
 * - Pre-filled blocks (from DEFAULT_BLOCKS) are shown immediately and are read-only.
 * - Empty blocks are filled one-by-one in sequence as the user types.
 * - User-filled blocks are highlighted yellow.
 * - The overlay Submit button is disabled until every empty block is filled.
 * - On submit:
 *     correct → all blocks turn green → overlay closes → "Well Done!" popup.
 *     wrong   → all blocks flash red, then revert to yellow so the user can retry.
 */

import { BaseScene } from './BaseScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, multiplierResolution } from '../core/Config';

/* ------------------------------------------------------------------ */
/*  Asset imports                                                       */
/* ------------------------------------------------------------------ */

import bgVideoUrl from '../assets/videos/CountEgg/Background Gameplay.mp4';
import submitBtnUrl from '../assets/images/CountEgg/submit-button.png';
import cancelBtnUrl from '../assets/images/CountEgg/input/cancel-button.png';
import overlaySubmitUrl from '../assets/images/CountEgg/input/submit-button.png';
import charHolderUrl from '../assets/images/CountEgg/input/character-holder.png';
import headerInputUrl from '../assets/images/CountEgg/input/header-input.png';
import correctSfxUrl from '../assets/audio/Correct-SFX.mp3';
import wrongSfxUrl from '../assets/audio/Wrong-SFX.mp3';

/* ------------------------------------------------------------------ */
/*  Texture keys                                                        */
/* ------------------------------------------------------------------ */

const VID_BG = 'ce-bg-video';
const TEX_SUBMIT_BTN = 'ce-submit-btn';
const TEX_CANCEL_BTN = 'ce-cancel-btn';
const TEX_OVERLAY_SUBMIT = 'ce-overlay-submit';
const TEX_CHAR_HOLDER = 'ce-char-holder';
const TEX_HEADER_INPUT = 'ce-header-input';
const SFX_CORRECT = 'ce-sfx-correct';
const SFX_WRONG = 'ce-sfx-wrong';

/* ------------------------------------------------------------------ */
/*  Game data                                                           */
/* ------------------------------------------------------------------ */

/**
 * Each entry is a single-element array:
 *   ["X"]  – pre-filled letter (read-only)
 *   [""]   – empty slot the user must fill
 *   [" "]  – row separator (starts a new row)
 *
 * Example (DEFAULT_CORRECT_ANSWER = "BEE HUMMINGBIRD"):
 *   Row 1:  _  _  E          ← indices 0-2
 *   Row 2:  _  U  M  M  _  _  G  _  _  _  D   ← indices 4-14
 */
const DEFAULT_BLOCKS: string[][] = [
  [""], [""], ["E"], [" "],
  [""], ["U"], ["M"], ["M"], [""], [""], ["G"], [""], [""], [""], ["D"],
];

const DEFAULT_CORRECT_ANSWER = "BEE HUMMINGBIRD";

/* ------------------------------------------------------------------ */
/*  Layout constants                                                    */
/* ------------------------------------------------------------------ */

/* Bird (main screen) */
const BIRD_SCALE = 0.25 * multiplierResolution;
const BIRD_CENTER_Y = 420 * multiplierResolution;

/* "Submit Answer" button (main screen) */
const SUBMIT_BTN_SCALE = 0.25 * multiplierResolution;
const SUBMIT_BTN_Y = GAME_HEIGHT - 100;

/* Overlay */
const OVERLAY_DEPTH = 900;
const HEADER_Y = 100;
const HEADER_SCALE = 0.30 * multiplierResolution;

/* Block grid — auto-sized so MAX_ROW_BLOCKS fit in one row */
const MAX_ROW_BLOCKS = 11;
const SIDE_MARGIN = Math.floor(GAME_WIDTH * 0.05);
const BLOCK_GAP = Math.floor(GAME_WIDTH * 0.013);
const BLOCK_SIZE = Math.floor(
  (GAME_WIDTH - 2 * SIDE_MARGIN - BLOCK_GAP * (MAX_ROW_BLOCKS - 1)) / MAX_ROW_BLOCKS,
);
const BLOCK_HEIGHT = Math.floor(BLOCK_SIZE * 1.5);  // display height of each block
const BLOCK_ROW_GAP = Math.floor(BLOCK_HEIGHT * 0.2);
const BLOCK_FONT_SIZE = Math.floor(BLOCK_SIZE * 0.50);

/* Row Y positions inside the overlay */
const OVERLAY_ROW1_Y = Math.floor(GAME_HEIGHT * 0.35);
const OVERLAY_ROW2_Y = OVERLAY_ROW1_Y + BLOCK_HEIGHT + BLOCK_ROW_GAP;

/* Cancel / Submit buttons inside the overlay */
const ACTION_BTN_SCALE = 0.25 * multiplierResolution;
const ACTION_BTN_Y = OVERLAY_ROW2_Y + Math.floor(BLOCK_HEIGHT * 0.5) + 90;
const ACTION_BTN_GAP = 20 * multiplierResolution;

/* Tints */
const TINT_USER = 0xFFE066; // yellow — user-typed
const TINT_CORRECT = 0x5DBF75; // green  — correct answer
const TINT_WRONG = 0xFF6B6B; // red    — wrong answer

/* ------------------------------------------------------------------ */
/*  Internal types                                                      */
/* ------------------------------------------------------------------ */

interface BlockState {
  char: string;         // current character; '' = empty, ' ' = row-break spacer
  isPreFilled: boolean; // true → shown on load, cannot be edited
}

interface BlockView {
  bg: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

/* ------------------------------------------------------------------ */
/*  Scene                                                               */
/* ------------------------------------------------------------------ */

export class CountEggScene extends BaseScene {
  protected get backgroundColor(): number { return 0xf5f0e1; }

  /* Overlay */
  private overlayContainer: Phaser.GameObjects.Container | null = null;
  private overlaySubmitBtn: Phaser.GameObjects.Image | null = null;

  /* Resolved game config (from query params or defaults) */
  private resolvedBlocks: string[][] = DEFAULT_BLOCKS;
  private resolvedAnswer: string = DEFAULT_CORRECT_ANSWER;

  /* Block data */
  private states: BlockState[] = [];
  private views: (BlockView | null)[] = []; // null for spacer entries
  private fillIdx = 0;                        // next empty user-fillable slot (-1 = all done)

  /* Keyboard */
  private kbd: HTMLInputElement | null = null;

  constructor() {
    super({ key: SceneKeys.CountEgg });
  }

  /* ---------------------------------------------------------------- */
  /*  Lifecycle                                                         */
  /* ---------------------------------------------------------------- */

  preload(): void {
    super.preload();
    this.load.video(VID_BG, bgVideoUrl);
    this.load.image(TEX_SUBMIT_BTN, submitBtnUrl);
    this.load.image(TEX_CANCEL_BTN, cancelBtnUrl);
    this.load.image(TEX_OVERLAY_SUBMIT, overlaySubmitUrl);
    this.load.image(TEX_CHAR_HOLDER, charHolderUrl);
    this.load.image(TEX_HEADER_INPUT, headerInputUrl);
    this.load.audio(SFX_CORRECT, correctSfxUrl);
    this.load.audio(SFX_WRONG, wrongSfxUrl);
  }

  create(): void {
    super.create();
    this.overlayContainer = null;
    this.overlaySubmitBtn = null;
    this.states = [];
    this.views = [];
    this.fillIdx = 0;
    this.kbd = null;

    /* Resolve blocks & answer from query params (fall back to defaults) */
    const blocksParam = this.getQueryParam('blocks');
    const answerParam = this.getQueryParam('answer');
    this.resolvedBlocks = blocksParam ? this.parseBlocksParam(blocksParam) : DEFAULT_BLOCKS;
    this.resolvedAnswer = answerParam ?? DEFAULT_CORRECT_ANSWER;

    this.createStaticUI();

    /* Cleanup keyboard when scene stops */
    this.events.once('shutdown', () => this.removeKeyboard());
  }

  /* ---------------------------------------------------------------- */
  /*  Query-param helpers                                               */
  /* ---------------------------------------------------------------- */

  /**
   * Parses the `blocks` query param into a string[][] compatible with DEFAULT_BLOCKS.
   *
   * Encoding rules:
   *   _  →  [""]   empty slot (user fills)
   *   |  →  [" "]  row separator (new line)
   *   A–Z / a–z  →  ["X"]  pre-filled letter (uppercased)
   *
   * Example: "__E|_UMM__G___D"
   *   → [[""],[""],["E"],[" "],[""],["U"],["M"],["M"],[""],[""],["G"],[""],[""],[""],["D"]]
   */
  private parseBlocksParam(param: string): string[][] {
    return param.split('').map(ch => {
      if (ch === '_') return [''];
      if (ch === '|') return [' '];
      return [ch.toUpperCase()];
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Main screen                                                       */
  /* ---------------------------------------------------------------- */

  private createStaticUI(): void {
    /* Background video */
    const bg = this.add.video(0, 0, VID_BG);
    bg.setOrigin(0, 0);
    bg.setLoop(true);
    if (bg.video) { bg.video.muted = true; bg.video.playsInline = true; }
    bg.play();
    bg.once('play', () => { bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT); });

    this.createInstructionUI(
      'Spot The Smallest',
      'Find the smallest white bird egg at Egg Discovery Hub. Which bird does it belong to?',
    );

    /* "Submit Answer" button */
    this.createImageButton(
      this.cx, SUBMIT_BTN_Y,
      TEX_SUBMIT_BTN, SUBMIT_BTN_SCALE,
      () => this.openOverlay(),
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Overlay — open / close                                            */
  /* ---------------------------------------------------------------- */

  private openOverlay(): void {
    if (this.overlayContainer) return;

    /* Reset block state fresh each time */
    this.states = this.resolvedBlocks.map(entry => ({
      char: entry[0],
      isPreFilled: entry[0] !== '' && entry[0] !== ' ',
    }));
    this.views = new Array(this.states.length).fill(null);
    this.fillIdx = this.nextFillIdx(0);

    const container = this.add.container(0, 0).setDepth(OVERLAY_DEPTH);

    /* Dimmed backdrop */
    container.add(
      this.add.graphics()
        .fillStyle(0x000000, 0.8)
        .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT),
    );

    /* Blocker zone (swallows taps behind overlay) */
    container.add(
      this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)
        .setInteractive(),
    );

    this.setBackButtonEnabled(false);

    this.createOverlayHeader(container);
    this.buildBlockGrid(container);
    this.createActionButtons(container);

    /* Highlight the first empty block as cursor */
    this.highlightCursor();

    /* Fade in */
    container.setAlpha(0);
    this.tweens.add({
      targets: container, alpha: 1, duration: 200, ease: 'Power2',
    });

    this.overlayContainer = container;
    this.attachKeyboard();
    /* Focus immediately inside the user-gesture call stack (pointerup)
       so mobile browsers allow the virtual keyboard to open. */
    this.focusKbd();
  }

  private closeOverlay(): void {
    if (!this.overlayContainer) return;

    this.setBackButtonEnabled(true);
    this.removeKeyboard();

    const container = this.overlayContainer;
    this.overlayContainer = null;
    this.overlaySubmitBtn = null;

    this.tweens.add({
      targets: container, alpha: 0, duration: 150, ease: 'Power2',
      onComplete: () => container.destroy(),
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Overlay — header                                                  */
  /* ---------------------------------------------------------------- */

  private createOverlayHeader(container: Phaser.GameObjects.Container): void {
    container.add(
      this.add.image(this.cx, HEADER_Y, TEX_HEADER_INPUT)
        .setOrigin(0.5)
        .setScale(HEADER_SCALE),
    );

    container.add(
      this.add.text(
        this.cx, HEADER_Y,
        'Find the smallest white bird egg at Egg Discovery\nHub. Which bird does it belong to?',
        {
          fontFamily: "'MandaiValueSerif'",
          fontSize: '14px',
          color: '#ffffff',
          align: 'center',
          lineSpacing: 6,
        },
      ).setOrigin(0.5).setScale(multiplierResolution).setResolution(2),
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Overlay — block grid                                              */
  /* ---------------------------------------------------------------- */

  private buildBlockGrid(container: Phaser.GameObjects.Container): void {
    /* Split flat array into rows at every spacer entry */
    const rows: number[][] = [];
    let row: number[] = [];
    for (let i = 0; i < this.states.length; i++) {
      if (this.states[i].char === ' ') { rows.push(row); row = []; }
      else { row.push(i); }
    }
    if (row.length) rows.push(row);

    const rowYs = [OVERLAY_ROW1_Y, OVERLAY_ROW2_Y];

    rows.forEach((indices, r) => {
      const y = rowYs[r] ?? OVERLAY_ROW2_Y + (r - 1) * (BLOCK_SIZE + BLOCK_ROW_GAP);
      const total = indices.length * BLOCK_SIZE + (indices.length - 1) * BLOCK_GAP;
      const x0 = (GAME_WIDTH - total) / 2 + BLOCK_SIZE / 2;

      indices.forEach((idx, c) => {
        const x = x0 + c * (BLOCK_SIZE + BLOCK_GAP);

        const bg = this.add.image(x, y, TEX_CHAR_HOLDER)
          .setOrigin(0.5)
          .setDisplaySize(BLOCK_SIZE, BLOCK_HEIGHT);

        const label = this.add.text(x, y, this.states[idx].char, {
          fontFamily: "'MandaiValueSerif'",
          fontSize: `${BLOCK_FONT_SIZE}px`,
          color: '#FFFFFF',
        }).setOrigin(0.5);

        /* Tapping an empty block focuses the keyboard */
        if (!this.states[idx].isPreFilled) {
          bg.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.focusKbd());
        }

        container.add([bg, label]);
        this.views[idx] = { bg, label };
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Overlay — Cancel / Submit buttons                                 */
  /* ---------------------------------------------------------------- */

  private createActionButtons(container: Phaser.GameObjects.Container): void {
    const cancelTex = this.textures.get(TEX_CANCEL_BTN);
    const cancelW = cancelTex.getSourceImage().width * ACTION_BTN_SCALE;

    const submitTex = this.textures.get(TEX_OVERLAY_SUBMIT);
    const submitW = submitTex.getSourceImage().width * ACTION_BTN_SCALE;

    const totalW = cancelW + submitW + ACTION_BTN_GAP;
    const startX = (GAME_WIDTH - totalW) / 2;

    /* Cancel */
    container.add(
      this.createImageButton(
        startX + cancelW / 2, ACTION_BTN_Y,
        TEX_CANCEL_BTN, ACTION_BTN_SCALE,
        () => this.closeOverlay(),
      ),
    );

    /* Submit (starts disabled) */
    const submitBtn = this.createImageButton(
      startX + cancelW + ACTION_BTN_GAP + submitW / 2, ACTION_BTN_Y,
      TEX_OVERLAY_SUBMIT, ACTION_BTN_SCALE,
      () => this.handleSubmit(),
    );
    container.add(submitBtn);
    this.overlaySubmitBtn = submitBtn;

    this.syncSubmitState();
  }

  /* ---------------------------------------------------------------- */
  /*  Overlay Submit button state                                       */
  /* ---------------------------------------------------------------- */

  private syncSubmitState(): void {
    if (!this.overlaySubmitBtn) return;
    const ready = this.isAllFilled();
    this.overlaySubmitBtn.setAlpha(ready ? 1 : 0.4);
    if (ready) {
      this.overlaySubmitBtn.setInteractive({ useHandCursor: true });
    } else {
      this.overlaySubmitBtn.removeInteractive();
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Keyboard capture (hidden HTML input)                              */
  /* ---------------------------------------------------------------- */

  private attachKeyboard(): void {
    const el = document.createElement('input');
    el.type = 'text';
    el.autocomplete = 'off';
    el.autocapitalize = 'characters';
    Object.assign(el.style, {
      position: 'fixed', bottom: '0', left: '50%',
      width: '1px', height: '1px',
      opacity: '0.01', zIndex: '-1',
      fontSize: '16px',       // prevents iOS zoom on focus
    });

    /* Physical / desktop keyboard */
    el.addEventListener('keydown', (e) => {
      e.preventDefault();
      if (e.key === 'Backspace') {
        this.onBackspace();
      } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        this.onChar(e.key.toUpperCase());
      }
    });

    /* Virtual / mobile keyboard fires 'input' for letters */
    el.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.value) {
        const ch = t.value[t.value.length - 1].toUpperCase();
        if (/[A-Z]/.test(ch)) this.onChar(ch);
        t.value = '';
      }
    });

    document.body.appendChild(el);
    this.kbd = el;
  }

  private removeKeyboard(): void {
    if (this.kbd) { this.kbd.remove(); this.kbd = null; }
  }

  private focusKbd(): void { this.kbd?.focus(); }

  /* ---------------------------------------------------------------- */
  /*  Input handlers                                                    */
  /* ---------------------------------------------------------------- */

  private onChar(ch: string): void {
    if (this.fillIdx === -1) return; // all slots filled

    /* Fill current block — no tint (normal) */
    this.states[this.fillIdx].char = ch;
    this.paintBlock(this.fillIdx, 0);

    /* Advance cursor */
    this.fillIdx = this.nextFillIdx(this.fillIdx + 1);
    this.highlightCursor();
    this.syncSubmitState();
  }

  private onBackspace(): void {
    /* Clear cursor highlight before moving */
    this.clearCursorHighlight();

    const target = this.prevFilledIdx(
      this.fillIdx === -1 ? this.states.length : this.fillIdx,
    );
    if (target === -1) return;

    this.states[target].char = '';
    this.paintBlock(target, 0);
    this.fillIdx = target;
    this.highlightCursor();
    this.syncSubmitState();
  }

  /* ---------------------------------------------------------------- */
  /*  Block visual helpers                                              */
  /* ---------------------------------------------------------------- */

  /** Highlight the current cursor block (fillIdx) with yellow. */
  private highlightCursor(): void {
    if (this.fillIdx === -1) return;
    const v = this.views[this.fillIdx];
    if (v) v.bg.setTint(TINT_USER);
  }

  /** Remove yellow highlight from the current cursor block. */
  private clearCursorHighlight(): void {
    if (this.fillIdx === -1) return;
    const v = this.views[this.fillIdx];
    if (v) v.bg.clearTint();
  }

  /** tint = 0 → clearTint (default appearance) */
  private paintBlock(idx: number, tint: number): void {
    const v = this.views[idx];
    if (!v) return;
    v.label.setText(this.states[idx].char);
    if (tint === 0) v.bg.clearTint();
    else v.bg.setTint(tint);
  }

  private paintAllBlocks(tint: number): void {
    this.states.forEach((s, i) => {
      if (s.char !== ' ') this.paintBlock(i, tint);
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Index helpers                                                     */
  /* ---------------------------------------------------------------- */

  /** First user-fillable empty slot at or after `from`; -1 if none. */
  private nextFillIdx(from: number): number {
    for (let i = from; i < this.states.length; i++) {
      const s = this.states[i];
      if (!s.isPreFilled && s.char === '') return i;
    }
    return -1;
  }

  /** Last user-filled slot strictly before `before`; -1 if none. */
  private prevFilledIdx(before: number): number {
    for (let i = before - 1; i >= 0; i--) {
      const s = this.states[i];
      if (!s.isPreFilled && s.char !== '' && s.char !== ' ') return i;
    }
    return -1;
  }

  private isAllFilled(): boolean {
    return this.states.every(s => s.isPreFilled || s.char === ' ' || s.char !== '');
  }

  /** Concatenate all chars; spacer entries become a space character. */
  private assembleAnswer(): string {
    return this.states.map(s => (s.char === ' ' ? ' ' : s.char)).join('');
  }

  /* ---------------------------------------------------------------- */
  /*  Submit                                                            */
  /* ---------------------------------------------------------------- */

  private handleSubmit(): void {
    const answer = this.assembleAnswer();
    if (answer === this.resolvedAnswer) {
      this.handleCorrectAnswer();
    } else {
      this.handleWrongAnswer();
    }
  }

  private handleCorrectAnswer(): void {
    this.sound.play(SFX_CORRECT);
    /* All blocks → green, then close overlay and show "Well Done!" */
    this.paintAllBlocks(TINT_CORRECT);
    this.time.delayedCall(400, () => {
      this.closeOverlay();
      this.notifyGameCompleted(300);
    });
  }

  private handleWrongAnswer(): void {
    this.sound.play(SFX_WRONG);
    /* All blocks → red, then revert to normal and re-highlight cursor */
    this.paintAllBlocks(TINT_WRONG);
    this.time.delayedCall(700, () => {
      this.states.forEach((s, i) => {
        if (s.char !== ' ') this.paintBlock(i, 0);
      });
      this.highlightCursor();
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Reusable image button helper                                      */
  /* ---------------------------------------------------------------- */

  private createImageButton(
    x: number, y: number,
    textureKey: string, scale: number,
    onClick: () => void,
  ): Phaser.GameObjects.Image {
    const btn = this.add.image(x, y, textureKey)
      .setOrigin(0.5)
      .setScale(scale)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setTint(0xdddddd));
    btn.on('pointerout', () => { btn.clearTint(); btn.setScale(scale); });
    btn.on('pointerdown', () => btn.setScale(scale * 0.95));
    btn.on('pointerup', () => { btn.setScale(scale); onClick(); });

    return btn;
  }
}
