/**
 * Count Egg Mini-Game
 *
 * Gameplay:
 * - A background image with an illustration in the center.
 * - A "Submit Answer" button at the bottom opens an overlay.
 * - The overlay contains:
 *   - An input field displaying the typed number.
 *   - "Cancel" and "Submit" buttons.
 *   - A virtual numeric keyboard (0-9 + backspace).
 * - On submit: if the answer matches the correct number, show "Well Done!" popup.
 *   If wrong, the input field background flashes red.
 */

import { BaseScene } from './BaseScene';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../core/Config';

/* ------------------------------------------------------------------ */
/*  Asset imports (resolved by Vite)                                   */
/* ------------------------------------------------------------------ */

import bgUrl from '../assets/images/CountEgg/background.png';
import birdUrl from '../assets/images/CountEgg/bird.png';
import submitBtnUrl from '../assets/images/CountEgg/submit-button.png';
import keyboardBgUrl from '../assets/images/CountEgg/input/background-keyboard.png';
import keyboardBtnUrl from '../assets/images/CountEgg/input/button-keyboard.png';
import backspaceIconUrl from '../assets/images/CountEgg/input/Backspace.png';
import cancelBtnUrl from '../assets/images/CountEgg/input/cancel-button.png';
import overlaySubmitBtnUrl from '../assets/images/CountEgg/input/submit-button.png';
import inputFieldUrl from '../assets/images/CountEgg/input/inputfield.png';
import headerInputUrl from '../assets/images/CountEgg/input/header-input.png';

/* ------------------------------------------------------------------ */
/*  Texture keys                                                       */
/* ------------------------------------------------------------------ */

const TEX_BG = 'ce-bg';
const TEX_BIRD = 'ce-bird';
const TEX_SUBMIT_BTN = 'ce-submit-btn';
const TEX_KEYBOARD_BG = 'ce-keyboard-bg';
const TEX_KEYBOARD_BTN = 'ce-keyboard-btn';
const TEX_BACKSPACE_ICON = 'ce-backspace-icon';
const TEX_CANCEL_BTN = 'ce-cancel-btn';
const TEX_OVERLAY_SUBMIT_BTN = 'ce-overlay-submit-btn';
const TEX_INPUT_FIELD = 'ce-input-field';
const TEX_HEADER_INPUT = 'ce-header-input';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_CORRECT_ANSWER = '4';

/* Layout */
const BIRD_SCALE = 0.25;
const BIRD_CENTER_Y = 420;
const SUBMIT_BTN_SCALE = 0.25;
const SUBMIT_BTN_Y = 750;

/* Overlay */
const OVERLAY_DEPTH = 900;

/* Header */
const HEADER_Y = 80;
const HEADER_SCALE = 0.30;

/* Input field - positioned above keyboard */
const INPUT_FIELD_SCALE = 0.25;
const INPUT_Y = 420;
const INPUT_FONT_SIZE = 28;
const INPUT_MAX_LENGTH = 10;

/* Action buttons row */
const ACTION_BTN_SCALE = 0.25;
const ACTION_BTN_Y = INPUT_Y + 80;
const ACTION_BTN_GAP = 20;

/* Keyboard */
const KEYBOARD_ROWS = 4;
const KEYBOARD_COLS = 3;
const KEY_BTN_SCALE = 0.25;
const KEY_GAP_X = 8;
const KEY_GAP_Y = 8;
const KEYBOARD_PADDING_TOP = 30;
const KEYBOARD_PADDING_BOTTOM = 30;

/* Error flash */
const ERROR_FLASH_DURATION = 600;

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

export class CountEggScene extends BaseScene {
  protected get backgroundColor(): number {
    return 0xf5f0e1;
  }

  private overlayContainer: Phaser.GameObjects.Container | null = null;
  private inputValue = '';
  private inputDisplayText: Phaser.GameObjects.Text | null = null;
  private inputFieldImage: Phaser.GameObjects.Image | null = null;
  private isErrorFlashing = false;
  private correctAnswer: string = DEFAULT_CORRECT_ANSWER;

  constructor() {
    super({ key: SceneKeys.CountEgg });
  }

  /* ------------------------------------------------------------------ */
  /*  Asset loading                                                      */
  /* ------------------------------------------------------------------ */

  preload(): void {
    this.load.image(TEX_BG, bgUrl);
    this.load.image(TEX_BIRD, birdUrl);
    this.load.image(TEX_SUBMIT_BTN, submitBtnUrl);
    this.load.image(TEX_KEYBOARD_BG, keyboardBgUrl);
    this.load.image(TEX_KEYBOARD_BTN, keyboardBtnUrl);
    this.load.image(TEX_BACKSPACE_ICON, backspaceIconUrl);
    this.load.image(TEX_CANCEL_BTN, cancelBtnUrl);
    this.load.image(TEX_OVERLAY_SUBMIT_BTN, overlaySubmitBtnUrl);
    this.load.image(TEX_INPUT_FIELD, inputFieldUrl);
    this.load.image(TEX_HEADER_INPUT, headerInputUrl);
  }

  /* ------------------------------------------------------------------ */
  /*  Scene lifecycle                                                    */
  /* ------------------------------------------------------------------ */

  create(): void {
    super.create();
    this.inputValue = '';
    this.overlayContainer = null;
    this.inputDisplayText = null;
    this.inputFieldImage = null;
    this.isErrorFlashing = false;

    /* Read correct answer from query param, default to DEFAULT_CORRECT_ANSWER */
    this.correctAnswer = this.getQueryParam('total_egg') || DEFAULT_CORRECT_ANSWER;

    this.createStaticUI();
  }

  /* ------------------------------------------------------------------ */
  /*  Static UI                                                          */
  /* ------------------------------------------------------------------ */

  private createStaticUI(): void {
    /* Background image */
    const bg = this.add.image(0, 0, TEX_BG);
    bg.setOrigin(0, 0);
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    this.createInstructionUI(
      'Count the Eggs',
      'Count all the white eggs in the discovery hub and submit your answer here.',
    );

    /* Bird image in center */
    this.createBirdImage();

    /* Submit Answer button */
    this.createSubmitButton();
  }

  /* ------------------------------------------------------------------ */
  /*  Bird image                                                         */
  /* ------------------------------------------------------------------ */

  private createBirdImage(): void {
    const bird = this.add.image(this.cx, BIRD_CENTER_Y, TEX_BIRD);
    bird.setOrigin(0.5);
    bird.setScale(BIRD_SCALE);
  }

  /* ------------------------------------------------------------------ */
  /*  Submit button                                                      */
  /* ------------------------------------------------------------------ */

  private createSubmitButton(): void {
    const btn = this.add.image(this.cx, SUBMIT_BTN_Y, TEX_SUBMIT_BTN);
    btn.setOrigin(0.5);
    btn.setScale(SUBMIT_BTN_SCALE);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      btn.setTint(0xdddddd);
    });

    btn.on('pointerout', () => {
      btn.clearTint();
      btn.setScale(SUBMIT_BTN_SCALE);
    });

    btn.on('pointerdown', () => {
      btn.setScale(SUBMIT_BTN_SCALE * 0.95);
    });

    btn.on('pointerup', () => {
      btn.setScale(SUBMIT_BTN_SCALE);
      this.openOverlay();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Overlay                                                            */
  /* ------------------------------------------------------------------ */

  private openOverlay(): void {
    if (this.overlayContainer) return;

    this.inputValue = '';
    this.isErrorFlashing = false;

    const container = this.add.container(0, 0);
    container.setDepth(OVERLAY_DEPTH);

    /* Dimmed background */
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    container.add(overlay);

    /* Block input behind overlay */
    const blocker = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    blocker.setInteractive();
    container.add(blocker);

    /* Header */
    this.createOverlayHeader(container);

    /* Input field */
    this.createInputField(container);

    /* Cancel & Submit buttons */
    this.createActionButtons(container);

    /* Keyboard */
    this.createKeyboard(container);

    /* Entrance animation */
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });

    this.overlayContainer = container;
  }

  private closeOverlay(): void {
    if (!this.overlayContainer) return;

    const container = this.overlayContainer;
    this.overlayContainer = null;
    this.inputDisplayText = null;
    this.inputFieldImage = null;

    this.tweens.add({
      targets: container,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => container.destroy(),
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Overlay Header                                                     */
  /* ------------------------------------------------------------------ */

  private createOverlayHeader(container: Phaser.GameObjects.Container): void {
    /* Header background image */
    const headerBg = this.add.image(this.cx, HEADER_Y, TEX_HEADER_INPUT);
    headerBg.setOrigin(0.5);
    headerBg.setScale(HEADER_SCALE);
    container.add(headerBg);

    /* Header text */
    const headerText = this.add.text(
      this.cx,
      HEADER_Y,
      'Explore the discovery hub for the white egg.\nNote it down to remember!',
      {
        fontFamily: "'MandaiValueSerif'",
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 6,
      },
    );
    headerText.setOrigin(0.5);
    container.add(headerText);
  }

  /* ------------------------------------------------------------------ */
  /*  Input field                                                        */
  /* ------------------------------------------------------------------ */

  private createInputField(container: Phaser.GameObjects.Container): void {
    /* Input field background image */
    const inputBg = this.add.image(this.cx, INPUT_Y, TEX_INPUT_FIELD);
    inputBg.setOrigin(0.5);
    inputBg.setScale(INPUT_FIELD_SCALE);
    container.add(inputBg);
    this.inputFieldImage = inputBg;

    const display = this.add.text(this.cx, INPUT_Y, '', {
      fontFamily: "'MandaiValueSerif'",
      fontSize: `${INPUT_FONT_SIZE}px`,
      color: '#333333',
    });
    display.setOrigin(0.5);
    container.add(display);
    this.inputDisplayText = display;

    /* Placeholder text */
    const placeholder = this.add.text(this.cx, INPUT_Y, 'Enter number...', {
      fontFamily: "'MandaiValueSerif'",
      fontSize: '18px',
      color: '#aaaaaa',
    });
    placeholder.setOrigin(0.5);
    container.add(placeholder);

    /* Store placeholder ref to toggle visibility */
    (display as unknown as Record<string, unknown>)['_placeholder'] = placeholder;
  }

  private updateInputDisplay(): void {
    if (!this.inputDisplayText) return;
    this.inputDisplayText.setText(this.inputValue);

    const placeholder = (this.inputDisplayText as unknown as Record<string, unknown>)['_placeholder'] as Phaser.GameObjects.Text | undefined;
    if (placeholder) {
      placeholder.setVisible(this.inputValue.length === 0);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Action buttons (Cancel / Submit)                                   */
  /* ------------------------------------------------------------------ */

  private createActionButtons(container: Phaser.GameObjects.Container): void {
    /* Get button dimensions for positioning */
    const cancelTexture = this.textures.get(TEX_CANCEL_BTN);
    const cancelWidth = cancelTexture.getSourceImage().width * ACTION_BTN_SCALE;

    const submitTexture = this.textures.get(TEX_OVERLAY_SUBMIT_BTN);
    const submitWidth = submitTexture.getSourceImage().width * ACTION_BTN_SCALE;

    const totalWidth = cancelWidth + submitWidth + ACTION_BTN_GAP;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    /* Cancel button */
    const cancelBtn = this.createImageButton(
      startX + cancelWidth / 2,
      ACTION_BTN_Y,
      TEX_CANCEL_BTN,
      ACTION_BTN_SCALE,
      () => this.closeOverlay(),
    );
    container.add(cancelBtn);

    /* Submit button */
    const submitBtn = this.createImageButton(
      startX + cancelWidth + ACTION_BTN_GAP + submitWidth / 2,
      ACTION_BTN_Y,
      TEX_OVERLAY_SUBMIT_BTN,
      ACTION_BTN_SCALE,
      () => this.handleSubmit(),
    );
    container.add(submitBtn);
  }

  private createImageButton(
    x: number,
    y: number,
    textureKey: string,
    scale: number,
    onClick: () => void,
  ): Phaser.GameObjects.Image {
    const btn = this.add.image(x, y, textureKey);
    btn.setOrigin(0.5);
    btn.setScale(scale);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      btn.setTint(0xdddddd);
    });

    btn.on('pointerout', () => {
      btn.clearTint();
      btn.setScale(scale);
    });

    btn.on('pointerdown', () => {
      btn.setScale(scale * 0.95);
    });

    btn.on('pointerup', () => {
      btn.setScale(scale);
      onClick();
    });

    return btn;
  }

  /* ------------------------------------------------------------------ */
  /*  Keyboard                                                           */
  /* ------------------------------------------------------------------ */

  private createKeyboard(container: Phaser.GameObjects.Container): void {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      [',', '0', '⌫'],
    ];

    /* Calculate button size based on scale */
    const btnTexture = this.textures.get(TEX_KEYBOARD_BTN);
    const btnWidth = btnTexture.getSourceImage().width * KEY_BTN_SCALE;
    const btnHeight = btnTexture.getSourceImage().height * KEY_BTN_SCALE;

    /* Calculate total keyboard dimensions */
    const totalKeysWidth = KEYBOARD_COLS * btnWidth + (KEYBOARD_COLS - 1) * KEY_GAP_X;
    const totalKeysHeight = KEYBOARD_ROWS * btnHeight + (KEYBOARD_ROWS - 1) * KEY_GAP_Y;
    const keyboardHeight = totalKeysHeight + KEYBOARD_PADDING_TOP + KEYBOARD_PADDING_BOTTOM;

    /* Position keyboard at bottom of screen */
    const keyboardY = GAME_HEIGHT - keyboardHeight;

    /* Add keyboard background - full width */
    const keyboardBg = this.add.image(0, keyboardY, TEX_KEYBOARD_BG);
    keyboardBg.setOrigin(0, 0);
    keyboardBg.setDisplaySize(GAME_WIDTH, keyboardHeight);
    container.add(keyboardBg);

    /* Calculate starting position for keys (centered) */
    const startX = (GAME_WIDTH - totalKeysWidth) / 2 + btnWidth / 2;
    const startY = keyboardY + KEYBOARD_PADDING_TOP + btnHeight / 2;

    /* Create key buttons */
    keys.forEach((row, rowIndex) => {
      row.forEach((key, colIndex) => {
        const x = startX + colIndex * (btnWidth + KEY_GAP_X);
        const y = startY + rowIndex * (btnHeight + KEY_GAP_Y);

        const keyBtn = this.createKeyButton(x, y, key);
        container.add(keyBtn);
      });
    });
  }

  private createKeyButton(
    x: number,
    y: number,
    key: string,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    /* Button image */
    const btn = this.add.image(0, 0, TEX_KEYBOARD_BTN);
    btn.setScale(KEY_BTN_SCALE);
    container.add(btn);

    /* Label - use icon for backspace, text for others */
    const isBackspace = key === '⌫';
    if (isBackspace) {
      const icon = this.add.image(0, 0, TEX_BACKSPACE_ICON);
      icon.setScale(KEY_BTN_SCALE);
      icon.setOrigin(0.5);
      container.add(icon);
    } else {
      const label = this.add.text(0, 0, key, {
        fontFamily: 'Roboto, sans-serif',
        fontSize: '28px',
        color: '#000',
        fontStyle: 'bold',
      });
      label.setOrigin(0.5);
      container.add(label);
    }

    /* Set interactive area based on button size */
    const btnWidth = btn.displayWidth;
    const btnHeight = btn.displayHeight;
    container.setSize(btnWidth, btnHeight);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight),
      Phaser.Geom.Rectangle.Contains,
    );

    /* Hover effect */
    container.on('pointerover', () => {
      btn.setTint(0xdddddd);
    });

    container.on('pointerout', () => {
      btn.clearTint();
      container.setScale(1);
    });

    container.on('pointerdown', () => {
      container.setScale(0.95);
    });

    container.on('pointerup', () => {
      container.setScale(1);
      this.handleKeyPress(key);
    });

    return container;
  }

  /* ------------------------------------------------------------------ */
  /*  Key press handling                                                  */
  /* ------------------------------------------------------------------ */

  private handleKeyPress(key: string): void {
    if (this.isErrorFlashing) return;

    if (key === '⌫') {
      this.inputValue = this.inputValue.slice(0, -1);
    } else if (key === ',') {
      /* Comma key - can be used for decimal or skip */
      if (this.inputValue.length < INPUT_MAX_LENGTH && !this.inputValue.includes(',')) {
        this.inputValue += key;
      }
    } else {
      if (this.inputValue.length < INPUT_MAX_LENGTH) {
        this.inputValue += key;
      }
    }

    /* Clear error tint if present */
    if (this.inputFieldImage) {
      this.inputFieldImage.clearTint();
    }

    this.updateInputDisplay();
  }

  /* ------------------------------------------------------------------ */
  /*  Submit handling                                                     */
  /* ------------------------------------------------------------------ */

  private handleSubmit(): void {
    if (this.isErrorFlashing) return;
    if (this.inputValue.length === 0) return;

    if (this.inputValue === this.correctAnswer) {
      this.handleCorrectAnswer();
    } else {
      this.handleWrongAnswer();
    }
  }

  private handleCorrectAnswer(): void {
    this.closeOverlay();

    this.time.delayedCall(300, () => {
      this.uiManager.showPopup({
        title: 'Well Done!',
        message: 'You counted the eggs correctly!',
        buttonText: 'Play Again',
        onClose: () => this.scene.restart(),
      });
    });
  }

  private handleWrongAnswer(): void {
    this.isErrorFlashing = true;

    /* Flash input field red */
    if (this.inputFieldImage) {
      this.inputFieldImage.setTint(0xffcccc);
    }

    this.time.delayedCall(ERROR_FLASH_DURATION, () => {
      if (this.inputFieldImage) {
        this.inputFieldImage.clearTint();
      }
      this.isErrorFlashing = false;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Overlay button helper                                              */
  /* ------------------------------------------------------------------ */

  private createOverlayButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    bgColor: number,
    hoverColor: number,
    onClick: () => void,
    fontSize = 18,
    textColor = '#ffffff',
    radius = 10,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    container.add(bg);

    const text = this.add.text(0, 0, label, {
      fontFamily: "'MandaiValueSerif'",
      fontSize: `${fontSize}px`,
      color: textColor,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    container.add(text);

    container.setSize(width, height);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
      container.setScale(1);
    });

    container.on('pointerdown', () => {
      container.setScale(0.95);
    });

    container.on('pointerup', () => {
      container.setScale(1);
      onClick();
    });

    return container;
  }
}
