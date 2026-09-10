# ZincBank Playwright + Cucumber + TypeScript Framework

A clean, beginner-friendly **BDD test automation framework** for the
[ZincBank](https://zincbank.cydeo.io) simulated banking application
(a CYDEO teaching project built for QA practice).

| Layer | Technology |
| --- | --- |
| Browser automation | [Playwright](https://playwright.dev) (Chromium) |
| BDD layer | [@cucumber/cucumber](https://github.com/cucumber/cucumber-js) |
| Language | TypeScript (run with `ts-node`, no build step) |
| Design pattern | Page Object Model (POM) |
| Config & secrets | `dotenv` (`.env` file) |
| Reporting | `@cucumber/html-formatter` + `cucumber-html-reporter` |

---

## Project structure

```text
zincbank-playwright-framework/
│
├── package.json
├── tsconfig.json
├── cucumber.js                  # Cucumber configuration
├── .env                         # real credentials (git-ignored)
├── .env.example                 # template - copy it to .env
├── .gitignore
├── generate-html-report.js      # turns cucumber JSON into a pretty HTML report
├── README.md
│
├── reports/                     # generated reports + failure screenshots
│
└── src/
    ├── features/
    │   ├── login.feature        # Gherkin scenarios for the login flow
    │   ├── dashboard.feature    # Gherkin scenarios for the authenticated dashboard (ZIN-57)
    │   └── profile.feature      # Gherkin scenarios for profile + change password (ZIN-59)
    ├── pages/
    │   ├── LoginPage.ts         # Page Object Model for the login page
    │   ├── DashboardPage.ts     # Page Object Model for the dashboard (nav, content, sign out)
    │   └── ProfilePage.ts       # Page Object Model for the profile page (details + change password)
    ├── step-definitions/
    │   ├── login.steps.ts       # glue between the login .feature and the POM
    │   ├── dashboard.steps.ts   # glue between the dashboard .feature and the POM
    │   └── profile.steps.ts     # glue between the profile .feature and the POM
    └── support/
        ├── world.ts             # custom World: browser / context / page
        └── hooks.ts             # Before & After hooks (setup / teardown)
```

---

## How it all fits together

1. `cucumber.js` loads the `.env` file and configures where features and step
   definitions live.
2. For every scenario Cucumber creates a **World** object
   (`src/support/world.ts`) that holds the Playwright `browser`, `context` and
   `page`.
3. The **Before hook** (`src/support/hooks.ts`) launches Chromium in headed mode
   (the window is visible on screen) and opens a fresh page.
4. Each **step definition** (`src/step-definitions/login.steps.ts`) talks to
   the **Page Object** (`src/pages/LoginPage.ts`), which knows how to find and
   operate the page elements.
5. The **After hook** is the scenario cleanup: it restores the test account
   password when a change is still pending (see the profile feature below) and,
   if a scenario failed, captures a screenshot and embeds it in the report.
6. Two HTML reports are produced:
   - `reports/cucumber-report.html` — written by `@cucumber/html-formatter`
     **during the test run**, includes embedded failure screenshots.
   - `reports/summary-report.html` — the colorful bootstrap-style report created
     by `cucumber-html-reporter` when you run `npm run test:report`.

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Install the Playwright browser (first time only)

```bash
npx playwright install chromium
```

### 3. Create your .env file

```bash
# Windows (Command Prompt / PowerShell)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

The file already contains the demo ZincBank credentials:

```dotenv
BASE_URL=https://zincbank.cydeo.io
TEST_USER=student01@zinc.test
TEST_PASSWORD=9pJolA7GBQec
```

> 💡 `.env` is git-ignored. Never commit real credentials.

---

## Running the tests

### Run the whole suite

```bash
npm test
```

### Run only smoke tests (@smoke tag)

```bash
npm run test:smoke
```

### Run only regression tests (@regression tag)

```bash
npm run test:regression
```

### Generate the pretty HTML report

Run the tests first, then:

```bash
npm run test:report
```

Open the reports:

```bash
# Windows
start reports/cucumber-report.html
start reports/summary-report.html

# macOS
open reports/cucumber-report.html
open reports/summary-report.html

# Linux
xdg-open reports/cucumber-report.html
```

### Combined command

```bash
npm run test:full        # runs npm test, then generates the HTML report
```

### Advanced: filtering by tags

Cucumber tag expressions let you combine or exclude tags:

```bash
npx cucumber-js --tags "@smoke and @regression"
npx cucumber-js --tags "not @smoke"
```

### Watch the browser while debugging

The framework launches Chromium **headed** (`headless: false` in
`src/support/hooks.ts`), so a browser window is visible on screen while the
tests run. This is intentional for the profile / change-password story
(ZIN-59), where the whole flow - typing the passwords, the success
notification and the password revert - is meant to be seen. Switch it to
`headless: true` when you want faster, invisible runs (e.g. in CI).

---

## What the tests cover

### `src/features/login.feature`

| Scenario | Tags | What it verifies |
| --- | --- | --- |
| Successful login with valid credentials | `@smoke` `@regression` | Signing in with the `.env` demo account redirects to `/dashboard` and shows the welcome heading |
| Login is rejected with invalid credentials | `@regression` | Wrong credentials stay on the login page and show `Invalid email or password.` |

### `src/features/dashboard.feature` (ZIN-57 / US001, tagged `@dashboard`)

| Scenario | AC | What it verifies |
| --- | --- | --- |
| Valid login creates an authenticated session and shows navigation items | US001-AC1 | After login the customer is on `/dashboard` and all sidebar navigation items are visible |
| Dashboard shows welcome message, total deposit balance and account sections | US001-AC2 | Welcome banner, total deposit balance figure and account cards are rendered |
| Authenticated session persists on the dashboard after a page refresh | US001-AC3 | Reloading `/dashboard` keeps the session and the welcome banner |
| Unauthenticated user accessing the dashboard directly is redirected to login | US001-AC4 | Direct `/dashboard` visit redirects to `/login` and no protected content is shown |
| Sidebar displays all navigation elements | US001-AC5 | Dashboard, Accounts, Move money, Transactions, Cards, Profile and Sign out are all displayed |
| Each navigation element navigates to its corresponding page (scenario outline) | US001-AC5 | Clicking each nav link lands on `/dashboard`, `/accounts`, `/move-money`, `/transactions`, `/cards`, `/profile` |
| Sign out terminates the session and redirects to login | US001-AC6 | Clicking Sign out returns the customer to `/login` |
| Protected pages are blocked after sign out | US001-AC7 | After sign out, direct `/dashboard` and `/accounts` visits both redirect to `/login` |

Run just the dashboard feature:

```bash
npx cucumber-js --tags "@dashboard"
```

### `src/features/profile.feature` (ZIN-59 / US002, tagged `@profile`)

Profile information and change password.

| Scenario | AC | What it verifies |
| --- | --- | --- |
| Authenticated user navigates to the Profile page via the sidebar link | US002-AC1 | Clicking `Profile` in the header lands on `/profile` and the profile view renders |
| Profile page displays the customer's profile information | US002-AC2 | The `Profile` page and its change-password form are displayed to the authenticated customer |
| Customer changes the password and the original password is restored | US002-AC3 | Changing the password shows `Password changed`; a teardown step immediately reverts it to `process.env.TEST_PASSWORD`, and a final sign-out/sign-in proves the account works with the original password again |
| Validation errors for missing, short or incorrect password input (scenario outline) | US002-AC4 | Shows `Current password is required`, `New password must be at least 8 characters` (blank or too short) and `Current password is incorrect` |

Run just the profile feature:

```bash
npx cucumber-js --tags "@profile"
```

#### Password teardown (important)

The positive scenario (US002-AC3) really changes the password, so the feature
**always reverts it**:

1. `I change my password to a new valid password` generates a unique password
   and records the pending change on the World (`world.passwordReset`).
2. `I change my password back to the original password` signs the account back
   to `process.env.TEST_PASSWORD` and clears the pending change.
3. `I should be able to log in again with the original password` signs out and
   signs in again with `TEST_PASSWORD` to prove the revert really worked.
4. As a safety net, the **After hook** in `src/support/hooks.ts` restores the
   original password too if a scenario ever fails before the teardown step runs
   (while the browser is still open).

> **Adaptations to the live ZincBank build.** The `/profile` form has only two
> fields (current + new password) - there is **no "confirm new password"**
> field, so the "confirmation"/"mismatch" parts of US002-AC3/AC4 have no UI to
> test against. The page also renders the `Profile` view rather than
> Name/Email details (`/api/profile` returns `No profile on file` for the demo
> account), so AC2 is asserted against the profile view and the change-password
> form the app actually renders.

---

## How to add a new test (workflow)

1. Add a scenario to a `.feature` file (or create a new feature file under
   `src/features/`).
2. Run `npx cucumber-js` - Cucumber prints code snippets for any step that is
   not implemented yet.
3. Paste those snippets into a step-definitions file and fill in the logic,
   ideally delegating to a Page Object.
4. Keep page-specific locators/actions in `src/pages/` so the step definitions
   stay readable.

---

## Troubleshooting

| Problem | Solution |
| --- | --- |
| `browserType.launch: Executable doesn't exist` | Run `npx playwright install chromium` |
| Missing credentials error at runtime | Make sure `.env` exists (copy from `.env.example`) |
| `reports/cucumber-report.json` not found when running `test:report` | Run the tests first (`npm test`) |
| Tests are slow | Set `headless: true` in `src/support/hooks.ts` - headless mode is faster |

---

## Recommended learning resources

- [Playwright locators](https://playwright.dev/docs/locators)
- [Cucumber reference](https://cucumber.io/docs/cucumber/)
- [Cucumber-js configuration](https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md)
