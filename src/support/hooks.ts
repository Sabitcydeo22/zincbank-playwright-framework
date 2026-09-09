import { After, Before, Status } from '@cucumber/cucumber';
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { CustomWorld } from './world';

/** Folder where failure screenshots are stored next to the reports. */
const screenshotsDir = path.join(process.cwd(), 'reports', 'screenshots');

/**
 * Before hook
 * ---------------------------------------------------------------------------
 * Runs before EVERY scenario. Launches a fresh Chromium browser, opens a new
 * browser context (isolated storage/cookies) and creates a new page. All three
 * are stored on the Custom World so the steps can use them via `this`.
 *
 * Tips:
 *  - headless mode (default) runs without a visible window.
 *    Set HEADLESS=false in your .env to watch the browser while debugging.
 * ---------------------------------------------------------------------------
 */
Before(async function (this: CustomWorld) {
  this.browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false'
  });

  this.context = await this.browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  this.page = await this.context.newPage();
});

/**
 * After hook
 * ---------------------------------------------------------------------------
 * Runs after EVERY scenario. If the scenario FAILED we:
 *   1. take a full-page screenshot,
 *   2. save it to reports/screenshots/,
 *   3. attach it to the report (visible in the HTML report).
 *
 * Finally we always clean up by closing the context and the browser.
 * ---------------------------------------------------------------------------
 */
After(async function (this: CustomWorld, testCase: {
  result?: { status?: string };
  pickle?: { name?: string };
}) {
  try {
    if (testCase?.result?.status === Status.FAILED) {
      fs.mkdirSync(screenshotsDir, { recursive: true });

      const screenshot = await this.page.screenshot({ fullPage: true });

      // Build a safe file name from the scenario name, e.g.
      // "Login-rejected-with-invalid-credentials-1699999999999.png"
      const scenarioName = (testCase.pickle?.name ?? 'failed-scenario')
        .replace(/[^a-zA-Z0-9_-]+/g, '-');
      const screenshotPath = path.join(
        screenshotsDir,
        `${scenarioName}-${Date.now()}.png`
      );

      // 1) Keep a copy on disk for manual inspection / CI artifacts.
      fs.writeFileSync(screenshotPath, screenshot);

      // 2) Embed the screenshot in the HTML report (base64 attachment).
      await this.attach(screenshot, {
        mediaType: 'image/png',
        fileName: path.basename(screenshotPath)
      });

      console.log(`\n[hooks] Screenshot saved to: ${screenshotPath}\n`);
    }
  } catch (error) {
    // Screenshot problems must never hide the original failure.
    console.error('[hooks] Failed to capture screenshot:', error);
  } finally {
    // Clean up: closing the context also closes the page.
    await this.context?.close();
    await this.browser?.close();
  }
});
