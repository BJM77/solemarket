# AI Agent QA Testing Protocol: Sole Market

**Role:** You are an expert Senior QA Automation Engineer and UX Researcher.
**Objective:** Perform a comprehensive end-to-end audit of the "Sole Market" web application. Your goal is to identify functional bugs, UX friction points, visual regressions, and security vulnerabilities.
**Context:** The site has recently transitioned from a multi-category collectibles market ("Picksy") to a dedicated Sneaker & Streetwear marketplace ("Sole Market").

---

## 🔬 Testing Scope & Scenarios

### 1. 👟 Core User Flow: The "Seller Journey"
*   **Action:** Go to `/scan` (Sneaker Scanner).
*   **Input:** Upload a clear photo of a popular sneaker (e.g., Air Jordan 1).
*   **Verification:**
    *   Does the AI correctly identify the Brand, Model, and Colorway?
    *   Does clicking "Create Listing" redirect to `/sell/create`?
    *   Are the form fields (Title, Size, Category) pre-filled correctly?
    *   Complete the listing process and verify the "Success" toast appears.

### 2. 🛍️ Core User Flow: The "Buyer Journey"
*   **Action:** Navigate to `/browse` and use the filters.
*   **Verification:**
    *   Filter by "Sneakers" -> "Jordan". Does the grid update?
    *   Test the "Size Guide" popup on a product page. Does it load?
    *   Verify the "Authenticity Guaranteed" badge is visible on product details.
    *   Add an item to the Cart and proceed to Checkout.

### 3. 📅 New Features Integration
*   **Drops Page (`/drops`):**
    *   Verify images load correctly.
    *   Check if dates are formatted for the Australian locale.
*   **Research (`/research`):**
    *   Test the eBay Price Check with a query like "Yeezy 350 Zebra".
    *   Ensure results display prices in AUD.

### 4. 📱 Responsive & UI Polish
*   **Mobile View:** Switch to mobile emulation (iPhone 14/15 viewport).
    *   Test the Bottom Navigation Bar.
    *   Open the Hamburger Menu (`MobileNavContent`). Are "Sneakers" and "Accessories" properly nested?
    *   Check the "Scan to List" button visibility.
*   **Visual Branding:**
    *   Scan for any leftover text referring to "Picksy", "Trading Cards", or "Pokemon".
    *   Ensure the logo and color scheme are consistent (Black/Red/White/Grayscale).

### 5. 🛡️ Security & Performance
*   **Auth Walls:** Try to access `/admin` and `/admin/ads` without logging in. You should be redirected or see a 404/403.
*   **Performance:** Note any page loads that take longer than 2 seconds (excluding AI analysis).

---

## 📝 Reporting Format

Please report your findings in the following Markdown format:

### 🔴 Critical Issues (Blockers)
*   *List functionality that is broken or causes crashes.*

### 🟡 Functional Bugs (High Priority)
*   *List features that work incorrectly (e.g., wrong filter results, broken links).*

### 🔵 UX/UI Improvements (Low Priority)
*   *Visual inconsistencies, confusing copy, or branding misses.*

### 🟢 Verification Checklist
*   [ ] Scanner Auto-fill
*   [ ] Search & Filter
*   [ ] Admin Access Blocked
*   [ ] Mobile Nav Usability

---

**Execution Instructions:**
1.  Start at the Homepage (`/`).
2.  Log in using the test credentials provided (if applicable) or test as Guest first.
3.  Execute the scenarios above sequentially.
