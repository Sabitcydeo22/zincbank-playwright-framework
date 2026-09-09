/**
 * generate-html-report.js
 * ---------------------------------------------------------------------------
 * Converts the Cucumber JSON output (reports/cucumber-report.json) that was
 * produced during `npm test` into a pretty, self-contained HTML report
 * (reports/summary-report.html) using the cucumber-html-reporter package.
 *
 * Note: this is a SECOND, more colorful report. During the test run the
 * built-in html formatter already writes reports/cucumber-report.html.
 *
 * Usage:  npm run test:report
 * ---------------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');
const reporter = require('cucumber-html-reporter');

const jsonFile = path.join(__dirname, 'reports', 'cucumber-report.json');
const outputFile = path.join(__dirname, 'reports', 'summary-report.html');

if (!fs.existsSync(jsonFile)) {
  console.error(
    `\nNo report data found at ${jsonFile}.\n` +
      'Run the tests first (e.g. "npm test"), then run "npm run test:report".\n'
  );
  process.exit(1);
}

const options = {
  theme: 'bootstrap', // 'bootstrap' | 'simple' | 'foundation' | 'hierarchy'
  jsonFile,
  output: outputFile,
  reportSuiteAsScenarios: true, // one row per Scenario instead of per Feature
  scenarioTimestamp: true, // show a time stamp on each scenario
  launchReport: false, // do not auto-open the report in a browser
  metadata: {
    'Test Environment': process.env.TEST_ENV ?? 'production',
    'Browser': 'Chromium (headless)',
    'Platform': `${process.platform} (${process.arch})`,
    'Executed': new Date().toLocaleString()
  }
};

(async () => {
  try {
    await reporter.generate(options);
    console.log(`\n✅ HTML report generated: ${outputFile}\n`);
    console.log('Open it in your browser, for example:');
    console.log(`   start ${outputFile}\n`);
  } catch (error) {
    console.error('Failed to generate the HTML report:', error);
    process.exit(1);
  }
})();
