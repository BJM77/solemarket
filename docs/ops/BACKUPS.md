# Firestore backups & point-in-time recovery

**Status:** script ready (`scripts/ops/firestore-backup.sh`); nothing enabled yet. Needs a one-off run by an account owner.

## What you get
| Layer | Protects against | Window |
|---|---|---|
| PITR (point-in-time recovery) | bad deploy / script corrupting data | any minute in the last 7 days |
| Daily managed export to `gs://<project>-firestore-backups` | accidental collection delete, ransomware, long-tail bugs | 35 days (lifecycle + retention lock) |

## One-time setup (Ben)
1. Install gcloud and `gcloud auth login` with the Owner account.
2. `PROJECT_ID=studio-3973035687-658c0 ./scripts/ops/firestore-backup.sh setup`
   - enables PITR, creates the locked bucket, a least-privilege service account and a Cloud Scheduler job (03:00 AWST daily).
   - Set `REGION` to the Firestore database's location if it is not `australia-southeast1` (`gcloud firestore databases describe`).
3. Next day: `./scripts/ops/firestore-backup.sh list` should show a dated export.
4. Cost: PITR billed as storage for retained versions; exports ~ document read cost + GCS storage. Expected low single-digit AUD/month at current size.

## Restore drill (do once a quarter)
- PITR: `gcloud firestore databases clone` (or export with `--snapshot-time`) into a **new** database, verify, then copy what you need. Never restore straight over prod without a fresh export first.
- Export: `./scripts/ops/firestore-backup.sh restore gs://.../<export>` (asks for confirmation; overwrites docs with matching IDs).

Storage (product photos) is separate: enable Object Versioning + soft delete on the default bucket in the console (Cloud Storage > bucket > Protection).
