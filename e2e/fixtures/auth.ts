import { Page } from '@playwright/test';

export async function signInWithEmail(page: Page, email: string, password: string) {
  // Navigate to login page
  await page.goto('/login'); // Adjust this URL based on your app's actual login route
  
  // Fill in credentials and submit
  // Adjust these selectors based on your actual login form implementation
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for login to complete (e.g., wait for a dashboard element or successful redirect)
  await page.waitForURL('**/'); // Adjust based on where users go after login
}
