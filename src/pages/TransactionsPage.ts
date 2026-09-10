import { expect, type Locator, type Page } from '@playwright/test';
import { ACCOUNT_LABEL_PATTERN } from './TransferPage';

/**
 * A single option of the "Account" filter on the Transactions page.
 */
export interface AccountOption {
  /** The account id (the option's `value` attribute). */
  id: string;

  /** The visible label, e.g. `Savings ••1182 ($0.00)`. */
  label: string;
}

/**
 * The values rendered inside one ledger row, in display order.
 */
export interface TransactionRowData {
  /** Formatted as `MM/DD/YYYY`. */
  date: string;

  /** The account-visible description (memo falls back to the raw kind). */
  description: string;

  /** The category badge label, e.g. `Transfer`, `Deposit`, `ATM`. */
  type: string;

  /** Signed amount, e.g. `+$2,500.00` (credit) or `-$25.00` (debit). */
  amount: string;

  /** Running balance after the transaction, e.g. `$2,475.00`. */
  balance: string;
}

/**
 * TransactionsPage (View activity)
 * ---------------------------------------------------------------------------
 * Page Object Model for the ZincBank activity ledger at `/transactions`
 * (User Story ZIN-61 / US004).
 *
 * The page hosts:
 *   • the Account filter + the "Current Balance" summary card for the
 *     selected account,
 *   • From / To date-range inputs plus an Apply button,
 *   • a statement-period dropdown and a "Download statement" link,
 *   • the transaction history table (Date | Description | Type | Amount |
 *     Balance) with `txn-row-<id>` rows,
 *   • a "N total" counter with Previous / Next pagination (25 rows/page),
 *   • an explicit empty state ("No transactions for this account and range.").
 *
 * Only stable `data-testid` hooks are used; the header cells and the per-row
 * ids rely on structural selectors because the app does not tag them.
 *
 * Money formatting (source of truth - the app bundle): debit amounts render a
 * leading ASCII hyphen (`-$25.00`), credits render a plus sign (`+$25.00`) and
 * the running balance is unsigned (`$0.00`).
 * ---------------------------------------------------------------------------
 */
export class TransactionsPage {
// ── Page shell ──────────────────────────────────────────────────────────
  private readonly view: Locator;
  private readonly heading: Locator;

  // ── Filters ─────────────────────────────────────────────────────────────
  private readonly accountSelect: Locator;
  private readonly fromDateInput: Locator;
  private readonly toDateInput: Locator;
  private readonly applyButton: Locator;

  // ── Summary card ────────────────────────────────────────────────────────
  private readonly summary: Locator;
  private readonly summaryBalance: Locator;

  // ── Statement section ───────────────────────────────────────────────────
  private readonly periodSelect: Locator;
  private readonly downloadStatementLink: Locator;

  // ── Result area ─────────────────────────────────────────────────────────
  private readonly total: Locator;
  private readonly emptyState: Locator;
  private readonly errorBanner: Locator;
  private readonly table: Locator;

  /** Every ledger row (`tr[data-testid^="txn-row-"]`). */
  private readonly rows: Locator;

  private readonly prevButton: Locator;
  private readonly nextButton: Locator;

  constructor(private readonly page: Page) {
    this.view = page.getByTestId('transactions-view');
    this.heading = page.getByRole('heading', { level: 1, name: 'Transactions' });

    this.accountSelect = page.getByTestId('transactions-account');
    this.fromDateInput = page.getByTestId('transactions-from');
    this.toDateInput = page.getByTestId('transactions-to');
    this.applyButton = page.getByTestId('transactions-apply');

    this.summary = page.getByTestId('transactions-summary');
    this.summaryBalance = page.getByTestId('transactions-balance');

    this.periodSelect = page.getByTestId('transactions-period');
    this.downloadStatementLink = page.getByTestId('transactions-statement');

    this.total = page.getByTestId('transactions-total');
    this.emptyState = page.getByTestId('transactions-empty');
    this.errorBanner = page.getByTestId('transactions-error');
    this.table = page.getByTestId('transactions-table');
    this.rows = page.locator('[data-testid^="txn-row-"]');

    this.prevButton = page.getByTestId('transactions-prev');
    this.nextButton = page.getByTestId('transactions-next');
  }

  // ── Navigation & readiness ──────────────────────────────────────────────

  /** Opens the given /transactions URL and waits until the page is ready. */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
    await this.expectPageReady();
  }

  /** Asserts the browser is on the /transactions route. */
  async expectOnTransactionsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/transactions$/);
  }

  /** Waits until the page shell, the account filter and the form controls are interactive. */
  async expectPageReady(timeout = 30_000): Promise<void> {
    await expect(this.view).toBeVisible({ timeout });
    await expect(this.heading).toBeVisible();
    await expect(this.accountSelect).toBeVisible();
    await expect(this.fromDateInput).toBeVisible();
    await expect(this.toDateInput).toBeVisible();
    await expect(this.applyButton).toBeVisible();
  }

  // ── Account filter ──────────────────────────────────────────────────────

  /** Returns every option of the "Account" dropdown. */
  async getAccountOptions(): Promise<AccountOption[]> {
    return this.accountSelect.locator('option').evaluateAll((options) =>
      options.map((option) => ({
        id: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).textContent?.trim() ?? ''
      }))
    );
  }

  /** Returns the id of the currently selected account option. */
  async getSelectedAccountId(): Promise<string> {
    return this.accountSelect.inputValue();
  }

  /** Selects the nth account (0-based) in the filter, like a customer would. */
  async selectAccountAtIndex(index: number): Promise<void> {
    const options = await this.getAccountOptions();
    expect(
      options.length,
      `The account filter should offer at least ${index + 1} accounts (found ${options.length}).`
    ).toBeGreaterThan(index);
    await this.accountSelect.selectOption({ index });
  }

  /** Asserts the filter lists at least two accounts in the `Type ••1234 ($X.XX)` format. */
  async expectAccountOptionsValid(): Promise<void> {
    const options = await this.getAccountOptions();
    expect(
      options.length,
      `The account filter should list at least two accounts (found ${options.length}).`
    ).toBeGreaterThanOrEqual(2);
    for (const option of options) {
      expect(
        option.label,
        `Account option "${option.label}" should show the type, last 4 digits and available balance.`
      ).toMatch(ACCOUNT_LABEL_PATTERN);
    }
  }

  // ── Date-range filters ──────────────────────────────────────────────────

  /** Types a `YYYY-MM-DD` value into the "From" date input. */
  async fillFromDate(date: string): Promise<void> {
    await this.fromDateInput.fill(date);
  }

  /** Types a `YYYY-MM-DD` value into the "To" date input. */
  async fillToDate(date: string): Promise<void> {
    await this.toDateInput.fill(date);
  }

  /** Clicks the "Apply" button (resets the page to offset 0 and re-fetches). */
  async clickApply(): Promise<void> {
    await this.applyButton.click();
  }
// ── Summary card ────────────────────────────────────────────────────────

  /**
   * Asserts the "Current Balance" summary belongs to the selected account:
   * the card shows the balance, the masked account number (••••1234) and the
   * account type derived from the currently selected option label.
   */
  async expectSummaryForSelectedAccount(): Promise<void> {
    await expect(this.summary).toBeVisible();
    await expect(this.summary).toContainText('Current Balance');
    await expect(this.summaryBalance).toBeVisible();
    await expect(this.summaryBalance).toHaveText(/^\$[\d,]+\.\d{2}$/);

    const options = await this.getAccountOptions();
    const selectedId = await this.getSelectedAccountId();
    const selected = options.find((option) => option.id === selectedId);
    expect(selected, 'The selected account option should be resolvable.').toBeDefined();

    const label = selected!.label;
    const last4 = label.match(/••(\d{4})/)?.[1];
    const type = label.match(/^(Checking|Savings)/)?.[1];
    expect(last4, 'The selected account label should expose the masked last four digits.').toBeTruthy();
    expect(type, 'The selected account label should expose the account type.').toBeTruthy();

    const summaryText = (await this.summary.innerText()).replace(/\s+/g, ' ').trim();
    expect(summaryText, `The summary should mention the selected account ${'••••' + last4}.`).toContain(
      `••••${last4}`
    );
    expect(summaryText, `The summary should mention the account type ${type}.`).toContain(type);
  }
// ── History table ───────────────────────────────────────────────────────

  /** Asserts the history table (or the live empty state) is rendered. */
  async expectActivitySectionDisplayed(): Promise<void> {
    await expect(this.view).toBeVisible();
    await expect
      .poll(() =>
        this.emptyState
          .isVisible()
          .catch(() => false)
          .then((empty) => empty || this.table.isVisible().catch(() => false))
      )
      .toBe(true);
  }

  /** Asserts the table is present with the Date | Description | Type | Amount | Balance headers. */
  async expectColumnHeaders(expectedHeaders: string[]): Promise<void> {
    await expect(this.table).toBeVisible();
    await expect
      .poll(async () => {
        const headers = await this.table.locator('thead th').allTextContents();
        return headers.map((header) => header.replace(/\s+/g, ' ').trim());
      })
      .toEqual(expectedHeaders);
  }

  /** Waits until the table renders exactly `expected` rows. */
  async expectRowCount(expected: number): Promise<void> {
    await expect.poll(() => this.rows.count(), { message: `Expected ${expected} ledger rows.` }).toBe(
      expected
    );
  }

  /**
   * Finds the row whose description cell equals `description` and asserts every
   * cell matches the expected date / type / amount / balance values.
   */
  async expectTransactionRow(description: string, expected: TransactionRowData): Promise<void> {
    const row = this.findRowByDescription(description);
    await expect(row, `A ledger row for "${description}" should be visible.`).toBeVisible();

    await expect(row.locator('td').nth(0)).toHaveText(expected.date);
    await expect(row.locator('td').nth(1)).toHaveText(expected.description);
    await expect(row.locator('td').nth(2)).toHaveText(expected.type);
    await expect(row.locator('td').nth(3)).toHaveText(expected.amount);
    await expect(row.locator('td').nth(4)).toHaveText(expected.balance);
  }

  /** Asserts the "N total" counter under the table. */
  async expectTotalText(expected: string): Promise<void> {
    await expect(this.total).toHaveText(expected);
  }

  /** Asserts the explicit "No transactions for this account and range." empty state. */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
    await expect(this.emptyState).toHaveText('No transactions for this account and range.');
  }

  /** Asserts the table is NOT rendered while the empty state is shown. */
  async expectNoTable(): Promise<void> {
    await expect(this.table).toHaveCount(0);
  }
// ── Pagination ──────────────────────────────────────────────────────────

  /** Clicks the given pagination button ("Previous" or "Next"). */
  async clickPagination(button: 'Previous' | 'Next'): Promise<void> {
    await (button === 'Previous' ? this.prevButton : this.nextButton).click();
  }

  /** Asserts a pagination button is enabled / disabled. */
  async expectPaginationEnabled(button: 'Previous' | 'Next', enabled: boolean): Promise<void> {
    const locator = button === 'Previous' ? this.prevButton : this.nextButton;
    if (enabled) {
      await expect(locator, `The "${button}" button should be enabled.`).toBeEnabled();
    } else {
      await expect(locator, `The "${button}" button should be disabled.`).toBeDisabled();
    }
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private findRowByDescription(description: string): Locator {
    return this.rows.filter({ hasText: description });
  }
}