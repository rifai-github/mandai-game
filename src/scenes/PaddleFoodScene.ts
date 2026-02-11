/**
 * Paddle to Food Mini-Game
 *
 * Gameplay:
 * - A duck sits on the left side of a pond. Bread (food) is on the right.
 * - Two tap zones at the bottom: LEFT and RIGHT.
 * - The player must alternate taps: left -> right -> left -> right ...
 * - Correct alternating taps advance the duck toward the food.
 * - Wrong-order taps reduce progress and break the streak.
 * - Consecutive correct taps build a rhythm streak that increases speed.
 * - Visual foot feedback shows which foot was paddled.
 * - When the duck reaches the food, the player wins.
 */

import { BaseScene } from './BaseScene';
import {
  SceneKeys,
  TEXT_STYLES,
  GAME_WIDTH,
  GAME_HEIGHT,
  ProgressBarHandle,
  COLORS,
} from '../core/Config';
import { AssetLoader } from '../systems/AssetLoader';

/** Which foot is expected next */
enum PaddleSide {
  Left = 'left',
  Right = 'right',
}

export class PaddleFoodScene extends BaseScene {
  protected get backgroundColor(): number {
    return 0x2e86c1;
  }

  /* Tuning constants */
  private readonly MAX_PROGRESS = 100;
  private readonly BASE_STEP = 5;
  private readonly PENALTY = 4;
  private readonly STREAK_BONUS_INTERVAL = 3;

  /* State */
  private progress = 0;
  private streak = 0;
  private expectedSide: PaddleSide = PaddleSide.Left;
  private isGameOver = false;

  /* Display objects */
  private duck!: Phaser.GameObjects.Sprite;
  private bread!: Phaser.GameObjects.Sprite;
  private leftFoot!: Phaser.GameObjects.Sprite;
  private rightFoot!: Phaser.GameObjects.Sprite;
  private progressBar!: ProgressBarHandle;
  private streakText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private leftZoneVisual!: Phaser.GameObjects.Graphics;
  private rightZoneVisual!: Phaser.GameObjects.Graphics;
  private leftLabel!: Phaser.GameObjects.Text;
  private rightLabel!: Phaser.GameObjects.Text;

  /* Layout */
  private readonly DUCK_START_X = 80;
  private readonly DUCK_END_X = GAME_WIDTH - 80;
  private readonly DUCK_Y = 400;
  private readonly ZONE_HEIGHT = 180;

  constructor() {
    super({ key: SceneKeys.PaddleFood });
  }

  create(): void {
    super.create();

    this.progress = 0;
    this.streak = 0;
    this.expectedSide = PaddleSide.Left;
    this.isGameOver = false;

    this.generateAssets();
    this.drawBackground();
    this.createGameObjects();
    this.createUI();
    this.createTapZones();
  }

  /* ------------------------------------------------------------------ */
  /*  Setup                                                              */
  /* ------------------------------------------------------------------ */

  private generateAssets(): void {
    AssetLoader.generateDuck(this, 'duck');
    AssetLoader.generateFoot(this, 'foot');
    AssetLoader.generateBread(this, 'bread');
    AssetLoader.generateStar(this, 'star');
  }

  private drawBackground(): void {
    const bg = this.add.graphics();

    // Sky gradient
    bg.fillStyle(0x87ceeb, 1);
    bg.fillRect(0, 0, GAME_WIDTH, 200);

    // Water
    bg.fillStyle(0x2196f3, 1);
    bg.fillRect(0, 200, GAME_WIDTH, GAME_HEIGHT - 200);

    // Water surface line
    bg.lineStyle(3, 0x64b5f6, 0.5);
    bg.beginPath();
    bg.moveTo(0, 200);
    for (let x = 0; x <= GAME_WIDTH; x += 30) {
      bg.lineTo(x + 15, 204);
      bg.lineTo(x + 30, 200);
    }
    bg.strokePath();

    // Ripple lines
    bg.lineStyle(1, 0x64b5f6, 0.3);
    for (let i = 1; i <= 5; i++) {
      const y = 200 + i * 50;
      bg.beginPath();
      bg.moveTo(0, y);
      for (let x = 0; x <= GAME_WIDTH; x += 50) {
        bg.lineTo(x + 25, y + 3);
        bg.lineTo(x + 50, y);
      }
      bg.strokePath();
    }
  }

  private createGameObjects(): void {
    // Bread (food target on the right)
    this.bread = this.add.sprite(this.DUCK_END_X, this.DUCK_Y - 10, 'bread');
    this.bread.setOrigin(0.5);

    // "Goal" indicator
    this.add
      .text(this.DUCK_END_X, this.DUCK_Y - 50, 'FOOD', {
        ...TEXT_STYLES.body,
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Duck
    this.duck = this.add.sprite(this.DUCK_START_X, this.DUCK_Y, 'duck');
    this.duck.setOrigin(0.5);

    // Feet (below duck, for visual feedback)
    this.leftFoot = this.add.sprite(this.DUCK_START_X - 15, this.DUCK_Y + 35, 'foot');
    this.leftFoot.setOrigin(0.5);
    this.leftFoot.setAlpha(0.5);

    this.rightFoot = this.add.sprite(this.DUCK_START_X + 15, this.DUCK_Y + 35, 'foot');
    this.rightFoot.setOrigin(0.5);
    this.rightFoot.setAlpha(0.5);

    // Gentle bobbing for the duck
    this.tweens.add({
      targets: [this.duck, this.leftFoot, this.rightFoot],
      y: '+=4',
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createUI(): void {
    // Title
    this.add
      .text(this.cx, 40, 'Paddle to Food!', TEXT_STYLES.title)
      .setOrigin(0.5);

    // Instruction
    this.instructionText = this.add
      .text(this.cx, 90, 'Tap LEFT then RIGHT to paddle!', TEXT_STYLES.body)
      .setOrigin(0.5);

    // Progress bar
    this.progressBar = this.uiManager.createProgressBar({
      x: 40,
      y: 130,
      width: GAME_WIDTH - 80,
      height: 22,
    });

    // Streak counter
    this.streakText = this.add
      .text(this.cx, 165, 'Streak: 0', {
        ...TEXT_STYLES.body,
        fontSize: '16px',
      })
      .setOrigin(0.5);
  }

  private createTapZones(): void {
    const zoneY = GAME_HEIGHT - this.ZONE_HEIGHT / 2;
    const halfW = GAME_WIDTH / 2;

    // Separator line
    const sep = this.add.graphics();
    sep.lineStyle(2, 0xffffff, 0.4);
    sep.lineBetween(halfW, GAME_HEIGHT - this.ZONE_HEIGHT, halfW, GAME_HEIGHT);

    // Left zone visual
    this.leftZoneVisual = this.add.graphics();
    this.drawZone(this.leftZoneVisual, 0, GAME_HEIGHT - this.ZONE_HEIGHT, halfW, this.ZONE_HEIGHT, 0x1976d2);

    // Right zone visual
    this.rightZoneVisual = this.add.graphics();
    this.drawZone(this.rightZoneVisual, halfW, GAME_HEIGHT - this.ZONE_HEIGHT, halfW, this.ZONE_HEIGHT, 0x0d47a1);

    // Labels
    this.leftLabel = this.add
      .text(halfW / 2, zoneY, 'LEFT', {
        ...TEXT_STYLES.subtitle,
        fontSize: '28px',
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    this.rightLabel = this.add
      .text(halfW + halfW / 2, zoneY, 'RIGHT', {
        ...TEXT_STYLES.subtitle,
        fontSize: '28px',
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    // Highlight which side is expected
    this.updateExpectedHighlight();

    // Tap zones (invisible interactive areas)
    this.inputManager.createTapZone(halfW / 2, zoneY, halfW, this.ZONE_HEIGHT, () => {
      this.onTap(PaddleSide.Left);
    });

    this.inputManager.createTapZone(halfW + halfW / 2, zoneY, halfW, this.ZONE_HEIGHT, () => {
      this.onTap(PaddleSide.Right);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Gameplay                                                           */
  /* ------------------------------------------------------------------ */

  private onTap(side: PaddleSide): void {
    if (this.isGameOver) return;
    if (this.uiManager.hasActivePopup()) return;

    if (side === this.expectedSide) {
      this.handleCorrectTap(side);
    } else {
      this.handleWrongTap(side);
    }

    this.updateDuckPosition();
    this.progressBar.update(this.progress / this.MAX_PROGRESS);
    this.streakText.setText(`Streak: ${this.streak}`);
    this.updateExpectedHighlight();

    if (this.progress >= this.MAX_PROGRESS) {
      this.handleWin();
    }
  }

  private handleCorrectTap(side: PaddleSide): void {
    this.streak++;
    const bonus = Math.floor(this.streak / this.STREAK_BONUS_INTERVAL);
    const step = this.BASE_STEP + bonus;
    this.progress = Math.min(this.MAX_PROGRESS, this.progress + step);

    // Toggle expected side
    this.expectedSide =
      side === PaddleSide.Left ? PaddleSide.Right : PaddleSide.Left;

    // Foot animation
    this.animateFoot(side);

    // Zone flash
    this.flashZone(side, 0x4caf50);

    // Floating feedback
    if (this.streak > 0 && this.streak % this.STREAK_BONUS_INTERVAL === 0) {
      this.showFloatingText(this.cx, this.DUCK_Y - 60, `Streak x${this.streak}!`, '#ffeb3b');
    }
  }

  private handleWrongTap(side: PaddleSide): void {
    this.streak = 0;
    this.progress = Math.max(0, this.progress - this.PENALTY);

    // Zone flash red
    this.flashZone(side, 0xe74c3c);

    // Shake duck
    this.shakeObject(this.duck);

    this.showFloatingText(
      this.cx,
      this.DUCK_Y - 50,
      `Tap ${this.expectedSide.toUpperCase()}!`,
      '#ff4444'
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Visual updates                                                     */
  /* ------------------------------------------------------------------ */

  private updateDuckPosition(): void {
    const ratio = this.progress / this.MAX_PROGRESS;
    const targetX = Phaser.Math.Linear(this.DUCK_START_X, this.DUCK_END_X - 40, ratio);

    this.tweens.add({
      targets: this.duck,
      x: targetX,
      duration: 200,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: this.leftFoot,
      x: targetX - 15,
      duration: 200,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: this.rightFoot,
      x: targetX + 15,
      duration: 200,
      ease: 'Power2',
    });
  }

  private animateFoot(side: PaddleSide): void {
    const foot = side === PaddleSide.Left ? this.leftFoot : this.rightFoot;

    this.tweens.add({
      targets: foot,
      alpha: 1,
      scaleX: 1.3,
      scaleY: 1.3,
      angle: side === PaddleSide.Left ? -20 : 20,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        foot.setAlpha(0.5);
        foot.setScale(1);
        foot.setAngle(0);
      },
    });
  }

  private flashZone(side: PaddleSide, color: number): void {
    const halfW = GAME_WIDTH / 2;
    const flashGfx = this.add.graphics();
    flashGfx.fillStyle(color, 0.25);
    if (side === PaddleSide.Left) {
      flashGfx.fillRect(0, GAME_HEIGHT - this.ZONE_HEIGHT, halfW, this.ZONE_HEIGHT);
    } else {
      flashGfx.fillRect(halfW, GAME_HEIGHT - this.ZONE_HEIGHT, halfW, this.ZONE_HEIGHT);
    }
    flashGfx.setDepth(10);

    this.tweens.add({
      targets: flashGfx,
      alpha: 0,
      duration: 200,
      onComplete: () => flashGfx.destroy(),
    });
  }

  private updateExpectedHighlight(): void {
    if (this.expectedSide === PaddleSide.Left) {
      this.leftLabel.setAlpha(1);
      this.rightLabel.setAlpha(0.4);
    } else {
      this.leftLabel.setAlpha(0.4);
      this.rightLabel.setAlpha(1);
    }
  }

  private drawZone(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    color: number
  ): void {
    gfx.fillStyle(color, 0.4);
    gfx.fillRect(x, y, w, h);
    gfx.lineStyle(1, 0xffffff, 0.2);
    gfx.strokeRect(x, y, w, h);
  }

  /* ------------------------------------------------------------------ */
  /*  Win state                                                          */
  /* ------------------------------------------------------------------ */

  private handleWin(): void {
    this.isGameOver = true;

    // Move duck to bread
    this.tweens.add({
      targets: this.duck,
      x: this.DUCK_END_X - 20,
      duration: 400,
      ease: 'Power2',
    });

    // Celebration
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 60, () => {
        AssetLoader.generateStar(this, 'star');
        const star = this.add.sprite(
          Phaser.Math.Between(60, GAME_WIDTH - 60),
          Phaser.Math.Between(200, 500),
          'star'
        );
        star.setDepth(200);
        this.tweens.add({
          targets: star,
          y: star.y - 80,
          alpha: 0,
          angle: Phaser.Math.Between(-180, 180),
          duration: 700,
          onComplete: () => star.destroy(),
        });
      });
    }

    this.time.delayedCall(600, () => {
      this.uiManager.showPopup({
        title: 'Well Done!',
        message: `The duck reached the food!\nStreak: ${this.streak}`,
        buttonText: 'Play Again',
        onClose: () => this.scene.restart(),
      });
    });
  }
}
