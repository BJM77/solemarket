# Production Launch Walkthrough: Final Steps

Welcome to Phase 3 of the Production Launch! All of your marketplace logic optimizations for the lead-generation model are successfully deployed, and the database has been scrubbed clean of test products.

Your platform is now a streamlined, peer-to-peer connection hub. To start onboarding real users and uploading your first items, you only have a few manual configurations left.

## Step 1: Initialize Your Live Environment Secrets

For security reasons, your API keys must be entered directly into Google Cloud / Firebase App Hosting, not stored in the codebase.

1. Go to the **[Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager)** for your project.
2. Ensure the following secrets exist and have the correct, live values:
   * `GOOGLE_GENAI_API_KEY` (Required for Kicks/Card Scanners)
   * `SENDGRID_API_KEY` (Required for Verification Emails)
3. *If you updated or added these secrets:* Go to **[Firebase App Hosting](https://console.firebase.google.com/project/_/apphosting)**, locate your `studio` backend, and trigger a new rollout so it picks up the latest keys.

## Step 2: Establish the Super Admin Account

With the database clean, you need to set yourself up as the platform's owner on the live site.

1. Navigate to your live production URL (e.g., `https://benched.au`).
2. Click **Sign In** or **Register** and create an account with your primary admin email.
3. Open a new tab and go to the **[Firebase Firestore Console](https://console.firebase.google.com/project/_/firestore)**.
4. Navigate to the `users` collection and find the document that matches your new account.
5. Manually edit that document to include the following fields:
   * `role`: (string) `superadmin`
   * `isAdmin`: (boolean) `true`
   * `canSell`: (boolean) `true`
6. Refresh your browser on the live site. You should now see the **Admin Dashboard** option in your navigation menu.

## Step 3: Configure Base Categories

Before sellers can list anything, the master category list needs to be active.

1. Go to your **Admin Dashboard -> Categories**.
2. If the list is empty, manually add your top-level categories (e.g., "Sneakers", "Collector Cards").
3. Ensure their visibility and ordering match your desired storefront layout.

## Step 4: Upload the First Products

Your marketplace needs initial inventory before driving traffic.

1. Go to your **Seller Dashboard** and ensure your profile information (Store Name, Contact Number) is complete.
2. Click **Deploy Listing**.
3. Use your phone or computer to snap photos of 5-10 real items and upload them using the AI Scanner.
4. Set the prices and publish the listings.

## Step 5: Test the Core Loop

Verify that the platform's primary value proposition—connecting buyers and sellers—is functioning perfectly in the live environment.

1. Open a new "Incognito" window and go to your site.
2. Find one of the items you just listed and click **Message Seller to Buy**.
3. Enter a test name and email (different from your admin email).
4. **Verify the SendGrid Integration:** Check that test email's inbox for the 5-digit verification code.
5. Enter the code to reveal your seller contact details.
6. **Verify the Notifications:** Check your seller email and/or Telegram (if configured) to confirm you received the "New Enquiry" alert.

---

### You are ready for traffic!

Once those 5 steps are complete, your platform is officially operational. Your next move should be executing your SEO strategies and inviting your first wave of trusted sellers to populate the marketplace.
