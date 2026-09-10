import { When } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';

When(
  'the smoke test intentionally throws an error',
  async function (this: CustomWorld) {
    if (this.page) {
      await this.page.goto('about:blank');
    }
    throw new Error('DELIBERATE_FAILURE_FOR_SCREENSHOT_CHECK');
  }
);