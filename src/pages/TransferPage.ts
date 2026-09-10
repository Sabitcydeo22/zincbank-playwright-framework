import { expect, type Locator, type Page } from '@playwright/test';

/**
 * A single entry of the "From"/"To" account dropdowns on the Move Money page.
 */
export interface AccountOption {
  /** The account id (the option's `value` attribute). */
  id: string;

  /** The visible label, e.g. `Savings ••1182 ($0.00)`. */
  label: string;
}

/**
 * Every account option must expose the account type, the last four digits and
 * the available balance, e.g. `Checking ••4471 ($0.00)`.
 */
export const ACCOUNT_LABEL_PATTERN = /^(Checking|Savings) ••\d{4} \(\$[\d,]+\.\d{2}\)$/;

/**
 * TransferPage (Move Money)
 * ---------------------------------------------------------------------------
 * Page Object for the Move Money screen at `/move-money`, which hosts the
 * "Transfer between accounts" form (ZIN-60 / US003).
 *
 * Encapsulates:
 *   • navigation to the page and waiting until the form is interactive,
 *   • reading/selecting the From & To accounts (with their balances),
 *   • typing the amount and memo,
 *   • submitting and asserting on the result banner (success or error code),
 *   • a couple of higher-level helpers used by the transfer step definitions.
 *
 * Only `data-testid` hooks are used, mirroring the rest of the framework.
 * ---------------------------------------------------------------------------
 */
export class TransferPage {
  private readonly transferForm: Locator;
  private readonly fromAccountSelect: Locator;
  private readonly toAccountSelect: Locator;
  private readonly amountInput: Locator;
  private readonly memoInput: Locator;
  private readonly submitButton: Locator;
  private readonly resultBanner: Locator;

  constructor(private readonly page: Page) {
    // The form is a "Card" rendered with data-testid="transfer-form".
    this.transferForm = page.getByTestId('transfer-form');
    this.fromAccountSelect = page.getByTestId('transfer-from');
    this.toAccountSelect = page.getByTestId('transfer-to');
    this.amountInput = page.getByTestId('transfer-amount');
    this.memoInput = page.getByTestId('transfer-memo');
    this.submitButton = page.getByTestId('transfer-submit');
    // Only rendered once a submit has produced a success/error result.
    this.resultBanner = page.getByTestId('transfer-result');
  }

  // ── Navigation ────────────────────────────────────────────────────────

  /** Opens the given Move Money URL and waits for the transfer form. */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
    await this.expectTransferFormVisible();
  }

  /** Asserts the browser is on the Move Money route. */
  async expectOnMoveMoneyPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/move-money$/);
  }

  /** Waits until every control of the transfer form is visible. */
  async expectTransferFormVisible(timeout = 30_000): Promise<void> {
    await expect(this.transferForm).toBeVisible({ timeout });
    await expect(this.fromAccountSelect).toBeVisible();
    await expect(this.toAccountSelect).toBeVisible();
    await expect(this.amountInput).toBeVisible();
    await expect(this.memoInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    await expect(this.submitButton).toHaveText(/Transfer/);
  }

  // ── Reading the account dropdowns ─────────────────────────────────────

  /** Returns every option of the "From" dropdown. */
  async getFromAccountOptions(): Promise<AccountOption[]> {
    return this.readOptions(this.fromAccountSelect);
  }

  /** Returns every option of the "To" dropdown. */
  async getToAccountOptions(): Promise<AccountOption[]> {
    return this.readOptions(this.toAccountSelect);
  }

  /** The id of the account currently selected as the source. */
  async getSelectedFromAccountId(): Promise<string> {
    return this.fromAccountSelect.inputValue();
  }

  /** The id of the account currently selected as the destination. */
  async getSelectedToAccountId(): Promise<string> {
    return this.toAccountSelect.inputValue();
  }

  /** The available balance (in cents) of the selected source account. */
  async getSelectedFromAccountBalanceCents(): Promise<number> {
    const selectedId = await this.getSelectedFromAccountId();
    const option = (await this.getFromAccountOptions()).find((o) => o.id === selectedId);
    if (!option) {
      throw new Error(`The selected source account "${selectedId}" was not found in the From dropdown.`);
    }
    return TransferPage.parseBalanceCents(option.label);
  }

  /** Reads the `$12.34` balance out of an account label into cents. */
  static parseBalanceCents(label: string): number {
    const match = /\(\$([\d,]+\.\d{2})\)$/.exec(label.trim());
    if (!match) {
      throw new Error(`Could not read an available balance from the account label "${label}".`);
    }
    return Math.round(Number(match[1].replace(/,/g, '')) * 100);
  }

  // ── Selecting / typing ────────────────────────────────────────────────

  /** Selects the source account by id. */
  async selectFromAccount(id: string): Promise<void> {
    await this.fromAccountSelect.selectOption(id);
  }

  /** Selects the destination account by id. */
  async selectToAccount(id: string): Promise<void> {
    await this.toAccountSelect.selectOption(id);
  }

  /**
   * Selects the first account as the source and the second account as the
   * destination - the standard "happy path" setup for a transfer.
   */
  async selectFirstTwoAccounts(): Promise<void> {
    const options = await this.getFromAccountOptions();
    if (options.length < 2) {
      throw new Error(
        `A transfer needs at least two accounts but the From dropdown only listed ${options.length}.`
      );
    }
    await this.selectFromAccount(options[0].id);
    await this.selectToAccount(options[1].id);
  }

  /** Points the destination at the currently selected source account. */
  async selectSourceAsDestination(): Promise<void> {
    await this.selectToAccount(await this.getSelectedFromAccountId());
  }

  /** Types a value into the "Amount (USD)" field. */
  async fillAmount(amount: string): Promise<void> {
    await this.amountInput.fill(amount);
  }

  /** Types a value into the optional "Memo" field. */
  async fillMemo(memo: string): Promise<void> {
    await this.memoInput.fill(memo);
  }

  /** Submits the transfer. */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  // ── Assertions ────────────────────────────────────────────────────────

  /**
   * Asserts the given dropdown lists at least two accounts and that every
   * option shows the type, last four digits and available balance.
   */
  async expectAccountOptions(select: 'from' | 'to'): Promise<void> {
    const options =
      select === 'from' ? await this.getFromAccountOptions() : await this.getToAccountOptions();
    expect(
      options.length,
      `The ${select} account dropdown should list at least two accounts (found ${options.length}).`
    ).toBeGreaterThanOrEqual(2);
    for (const option of options) {
      expect(
        option.label,
        `Account option "${option.label}" should show the type, last 4 digits and available balance.`
      ).toMatch(ACCOUNT_LABEL_PATTERN);
    }
  }

  /** Asserts the destination defaults to an account other than the source. */
  async expectDefaultDestinationDiffersFromSource(): Promise<void> {
    const fromId = await this.getSelectedFromAccountId();
    const toId = await this.getSelectedToAccountId();
    expect(toId, 'The "To" account should default to a different account than the "From" account.').not.toBe(
      fromId
    );
  }

  /**
   * Waits for the result banner and asserts its text matches the expected
   * message (success message or API error code).
   *
   * Dashes (-/-/-) and repeated whitespace are normalised on both sides so the
   * assertion is not broken by typographic differences.
   */
  async expectResultMessage(message: string, timeout = 15_000): Promise<void> {
    await expect(this.resultBanner).toBeVisible({ timeout });
    await expect
      .poll(async () => TransferPage.normalize(await this.resultBanner.innerText().catch(() => '')), {
        timeout
      })
      .toBe(TransferPage.normalize(message));
  }

  /** Asserts no result banner is rendered (e.g. before/without a submit). */
  async expectNoResult(): Promise<void> {
    await expect(this.resultBanner).toHaveCount(0);
  }

  /** Asserts the "Amount (USD)" field currently holds the given value. */
  async expectAmountValue(value: string): Promise<void> {
    await expect(this.amountInput).toHaveValue(value);
  }

  // ── Internals ─────────────────────────────────────────────────────────

  private async readOptions(select: Locator): Promise<AccountOption[]> {
    return select.locator('option').evaluateAll((options) =>
      options.map((option) => ({
        id: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).textContent?.trim() ?? ''
      }))
    );
  }

  private static normalize(text: string): string {
    return text.replace(/[\u2012-\u2015]/g, '-').replace(/\s+/g, ' ').trim();
  }
}
