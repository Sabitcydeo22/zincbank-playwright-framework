import { IWorldOptions, setWorldConstructor, World } from '@cucumber/cucumber';
import type { Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Custom World
 * ---------------------------------------------------------------------------
 * Cucumber creates ONE World object per scenario and makes it available as
 * `this` inside every step definition and Before/After hook.
 *
 * We use it as our "shared state" so every step of a scenario can reach the
 * same Playwright Browser, BrowserContext and Page instances that were
 * created in the Before hook (src/support/hooks.ts).
 * ---------------------------------------------------------------------------
 */
export class CustomWorld extends World {
  /** Playwright browser (Chromium) instance created for this scenario. */
  browser!: Browser;

  /** Isolated browser context (cookie jar, storage, etc.) for this scenario. */
  context!: BrowserContext;

  /** The active page inside the context - all UI actions happen on it. */
  page!: Page;

  constructor(options: IWorldOptions) {
    super(options);
    // Calling super() wires up the helper methods that come with the World,
    // such as this.attach(...) which we use to embed screenshots in reports.
  }
}

// Tell Cucumber to build our CustomWorld (instead of the default World)
// for every scenario.
setWorldConstructor(CustomWorld);
