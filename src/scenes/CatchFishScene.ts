/**
 * Catch Fish Mini-Game
 *
 * Gameplay:
 * - Fish spawn at random positions within the pond area.
 * - Each fish swims briefly and then escapes if not tapped.
 * - Tapping a fish catches it, plays a splash animation, and increments the counter.
 * - The goal is to catch 10 fish.
 * - On reaching 10, a win celebration and popup are displayed.
 * - Auto-restart via popup button.
 */

import { BaseScene } from './BaseScene';
import { SceneKeys, FISH_COLORS, TEXT_STYLES, GAME_WIDTH, GAME_HEIGHT } from '../core/Config';
import { AssetLoader } from '../systems/AssetLoader';
import { CounterHandle } from '../core/Config';

/** Spawn bounds for fish within the pond area */
interface SpawnBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class CatchFishScene extends BaseScene {
  protected get backgroundColor(): number {
    return 0x1565c0;
  }

  private readonly TARGET_CATCH = 10;
  private readonly SPAWN_INTERVAL_MIN = 800;
  private readonly SPAWN_INTERVAL_MAX = 1800;
  private readonly FISH_LIFETIME = 3000;

  private caughtCount = 0;
  private counter!: CounterHandle;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private activeFish: Phaser.GameObjects.Sprite[] = [];
  private isGameOver = false;
  private spawnBounds: SpawnBounds = {
    minX: 60,
    maxX: GAME_WIDTH - 60,
    minY: 180,
    maxY: GAME_HEIGHT - 160,
  };

  constructor() {
    super({ key: SceneKeys.CatchFish });
  }

  create(): void {
    super.create();

    this.caughtCount = 0;
    this.activeFish = [];
    this.isGameOver = false;

    this.generateAssets();
    this.drawBackground();
    this.createUI();
    this.startSpawning();
  }

  /* ------------------------------------------------------------------ */
  /*  Asset generation                                                   */
  /* ------------------------------------------------------------------ */

  private generateAssets(): void {
    FISH_COLORS.forEach((color, i) => {
      AssetLoader.generateFish(this, `fish-${i}`, color);
    });
    AssetLoader.generateSplash(this, 'splash');
    AssetLoader.generateStar(this, 'star');
  }

  /* ------------------------------------------------------------------ */
  /*  Background                                                         */
  /* ------------------------------------------------------------------ */

  private drawBackground(): void {
    // Water gradient (simulated with layered rects)
    const bg = this.add.graphics();

    bg.fillStyle(0x0d47a1, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    bg.fillStyle(0x1565c0, 0.6);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT / 3);

    // Surface ripples
    bg.lineStyle(2, 0x42a5f5, 0.3);
    for (let i = 0; i < 6; i++) {
      const y = 160 + i * 8;
      bg.beginPath();
      bg.moveTo(0, y);
      for (let x = 0; x < GAME_WIDTH; x += 40) {
        bg.lineTo(x + 20, y + 4);
        bg.lineTo(x + 40, y);
      }
      bg.strokePath();
    }

    // Bubbles (decorative)
    bg.fillStyle(0x64b5f6, 0.2);
    for (let i = 0; i < 12; i++) {
      const bx = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const by = Phaser.Math.Between(200, GAME_HEIGHT - 100);
      const br = Phaser.Math.Between(4, 12);
      bg.fillCircle(bx, by, br);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  UI                                                                 */
  /* ------------------------------------------------------------------ */

  private createUI(): void {
    this.add
      .text(this.cx, 40, 'Catch the Fish!', TEXT_STYLES.title)
      .setOrigin(0.5);

    this.counter = this.uiManager.createCounter(
      this.cx,
      90,
      'Fish',
      0,
      this.TARGET_CATCH
    );

    this.add
      .text(this.cx, 130, 'Tap the fish to catch them!', {
        ...TEXT_STYLES.body,
        fontSize: '16px',
      })
      .setOrigin(0.5);
  }

  /* ------------------------------------------------------------------ */
  /*  Spawning                                                           */
  /* ------------------------------------------------------------------ */

  private startSpawning(): void {
    this.scheduleNextSpawn();
  }

  private scheduleNextSpawn(): void {
    if (this.isGameOver) return;

    const delay = Phaser.Math.Between(this.SPAWN_INTERVAL_MIN, this.SPAWN_INTERVAL_MAX);
    this.spawnTimer = this.time.delayedCall(delay, () => {
      this.spawnFish();
      this.scheduleNextSpawn();
    });
  }

  private spawnFish(): void {
    if (this.isGameOver) return;

    const { minX, maxX, minY, maxY } = this.spawnBounds;
    const x = Phaser.Math.Between(minX, maxX);
    const y = Phaser.Math.Between(minY, maxY);
    const colorIndex = Phaser.Math.Between(0, FISH_COLORS.length - 1);

    const fish = this.add.sprite(x, y, `fish-${colorIndex}`);
    fish.setOrigin(0.5);
    fish.setScale(0);
    fish.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-40, -22, 80, 44),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    // Random horizontal direction
    const facingLeft = Phaser.Math.Between(0, 1) === 0;
    if (facingLeft) {
      fish.setFlipX(true);
    }

    // Entrance tween
    this.tweens.add({
      targets: fish,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Swimming motion
    const swimDistance = Phaser.Math.Between(30, 80);
    const swimDir = facingLeft ? -1 : 1;
    this.tweens.add({
      targets: fish,
      x: x + swimDistance * swimDir,
      y: y + Phaser.Math.Between(-20, 20),
      duration: this.FISH_LIFETIME,
      ease: 'Sine.easeInOut',
    });

    // Slight bobbing
    this.tweens.add({
      targets: fish,
      angle: { from: -5, to: 5 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Tap to catch
    fish.on('pointerdown', () => {
      this.catchFish(fish);
    });

    // Auto-escape after lifetime
    this.time.delayedCall(this.FISH_LIFETIME, () => {
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

    // Splash effect
    const splash = this.add.sprite(fish.x, fish.y, 'splash');
    splash.setDepth(50);
    this.tweens.add({
      targets: splash,
      scale: { from: 0.5, to: 1.8 },
      alpha: { from: 1, to: 0 },
      duration: 400,
      onComplete: () => splash.destroy(),
    });

    // Fish disappears
    this.tweens.add({
      targets: fish,
      scale: 0,
      alpha: 0,
      duration: 200,
      onComplete: () => fish.destroy(),
    });

    // Update count
    this.caughtCount++;
    this.counter.update(this.caughtCount, this.TARGET_CATCH);
    this.showFloatingText(fish.x, fish.y - 30, '+1', '#00ff88');

    // Check win
    if (this.caughtCount >= this.TARGET_CATCH) {
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
  /*  Win state                                                          */
  /* ------------------------------------------------------------------ */

  private handleWin(): void {
    this.isGameOver = true;

    // Stop spawning
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }

    // Remove remaining fish
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

    // Win celebration
    this.spawnWinCelebration();

    this.time.delayedCall(600, () => {
      this.uiManager.showPopup({
        title: 'You Won!',
        message: `You caught all ${this.TARGET_CATCH} fish!`,
        buttonText: 'Play Again',
        onClose: () => this.scene.restart(),
      });
    });
  }

  private spawnWinCelebration(): void {
    for (let i = 0; i < 15; i++) {
      this.time.delayedCall(i * 80, () => {
        const star = this.add.sprite(
          Phaser.Math.Between(40, GAME_WIDTH - 40),
          Phaser.Math.Between(100, GAME_HEIGHT - 200),
          'star'
        );
        star.setDepth(200);
        star.setScale(Phaser.Math.FloatBetween(0.6, 1.4));
        this.tweens.add({
          targets: star,
          y: star.y - Phaser.Math.Between(40, 100),
          alpha: 0,
          angle: Phaser.Math.Between(-180, 180),
          duration: 800,
          ease: 'Power2',
          onComplete: () => star.destroy(),
        });
      });
    }
  }
}
