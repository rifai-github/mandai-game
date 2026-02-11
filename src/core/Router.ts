/**
 * Custom URL router using the History API.
 * Maps URL pathnames to Phaser scene keys.
 * Supports pushState, popstate, and back/forward navigation.
 */

import { SceneKeys, RoutePaths, ROUTE_TABLE, RouteEntry } from './Config';

/** Callback invoked when the route changes */
export type RouteChangeCallback = (sceneKey: SceneKeys) => void;

export class Router {
  private onRouteChange: RouteChangeCallback | null = null;
  private currentSceneKey: SceneKeys = SceneKeys.Menu;

  constructor() {
    this.bindPopState();
  }

  /** Resolve the current URL pathname to a scene key */
  resolve(): SceneKeys {
    const pathname = window.location.pathname;
    const entry = this.findRoute(pathname);

    if (entry) {
      this.currentSceneKey = entry.sceneKey;
      return entry.sceneKey;
    }

    this.currentSceneKey = SceneKeys.Menu;
    return SceneKeys.Menu;
  }

  /** Navigate to a new route, updating the URL and triggering scene change */
  navigate(path: RoutePaths): void {
    const entry = this.findRoute(path);
    if (!entry) return;

    window.history.pushState({ sceneKey: entry.sceneKey }, '', path);
    this.currentSceneKey = entry.sceneKey;

    if (this.onRouteChange) {
      this.onRouteChange(entry.sceneKey);
    }
  }

  /** Register a callback for route changes (popstate / navigate) */
  setRouteChangeHandler(callback: RouteChangeCallback): void {
    this.onRouteChange = callback;
  }

  /** Get the current active scene key */
  getCurrentSceneKey(): SceneKeys {
    return this.currentSceneKey;
  }

  /** Get all available routes for menu rendering */
  getRoutes(): readonly RouteEntry[] {
    return ROUTE_TABLE;
  }

  /** Unbind event listeners for cleanup */
  destroy(): void {
    window.removeEventListener('popstate', this.handlePopState);
    this.onRouteChange = null;
  }

  private findRoute(pathname: string): RouteEntry | undefined {
    const normalized = pathname.replace(/\/+$/, '') || '/';
    return ROUTE_TABLE.find((entry) => entry.path === normalized);
  }

  private bindPopState(): void {
    window.addEventListener('popstate', this.handlePopState);
  }

  private handlePopState = (): void => {
    const sceneKey = this.resolve();
    if (this.onRouteChange) {
      this.onRouteChange(sceneKey);
    }
  };
}
