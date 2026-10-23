# Orbyte Hub — Modification Notes

## Existing product and compliance refinements retained

- Corrected the e-Invoice exemption screening reference from RM1,000,000 to RM3,000,000 as a screening reference only; business-specific conditions still need to be checked.
- Preserved separate official-source page checks and LHDN General/Specific PDF checks; failed/unverifiable retrievals do not overwrite the last known-good snapshot.
- Kept demo simulations separate from live retrieval and real pending review items. A webpage/PDF hash change is a review signal, not proof of a statutory change.
- Removed quick profile presets that could overwrite a real business profile with sample data, clarified demo profile/sample data, and kept policy-rule activation subject to human review.
- Retained the invoice-processing workflow, role-aware API, policy-screening refinements, and project tests from the uploaded source ZIP.

## Current policy-monitoring implementation (GitHub Actions, no Google Cloud Billing)

- Added `.github/workflows/policy-monitor.yml`, scheduled at 00:00 and 12:00 Malaysia time (`0 4,16 * * *` UTC) and available through manual workflow dispatch.
- Added `policy-monitoring/policy_monitor_github.mjs` to check the LHDN guideline listing, MyInvois SDK page, and MOF portal; rediscover links to the two LHDN guideline PDFs; retrieve PDFs from approved HTTPS domains; extract/normalize PDF text; and compare SHA-256 snapshots.
- Added bounded retries, redirect-domain validation, body-size checks, PDF signature validation, and readable old/new excerpts for detected document changes. A 404 is not reported as a successful retrieval, and failed checks preserve previous snapshots.
- The workflow commits `policy-monitoring/state.json`, `public/policy-monitoring/status.json`, and `public/policy-monitoring/latest-report.md` back to the same branch. A first successful PDF retrieval records a baseline; a second successful retrieval is needed before claiming unchanged/changed.
- The UI now supports `schedulerMode: github_actions` and reads the read-only status feed. For a separately hosted app and public repository, set the build-time `VITE_POLICY_MONITORING_STATUS_URL` to the raw `status.json` URL and redeploy the frontend.
- No Gemini/API key is required for this monitor. It performs deterministic comparison only. Text changes never automatically activate compliance rules.
- The older Cloud Scheduler endpoint remains for backward compatibility with existing Cloud Run setups, but the new workflow does not call it and does not require Cloud Scheduler, Cloud Storage, Secret Manager, or Google Cloud Billing.

## Validation and limits

- `node --check policy-monitoring/policy_monitor_github.mjs` passed; TypeScript/TSX syntax parsing found no syntax errors across 40 files.
- An offline mocked smoke test passed both first-baseline and changed-PDF flows. It did not test live LHDN/MOF access or the real `pdf-parse` package installation.
- Parsed the status/state JSON, package manifest, and bundled policy fixtures successfully.
- Full dependency installation, Vite production build, full TypeScript type-check, and live LHDN/MOF requests were not verified in this environment. The target repository's first manual GitHub Actions run is required to establish a real baseline and verify that the external sites permit retrieval from GitHub-hosted runners.
- GitHub Actions has its own platform usage limits and scheduled jobs are best-effort. This path removes the Google Cloud Billing setup requirement for the policy monitor; it does not promise unlimited compute or eliminate separate app-hosting costs.
