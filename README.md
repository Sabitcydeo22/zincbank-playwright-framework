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
    │   └── login.feature        # Gherkin scenarios
    ├── pages/
    │   └── LoginPage.ts         # Page Object Model for the login page
    ├── step-definitions/
    │   └── login.steps.ts       # glue between .feature and the POM
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
3. The **Before hook** (`src/support/hooks.ts`) launches Chromium and opens a
   fresh page.
4. Each **step definition** (`src/step-definitions/login.steps.ts`) talks to
   the **Page Object** (`src/pages/LoginPage.ts`), which knows how to find and
   operate the page elements.
5. If a scenario fails, the **After hook** captures a screenshot and embeds it
   in the report.
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

Set `HEADLESS=false` in your `.env` file (or run
`set HEADLESS=false` before the test command) and the browser window will be
visible while the tests run.

---

## What the tests cover

`src/features/login.feature` contains two scenarios:

| Scenario | Tags | What it verifies |
| --- | --- | --- |
| Successful login with valid credentials | `@smoke` `@regression` | Signing in with the `.env` demo account redirects to `/dashboard` and shows the welcome heading |
| Login is rejected with invalid credentials | `@regression` | Wrong credentials stay on the login page and show `Invalid email or password.` |

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
| Tests are slow | Headless mode is faster; keep `HEADLESS` unset (or `true`) |

---

## Recommended learning resources

- [Playwright locators](https://playwright.dev/docs/locators)
- [Cucumber reference](https://cucumber.io/docs/cucumber/)
- [Cucumber-js configuration](https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md)
