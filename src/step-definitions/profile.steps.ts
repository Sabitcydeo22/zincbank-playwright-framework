import { Then, When } from '@cucumber/cucumber';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';
import { CustomWorld } from '../support/world';

/**
 * Step definitions for the Profile Information and Change Password feature
 * (ZIN-59 / US002). The Gherkin glue stays thin - all page knowledge lives in
 * the ProfilePage page object.
 *
 * Password teardown (critical requirement):
 * ---------------------------------------------------------------------------
 * The positive scenario changes the password to a fresh value and then
 * IMMEDIATELY reverts it back to process.env.TEST_PASSWORD, so the shared test
 * account keeps working for future runs. The state needed to revert is kept on
 * the World (world.passwordReset) and the defensive cleanup in hooks.ts
 * restores the password even if the scenario fails before the teardown step.
 * ---------------------------------------------------------------------------
 */

/** Base URL of the ZincBank app (loaded from .env by cucumber.js). */
const baseUrl = (process.env.BASE_URL ?? 'https://zincbank.cydeo.io')
  .replace(/\/+$/, ''); // strip trailing slashes

/** Route of the authenticated profile page. */
const profilePath = '/profile';

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

/**
 * Builds a brand-new password for the positive scenario. It is unique per run
 * and always different from the original password, so the change is real.
 */
function generateNewPassword(): string {
  return `Zinc#Pass${Date.now()}`;
}

/**
 * Maps a friendly keyword used in the AC4 scenario outline to the value that
 * is typed into a password field:
 *   "empty"       -> no value at all (a required field left blank),
 *   "correct"     -> the original password from .env,
 *   "wrong"       -> a deliberately incorrect password,
 *   anything else -> the literal value.
 */
function resolvePasswordInput(token: string): string {
  switch (token.trim()) {
    case 'empty':
      return '';
    case 'correct':
      return requiredEnvVariable('TEST_PASSWORD');
    case 'wrong':
      return 'DefinitelyNotThePassword#1';
    default:
      return token;
  }
}

// ── When ────────────────────────────────────────────────────────────────

When('I open the Profile page', async function (this: CustomWorld) {
  const profilePage = new ProfilePage(this.page);
  await profilePage.goto(`${baseUrl}${profilePath}`);
});

/**
 * Positive path: change the password to a brand-new value.
 * Records the pending change on the World so it can be reverted afterwards.
 */
When('I change my password to a new valid password', async function (this: CustomWorld) {
  const originalPassword = requiredEnvVariable('TEST_PASSWORD');
  const newPassword = generateNewPassword();

  // Remember how to get back to the original password. Used by the explicit
  // teardown step below and by the defensive cleanup in hooks.ts.
  this.passwordReset = { currentPassword: newPassword, restoreTo: originalPassword };

  const profilePage = new ProfilePage(this.page);
  await profilePage.changePassword(originalPassword, newPassword);
});

/**
 * Teardown / revert step: reset the password back to process.env.TEST_PASSWORD
 * so the test account is never left in a changed state.
 */
When('I change my password back to the original password', async function (this: CustomWorld) {
  const reset = this.passwordReset;
  if (!reset) {
    throw new Error(
      'No password change is pending - run "I change my password to a new valid password" first.'
    );
  }

  const profilePage = new ProfilePage(this.page);
  await profilePage.changePassword(reset.currentPassword, reset.restoreTo);

  // Only clear the pending state once the restore is confirmed, so the
  // defensive cleanup still runs if this step fails halfway through.
  await profilePage.expectStatusMessage('Password changed');
  this.passwordReset = undefined;
});

/** Negative path: submit the form with the supplied (possibly invalid) values. */
When(
  'I submit the change password form with current password {string} and new password {string}',
  async function (this: CustomWorld, currentPassword: string, newPassword: string) {
    const profilePage = new ProfilePage(this.page);
    await profilePage.changePassword(
      resolvePasswordInput(currentPassword),
      resolvePasswordInput(newPassword)
    );
  }
);

// ── Then ────────────────────────────────────────────────────────────────

Then('the Profile page should be displayed', async function (this: CustomWorld) {
  const profilePage = new ProfilePage(this.page);
  await profilePage.expectProfileVisible();
});

Then('the change password form should be displayed', async function (this: CustomWorld) {
  const profilePage = new ProfilePage(this.page);
  await profilePage.expectChangePasswordFormVisible();
});

Then(
  'I should see the profile message {string}',
  async function (this: CustomWorld, message: string) {
    const profilePage = new ProfilePage(this.page);
    await profilePage.expectStatusMessage(message);
  }
);

/** Proves the account really is usable again with the original password. */
Then(
  'I should be able to log in again with the original password',
  async function (this: CustomWorld) {
    const email = requiredEnvVariable('TEST_USER');
    const password = requiredEnvVariable('TEST_PASSWORD');

    // Sign out (we are on /profile) so the next login proves the restored
    // password works end-to-end.
    const dashboardPage = new DashboardPage(this.page);
    await dashboardPage.signOut();

    const loginPage = new LoginPage(this.page);
    await loginPage.login(email, password);
    await dashboardPage.expectDashboardReady();
  }
);
