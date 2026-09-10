import { IWorldOptions, setDefaultTimeout, setWorldConstructor, World } from '@cucumber/cucumber';
import type { Browser, BrowserContext, Page } from '@playwright/test';

/**
 * ZincBank is an SPA whose pages settle a few seconds after navigation
 * (login -> dashboard, Move Money, Transactions). Cucumber's default step
 * timeout of 5 s is too tight for that, so every step is allowed up to 30 s -
 * the same budget Playwright's own assertions use. This hardens the whole
 * suite against slow cold starts without changing any scenario logic.
 */
setDefaultTimeout(30_000);

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

  /**
   * Set while a password change still needs to be reverted (ZIN-59 / US002).
   *  - `currentPassword` is the password the account has right now (the one we
   *    just changed it to),
   *  - `restoreTo` is the original password from process.env.TEST_PASSWORD.
   *
   * The positive profile scenario clears this via an explicit teardown step;
   * the defensive cleanup in hooks.ts uses it as a safety net.
   */
  passwordReset?: { currentPassword: string; restoreTo: string };

  /**
   * Snapshot of the account labels (id -> "Savings ••1182 ($0.00)") taken from
   * the Move Money "From" dropdown (ZIN-60 / US003).
   *
   * The Transfer feature uses it as cross-step state so a later step can prove
   * that abandoning the transfer form without submitting never changes a
   * balance.
   */
  transferBalancesSnapshot?: Record<string, string>;

  /**
   * Every `/api/transactions` request the app triggers while the Transactions
   * feature (ZIN-61 / US004) runs. The date-range / pagination scenarios stub
   * the API and push each intercepted request URL here so a later step can
   * assert the exact `accountId`, `from`, `to` and `offset` query params the
   * UI really sent.
   */
  transactionsRequests?: string[];

  constructor(options: IWorldOptions) {
    super(options);
    // Calling super() wires up the helper methods that come with the World,
    // such as this.attach(...) which we use to embed screenshots in reports.
  }
}

// Tell Cucumber to build our CustomWorld (instead of the default World)
// for every scenario.
setWorldConstructor(CustomWorld);
