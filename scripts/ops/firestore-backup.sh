#!/usr/bin/env bash
# Firestore backup & PITR helper for benched.au.
# Nothing here runs automatically - Ben runs each subcommand once with an
# account that has Owner / Datastore Import Export Admin on the project.
#
#   ./scripts/ops/firestore-backup.sh setup        # bucket + PITR + scheduled export job
#   ./scripts/ops/firestore-backup.sh export-now   # one-off manual export
#   ./scripts/ops/firestore-backup.sh list         # list exports
#   ./scripts/ops/firestore-backup.sh restore gs://.../2026-10-11T00:00:00_12345   # DANGER: imports into the live DB
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-studio-3973035687-658c0}"
REGION="${REGION:-australia-southeast1}"
BUCKET="${BUCKET:-gs://${PROJECT_ID}-firestore-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-35}"
SCHEDULE="${SCHEDULE:-0 3 * * *}"   # 03:00 daily
TZ_NAME="${TZ_NAME:-Australia/Perth}"
SA_NAME="firestore-backup"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

cmd="${1:-help}"

case "$cmd" in
  setup)
    echo "==> Enabling APIs"
    gcloud services enable firestore.googleapis.com cloudscheduler.googleapis.com --project "$PROJECT_ID"

    echo "==> Point-in-time recovery (7-day window of per-minute versions)"
    gcloud firestore databases update --database='(default)' --enable-pitr --project "$PROJECT_ID"

    echo "==> Backup bucket $BUCKET (retention ${RETENTION_DAYS}d, uniform access, no public access)"
    gcloud storage buckets describe "$BUCKET" >/dev/null 2>&1 || \
      gcloud storage buckets create "$BUCKET" --project "$PROJECT_ID" --location "$REGION" \
        --uniform-bucket-level-access --public-access-prevention
    cat > /tmp/lifecycle.json <<JSON
{"rule":[{"action":{"type":"Delete"},"condition":{"age":${RETENTION_DAYS}}}]}
JSON
    gcloud storage buckets update "$BUCKET" --lifecycle-file=/tmp/lifecycle.json
    # Soft-delete/retention lock protects backups from accidental or malicious deletion.
    gcloud storage buckets update "$BUCKET" --retention-period="${RETENTION_DAYS}d" || true

    echo "==> Service account for scheduled exports"
    gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1 || \
      gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT_ID" --display-name "Firestore scheduled export"
    gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$SA_EMAIL" --role roles/datastore.importExportAdmin --condition=None >/dev/null
    gcloud storage buckets add-iam-policy-binding "$BUCKET" --member "serviceAccount:$SA_EMAIL" --role roles/storage.objectAdmin >/dev/null

    echo "==> Cloud Scheduler job (daily export via Firestore REST API)"
    gcloud scheduler jobs describe firestore-daily-export --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1 && \
      gcloud scheduler jobs delete firestore-daily-export --location "$REGION" --project "$PROJECT_ID" --quiet
    gcloud scheduler jobs create http firestore-daily-export \
      --project "$PROJECT_ID" --location "$REGION" \
      --schedule "$SCHEDULE" --time-zone "$TZ_NAME" \
      --http-method POST \
      --uri "https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default):exportDocuments" \
      --message-body "{\"outputUriPrefix\":\"${BUCKET}\"}" \
      --oauth-service-account-email "$SA_EMAIL" \
      --oauth-token-scope "https://www.googleapis.com/auth/datastore"
    echo "Done. Verify tomorrow with: $0 list"
    ;;
  export-now)
    gcloud firestore export "$BUCKET/manual-$(date -u +%Y%m%dT%H%M%SZ)" --project "$PROJECT_ID" --async
    ;;
  list)
    gcloud storage ls "$BUCKET/"
    ;;
  restore)
    src="${2:?usage: $0 restore gs://bucket/export-prefix}"
    echo "About to IMPORT $src into the LIVE database of $PROJECT_ID. Documents with the same IDs are overwritten."
    read -r -p "Type the project id to confirm: " confirm
    [ "$confirm" = "$PROJECT_ID" ] || { echo "Aborted"; exit 1; }
    gcloud firestore import "$src" --project "$PROJECT_ID" --async
    ;;
  *)
    sed -n '2,12p' "$0"
    ;;
esac
