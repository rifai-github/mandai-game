/**
 * Reusable UI component factory.
 * Creates mobile-friendly buttons, popups, progress bars, and counters.
 * All sizes use minimum touch-target dimensions for accessibility.
 */

import Phaser from 'phaser';
import {
  ButtonConfig,
  PopupConfig,
  ProgressBarConfig,
  ProgressBarHandle,
  CounterHandle,
  COLORS,
  TEXT_STYLES,
  UI,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../core/Config';

export class UIManager {
  private scene: Phaser.Scene;
  private activePopup: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /* ------------------------------------------------------------------ */
  /*  Button                                                             */
  /* ------------------------------------------------------------------ */

  createButton(config: ButtonConfig): Phaser.GameObjects.Container {
    const {
      x,
      y,
      width,
      height,
      text,
      fontSize = 20,
      backgroundColor = COLORS.primaryButton,
      hoverColor = COLORS.primaryButtonHover,
      textColor = '#ffffff',
      cornerRadius = 12,
      onClick,
    } = config;

    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(backgroundColor, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
    container.add(bg);

    const label = this.scene.add.text(0, 0, text, {
      ...TEXT_STYLES.button,
      fontSize: `${fontSize}px`,
      color: textColor,
    });
    label.setOrigin(0.5);
    container.add(label);

    container.setSize(width, height);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(backgroundColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
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

  /* ------------------------------------------------------------------ */
  /*  Popup                                                              */
  /* ------------------------------------------------------------------ */

  showPopup(config: PopupConfig): void {
    if (this.activePopup) {
      this.activePopup.destroy();
      this.activePopup = null;
    }

    const container = this.scene.add.container(0, 0);
    container.setDepth(1000);

    // Fullscreen overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(COLORS.overlayBlack, COLORS.overlayAlpha);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    container.add(overlay);

    // Block input behind popup
    const blocker = this.scene.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    blocker.setInteractive();
    container.add(blocker);

    // Panel
    const pw = UI.POPUP_WIDTH;
    const ph = UI.POPUP_HEIGHT;
    const px = (GAME_WIDTH - pw) / 2;
    const py = (GAME_HEIGHT - ph) / 2;

    const panel = this.scene.add.graphics();
    panel.fillStyle(COLORS.panelBackground, 1);
    panel.fillRoundedRect(px, py, pw, ph, UI.POPUP_CORNER_RADIUS);
    panel.lineStyle(3, 0xcccccc, 1);
    panel.strokeRoundedRect(px, py, pw, ph, UI.POPUP_CORNER_RADIUS);
    container.add(panel);

    // Title
    const title = this.scene.add.text(GAME_WIDTH / 2, py + 50, config.title, TEXT_STYLES.popupTitle);
    title.setOrigin(0.5);
    container.add(title);

    // Message
    const message = this.scene.add.text(GAME_WIDTH / 2, py + 110, config.message, TEXT_STYLES.popupMessage);
    message.setOrigin(0.5);
    container.add(message);

    // Button
    const btn = this.createButton({
      x: GAME_WIDTH / 2,
      y: py + ph - 60,
      width: 200,
      height: UI.BUTTON_MIN_HEIGHT,
      text: config.buttonText,
      onClick: () => {
        this.dismissPopup();
        config.onClose();
      },
    });
    container.add(btn);

    // Entrance animation
    container.setAlpha(0);
    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });

    this.activePopup = container;
  }

  /** Dismiss the current popup if one is showing */
  dismissPopup(): void {
    if (!this.activePopup) return;

    const popup = this.activePopup;
    this.activePopup = null;

    this.scene.tweens.add({
      targets: popup,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        popup.destroy();
      },
    });
  }

  /** Check if a popup is currently displayed */
  hasActivePopup(): boolean {
    return this.activePopup !== null;
  }

  /* ------------------------------------------------------------------ */
  /*  Progress Bar                                                       */
  /* ------------------------------------------------------------------ */

  createProgressBar(config: ProgressBarConfig): ProgressBarHandle {
    const fullConfig: Required<ProgressBarConfig> = {
      fillColor: config.fillColor ?? COLORS.progressFill,
      backgroundColor: config.backgroundColor ?? COLORS.progressBackground,
      borderColor: config.borderColor ?? COLORS.progressBorder,
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height,
    };

    const background = this.scene.add.graphics();
    background.fillStyle(fullConfig.backgroundColor, 1);
    background.fillRoundedRect(fullConfig.x, fullConfig.y, fullConfig.width, fullConfig.height, fullConfig.height / 2);

    const fill = this.scene.add.graphics();

    const border = this.scene.add.graphics();
    border.lineStyle(2, fullConfig.borderColor, 0.8);
    border.strokeRoundedRect(fullConfig.x, fullConfig.y, fullConfig.width, fullConfig.height, fullConfig.height / 2);

    const handle: ProgressBarHandle = {
      background,
      fill,
      border,
      config: fullConfig,
      update: (ratio: number) => {
        const clamped = Phaser.Math.Clamp(ratio, 0, 1);
        fill.clear();
        if (clamped > 0.01) {
          fill.fillStyle(fullConfig.fillColor, 1);
          const fillWidth = Math.max(fullConfig.height, fullConfig.width * clamped);
          fill.fillRoundedRect(
            fullConfig.x,
            fullConfig.y,
            fillWidth,
            fullConfig.height,
            fullConfig.height / 2
          );
        }
      },
      destroy: () => {
        background.destroy();
        fill.destroy();
        border.destroy();
      },
    };

    handle.update(0);
    return handle;
  }

  /* ------------------------------------------------------------------ */
  /*  Counter                                                            */
  /* ------------------------------------------------------------------ */

  createCounter(
    x: number,
    y: number,
    label: string,
    initial: number,
    total: number
  ): CounterHandle {
    const text = this.scene.add.text(x, y, `${label}: ${initial}/${total}`, TEXT_STYLES.counter);
    text.setOrigin(0.5);

    return {
      text,
      update: (current: number, t: number) => {
        text.setText(`${label}: ${current}/${t}`);
      },
      destroy: () => {
        text.destroy();
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Cleanup                                                            */
  /* ------------------------------------------------------------------ */

  destroy(): void {
    this.dismissPopup();
  }
}
