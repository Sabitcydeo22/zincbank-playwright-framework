import { expect, type Locator, type Page } from '@playwright/test';

/**
 * ProfilePage
 * ---------------------------------------------------------------------------
 * Page Object Model (POM) for the ZincBank authenticated profile page
 * (/profile), covering User Story ZIN-59 / US002.
 *
 * Covers:
 *   - profile details (the "Profile" heading and the profile view),
 *   - the change-password form inputs (current + new password),
 *   - the "Change password" submit button,
 *   - the alert / success notification (profile-password-status).
 *
 * The ZincBank application exposes stable `data-testid` attributes, which are
 * the recommended way to locate elements in Playwright.
 * ---------------------------------------------------------------------------
 */
export class ProfilePage {
  /** The whole profile view section (heading + change password form). */
  private readonly profileView: Locator;

  /** The page heading, "Profile". */
  private readonly heading: Locator;

  /** The change password form. */
  private readonly passwordForm: Locator;

  /** Input for the customer's current password. */
  private readonly currentPasswordInput: Locator;

  /** Input for the new password the customer wants to set. */
  private readonly newPasswordInput: Locator;

  /** "Change password" submit button. */
  private readonly submitButton: Locator;

  /**
   * Alert / notification shown after a submit, e.g.
   *   "Password changed"
   *   "Current password is required"
   *   "New password must be at least 8 characters"
   *   "Current password is incorrect"
   * It is only rendered once the form has been submitted.
   */
  private readonly statusMessage: Locator;

  constructor(private readonly page: Page) {
    this.profileView = page.getByTestId('profile-view');
    this.heading = this.profileView.getByRole('heading', { name: 'Profile', level: 1 });
    this.passwordForm = page.getByTestId('profile-password-form');
    this.currentPasswordInput = page.getByTestId('profile-currentpassword-input');
    this.newPasswordInput = page.getByTestId('profile-newpassword-input');
    this.submitButton = page.getByTestId('profile-changepassword-submit');
    this.statusMessage = page.getByTestId('profile-password-status');
  }

  // ── Navigation ────────────────────────────────────────────────────────

  /**
   * Navigates the browser to the given absolute profile URL and waits until
   * the profile view has rendered.
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
    await this.expectProfileReady();
  }

  /** Waits until the profile view is actually rendered. */
  async expectProfileReady(timeout = 30_000): Promise<void> {
    await expect(this.profileView).toBeVisible({ timeout });
  }

  // ── Actions ───────────────────────────────────────────────────────────

  /** Types the current password into the current-password field. */
  async fillCurrentPassword(password: string): Promise<void> {
    await this.currentPasswordInput.fill(password);
  }

  /** Types the new password into the new-password field. */
  async fillNewPassword(password: string): Promise<void> {
    await this.newPasswordInput.fill(password);
  }

  /** Clicks the "Change password" submit button. */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Fills the current + new password and submits the form in one go.
   * Used by both the positive scenario and the teardown/revert step.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.fillCurrentPassword(currentPassword);
    await this.fillNewPassword(newPassword);
    await this.submit();
  }

  // ── Assertions ────────────────────────────────────────────────────────

  /** Asserts the browser is on the /profile page. */
  async expectOnProfile(): Promise<void> {
    await expect(this.page).toHaveURL(/\/profile$/);
  }

  /** Asserts the profile view (heading + section) is visible. */
  async expectProfileVisible(): Promise<void> {
    await expect(this.profileView).toBeVisible();
    await expect(this.heading).toBeVisible();
    await expect(this.heading).toHaveText('Profile');
  }

  /** Asserts the change password form and all of its controls are visible. */
  async expectChangePasswordFormVisible(): Promise<void> {
    await expect(this.passwordForm).toBeVisible();
    await expect(this.currentPasswordInput).toBeVisible();
    await expect(this.newPasswordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    await expect(this.submitButton).toHaveText('Change password');
  }

  /**
   * Asserts the alert / success notification is visible and shows exactly the
   * expected message.
   */
  async expectStatusMessage(message: string, timeout = 15_000): Promise<void> {
    await expect(this.statusMessage).toBeVisible({ timeout });
    await expect(this.statusMessage).toHaveText(message);
  }

  /** Asserts no alert / notification is currently rendered. */
  async expectNoStatusMessage(): Promise<void> {
    await expect(this.statusMessage).toHaveCount(0);
  }
}
