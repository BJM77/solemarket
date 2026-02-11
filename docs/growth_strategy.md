# Picksy.au CEO Report: Go-to-Market Strategy & Risk Analysis
**Date:** February 11, 2026
**Prepared by:** Gemini (CEO)

## 1. Executive Summary

Picksy.au enters the Australian collectibles market at a pivotal moment. The hobby is booming, but incumbent platforms (eBay, Facebook Marketplace) suffer from high fees (`13%+`), lack of specialized tools, and trust issues.

**Our Mission:** To become Australia's safest and most technologically advanced marketplace for collectors.

**Our Edge:** We don't just facilitate transactions; we provide *utility*. With AI grading, scanning tools, and escrow services built-in, we offer value to users even before they buy or sell.

---

## 2. Go-to-Market Strategy (The "Liquidity Engine")

The biggest challenge for any marketplace is the "Chicken and Egg" problem. Buyers won't come without inventory; sellers won't list without buyers. Our strategy focuses on **"Utility-Led Growth"**.

### Phase 1: Supply Side & The "Tool Hook" (Months 1-3)
*Objective: Populate the marketplace with high-quality inventory without spending millions on ads.*

1.  **The "AI Grader" Trojan Horse:**
    *   **Strategy:** Promote the *free* AI Card Grader and Scanner tools on social media (TikTok/Reels). "Stop guessing your card's grade. Scan it on Picksy for free."
    *   **Conversion:** Once a user scans a card to check its condition, present a one-click "List for Sale" button.
    *   **Goal:** Convert curious hobbyists into active sellers.

2.  **Consignment Program (White-Glove Service):**
    *   **Strategy:** Partner with high-volume sellers or local card shops who are tired of eBay fees. Offer to manage their inventory for a reduced fee during launch.
    *   **Goal:** Ensure Day 1 visitors see "premium" inventory (Jordan rookies, shiny Charizards), not just junk.

3.  **"Wanted to Buy" (WTB) Aggregation:**
    *   **Strategy:** Scrape Facebook groups (manually or via tools) for "In Search Of" (ISO) posts. Reach out to those users and ask them to create a structured WTB listing on Picksy.
    *   **Goal:** Create immediate demand signals. Sellers love knowing a buyer is already waiting.

### Phase 2: Demand Generation & SEO (Months 3-6)
*Objective: Drive organic traffic and build trust.*

1.  **Programmatic SEO "Guide Pages":**
    *   **Strategy:** Use our `seo-guide-generator` skill to create 1,000+ deep-dive pages for specific sets (e.g., "1999 Pokemon Base Set Investment Guide", "2024 NBA Prizm Checklist").
    *   **Goal:** Capture high-intent Google traffic. When someone Googles "Is 1986 Fleer Jordan a good investment?", they land on Picksy.

2.  **Trust-First Marketing (DealSafe):**
    *   **Strategy:** Run campaigns highlighting "DealSafe Escrow." Target users who have been scammed on Facebook Marketplace. "Never send money to a stranger again."
    *   **Goal:** Position Picksy as the *only* safe alternative to face-to-face deals.

3.  **The "Bidsy" Drop:**
    *   **Strategy:** Host weekly "Event Auctions" starting at $1. Secure 10-20 "Grail" items (high value).
    *   **Goal:** Create "Appointment Viewing." Users return to the site every Friday night for the drops.

### Phase 3: Community & Moat (Months 6+)
*Objective: Retention and viral loops.*

1.  **Collector Profiles (Social Proof):**
    *   **Strategy:** Encourage users to treat their profile as a "Digital Showcase." Gamify it with badges ("Verified Seller", "Top Rated", "Early Adopter").
    *   **Goal:** Users share their Picksy profiles on Instagram/Linktree instead of an eBay link.

2.  **Data-Driven Repricing:**
    *   **Strategy:** Use our "Priget" market data to notify sellers when their items are overpriced compared to recent sales.
    *   **Goal:** Increase sell-through rate.

---

## 3. Risk Assessment & "Pre-Mortem"

As CEO, I must look at what could kill us. Here are the critical risks and our mitigation plans.

### A. Technical Risks (The Platform)

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Search Relevance** | **High** | If a user searches "Charizard" and gets "Wizards", they leave. **Fix:** We implemented `keywords` arrays and prefix search, but we MUST monitor "zero result searches" daily. Eventually, migrate to Algolia/Typesense if Firestore search limits hurt us. |
| **Real-time Latency** | **Medium** | "Bidsy" auctions need to feel instant. Firestore snapshots are good, but if 1,000 people bid at once, we might hit contention. **Fix:** Stress test the `placeBidAction`. Consider moving active auction state to Realtime Database or Redis for the final minute. |
| **AI "Hallucinations"** | **High** | If the AI Grader says a damaged card is "Gem Mint 10", buyers will revolt. **Fix:** Clearly label AI grades as "Estimates Only." Force manual review for items >$500 via DealSafe. |
| **Image Hosting Costs** | **Medium** | High-res images can rack up storage bills. **Fix:** Ensure we are rigorously compressing images (using Next.js Image Optimization) and eventually offloading cold storage to cheaper buckets (like R2) if Firebase Storage gets expensive. |

### B. Business & Operational Risks (The Market)

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Liquidity Trap** | **Critical** | Buyers see no items; Sellers see no sales. **Fix:** The "Consignment Program" is the bridge. We must *manufacture* supply. If needed, we (Picksy) buy key inventory to seed the market. |
| **The "Facebook Leak"** | **High** | Users find each other on Picksy but complete the deal on PayID/Cash to save fees. **Fix:** This is hard to stop. We must make the *fee* worth it. DealSafe (Escrow) is the value add. "Is saving 5% worth risking $500?" |
| **Fraud/Chargebacks** | **High** | A buyer claims they received a rock instead of a card. **Fix:** DealSafe Escrow requires video evidence of packing/unpacking for high-value items. Strict Stripe identity verification for sellers. |
| **Shipping Logistics** | **Medium** | Shipping prices in Australia are painful. **Fix:** Integrate Australia Post API for accurate real-time quoting. Offer "Bundle Shipping" (Multibuy) to spread shipping costs across multiple items. |

---

## 4. Immediate Action Items (First 7 Days)

1.  **Audit the "Empty State":** Go through every category. If a category has 0 items, either hide it or add a "Wanted" placeholder. Empty pages kill conversion.
2.  **Seed the "Guide":** Generate the top 50 most popular card sets using the SEO skill. This starts the Google indexing clock ticking.
3.  **Soft Launch Invite:** Email the `SUPER_ADMIN_EMAILS` list and a small group of trusted beta testers to list the first 100 items. Do not open to the public until 100 real items are listed.

***

*Signed,*
**Gemini**
**CEO, Picksy.au**