@transfer
Feature: Transfer money between own accounts (ZIN-60 / US003)

  As a ZincBank customer
  I want to transfer money between my own accounts
  So that I can move funds without leaving the app

  # ── Scope ──────────────────────────────────────────────────────────────────
  # User Story ZIN-60 / US003 - "Transfer Money Between Own Accounts".
  # Acceptance criteria covered:
  #   AC1  The "Move money" entry points open the transfer page (sidebar link and
  #        the dashboard quick-action shortcut).
  #   AC2  The "From" account dropdown lists the customer's active accounts next
  #        to their available balances.
  #   AC3  The "To" account dropdown lists valid destination accounts and the
  #        source account cannot be used as the destination.
  #   AC4  A successful transfer shows a clear confirmation with the new balance
  #        and resets the amount field.
  #   AC5  Zero, negative, non-numeric and over-balance amounts are rejected with
  #        an error.
  #   AC6  Abandoning the form without submitting leaves every balance untouched.
  #
  # ── Demo-data note (AC4) ───────────────────────────────────────────────────
  # Every account in the shared ZincBank demo starts and stays at $0.00 - there
  # is no deposit / top-up / seed endpoint or UI flow - so a genuine funded
  # transfer cannot succeed. To still exercise the success path, the step
  # "I stub the transfer API so a successful transfer leaves a balance of ..."
  # intercepts POST /api/transfers in the browser and returns a successful
  # response. The UI then renders its REAL success banner and resets the form.
  # The scenario says so explicitly so the simulation is never mistaken for a
  # real money movement.
  # ───────────────────────────────────────────────────────────────────────────

  @smoke
  Scenario: US003-AC1 - The sidebar opens the Move Money page
    Given I am logged in to the ZincBank dashboard
    When I click the "Move money" navigation link
    Then I should be redirected to the "/move-money" page
    And the transfer form should be displayed

  @smoke
  Scenario: US003-AC1 - The dashboard shortcut opens the Move Money page
    Given I am logged in to the ZincBank dashboard
    When I click the dashboard "Move money" shortcut
    Then I should be redirected to the "/move-money" page
    And the transfer form should be displayed

  @smoke
  Scenario: US003-AC2 - From account dropdown lists active accounts with available balances
    Given I am logged in to the ZincBank dashboard
    When I open the Move Money page
    Then the From Account dropdown should list the active accounts with their available balances

  @regression
  Scenario: US003-AC3 - To account dropdown lists destinations and rejects the source account
    Given I am logged in to the ZincBank dashboard
    When I open the Move Money page
    Then the To Account dropdown should list the destination accounts
    When I select the source account as the destination account
    And I enter the transfer amount "1"
    And I submit the transfer
    Then I should see the transfer result "SAME_ACCOUNT_TRANSFER"

  @smoke
  Scenario: US003-AC4 - A successful transfer confirms the transfer and shows the new balance
    Given I am logged in to the ZincBank dashboard
    When I open the Move Money page
    And I stub the transfer API so a successful transfer leaves a balance of "75.00"
    And I select the first account as the source and the second account as the destination
    And I enter the transfer amount "25.00"
    And I enter the transfer memo "Rent savings"
    And I submit the transfer
    Then I should see the transfer result "Transferred — new balance $75.00."
    And the transfer amount field should be reset

  @regression
  Scenario Outline: US003-AC5 - Zero, negative and non-numeric amounts are rejected
    Given I am logged in to the ZincBank dashboard
    When I open the Move Money page
    And I select the first account as the source and the second account as the destination
    And I enter the transfer amount "<amount>"
    And I submit the transfer
    Then I should see the transfer result "<error>"

    Examples:
      | amount | error          |
      | 0      | INVALID_AMOUNT |
      | -5     | INVALID_AMOUNT |
      | abc    | INVALID_AMOUNT |

  @regression
  Scenario: US003-AC5 - An amount exceeding the available balance is rejected
    Given I am logged in to the ZincBank dashboard
    When I open the Move Money page
    And I select the first account as the source and the second account as the destination
    And I enter a transfer amount exceeding the available balance
    And I submit the transfer
    Then I should see the transfer result "INSUFFICIENT_FUNDS"

  @regression
  Scenario: US003-AC6 - Abandoning the transfer form leaves the balances unchanged
    Given I am logged in to the ZincBank dashboard
    When I open the Move Money page
    And I capture the current account balances
    And I select the first account as the source and the second account as the destination
    And I enter the transfer amount "25.00"
    And I enter the transfer memo "Should not move"
    And I leave the Move Money page without submitting
    When I open the Move Money page
    Then the account balances should be unchanged
    And no transfer result should be displayed
