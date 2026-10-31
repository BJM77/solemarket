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
  # Every optimised image on the page, but only the widths phones/tablets/laptops
  # actually pick (srcsets list 16 widths per image; warming them all wasted the
  # budget on a few images and left most phone-size thumbnails cold).
  printf %s "$html" | grep -oE '/_next/image\?url=[^" ,]+' | sed 's/&amp;/\&/g' |
    grep -E '&w=(96|128|256|384|480|640|750|828)&' | sort -u | head -300 |
  while read -r u; do
    for fmt in image/webp; do
      curl -s -o /dev/null -A "$UA" -H "Accept: $fmt,image/*" -w "%{http_code} %{time_total}s $fmt $u\n" "$BASE$u" | cut -c1-120
    done
  done
done
