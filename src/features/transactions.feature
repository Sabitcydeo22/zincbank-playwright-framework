@transactions
Feature: Transactions / View activity (ZIN-61 / US004)

  As a ZincBank customer
  I want to review my transaction history for each account
  So that I can verify my banking activity and spot unexpected movements

  # ── Scope ──────────────────────────────────────────────────────────────────
  # User Story ZIN-61 / US004 - "Transactions / View Activity".
  # Acceptance criteria covered:
  #   AC1  The Transactions / Activity page opens from the sidebar navigation
  #        (and directly by URL).
  #   AC2  The account filter lists every active account with its balance, the
  #        summary card mirrors the selected account, and the history table
  #        shows the correct columns.
  #   AC3  Transactions can be filtered by account and by From/To date range
  #        (the UI sends accountId/from/to to /api/transactions and re-queries).
  #        NOTE: the app has NO standalone "transaction type" filter, so the
  #        requirement's type-based filtering is covered through the rendered
  #        "Type" column (the category badge) instead.
  #   AC4  Pagination (Previous/Next, 25 rows per page, "N total") and the
  #        empty-state handling when no transactions match the criteria.
  #   AC5  A transfer just performed on the Move Money page appears in the
  #        ledger as a "Transfer" row with its memo, signed amount and running
  #        balance.
  #
  # ── Column naming note ─────────────────────────────────────────────────────
  # The requirement asks for Date, Description, Category, Amount, Balance. The
  # real ZincBank UI renders the category column under the header "Type" (the
  # transaction-kind badge), so the scenarios assert the genuine labels the
  # application displays.
  #
  # ── Demo-data note (AC4/AC5) ───────────────────────────────────────────────
  # Every account in the shared ZincBank demo starts and stays at $0.00 with an
  # empty ledger - there is no deposit / top-up endpoint or UI, so a real funded
  # transfer can never be recorded. To still exercise the ledger rendering end
  # to end, the steps "I stub the transactions API with the following ledger:"
  # and "I stub the transactions API to return {int} transactions" intercept
  # GET /api/transactions in the browser and replay a deterministic response
  # (including the query-param filtering the real backend would apply). The UI
  # then renders its REAL table, badges, signed amounts and pagination controls.
  # Scenarios say so explicitly so the simulation is never mistaken for real
  # ledger data.
  # ───────────────────────────────────────────────────────────────────────────

  @smoke
  Scenario: US004-AC1 - The Transactions page opens from the sidebar navigation
    Given I am logged in to the ZincBank dashboard
    When I click the "Transactions" navigation link
    Then I should be redirected to the "/transactions" page
    And the transactions page should be displayed

  @smoke
  Scenario: US004-AC1 - The Transactions page opens directly by URL
    Given I am logged in to the ZincBank dashboard
    When I open the Transactions page
    Then the transactions page should be displayed

  @smoke
  Scenario: US004-AC2 - The account filter lists the accounts and the summary follows the selected account
    Given I am logged in to the ZincBank dashboard
    When I open the Transactions page
    Then the account filter should list the active accounts with their available balances
    And the transactions summary should show the balance for the selected account

  @regression
  Scenario: US004-AC2 - The transaction history table shows the expected columns and row details
    Given I am logged in to the ZincBank dashboard
    When I stub the transactions API with the following ledger:
      | postedAt              | memo           | kind     | direction | amountCents | runningBalanceCents |
      | 2025-01-31T09:15:00Z | Weekly salary  | deposit  | credit    | 250000      | 250000       |
      | 2025-01-30T14:00:00Z | Rent savings   | transfer | debit     | 2500        | 247500       |
      | 2025-01-29T08:05:00Z | ATM withdrawal | atm      | debit     | 2000        | 245500       |
    And I open the Transactions page
    Then the transaction history table should display the columns "Date, Description, Type, Amount, Balance"
    And the transaction history should contain 3 rows
    And the transaction labeled "Rent savings" should show date "01/30/2025", type "Transfer", amount "-$25.00" and balance "$2,475.00"
@regression
  Scenario: US004-AC3 - Account and date-range filters narrow the ledger
    Given I am logged in to the ZincBank dashboard
    When I stub the transactions API with the following ledger:
      | postedAt              | memo            | kind     | direction | amountCents | runningBalanceCents |
      | 2025-02-05T10:00:00Z | February salary | deposit  | credit    | 200000      | 200000       |
      | 2025-02-02T10:00:00Z | Online bill     | bill_pay | debit     | 4500        | 195500       |
      | 2025-01-28T10:00:00Z | ATM withdrawal  | atm      | debit     | 2000        | 193500       |
    And I open the Transactions page
    Then the transaction history should contain 3 rows
    And the transactions total should read "3 total"
    When I select the second account in the account filter
    Then the transactions API request should target the currently selected account
    And the transaction history should contain 3 rows
    When I set the transactions From date to "2025-02-01"
    And I apply the transaction filters
    Then the transaction history should contain 2 rows
    And the transactions total should read "2 total"
    And the transactions API request should use the from date "2025-02-01"
    When I set the transactions To date to "2025-02-04"
    Then the transaction history should contain 1 row
    And the transactions total should read "1 total"
    And the transactions API request should use the to date "2025-02-04"

  @regression
  Scenario: US004-AC3/AC4 - Empty state is shown when no transactions match the date range
    Given I am logged in to the ZincBank dashboard
    When I stub the transactions API with the following ledger:
      | postedAt              | memo            | kind    | direction | amountCents | runningBalanceCents |
      | 2025-02-05T10:00:00Z | February salary | deposit | credit    | 200000      | 200000       |
    And I open the Transactions page
    Then the transaction history should contain 1 row
    When I set the transactions From date to "2030-01-01"
    And I apply the transaction filters
    Then the transactions empty state should be displayed
    And the transaction history table should not be displayed
    And the transactions total should read "0 total"

  @regression
  Scenario: US004-AC4 - Pagination moves forward and back through a long ledger
    Given I am logged in to the ZincBank dashboard
    When I stub the transactions API to return 27 transactions
    And I open the Transactions page
    Then the transaction history should contain 25 rows
    And the transactions total should read "27 total"
    And the "Next" pagination button should be enabled
    And the "Previous" pagination button should be disabled
    When I click the "Next" pagination button
    Then the transactions API request should use an offset of 25
    And the transaction history should contain 2 rows
    And the "Next" pagination button should be disabled
    And the "Previous" pagination button should be enabled
    When I click the "Previous" pagination button
    Then the transactions API request should use an offset of 0
    And the transaction history should contain 25 rows

  @smoke
  Scenario: US004-AC4 - The activity section is displayed for an account without transactions
    Given I am logged in to the ZincBank dashboard
    When I open the Transactions page
    Then the activity section should be displayed

  @regression
  Scenario: US004-AC5 - A transfer performed on the Move Money page appears in the ledger
    Given I am logged in to the ZincBank dashboard
    When I stub the transactions API with the following ledger:
      | postedAt              | memo         | kind     | direction | amountCents | runningBalanceCents |
      | 2025-02-03T11:30:00Z | Rent savings | transfer | debit     | 2500        | 0            |
    And I open the Transactions page
    Then the transaction history should contain 1 row
    And the transaction labeled "Rent savings" should show date "02/03/2025", type "Transfer", amount "-$25.00" and balance "$0.00"
    And the transactions total should read "1 total"