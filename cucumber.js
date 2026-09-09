/**
 * cucumber.js
 * ---------------------------------------------------------------------------
 * Configuration file for @cucumber/cucumber. Cucumber looks for this file
 * automatically in the project root when you run `npx cucumber-js`.
 *
 * Docs: https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md
 * ---------------------------------------------------------------------------
 */

// 1) Load the variables from the .env file into process.env (dotenv).
require('dotenv').config({ quiet: true });

// 2) Make sure the report folders exist before the reporters write to them.
const fs = require('fs');
const path = require('path');
fs.mkdirSync(path.join(__dirname, 'reports', 'screenshots'), { recursive: true });

module.exports = {
  default: {
    // Compile .ts support code on the fly with ts-node (no build step needed).
    requireModule: ['ts-node/register'],

    // Support code loaded with the CommonJS require() API:
    // the custom World, the hooks, and all step definitions.
    require: [
      'src/support/world.ts',
      'src/support/hooks.ts',
      'src/step-definitions/**/*.ts'
    ],

    // Where the Gherkin .feature files live.
    paths: ['src/features/**/*.feature'],

    // Output:
    //  - "progress"  -> simple console output while the tests run
    //  - "json"      -> reports/cucumber-report.json  (used by cucumber-html-reporter)
    //  - "html"      -> reports/cucumber-report.html  (standalone HTML report incl. screenshots)
    format: [
      'progress',
      'json:reports/cucumber-report.json',
      'html:reports/cucumber-report.html'
    ],

    // When Cucumber prints snippets for missing steps, use async/await style.
    formatOptions: {
      snippetInterface: 'async-await'
    }
  }
};
