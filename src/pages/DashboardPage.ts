import { expect, type Locator, type Page } from '@playwright/test';

/**
 * DashboardPage
 * ---------------------------------------------------------------------------
 * Page Object Model (POM) for the ZincBank authenticated dashboard (/dashboard).
 *
 * Covers (User Story ZIN-57 / US001):
 *   - sidebar / header navigation links (dashboard, accounts, move money,
 *     transactions, cards, profile, sign out),
 *   - content assertions (welcome banner, total deposit balance, account cards),
 *   - navigation actions (clickAccounts, clickMoveMoney, clickProfile, ...),
 *   - sign out action.
 *
 * The ZincBank application exposes stable `data-testid` attributes, which are
 * the recommended way to locate elements in Playwright. Navigation links live
 * in the sticky app header and keep the same testids on every authenticated
 * page, so the same locators keep working after navigating away and back.
 * ---------------------------------------------------------------------------
 */
export class DashboardPage {
  // ── Sidebar / header navigation links ─────────────────────────────────
  private readonly navDashboard: Locator;
  private readonly navAccounts: Locator;
  private readonly navMoveMoney: Locator;
  private readonly navTransactions: Locator;
  private readonly navCards: Locator;
  private readonly navProfile: Locator;
  private readonly navSignOut: Locator;

  /** Navigation items keyed by their displayed label (for data-driven steps). */
  private readonly navByLabel: Record<string, Locator>;

  // ── Dashboard content ─────────────────────────────────────────────────
  private readonly welcomeHeading: Locator;
  private readonly totalDepositBalance: Locator;
  private readonly accountCards: Locator;

  constructor(private readonly page: Page) {
    this.navDashboard = page.getByTestId('nav-dashboard');
    this.navAccounts = page.getByTestId('nav-accounts');
    this.navMoveMoney = page.getByTestId('nav-move-money');
    this.navTransactions = page.getByTestId('nav-transactions');
    this.navCards = page.getByTestId('nav-cards');
    this.navProfile = page.getByTestId('nav-profile');
    this.navSignOut = page.getByTestId('nav-signout');

    this.navByLabel = {
      Dashboard: this.navDashboard,
      Accounts: this.navAccounts,
      'Move money': this.navMoveMoney,
      Transactions: this.navTransactions,
      Cards: this.navCards,
      Profile: this.navProfile,
      'Sign out': this.navSignOut
    };

    this.welcomeHeading = page.getByTestId('dashboard-welcome');
    this.totalDepositBalance = page.getByTestId('dashboard-total-deposit');
    // Account card testids contain a dynamic UUID, e.g.
    // "dashboard-account-card-e6539f51-...", so match by prefix.
    this.accountCards = page.locator('[data-testid^="dashboard-account-card-"]');
  }

  // ── Navigation actions ────────────────────────────────────────────────

  /** Clicks the "Dashboard" sidebar link. */
  async clickDashboard(): Promise<void> {
    await this.navDashboard.click();
  }

  /** Clicks the "Accounts" sidebar link. */
  async clickAccounts(): Promise<void> {
    await this.navAccounts.click();
  }

  /** Clicks the "Move money" sidebar link. */
  async clickMoveMoney(): Promise<void> {
    await this.navMoveMoney.click();
  }

  /** Clicks the "Transactions" sidebar link. */
  async clickTransactions(): Promise<void> {
    await this.navTransactions.click();
  }

  /** Clicks the "Cards" sidebar link. */
  async clickCards(): Promise<void> {
    await this.navCards.click();
  }

  /** Clicks the "Profile" sidebar link. */
  async clickProfile(): Promise<void> {
    await this.navProfile.click();
  }

  /**
   * Clicks a navigation item by its displayed label (e.g. "Move money").
   * Used by the data-driven "each navigation element navigates" scenario.
   */
  async clickNavItem(label: string): Promise<void> {
    await this.resolveNavItem(label).click();
  }

  /**
   * Signs out: clicks the "Sign out" button and waits until the browser
   * lands back on the login page.
   */
  async signOut(): Promise<void> {
    await this.navSignOut.click();
    await expect(this.page).toHaveURL(/\/login$/);
  }

  // ── Content assertions ────────────────────────────────────────────────

  /**
   * Waits until the dashboard content is actually rendered.
   * The ZincBank SPA can take a few seconds to settle after login, so this
   * is used by the shared "I am logged in to the ZincBank dashboard" step.
   */
  async expectDashboardReady(timeout = 30_000): Promise<void> {
    await expect(this.welcomeHeading).toBeVisible({ timeout });
  }

  /** Asserts the welcome banner is visible and greets the customer. */
  async expectWelcomeMessage(): Promise<void> {
    await expect(this.welcomeHeading).toBeVisible();
    await expect(this.welcomeHeading).toContainText('Welcome');
  }

  /** Asserts the "Total deposit balance" figure is visible. */
  async expectTotalDepositBalanceVisible(): Promise<void> {
    await expect(this.totalDepositBalance).toBeVisible();
  }

  /** Asserts at least one account card is visible in the "Your accounts" section. */
  async expectAccountCardsVisible(): Promise<void> {
    const count = await this.accountCards.count();
    expect(count).toBeGreaterThan(0);
    await expect(this.accountCards.first()).toBeVisible();
  }

  /** Asserts every sidebar navigation element (including Sign out) is visible. */
  async expectAllNavItemsVisible(): Promise<void> {
    for (const locator of Object.values(this.navByLabel)) {
      await expect(locator).toBeVisible();
    }
  }

  /** Asserts a single navigation item (by displayed label) is visible. */
  async expectNavItemVisible(label: string): Promise<void> {
    await expect(this.resolveNavItem(label)).toBeVisible();
  }

  /**
   * Asserts that no protected dashboard content is rendered - used after a
   * redirect to /login to prove the dashboard never leaked to unauthenticated
   * users.
   */
  async expectNoProtectedContent(): Promise<void> {
    await expect(this.welcomeHeading).not.toBeVisible();
    await expect(this.navAccounts).not.toBeVisible();
  }

  // ── URL assertions ────────────────────────────────────────────────────

  /** Asserts the browser is on the /dashboard page. */
  async expectOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard$/);
  }

  /** Asserts the browser is on the /login page. */
  async expectRedirectedToLogin(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login$/);
  }

  /** Asserts the browser URL ends with the given path (e.g. "/accounts"). */
  async expectUrl(path: string): Promise<void> {
    const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(this.page).toHaveURL(new RegExp(`${escapedPath}$`));
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private resolveNavItem(label: string): Locator {
    const locator = this.navByLabel[label];
    if (!locator) {
      throw new Error(
        `Unknown navigation item "${label}". Expected one of: ` +
          Object.keys(this.navByLabel).join(', ')
      );
    }
    return locator;
  }
}
