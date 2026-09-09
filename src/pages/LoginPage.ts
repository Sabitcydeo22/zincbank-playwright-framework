import { expect, type Locator, type Page } from '@playwright/test';

/**
 * LoginPage
 * ---------------------------------------------------------------------------
 * Page Object Model (POM) for the ZincBank login page.
 *
 * Idea: ALL knowledge about how to find and interact with the login page lives
 * in this one class. Step definitions stay clean and readable - they simply
 * call loginPage.login(...) / loginPage.expectErrorMessage(...).
 *
 * The ZincBank application exposes stable `data-testid` attributes, which are
 * the recommended way to locate elements in Playwright.
 * ---------------------------------------------------------------------------
 */
export class LoginPage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly signInButton: Locator;
  private readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByTestId('login-email-input');
    this.passwordInput = page.getByTestId('login-password-input');
    this.signInButton = page.getByTestId('login-submit');
    this.errorMessage = page.getByTestId('login-error');
  }

  // ── Actions ───────────────────────────────────────────────────────────

  /** Navigates the browser to the given absolute URL. */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  /** Types the email into the email field. */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /** Types the password into the password field. */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /** Clicks the "Sign in" submit button. */
  async clickSignIn(): Promise<void> {
    await this.signInButton.click();
  }

  /** Fills in the credentials and submits the form in one go. */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSignIn();
  }

  // ── Assertions ─────────────────────────────────────────────────────────

  /**
   * Asserts that the page shows the expected login error.
   * ZincBank shows:
   *   - "Enter your email and password."  when the form is submitted empty
   *   - "Invalid email or password."      for wrong credentials
   */
  async expectErrorMessage(expectedMessage: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toHaveText(expectedMessage);
  }
}
