import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { TransferPage } from '../pages/TransferPage';
import { CustomWorld } from '../support/world';

/**
 * Step definitions for the Transfer Money Between Own Accounts feature
 * (ZIN-60 / US003). Keeps the Gherkin glue thin - all page knowledge lives in
 * the TransferPage page object, and the shared
 * "I am logged in to the ZincBank dashboard" step is reused from
 * dashboard.steps.ts.
 */

/** Base URL of the ZincBank app (loaded from .env by cucumber.js). */
const baseUrl = (process.env.BASE_URL ?? 'https://zincbank.cydeo.io').replace(/\/+$/, '');

/** Route of the Move Money / transfer page. */
const moveMoneyPath = '/move-money';

/** Buffer added on top of the balance to build an over-balance amount ($1,000). */
const OVER_BALANCE_BUFFER_CENTS = 100_000;

// ── When ────────────────────────────────────────────────────────────────

/** Opens the Move Money page directly and waits for the transfer form. */
When('I open the Move Money page', async function (this: CustomWorld) {
  const transferPage = new TransferPage(this.page);
  await transferPage.goto(`${baseUrl}${moveMoneyPath}`);
});

/** Uses the dashboard quick-action shortcut instead of the sidebar. */
When('I click the dashboard {string} shortcut', async function (this: CustomWorld, _label: string) {
  const dashboardPage = new DashboardPage(this.page);
  await dashboardPage.clickQuickTransfer();
});

/** Selects the first account as source and the second as destination. */
When(
  'I select the first account as the source and the second account as the destination',
  async function (this: CustomWorld) {
    const transferPage = new TransferPage(this.page);
    await transferPage.selectFirstTwoAccounts();
  }
);

/** Points the destination dropdown back at the selected source account. */
When('I select the source account as the destination account', async function (this: CustomWorld) {
  const transferPage = new TransferPage(this.page);
  await transferPage.selectSourceAsDestination();
});

/** Types an amount into the "Amount (USD)" field. */
When('I enter the transfer amount {string}', async function (this: CustomWorld, amount: string) {
  const transferPage = new TransferPage(this.page);
  await transferPage.fillAmount(amount);
});

/**
 * Builds an amount that is guaranteed to be larger than the selected source
 * account's available balance, so the API must reject it with
 * INSUFFICIENT_FUNDS regardless of the demo balances.
 */
When('I enter a transfer amount exceeding the available balance', async function (this: CustomWorld) {
  const transferPage = new TransferPage(this.page);
  const balanceCents = await transferPage.getSelectedFromAccountBalanceCents();
  const overBalance = ((balanceCents + OVER_BALANCE_BUFFER_CENTS) / 100).toFixed(2);
  await transferPage.fillAmount(overBalance);
});

/** Types an optional memo. */
When('I enter the transfer memo {string}', async function (this: CustomWorld, memo: string) {
  const transferPage = new TransferPage(this.page);
  await transferPage.fillMemo(memo);
});

/** Submits the transfer form. */
When('I submit the transfer', async function (this: CustomWorld) {
  const transferPage = new TransferPage(this.page);
  await transferPage.submit();
});

/**
 * Stubs POST /api/transfers so the browser receives a successful response with
 * the given "new balance". Because every ZincBank demo account sits at $0.00
 * and there is no funding flow, this is how the AC4 success path is exercised:
 * the UI renders its real success banner from the (simulated) response and
 * resets the amount field. See the note in transfer.feature.
 */
When(
  'I stub the transfer API so a successful transfer leaves a balance of {string}',
  async function (this: CustomWorld, newBalance: string) {
    const balanceCents = Math.round(Number(newBalance.replace(/,/g, '')) * 100);
    await this.page.route('**/api/transfers', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { fromBalanceCents: balanceCents } })
      });
    });
  }
);

/** Snapshots every account label (id -> "Type ••1234 ($X.XX)") for later checks. */
When('I capture the current account balances', async function (this: CustomWorld) {
  const transferPage = new TransferPage(this.page);
  const options = await transferPage.getFromAccountOptions();
  this.transferBalancesSnapshot = Object.fromEntries(options.map((option) => [option.id, option.label]));
});

/**
 * Abandons the form without submitting - the closest real-world equivalent of
 * a "Cancel" (the demo form has no Cancel button). Navigating away means no
 * transfer request is ever sent.
 */
When('I leave the Move Money page without submitting', async function (this: CustomWorld) {
  await this.page.goto(`${baseUrl}/dashboard`);
});

// ── Then ────────────────────────────────────────────────────────────────

/** AC1: the Move Money route is open and the transfer form is rendered. */
Then('the transfer form should be displayed', async function (this: CustomWorld) {
  const transferPage = new TransferPage(this.page);
  await transferPage.expectOnMoveMoneyPage();
  await transferPage.expectTransferFormVisible();
});

/** AC2: the "From" dropdown lists active accounts with their balances. */
Then(
  'the From Account dropdown should list the active accounts with their available balances',
  async function (this: CustomWorld) {
    const transferPage = new TransferPage(this.page);
    await transferPage.expectAccountOptions('from');
  }
);

/** AC3: the "To" dropdown lists destinations and defaults away from the source. */
Then('the To Account dropdown should list the destination accounts', async function (this: CustomWorld) {
  const transferPage = new TransferPage(this.page);
  await transferPage.expectAccountOptions('to');
  await transferPage.expectDefaultDestinationDiffersFromSource();
});

/** AC4/AC5: the result banner shows the expected success message / error code. */
Then('I should see the transfer result {string}', async function (this: CustomWorld, message: string) {
  const transferPage = new TransferPage(this.page);
  await transferPage.expectResultMessage(message);
});

/** AC4: after a successful transfer the amount field is cleared. */
Then('the transfer amount field should be reset', async function (this: CustomWorld) {
  const transferPage = new TransferPage(this.page);
  await transferPage.expectAmountValue('');
});

/** AC6: no balance changed while the form was abandoned. */
Then('the account balances should be unchanged', async function (this: CustomWorld) {
  const snapshot = this.transferBalancesSnapshot;
  if (!snapshot) {
    throw new Error('No balance snapshot found - run "I capture the current account balances" first.');
  }
  const transferPage = new TransferPage(this.page);
  const current = await transferPage.getFromAccountOptions();
  for (const [id, label] of Object.entries(snapshot)) {
    const after = current.find((option) => option.id === id);
    expect(after?.label, `The balance label for account ${id} should not have changed.`).toBe(label);
  }
});

/** AC6: abandoning the form never triggers a transfer, so no banner is shown. */
Then('no transfer result should be displayed', async function (this: CustomWorld) {
  const transferPage = new TransferPage(this.page);
  await transferPage.expectNoResult();
});
