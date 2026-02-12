/**
 * Pink Parents Mini-Game
 *
 * Gameplay:
 * - A target pink color swatch is displayed prominently.
 * - 3 selectable buttons show different pink shades.
 * - One button matches the target exactly.
 * - Player taps the matching button.
 * - Correct: green feedback, score increments, new round after a brief delay.
 * - Wrong: red feedback, shake animation, prompt to try again.
 * - Rounds continue indefinitely; each round randomizes colors.
 */

import { BaseScene } from './BaseScene';
import {
  SceneKeys,
  TEXT_STYLES,
  GAME_WIDTH,
  GAME_HEIGHT,
  COLORS,
  CounterHandle,
} from '../core/Config';
import { AssetLoader } from '../systems/AssetLoader';

/** HSL representation for generating pink shades */
interface HSL {
  h: number;
  s: number;
  l: number;
}

export class PinkParentsScene extends BaseScene {
  protected get backgroundColor(): number {
    return 0xfce4ec;
  }

  private score = 0;
  private round = 0;
  private counter!: CounterHandle;
  private targetSwatchSprite!: Phaser.GameObjects.Sprite;
  private optionButtons: Phaser.GameObjects.Container[] = [];
  private correctIndex = 0;
  private isRoundActive = false;

  constructor() {
    super({ key: SceneKeys.PinkParents });
  }

  create(): void {
    super.create();

    this.score = 0;
    this.round = 0;
    this.optionButtons = [];

    this.createStaticUI();
    this.startNewRound();
  }

  /* ------------------------------------------------------------------ */
  /*  Static UI                                                          */
  /* ------------------------------------------------------------------ */

  private createStaticUI(): void {
    this.createInstructionUI(
      'Pink Parents',
      'Find the matching pink shade!',
    );

    // Score counter
    this.counter = this.uiManager.createCounter(this.cx, GAME_HEIGHT - 50, 'Score', 0, 0);
    this.counter.text.setStyle({
      ...TEXT_STYLES.counter,
      color: '#c2185b',
      stroke: '#ffffff',
      strokeThickness: 3,
    });
    this.updateScoreDisplay();

    // "Target" label
    this.add
      .text(this.cx, 130, 'TARGET', {
        ...TEXT_STYLES.body,
        fontSize: '16px',
        color: '#ad1457',
        stroke: '#ffffff',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
  }

  /* ------------------------------------------------------------------ */
  /*  Round management                                                   */
  /* ------------------------------------------------------------------ */

  private startNewRound(): void {
    this.round++;
    this.isRoundActive = true;

    // Clean up previous round's dynamic objects
    this.cleanupRound();

    // Generate target pink
    const targetHSL = this.randomPink();
    const targetColor = this.hslToHex(targetHSL);

    // Generate distractors (visibly different from target)
    const options = this.generateOptions(targetHSL);
    this.correctIndex = options.correctIndex;

    // Draw target swatch
    const targetKey = `swatch-target-${this.round}`;
    AssetLoader.generateSwatch(this, targetKey, targetColor, 160);
    this.targetSwatchSprite = this.add.sprite(this.cx, 250, targetKey);
    this.targetSwatchSprite.setOrigin(0.5);

    // Shadow behind target
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.1);
    shadow.fillRoundedRect(this.cx - 84, 166, 168, 168, 14);
    shadow.setDepth(this.targetSwatchSprite.depth - 1);

    // Entrance animation for target
    this.targetSwatchSprite.setScale(0);
    this.tweens.add({
      targets: this.targetSwatchSprite,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Create option buttons
    this.createOptionButtons(options.colors);
  }

  private cleanupRound(): void {
    // Remove previous target swatch
    if (this.targetSwatchSprite && this.targetSwatchSprite.active) {
      this.targetSwatchSprite.destroy();
    }

    // Remove previous option buttons
    this.optionButtons.forEach((btn) => {
      if (btn.active) btn.destroy();
    });
    this.optionButtons = [];
  }

  /* ------------------------------------------------------------------ */
  /*  Option buttons                                                     */
  /* ------------------------------------------------------------------ */

  private createOptionButtons(colors: number[]): void {
    const buttonWidth = 120;
    const buttonHeight = 90;
    const spacing = 20;
    const totalWidth = colors.length * buttonWidth + (colors.length - 1) * spacing;
    const startX = (GAME_WIDTH - totalWidth) / 2 + buttonWidth / 2;
    const y = 500;

    // "Choose one:" label
    const chooseLabel = this.add
      .text(this.cx, y - 70, 'Which shade matches?', {
        ...TEXT_STYLES.body,
        color: '#880e4f',
        stroke: '#ffffff',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    colors.forEach((color, index) => {
      const x = startX + index * (buttonWidth + spacing);
      const container = this.createColorButton(x, y, buttonWidth, buttonHeight, color, index);
      this.optionButtons.push(container);

      // Staggered entrance
      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 250,
        delay: 100 + index * 80,
        ease: 'Back.easeOut',
      });
    });
  }

  private createColorButton(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    index: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    bg.lineStyle(3, 0xffffff, 0.8);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    container.add(bg);

    // Option label (A, B, C)
    const label = this.add
      .text(0, height / 2 + 20, String.fromCharCode(65 + index), {
        ...TEXT_STYLES.body,
        fontSize: '20px',
        color: '#880e4f',
        stroke: '#ffffff',
        strokeThickness: 2,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(label);

    // Interactive hit area
    container.setSize(width, height + 30);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height + 30),
      Phaser.Geom.Rectangle.Contains
    );

    container.on('pointerdown', () => {
      if (!this.isRoundActive) return;
      container.setScale(0.93);
    });

    container.on('pointerup', () => {
      if (!this.isRoundActive) return;
      container.setScale(1);
      this.onOptionSelected(index, container, bg, width, height);
    });

    container.on('pointerout', () => {
      container.setScale(1);
    });

    return container;
  }

  /* ------------------------------------------------------------------ */
  /*  Selection handling                                                  */
  /* ------------------------------------------------------------------ */

  private onOptionSelected(
    index: number,
    container: Phaser.GameObjects.Container,
    bg: Phaser.GameObjects.Graphics,
    width: number,
    height: number
  ): void {
    if (!this.isRoundActive) return;
    this.isRoundActive = false;

    if (index === this.correctIndex) {
      this.handleCorrectSelection(container, bg, width, height);
    } else {
      this.handleWrongSelection(container, bg, width, height);
    }
  }

  private handleCorrectSelection(
    container: Phaser.GameObjects.Container,
    bg: Phaser.GameObjects.Graphics,
    width: number,
    height: number
  ): void {
    this.score++;
    this.updateScoreDisplay();

    // Green border feedback
    bg.lineStyle(5, COLORS.successGreen, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);

    this.showFloatingText(container.x, container.y - 60, 'Correct!', '#27ae60');

    // Disable all buttons
    this.optionButtons.forEach((btn) => btn.disableInteractive());

    // Celebration sparkle on the correct button
    AssetLoader.generateStar(this, 'star');
    for (let i = 0; i < 5; i++) {
      const star = this.add.sprite(container.x, container.y, 'star');
      star.setDepth(200);
      const angle = (i / 5) * Math.PI * 2;
      this.tweens.add({
        targets: star,
        x: container.x + Math.cos(angle) * 50,
        y: container.y + Math.sin(angle) * 50,
        alpha: 0,
        duration: 500,
        onComplete: () => star.destroy(),
      });
    }

    // Next round after a brief delay
    this.time.delayedCall(1200, () => {
      this.startNewRound();
    });
  }

  private handleWrongSelection(
    container: Phaser.GameObjects.Container,
    bg: Phaser.GameObjects.Graphics,
    width: number,
    height: number
  ): void {
    // Red border feedback
    bg.lineStyle(5, COLORS.errorRed, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);

    this.shakeObject(container);
    this.showFloatingText(container.x, container.y - 60, 'Try Again!', '#e74c3c');

    // Re-enable after a brief delay
    this.time.delayedCall(600, () => {
      // Reset border
      bg.lineStyle(3, 0xffffff, 0.8);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
      this.isRoundActive = true;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Color generation                                                   */
  /* ------------------------------------------------------------------ */

  private randomPink(): HSL {
    return {
      h: Phaser.Math.Between(320, 355),
      s: Phaser.Math.Between(50, 100),
      l: Phaser.Math.Between(40, 80),
    };
  }

  private generateOptions(target: HSL): { colors: number[]; correctIndex: number } {
    const correctColor = this.hslToHex(target);

    // Generate two distractors that differ enough to be distinguishable
    const distractors: number[] = [];
    const minDiff = 12;

    for (let attempt = 0; distractors.length < 2 && attempt < 50; attempt++) {
      const hShift = Phaser.Math.Between(-20, 20);
      const sShift = Phaser.Math.Between(-25, 25);
      const lShift = Phaser.Math.Between(-20, 20);

      const candidate: HSL = {
        h: Phaser.Math.Clamp(target.h + hShift, 300, 360),
        s: Phaser.Math.Clamp(target.s + sShift, 30, 100),
        l: Phaser.Math.Clamp(target.l + lShift, 30, 85),
      };

      // Ensure it's visually different from target and other distractors
      const diff = Math.abs(hShift) + Math.abs(sShift) + Math.abs(lShift);
      if (diff < minDiff) continue;

      const hex = this.hslToHex(candidate);
      if (hex === correctColor) continue;

      const tooSimilar = distractors.some(
        (d) => Math.abs(d - hex) < 0x111111
      );
      if (tooSimilar) continue;

      distractors.push(hex);
    }

    // Fallback distractors if generation was unlucky
    while (distractors.length < 2) {
      distractors.push(
        this.hslToHex({
          h: Phaser.Math.Between(300, 360),
          s: Phaser.Math.Between(30, 100),
          l: Phaser.Math.Between(30, 85),
        })
      );
    }

    // Build array with correct answer at a random position
    const correctIndex = Phaser.Math.Between(0, 2);
    const colors: number[] = [];

    let dIdx = 0;
    for (let i = 0; i < 3; i++) {
      if (i === correctIndex) {
        colors.push(correctColor);
      } else {
        colors.push(distractors[dIdx++]);
      }
    }

    return { colors, correctIndex };
  }

  /** Convert HSL (h: 0-360, s: 0-100, l: 0-100) to a hex number */
  private hslToHex(hsl: HSL): number {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;

    const hue2rgb = (p: number, q: number, t: number): number => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };

    let r: number;
    let g: number;
    let b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const ri = Math.round(r * 255);
    const gi = Math.round(g * 255);
    const bi = Math.round(b * 255);

    return (ri << 16) | (gi << 8) | bi;
  }

  private updateScoreDisplay(): void {
    this.counter.text.setText(`Score: ${this.score}`);
  }
}
