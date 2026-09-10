import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { CustomWorld } from '../support/world';

/**
 * Step definitions for the Authenticated Customer Dashboard feature
 * (ZIN-57 / US001). Keeps the Gherkin glue thin - all heavy lifting is
 * delegated to the DashboardPage / LoginPage page objects.
 */

/**
 * Base URL of the ZincBank app, taken from the .env file
 * (loaded by cucumber.js) with a sensible fallback.
 */
const baseUrl = (process.env.BASE_URL ?? 'https://zincbank.cydeo.io')
  .replace(/\/+$/, ''); // strip trailing slashes

/**
 * Reads a required environment variable and fails with a helpful message
 * when it is missing (e.g. someone cloned the project but skipped .env).
 */
function requiredEnvVariable(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing environment variable "${name}". ` +
        'Copy .env.example to .env and fill in the values.'
    );
  }
  return value;
}

// ── Given ───────────────────────────────────────────────────────────────

/**
 * Logs in with the .env demo account and waits until the dashboard has
 * actually rendered. The ZincBank SPA can take a few seconds to settle after
 * submitting the login form, so we wait for the welcome heading (not just the
 * URL) before the scenario continues.
 */
Given('I am logged in to the ZincBank dashboard', async function (this: CustomWorld) {
  const email = requiredEnvVariable('TEST_USER');
  const password = requiredEnvVariable('TEST_PASSWORD');

  const loginPage = new LoginPage(this.page);
  const dashboardPage = new DashboardPage(this.page);

  await loginPage.goto(`${baseUrl}/login`);
  await loginPage.login(email, password);
  await dashboardPage.expectDashboardReady();
});

/**
 * Every scenario starts with a fresh browser context (no cookies / storage),
 * so the "unauthenticated" state is the default. This step simply establishes
 * the login page as the base state so the security assertions are meaningful.
 */
Given('I am an unauthenticated user', async function (this: CustomWorld) {
  await this.page.goto(`${baseUrl}/login`);
  await expect(this.page).toHaveURL(/\/login$/);
});

// ── When ────────────────────────────────────────────────────────────────

When('I open the dashboard page directly', async function (this: CustomWorld) {
  await this.page.goto(`${baseUrl}/dashboard`);
});

When('I open the accounts page directly', async function (this: CustomWorld) {
  await this.page.goto(`${baseUrl}/accounts`);
});

When('I refresh the dashboard page', async function (this: CustomWorld) {
  await this.page.reload({ waitUntil: 'domcontentloaded' });
});

When('I click the {string} navigation link', async function (this: CustomWorld, label: string) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.clickNavItem(label);
});

When('I sign out', async function (this: CustomWorld) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.signOut();
});

// ── Then ────────────────────────────────────────────────────────────────

Then('I should be on the dashboard page', async function (this: CustomWorld) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.expectOnDashboard();
});

Then('I should still be on the dashboard page', async function (this: CustomWorld) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.expectOnDashboard();
});

Then('I should be redirected to the login page', async function (this: CustomWorld) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.expectRedirectedToLogin();
});

Then('I should be redirected to the {string} page', async function (this: CustomWorld, path: string) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.expectUrl(path);
});

Then('the navigation items should be visible', async function (this: CustomWorld) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.expectAllNavItemsVisible();
});

Then('the navigation item {string} should be displayed', async function (this: CustomWorld, label: string) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.expectNavItemVisible(label);
});

Then('I should see the welcome message on the dashboard', async function (this: CustomWorld) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.expectWelcomeMessage();
});

Then('I should see the total deposit balance on the dashboard', async function (this: CustomWorld) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.expectTotalDepositBalanceVisible();
});

Then('I should see the account cards on the dashboard', async function (this: CustomWorld) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.expectAccountCardsVisible();
});

Then('the welcome message should still be visible', async function (this: CustomWorld) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.expectWelcomeMessage();
});

Then('no protected dashboard content should be shown', async function (this: CustomWorld) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.expectNoProtectedContent();
});
