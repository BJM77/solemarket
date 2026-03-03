#!/bin/bash
# Sitemap Ping Utility (2026 Edition)
# Even if deprecated, many SEO tools still use this to "nudge" Googlebot.

BASE_URL="https://benched.au"
SITEMAP_URL="${BASE_URL}/sitemap.xml"

echo "Pinging Google Search Console for sitemap: ${SITEMAP_URL}..."

# Standard Ping URL
curl -I "https://www.google.com/ping?sitemap=${SITEMAP_URL}"

# Alternative approach: Bing (IndexNow)
# Note: Requires an IndexNow key for full automation
# curl "https://www.bing.com/indexnow?url=${SITEMAP_URL}&key=YOUR_KEY"

echo "Done! If Google shows 0 pages in GSC, please wait 24-48 hours after resubmitting."
