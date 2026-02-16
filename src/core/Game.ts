/**
 * Central Game controller.
 * Creates the Phaser game instance, registers all scenes,
 * wires up the Router, and manages scene transitions.
 */

import Phaser from 'phaser';
import { SceneKeys, GAME_WIDTH, GAME_HEIGHT, ROUTE_TABLE, COLORS, TEXT_STYLES, UI } from './Config';
import { Router } from './Router';
import { MatchPenguinScene } from '../scenes/MatchPenguinScene';
import { CatchFishScene } from '../scenes/CatchFishScene';
import { PaddleFoodScene } from '../scenes/PaddleFoodScene';
import { PinkParentsScene } from '../scenes/PinkParentsScene';
import { CountEggScene } from '../scenes/CountEggScene';
import { RoutePaths } from './Config';

/**
 * Inline fallback menu scene shown when no valid route matches.
 * Presents navigation buttons to each mini-game.
 */
class MenuScene extends Phaser.Scene {
  private router: Router;

  constructor(router: Router) {
    super({ key: SceneKeys.Menu });
    this.router = router;
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(0x1a2a3a);

    this.add
      .text(width / 2, 80, 'Mandai Games', TEXT_STYLES.title)
      .setOrigin(0.5);

    this.add
      .text(width / 2, 130, 'Choose a game to play:', TEXT_STYLES.body)
      .setOrigin(0.5);

    const routes = this.router.getRoutes();
    const startY = 220;
    const spacing = 90;

    routes.forEach((route, index) => {
      const y = startY + index * spacing;
      this.createMenuButton(width / 2, y, route.label, route.path);
    });
  }

  private createMenuButton(x: number, y: number, label: string, path: RoutePaths): void {
    const btnWidth = 300;
    const btnHeight = 64;

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primaryButton, 1);
    bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 12);

    const text = this.add
      .text(x, y, label, TEXT_STYLES.button)
      .setOrigin(0.5);

    const hitZone = this.add
      .zone(x, y, btnWidth, btnHeight)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.primaryButtonHover, 1);
      bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 12);
    });

    hitZone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.primaryButton, 1);
      bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 12);
    });

    hitZone.on('pointerdown', () => {
      text.setScale(0.95);
    });

    hitZone.on('pointerup', () => {
      text.setScale(1);
      this.router.navigate(path);
    });
  }
}

export class GameController {
  private game: Phaser.Game;
  private router: Router;
  private activeSceneKey: SceneKeys | null = null;

  constructor() {
    this.router = new Router();

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#000000',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },
      input: {
        activePointers: 2,
      },
      scene: [],
      render: {
        pixelArt: false,
        antialias: true,
      },
    };

    this.game = new Phaser.Game(config);

    // Phaser boots asynchronously — wait for it to be fully ready
    // before registering scenes and starting the routed scene.
    this.game.events.once('ready', () => {
      this.registerScenes();
      this.setupRouting();
      this.startInitialScene();
    });
  }

  private registerScenes(): void {
    this.game.scene.add(SceneKeys.Menu, new MenuScene(this.router));
    this.game.scene.add(SceneKeys.MatchPenguin, MatchPenguinScene);
    this.game.scene.add(SceneKeys.CatchFish, CatchFishScene);
    this.game.scene.add(SceneKeys.PaddleFood, PaddleFoodScene);
    this.game.scene.add(SceneKeys.PinkParents, PinkParentsScene);
    this.game.scene.add(SceneKeys.CountEgg, CountEggScene);
  }

  private setupRouting(): void {
    this.router.setRouteChangeHandler((sceneKey: SceneKeys) => {
      this.switchScene(sceneKey);
    });
  }

  private startInitialScene(): void {
    const sceneKey = this.router.resolve();
    this.switchScene(sceneKey);
  }

  /** Stop the currently active scene and start the target scene */
  private switchScene(sceneKey: SceneKeys): void {
    if (this.activeSceneKey && this.activeSceneKey !== sceneKey) {
      const activeScene = this.game.scene.getScene(this.activeSceneKey);
      if (activeScene) {
        this.game.scene.stop(this.activeSceneKey);
      }
    }

    this.activeSceneKey = sceneKey;
    const targetScene = this.game.scene.getScene(sceneKey);

    if (targetScene) {
      if (this.game.scene.isActive(sceneKey)) {
        this.game.scene.stop(sceneKey);
      }
      this.game.scene.start(sceneKey);
    }
  }

  /** Cleanly destroy the entire game instance */
  destroy(): void {
    this.router.destroy();
    this.game.destroy(true);
  }
}
