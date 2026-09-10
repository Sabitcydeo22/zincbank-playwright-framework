import { DataTable, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { TransactionsPage, type TransactionRowData } from '../pages/TransactionsPage';
import { CustomWorld } from '../support/world';

/**
 * Step definitions for the Transactions / View Activity feature (ZIN-61 /
 * US004). Keeps the Gherkin glue thin - all page knowledge lives in the
 * TransactionsPage page object, and the shared
 * "I am logged in to the ZincBank dashboard" step is reused from
 * dashboard.steps.ts.
 */

/** Base URL of the ZincBank app (loaded from .env by cucumber.js). */
const baseUrl = (process.env.BASE_URL ?? 'https://zincbank.cydeo.io').replace(/\/+$/, '');

/** Route of the Transactions / View Activity page. */
const transactionsPath = '/transactions';

/** One row of the ledger payload replayed by the `/api/transactions` stub. */
interface StubTransaction {
  id: string;
  /** ISO timestamp, e.g. `2025-01-31T09:15:00Z` (rendered as `MM/DD/YYYY`). */
  postedAt: string;
  memo?: string;
  kind: string;
  direction: 'credit' | 'debit';
  amountCents: number;
  /** Running balance after the row (unsigned cents). */
  runningBalanceCents: number;
}

// ── Stub helpers ─────────────────────────────────────────────────────────

/** Builds the stub ledger from the Gherkin DataTable (dropping empty memos). */
function stubLedgerFromTable(table: DataTable): StubTransaction[] {
  return table.hashes().map((row, index) => ({
    id: row.id?.trim() || `txn-${index + 1}`,
    postedAt: row.postedAt.trim(),
    memo: row.memo?.trim() || undefined,
    kind: row.kind.trim(),
    direction: row.direction.trim() === 'credit' ? 'credit' : 'debit',
    amountCents: Number(row.amountCents),
    runningBalanceCents: Number(row.runningBalanceCents)
  }));
}

/**
 * Intercepts GET /api/transactions so the browser receives a deterministic
 * ledger. The stub mimics the real backend: it honours the `accountId`,
 * `limit`/`offset` and the inclusive `from`/`to` date-range query params the
 * UI sends, records every request URL on the World (so later steps can verify
 * the exact query string) and returns `{ ok, data: { transactions, total } }`.
 */
async function stubTransactionsApi(world: CustomWorld, ledger: StubTransaction[]): Promise<void> {
  await world.page.route('**/api/transactions*', async (route) => {
    const url = new URL(route.request().url());
    world.transactionsRequests = world.transactionsRequests ?? [];
    world.transactionsRequests.push(url.toString());

    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const offset = Number(url.searchParams.get('offset') ?? '0');
    const limit = Number(url.searchParams.get('limit') ?? '25');

    let matched = ledger;
    if (from) {
      matched = matched.filter((transaction) => transaction.postedAt.slice(0, 10) >= from);
    }
    if (to) {
      matched = matched.filter((transaction) => transaction.postedAt.slice(0, 10) <= to);
    }
    const total = matched.length;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { transactions: matched.slice(offset, offset + limit), total },
        meta: { requestId: 'playwright-stub' }
      })
    });
  });
}

/** Returns the LAST intercepted /api/transactions request URL. */
function lastTransactionsRequest(world: CustomWorld): URL {
  const requests = world.transactionsRequests;
  expect(
    requests && requests.length >= 1,
    'No /api/transactions request was captured - run one of the stub steps first.'
  ).toBeTruthy();
  return new URL(requests![requests!.length - 1]);
}

// ── When ─────────────────────────────────────────────────────────────────

/** Opens the Transactions page directly and waits until it is ready. */
When('I open the Transactions page', async function (this: CustomWorld) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.goto(`${baseUrl}${transactionsPath}`);
});

/**
 * Stubs GET /api/transactions with an explicit ledger. The stub applies the
 * date-range filtering the real backend would, so the From/To scenarios are
 * exercised end to end without touching the shared demo data.
 */
When(
  'I stub the transactions API with the following ledger:',
  async function (this: CustomWorld, table: DataTable) {
    await stubTransactionsApi(this, stubLedgerFromTable(table));
  }
);

/** Generates and stubs a synthetic ledger of `count` entries (for pagination). */
When(
  'I stub the transactions API to return {int} transactions',
  async function (this: CustomWorld, count: number) {
    const ledger: StubTransaction[] = [];
    for (let i = 0; i < count; i++) {
      const n = count - i;
      const isCredit = i % 2 === 0;
      ledger.push({
        id: `txn-${i + 1}`,
        postedAt: `2025-01-${String(n).padStart(2, '0')}T10:00:00.000Z`,
        memo: `Ledger entry ${n}`,
        kind: isCredit ? 'deposit' : 'purchase',
        direction: isCredit ? 'credit' : 'debit',
        amountCents: 1000 + i * 100,
        runningBalanceCents: 500000 - i * 100
      });
    }
    await stubTransactionsApi(this, ledger);
  }
);

/** Switches the Account filter to the second account option. */
When('I select the second account in the account filter', async function (this: CustomWorld) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.selectAccountAtIndex(1);
});

/** Types a `YYYY-MM-DD` value into the "From" date input. */
When('I set the transactions From date to {string}', async function (this: CustomWorld, date: string) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.fillFromDate(date);
});

/** Types a `YYYY-MM-DD` value into the "To" date input. */
When('I set the transactions To date to {string}', async function (this: CustomWorld, date: string) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.fillToDate(date);
});

/** Clicks the "Apply" button to re-run the query from page 1. */
When('I apply the transaction filters', async function (this: CustomWorld) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.clickApply();
});

/** Clicks the "Previous" or "Next" pagination button. */
When('I click the {string} pagination button', async function (this: CustomWorld, label: string) {
  const transactionsPage = new TransactionsPage(this.page);
  if (label !== 'Previous' && label !== 'Next') {
    throw new Error(`Unknown pagination button "${label}". Expected "Previous" or "Next".`);
  }
  await transactionsPage.clickPagination(label);
});
// ── Then ─────────────────────────────────────────────────────────────────

/** AC1: the /transactions route is open and the ledger page is rendered. */
Then('the transactions page should be displayed', async function (this: CustomWorld) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.expectOnTransactionsPage();
  await transactionsPage.expectPageReady();
});

/** AC2: the Account filter lists at least two accounts with type/last4/balance. */
Then('the account filter should list the active accounts with their available balances', async function (this: CustomWorld) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.expectAccountOptionsValid();
});

/** AC2: the summary card follows the selected account (balance + mask + type). */
Then('the transactions summary should show the balance for the selected account', async function (this: CustomWorld) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.expectSummaryForSelectedAccount();
});

/** AC2: the history table renders the exact column headers. */
Then(
  'the transaction history table should display the columns {string}',
  async function (this: CustomWorld, columns: string) {
    const expectedHeaders = columns.split(',').map((column) => column.trim());
    const transactionsPage = new TransactionsPage(this.page);
    await transactionsPage.expectColumnHeaders(expectedHeaders);
  }
);

/** AC2/AC4: the table renders the expected number of rows. */
Then('the transaction history should contain {int} row(s)', async function (this: CustomWorld, count: number) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.expectRowCount(count);
});

/** AC2/AC5: a specific row (by description) shows date, type, amount and balance. */
Then(
  'the transaction labeled {string} should show date {string}, type {string}, amount {string} and balance {string}',
  async function (
    this: CustomWorld,
    description: string,
    date: string,
    type: string,
    amount: string,
    balance: string
  ) {
    const expectedRow: TransactionRowData = { date, description, type, amount, balance };
    const transactionsPage = new TransactionsPage(this.page);
    await transactionsPage.expectTransactionRow(description, expectedRow);
  }
);

/** AC2/AC4: the counter under the table reads "<N> total". */
Then('the transactions total should read {string}', async function (this: CustomWorld, expected: string) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.expectTotalText(expected);
});
/** AC3/AC4: no matching transactions -> the explicit empty state is shown. */
Then('the transactions empty state should be displayed', async function (this: CustomWorld) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.expectEmptyState();
});

/** AC4: the empty state replaces the history table. */
Then('the transaction history table should not be displayed', async function (this: CustomWorld) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.expectNoTable();
});

/** AC4: the activity section (table OR empty state) is rendered for the real account. */
Then('the activity section should be displayed', async function (this: CustomWorld) {
  const transactionsPage = new TransactionsPage(this.page);
  await transactionsPage.expectActivitySectionDisplayed();
});

/** AC4: pagination button states. */
Then('the {string} pagination button should be enabled', async function (this: CustomWorld, label: string) {
  const transactionsPage = new TransactionsPage(this.page);
  if (label !== 'Previous' && label !== 'Next') {
    throw new Error(`Unknown pagination button "${label}". Expected "Previous" or "Next".`);
  }
  await transactionsPage.expectPaginationEnabled(label, true);
});

Then('the {string} pagination button should be disabled', async function (this: CustomWorld, label: string) {
  const transactionsPage = new TransactionsPage(this.page);
  if (label !== 'Previous' && label !== 'Next') {
    throw new Error(`Unknown pagination button "${label}". Expected "Previous" or "Next".`);
  }
  await transactionsPage.expectPaginationEnabled(label, false);
});
// ── Request-verification steps (AC3/AC4) ─────────────────────────────────

/** AC3: the selected account in the UI matches the accountId the app queried. */
Then('the transactions API request should target the currently selected account', async function (this: CustomWorld) {
  const transactionsPage = new TransactionsPage(this.page);
  const requestUrl = lastTransactionsRequest(this);
  const selectedAccountId = await transactionsPage.getSelectedAccountId();
  expect(requestUrl.searchParams.get('accountId'), 'The request should carry the selected account id.').toBe(
    selectedAccountId
  );
});

/** AC3: the last /api/transactions request carried a `from` date. */
Then('the transactions API request should use the from date {string}', async function (this: CustomWorld, expected: string) {
  const requestUrl = lastTransactionsRequest(this);
  expect(requestUrl.searchParams.get('from'), 'The request should carry the From date.').toBe(expected);
});

/** AC3: the last /api/transactions request carried a `to` date. */
Then('the transactions API request should use the to date {string}', async function (this: CustomWorld, expected: string) {
  const requestUrl = lastTransactionsRequest(this);
  expect(requestUrl.searchParams.get('to'), 'The request should carry the To date.').toBe(expected);
});

/** AC4: the last /api/transactions request used the expected page offset. */
Then('the transactions API request should use an offset of {int}', async function (this: CustomWorld, expected: number) {
  const requestUrl = lastTransactionsRequest(this);
  expect(requestUrl.searchParams.get('offset'), 'The request should carry the page offset.').toBe(String(expected));
});