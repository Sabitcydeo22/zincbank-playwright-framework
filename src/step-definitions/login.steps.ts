import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { CustomWorld } from '../support/world';

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

Given('I am on the ZincBank login page', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.goto(`${baseUrl}/login`);
});

// ── When ────────────────────────────────────────────────────────────────

When(
  'I log in with the valid test user credentials',
  async function (this: CustomWorld) {
    const email = requiredEnvVariable('TEST_USER');
    const password = requiredEnvVariable('TEST_PASSWORD');

    const loginPage = new LoginPage(this.page);
    await loginPage.login(email, password);
  }
);

When(
  'I log in with email {string} and password {string}',
  async function (this: CustomWorld, email: string, password: string) {
    const loginPage = new LoginPage(this.page);
    await loginPage.login(email, password);
  }
);

// ── Then ────────────────────────────────────────────────────────────────

Then(
  'I should be redirected to the Dashboard page',
  async function (this: CustomWorld) {
    // ZincBank redirects to /dashboard after a successful login.
    await expect(this.page).toHaveURL(/\/dashboard$/);
  }
);

Then('the welcome heading should be visible', async function (this: CustomWorld) {
  await expect(this.page.getByTestId('dashboard-welcome')).toBeVisible();
});

Then(
  'I should see the error message {string}',
  async function (this: CustomWorld, expectedMessage: string) {
    const loginPage = new LoginPage(this.page);
    await loginPage.expectErrorMessage(expectedMessage);
  }
);
