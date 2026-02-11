/**
 * Touch-optimized input management system.
 * Provides helpers for drag-and-drop, tap zones, and pointer tracking.
 * Each scene should create its own InputManager instance; cleanup
 * is handled automatically on scene shutdown.
 */

import Phaser from 'phaser';

/** Callback for tap zone interaction */
type TapCallback = (pointer: Phaser.Input.Pointer) => void;

export class InputManager {
  private scene: Phaser.Scene;
  private dragTargets: Phaser.GameObjects.GameObject[] = [];
  private tapZones: Phaser.GameObjects.Zone[] = [];
  private isDragSetup = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Make a game object (typically a Container or Sprite) draggable.
   * The object must already have an interactive hit area set.
   */
  makeDraggable(gameObject: Phaser.GameObjects.GameObject): void {
    if (!this.isDragSetup) {
      this.setupDragEvents();
      this.isDragSetup = true;
    }

    this.scene.input.setDraggable(gameObject);
    this.dragTargets.push(gameObject);
  }

  /**
   * Create an invisible interactive zone that fires a callback on tap/click.
   * Returns the zone so it can be styled or further configured.
   */
  createTapZone(
    x: number,
    y: number,
    width: number,
    height: number,
    callback: TapCallback
  ): Phaser.GameObjects.Zone {
    const zone = this.scene.add.zone(x, y, width, height);
    zone.setInteractive({ useHandCursor: false });
    zone.on('pointerdown', callback);
    this.tapZones.push(zone);
    return zone;
  }

  /**
   * Make a game object respond to tap/click.
   * The object must already have an interactive hit area set.
   */
  onTap(gameObject: Phaser.GameObjects.GameObject, callback: TapCallback): void {
    gameObject.on('pointerdown', callback);
  }

  /** Remove drag capability from a specific object */
  removeDraggable(gameObject: Phaser.GameObjects.GameObject): void {
    this.scene.input.setDraggable(gameObject, false);
    const idx = this.dragTargets.indexOf(gameObject);
    if (idx !== -1) {
      this.dragTargets.splice(idx, 1);
    }
  }

  /** Clean up all managed input objects */
  destroy(): void {
    this.dragTargets.forEach((target) => {
      if (target.active) {
        this.scene.input.setDraggable(target, false);
      }
    });
    this.dragTargets = [];

    this.tapZones.forEach((zone) => {
      if (zone.active) {
        zone.removeAllListeners();
        zone.destroy();
      }
    });
    this.tapZones = [];

    if (this.isDragSetup) {
      this.scene.input.off('drag');
      this.scene.input.off('dragstart');
      this.scene.input.off('dragend');
      this.isDragSetup = false;
    }
  }

  /** Internal: wire up global drag listeners on the scene input */
  private setupDragEvents(): void {
    this.scene.input.on(
      'drag',
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.Components.Transform,
        dragX: number,
        dragY: number
      ) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    );

    this.scene.input.on(
      'dragstart',
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Depth
      ) => {
        gameObject.setDepth(100);
      }
    );

    this.scene.input.on(
      'dragend',
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.Components.Depth
      ) => {
        gameObject.setDepth(0);
      }
    );
  }
}
