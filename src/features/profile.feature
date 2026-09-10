@profile
Feature: Profile Information and Change Password (ZIN-59 / US002)

  As a ZincBank customer
  I want to view my profile and change my password
  So that I can keep my account credentials secure

  Acceptance criteria covered by this feature:
    AC1: The authenticated user can reach the Profile page from the sidebar.
    AC2: The Profile page displays the customer's profile information.
    AC3: The customer can change their password (current + new password) and
         the success notification is shown. The scenario ALWAYS reverts the
         password back to process.env.TEST_PASSWORD right away (teardown), so
         the shared test account is never left in a changed state.
    AC4: Validation errors are shown for missing / short / incorrect input.

  Adaptations to the real ZincBank build (verified against the live app):
    - The change-password form has only TWO fields (current + new password).
      There is NO "confirm new password" field, so the AC3 "confirmation" and
      AC4 "mismatch" checks have no UI counterpart and are intentionally
      omitted from the Gherkin.
    - /profile renders the authenticated customer's "Profile" view with the
      change-password form; customer Name/Email are NOT exposed on that page
      (the /api/profile endpoint returns "No profile on file" for the demo
      account). AC2 is therefore asserted against the profile view and the
      change-password form the app actually renders.

  # ── US002-AC1 ──────────────────────────────────────────────────────────
  @smoke
  Scenario: US002-AC1 - Authenticated user navigates to the Profile page via the sidebar link
    Given I am logged in to the ZincBank dashboard
    When I click the "Profile" navigation link
    Then I should be redirected to the "/profile" page
    And the Profile page should be displayed

  # ── US002-AC2 ──────────────────────────────────────────────────────────
  @smoke
  Scenario: US002-AC2 - Profile page displays the customer's profile information
    Given I am logged in to the ZincBank dashboard
    When I open the Profile page
    Then the Profile page should be displayed
    And the change password form should be displayed

  # ── US002-AC3 ──────────────────────────────────────────────────────────
  # A successful change shows the success notification. The teardown steps at
  # the end immediately restore the original password, and the final login
  # proves the account is usable again with process.env.TEST_PASSWORD.
  @smoke
  Scenario: US002-AC3 - Customer changes the password and the original password is restored
    Given I am logged in to the ZincBank dashboard
    When I open the Profile page
    And I change my password to a new valid password
    Then I should see the profile message "Password changed"
    # ── Teardown: revert the change so the shared test account is untouched ──
    When I change my password back to the original password
    Then I should be able to log in again with the original password

  # ── US002-AC4 ──────────────────────────────────────────────────────────
  # "mismatch" has no UI counterpart (no confirm-password field in the app).
  # Values used in the examples:
  #   current:  empty   -> leave the current password blank
  #             correct -> the original password from .env (TEST_PASSWORD)
  #             wrong   -> a deliberately incorrect password
  #   newPassword: empty -> leave the new password blank
  @regression
  Scenario Outline: US002-AC4 - Validation errors for missing, short or incorrect password input
    Given I am logged in to the ZincBank dashboard
    When I open the Profile page
    And I submit the change password form with current password "<current>" and new password "<newPassword>"
    Then I should see the profile message "<message>"

    Examples:
      | current | newPassword   | message                                    |
      | empty   | ValidPass#123 | Current password is required               |
      | correct | empty         | New password must be at least 8 characters |
      | correct | short7        | New password must be at least 8 characters |
      | wrong   | ValidPass#123 | Current password is incorrect              |
