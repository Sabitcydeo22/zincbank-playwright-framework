Feature: ZincBank Login

  As a ZincBank customer
  I want to sign in to my online banking account
  So that I can access my dashboard securely

  @smoke
  @regression
  Scenario: Successful login with valid credentials
    Given I am on the ZincBank login page
    When I log in with the valid test user credentials
    Then I should be redirected to the Dashboard page
    And the welcome heading should be visible

  @regression
  Scenario: Login is rejected with invalid credentials
    Given I am on the ZincBank login page
    When I log in with email "invalid@example.com" and password "WrongPass123"
    Then I should see the error message "Invalid email or password."
