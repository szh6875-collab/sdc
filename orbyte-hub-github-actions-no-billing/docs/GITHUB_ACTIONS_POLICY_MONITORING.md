# Orbyte Hub — Policy Monitoring with GitHub Actions

This is the no-Google-Cloud-Billing monitoring path. It does not call Cloud Scheduler, Cloud Run jobs, Cloud Storage, Secret Manager, or a Gemini API. GitHub Actions runs a Node.js script that checks approved official source pages, rediscovers LHDN guideline PDF links, downloads the General and Specific guideline PDFs independently, extracts readable PDF text, normalizes it, and compares its SHA-256 hash against the last known-good snapshot.

## What the workflow does

- Runs at 00:00 and 12:00 Malaysia time (UTC cron `0 4,16 * * *`) and can also be launched manually.
- Tracks the LHDN guideline listing, MyInvois SDK guideline page, and MOF Budget portal independently from the two LHDN PDFs.
- Retries transient retrieval errors, checks HTTPS and approved official domains, applies response size limits, and rejects HTML/error pages masquerading as PDFs.
- Preserves the last known-good snapshot when a fetch or PDF extraction fails. A 404 is reported as a missing source/document, not as a successful check.
- Writes current status to `public/policy-monitoring/status.json`, a human-readable report to `public/policy-monitoring/latest-report.md`, and comparison state to `policy-monitoring/state.json`.
- Never activates tax/compliance rules. Text changes are only candidates for human review.

The workflow makes **no AI API calls**, so it requires no API key. It uses a deterministic text comparison and provides old/new excerpts when PDF text changes.

## Enable it in GitHub

1. Put this project in a GitHub repository and push the workflow file `.github/workflows/policy-monitor.yml` to the repository's default branch.
2. Open **Actions**. If prompted, enable GitHub Actions for the repository.
3. Select **Orbyte Official Policy Monitor** → **Run workflow** → run it on the default branch.
4. Open the run logs and review the `policy-monitor` step. The workflow commits its status, snapshot state, and report back to the same branch. If an official site is temporarily unavailable, the workflow still records the failure and preserves the previous successful snapshot; the run may be marked failed so the issue is visible.
5. After the initial successful retrieval, the status will say `BASELINE SAVED — NO PRIOR COMPARISON`. Run it again later to establish whether the extracted text is unchanged or has changed. A detected PDF change stays in a pending-review queue across later runs; it is not silently cleared just because the next fetch is unchanged. After manually reviewing the latest report, manually run the workflow again and set `acknowledge_detected_changes` to `true`. The workflow clears only a pending flag whose document was successfully re-fetched with the same hash; it does not activate or alter compliance rules.

Repository Actions permissions must allow the workflow to write contents so it can commit the results. The scheduled run is best-effort and may not begin at the exact minute shown in cron.

## Make the live Orbyte UI read the latest status

The monitor writes status into the repository on every scheduled run. There are two ways for the app UI to display it:

### If the app is built/deployed from this same repository

Configure your hosting provider to rebuild/redeploy when the monitoring commit is pushed. The app reads `/policy-monitoring/status.json` by default. If the hosting provider does not redeploy automatically, the monitor still writes its results to GitHub, but the live app will continue serving its previously deployed status file until it is rebuilt.

### If Orbyte Hub is hosted elsewhere

For a **public** GitHub repository, set the build-time environment variable `VITE_POLICY_MONITORING_STATUS_URL` to the raw status file URL:

```text
https://raw.githubusercontent.com/OWNER/REPOSITORY/main/public/policy-monitoring/status.json
```

Replace `OWNER` and `REPOSITORY` with the actual GitHub owner/repository name, and change `main` if the default branch has a different name. Rebuild/redeploy the frontend after setting this variable. The UI can then read the most recent GitHub Actions status without Google Cloud Billing. A browser cannot read a private repository's raw file without credentials; do not put a GitHub token in frontend code.

The report is also available at `public/policy-monitoring/latest-report.md` in the repository. The generated status includes its raw report URL for public repositories.

## Status meanings and legal safeguards

- `baseline_saved`: the first successful PDF text snapshot was recorded; no change/no-change claim is possible yet.
- `unchanged`: the newly extracted, normalized PDF text hash matches the last successful snapshot.
- `changed`: the text hash differs. Review the old/new excerpts, official source, version, and effective date manually.
- `document_not_found`: the URL returned HTTP 404/410; the previous snapshot is retained.
- `unavailable`, `failed`, or `unverifiable`: the source could not be checked safely; this does not mean the previous policy is still current.
- A portal-page change is not itself proof that the legal guideline changed.

This automation monitors the two configured LHDN guideline PDFs and three official source pages. It does not yet ingest every MyInvois schema, FAQ, gazette, or MOF publication as an individual document. GitHub Actions itself has platform usage limits; this avoids Google Cloud Billing but is not a promise of unlimited third-party compute.
