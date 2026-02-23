/**
 * Abstract base scene providing shared functionality for all mini-games.
 *
 * Handles:
 * - Background color setup
 * - Landscape orientation warning overlay
 * - UIManager and InputManager lifecycle
 * - Proper cleanup on scene shutdown to prevent memory leaks
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_STYLES, SCENE_INSTRUCTIONS, scaleByHeight, scaleByWidth, multiplierResolution } from '../core/Config';
import { UIManager } from '../systems/UIManager';
import { InputManager } from '../systems/InputManager';

import backButtonUrl from '../assets/images/back-button.png';

const BACK_BTN_KEY = 'back-button';
const BACK_BTN_DEPTH = 1000;

export abstract class BaseScene extends Phaser.Scene {
  protected uiManager!: UIManager;
  protected inputManager!: InputManager;
  private landscapeOverlay: Phaser.GameObjects.Container | null = null;
  private resizeHandler: (() => void) | null = null;

  /** Background color for the scene (override in subclass) */
  protected abstract get backgroundColor(): number;

  preload(): void {
    this.load.image(BACK_BTN_KEY, backButtonUrl);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(this.backgroundColor);

    this.uiManager = new UIManager(this);
    this.inputManager = new InputManager(this);

    this.createBackButton();
    this.setupOrientationCheck();

    // Wire up shutdown cleanup
    this.events.on('shutdown', this.onShutdown, this);
  }

  private createBackButton(): void {
    const x = 70 * scaleByWidth;
    const y = 50 * scaleByHeight;

    const btn = this.add.image(x, y, BACK_BTN_KEY);
    btn.setOrigin(0.5);
    btn.setDisplaySize(84 * multiplierResolution, 20 * multiplierResolution);
    btn.setDepth(BACK_BTN_DEPTH);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      window.parent.postMessage({ type: 'BACK', timestamp: Date.now() }, '*');
    });
  }

  /** Width of the game design canvas */
  protected get w(): number {
    return GAME_WIDTH;
  }

  /** Height of the game design canvas */
  protected get h(): number {
    return GAME_HEIGHT;
  }

  /** Center-x convenience */
  protected get cx(): number {
    return GAME_WIDTH / 2;
  }

  /** Create title + instruction text using per-scene config from SCENE_INSTRUCTIONS */
  protected createInstructionUI(
    titleText: string,
    instructionText: string,
  ): { title: Phaser.GameObjects.Text; instruction: Phaser.GameObjects.Text } {
    const config = SCENE_INSTRUCTIONS[this.scene.key];

    const title = this.add
      .text(this.cx, config.position.title * scaleByHeight, titleText, config.style.title)
      .setOrigin(0.5)
      .setScale(multiplierResolution)
      .setResolution(2);
    const instruction = this.add
      .text(this.cx, config.position.instruction * scaleByHeight, instructionText, config.style.instruction)
      .setOrigin(0.5)
      .setScale(multiplierResolution)
      .setResolution(2);

    return { title, instruction };
  }

  /** Show a quick floating text feedback (e.g. "+1", "Correct!") */
  protected showFloatingText(
    x: number,
    y: number,
    message: string,
    color: string = '#ffffff'
  ): void {
    const text = this.add.text(x, y, message, {
      ...TEXT_STYLES.subtitle,
      color,
    });
    text.setOrigin(0.5);
    text.setDepth(500);

    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Get query parameter value from URL
   * @param param - The query parameter name to retrieve
   * @returns The parameter value or null if not found
   */
  protected getQueryParam(param: string): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  /**
   * Notify the parent frame that the game is completed.
   * Waits `delay` ms (same timing as the old popup) before posting the message.
   */
  protected notifyGameCompleted(delay: number = 1000): void {
    this.time.delayedCall(delay, () => {
      window.parent.postMessage({
        type: 'GAME_COMPLETED',
        timestamp: Date.now(),
      }, '*');
    });
  }

  /** Create a tween that shakes an object horizontally */
  protected shakeObject(target: Phaser.GameObjects.GameObject): void {
    const t = target as unknown as Phaser.GameObjects.Components.Transform;
    const origX = t.x;
    this.tweens.add({
      targets: target,
      x: origX + 8,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        t.x = origX;
      },
    });
  }

  private setupOrientationCheck(): void {
    this.checkOrientation();

    this.resizeHandler = () => this.checkOrientation();
    window.addEventListener('resize', this.resizeHandler);
  }

  private checkOrientation(): void {
    const isLandscape = window.innerWidth > window.innerHeight;

    if (isLandscape && !this.landscapeOverlay) {
      this.showLandscapeWarning();
    } else if (!isLandscape && this.landscapeOverlay) {
      this.hideLandscapeWarning();
    }
  }

  private showLandscapeWarning(): void {
    this.landscapeOverlay = this.add.container(0, 0);
    this.landscapeOverlay.setDepth(2000);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.92);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.landscapeOverlay.add(bg);

    const blocker = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    blocker.setInteractive();
    this.landscapeOverlay.add(blocker);

    const icon = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '\u21BB', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '64px',
      color: '#ffffff',
    });
    icon.setOrigin(0.5);
    this.landscapeOverlay.add(icon);

    const msg = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 30,
      'Please rotate your device\nto portrait mode',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8,
      }
    );
    msg.setOrigin(0.5);
    this.landscapeOverlay.add(msg);
  }

  private hideLandscapeWarning(): void {
    if (this.landscapeOverlay) {
      this.landscapeOverlay.destroy();
      this.landscapeOverlay = null;
    }
  }

  private onShutdown(): void {
    this.uiManager.destroy();
    this.inputManager.destroy();
    this.hideLandscapeWarning();

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    this.events.off('shutdown', this.onShutdown, this);
  }
}
