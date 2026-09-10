@dashboard
Feature: Authenticated Customer Dashboard (ZIN-57 / US001)

  As a ZincBank customer
  I want to view my online banking dashboard after signing in
  So that I can see my balances, my accounts, and access the banking features

  # ── US001-AC1 ──────────────────────────────────────────────────────────────
  # Valid login creates an authenticated session and shows the navigation items.
  @smoke
  @regression
  Scenario: US001-AC1 - Valid login creates an authenticated session and shows navigation items
    Given I am logged in to the ZincBank dashboard
    Then I should be on the dashboard page
    And the navigation items should be visible

  # ── US001-AC2 ──────────────────────────────────────────────────────────────
  # Successful login redirects to /dashboard with the welcome message,
  # the total deposit balance, and the account sections.
  @smoke
  @regression
  Scenario: US001-AC2 - Dashboard shows welcome message, total deposit balance and account sections
    Given I am logged in to the ZincBank dashboard
    Then I should be on the dashboard page
    And I should see the welcome message on the dashboard
    And I should see the total deposit balance on the dashboard
    And I should see the account cards on the dashboard

  # ── US001-AC3 ──────────────────────────────────────────────────────────────
  # The authenticated session persists on /dashboard after a page refresh.
  @regression
  Scenario: US001-AC3 - Authenticated session persists on the dashboard after a page refresh
    Given I am logged in to the ZincBank dashboard
    When I refresh the dashboard page
    Then I should still be on the dashboard page
    And the welcome message should still be visible

  # ── US001-AC4 ──────────────────────────────────────────────────────────────
  # An unauthenticated user who opens /dashboard directly is redirected to
  # /login and no protected content is shown.
  @regression
  Scenario: US001-AC4 - Unauthenticated user accessing the dashboard directly is redirected to login
    Given I am an unauthenticated user
    When I open the dashboard page directly
    Then I should be redirected to the login page
    And no protected dashboard content should be shown

  # ── US001-AC5 ──────────────────────────────────────────────────────────────
  # The sidebar displays all navigation elements.
  @regression
  Scenario: US001-AC5 - Sidebar displays all navigation elements
    Given I am logged in to the ZincBank dashboard
    Then the navigation item "Dashboard" should be displayed
    And the navigation item "Accounts" should be displayed
    And the navigation item "Move money" should be displayed
    And the navigation item "Transactions" should be displayed
    And the navigation item "Cards" should be displayed
    And the navigation item "Profile" should be displayed
    And the navigation item "Sign out" should be displayed

  # Each navigation element takes the customer to its corresponding page/URL.
  @regression
  Scenario Outline: US001-AC5 - Each navigation element navigates to its corresponding page
    Given I am logged in to the ZincBank dashboard
    When I click the "<navLink>" navigation link
    Then I should be redirected to the "<path>" page

    Examples:
      | navLink      | path          |
      | Dashboard    | /dashboard    |
      | Accounts     | /accounts     |
      | Move money   | /move-money   |
      | Transactions | /transactions |
      | Cards        | /cards        |
      | Profile      | /profile      |

  # ── US001-AC6 ──────────────────────────────────────────────────────────────
  # Sign out terminates the session and redirects to /login.
  @smoke
  @regression
  Scenario: US001-AC6 - Sign out terminates the session and redirects to login
    Given I am logged in to the ZincBank dashboard
    When I sign out
    Then I should be redirected to the login page

  # ── US001-AC7 ──────────────────────────────────────────────────────────────
  # After sign out, opening /dashboard or /accounts directly still redirects
  # to /login (the session really is gone).
  @regression
  Scenario: US001-AC7 - Protected pages are blocked after sign out
    Given I am logged in to the ZincBank dashboard
    When I sign out
    Then I should be redirected to the login page
    When I open the dashboard page directly
    Then I should be redirected to the login page
    And no protected dashboard content should be shown
    When I open the accounts page directly
    Then I should be redirected to the login page
