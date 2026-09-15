import { chromium, FullConfig } from '@playwright/test';
import { signInWithEmail } from './fixtures/auth';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  if (process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD) {
    await signInWithEmail(page, process.env.E2E_TEST_EMAIL, process.env.E2E_TEST_PASSWORD);
    // Save auth state
    await page.context().storageState({ path: 'e2e/.auth/user.json' });
  } else {
    console.warn('Skipping E2E auth setup: E2E_TEST_EMAIL or E2E_TEST_PASSWORD not set');
  }
  
  await browser.close();
}

export default globalSetup;
