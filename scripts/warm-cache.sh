#!/usr/bin/env bash
# Warm the Next.js page + image-optimiser caches on benched.au after a rollout.
# Free: plain public GETs, no secrets. Usage: scripts/warm-cache.sh [base-url]
set -u
BASE="${1:-https://benched.au}"
UA="Mozilla/5.0 (Linux; Android 10; Mobile) BenchedCacheWarm/1.0"
PAGES="/ /cards /coins /shoes /browse /multibuy"
for p in $PAGES; do
  html=$(curl -s -A "$UA" "$BASE$p") || continue
  echo "page $p $(printf %s "$html" | wc -c) bytes"
  # The first ~30 optimised image URLs on the page (src + srcset), decoded &amp;.
  printf %s "$html" | grep -oE '/_next/image\?url=[^" ,]+' | sed 's/&amp;/\&/g' | sort -u | head -60 |
  while read -r u; do
    for fmt in image/avif image/webp; do
      curl -s -o /dev/null -A "$UA" -H "Accept: $fmt,image/*" -w "%{http_code} %{time_total}s $fmt $u\n" "$BASE$u" | cut -c1-120
    done
  done
done
