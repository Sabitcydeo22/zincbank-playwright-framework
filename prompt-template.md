# Universal BDD Automation Framework Master Prompt

Act as a Senior Test Automation Engineer. Create a clean, beginner-friendly, and maintainable test automation framework for the [APP_NAME] application from scratch inside this root directory.

Follow these explicit architecture and technical requirements:

1. Technology Stack:
   - Playwright for browser automation
   - TypeScript as the primary programming language
   - @cucumber/cucumber for BDD feature files, scenarios, and step definitions
   - Page Object Model (POM) design pattern
   - dotenv for managing credentials and environment variables
   - @cucumber/html-formatter and cucumber-html-reporter for test reports
   - ts-node for executing TypeScript without manual pre-compilation

2. Directory & File Structure to Create:
[project-root]/
│
├── package.json
├── tsconfig.json
├── cucumber.js
├── .env
├── .env.example
├── .gitignore
├── README.md
│
├── reports/
│   └── (directory for html test reports)
│
└── src/
    ├── features/
    │   └── login.feature
    │
    ├── pages/
    │   └── LoginPage.ts
    │
    ├── step-definitions/
    │   └── login.steps.ts
    │
    └── support/
        ├── world.ts
        └── hooks.ts

3. Component Specifications:
   - package.json: All required dependencies, devDependencies, and npm scripts ("test", "test:smoke", "test:regression", "test:report").
   - tsconfig.json: Minimal, beginner-friendly configuration compatible with Playwright, Cucumber, and ts-node.
   - cucumber.js: Default configuration specifying feature paths, require paths (step definitions, hooks, world), ts-node loader, and HTML report output formatting.
   - src/support/world.ts: Custom World extending Cucumber's World to hold Playwright's Browser, BrowserContext, and Page instances.
   - src/support/hooks.ts: 
       * Before hook to launch the browser and initialize a new page.
       * After hook to capture a screenshot automatically if a scenario fails (attached to the report) and close browser context.
   - src/pages/LoginPage.ts: POM class encapsulating locators and methods for login actions and assertions.
   - src/features/login.feature: Clean Gherkin scenarios for successful login and invalid login, tagged with @smoke and @regression.
   - src/step-definitions/login.steps.ts: Direct implementation of the Gherkin steps using the custom World and LoginPage.
   - .env & .env.example: Variables for BASE_URL, TEST_USER, and TEST_PASSWORD.
   - .gitignore: Standard ignores (node_modules, reports, .env, playwright-report).
   - README.md: Clear instructions on running 'npm install', running tests with tags, and generating/viewing the HTML report.

Please generate all the files with complete, working code and explain the basic terminal commands to run the suite.
