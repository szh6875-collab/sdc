# Orbyte Hub — Combined Project

This combined build uses the richer React/TypeScript Orbyte Hub UI and e-Invoice processing flow, while incorporating compatible features from the lightweight Orbyte Hub prototype. The lightweight prototype is not shipped as a second separate UI; its useful logic and test data are integrated into this main app to avoid maintaining two disconnected data stores and navigation systems.

## What has been combined and refined

- **Owner-facing React UI:** Home / Workspace, e-Invoice, Policies & Benefits, and Business Settings. Approval and relevant audit details are embedded in their related workflows; standalone Activity History is not part of the primary navigation.
- **Multi-company scope:** invoice lists, invoice exports, source-file downloads, audit history, and audit exports require the selected company and enforce the invoice's company ownership on the server.
- **Richer document intake:** PDF/XML/JSON/text/image and QR-related invoice intake, deterministic parsing, configured Gemini support, and optional RunPod OpenAI-compatible endpoint support.
- **Human review safety:** AI extraction results are cross-checked against deterministic text extraction; material discrepancies lower confidence and require review rather than silently accepting a confident result.
- **Versioned policy fixtures:** the `policies/LHDN-v4.8.json` and `policies/LHDN-v4.9.json` files from the companion prototype are read by the local policy-diff preview. The preview is explicitly a **local demo fixture comparison**, not proof of a current official LHDN policy change.
- **Reader benchmark:** a 50-case synthetic text benchmark is included at `benchmark/messages.json`, runnable with `npm run benchmark:reader` (deterministic mode) or `BENCHMARK_USE_AI=true npm run benchmark:reader` (configured AI provider).
- **Activity history durability:** the demo audit ledger is saved locally to `data/audit-ledger.json` between server restarts and includes company scope in its hash-chained content. This is local persistence, not an external immutable/WORM audit store.
- **Export repair:** activity CSV and XLSM exports use authenticated API downloads, strict company filtering, response-type checks, and file validation before the UI reports success.

## Run locally

Prerequisites: Node.js compatible with this project's Vite/TypeScript versions. The previously supplied lockfile was inconsistent with `package.json` (it omitted required `exceljs` and `jszip` entries and pinned an incompatible esbuild range), so it was removed. Run `npm install` with registry access to generate a fresh `package-lock.json` before reproducible deployment.

```bash
npm install
cp .env.example .env.local
# Edit .env.local and provide GEMINI_API_KEY if Gemini extraction is needed.
npm run dev
```

Optional RunPod configuration is available via `AI_PROVIDER=runpod`, `RUNPOD_API_KEY`, `RUNPOD_ENDPOINT_ID`, and optionally `RUNPOD_MODEL`. Keep actual API keys in `.env.local` or your hosting secret manager; never commit them.

## Validation and tests

```bash
npm run lint
npm run build
npm test
npm run benchmark:reader
```

The export integration test checks authenticated downloads, company separation, CSV UTF-8/escaping, XLSM OpenXML structure, and source/export API responses. Install dependencies before running project tests.

## Important demo / regulatory boundaries

- Included demo accounts are for local development only. Replace demo authentication and credentials before public or production deployment.
- Local policy JSON files are prototype fixtures. They are not a live source feed and must not be treated as legal/tax advice or the current official law. The existing monitoring UI distinguishes local/demo data from verified official-source activity.
- The workbook exporters produce Excel OpenXML workbooks with the macro-enabled `.xlsm` package content type and seven e-Invoice sheets / two activity sheets. No VBA macros are embedded because the workbook does not require macro behavior.
- The local audit chain detects record changes and survives ordinary process restarts, but is not protected against an administrator rewriting both the ledger and hash chain. Use external immutable storage/checkpoints for production audit evidence.
- Company profile data and bundled test profiles are local demo data; this build does not connect to SSM or MyInvois for authoritative validation/submission.

## Scheduled official policy monitoring (no Google Cloud Billing)

The project includes `.github/workflows/policy-monitor.yml`. GitHub Actions runs the policy monitor every 12 hours (00:00 and 12:00 Malaysia time) and can be started manually from the repository's **Actions** tab. The job retrieves the LHDN guideline listing, MyInvois SDK page and MOF portal, then downloads and compares the LHDN General and Specific e-Invoice guideline PDFs separately. It stores last-known-good text snapshots, SHA-256 hashes and old/new excerpts in the repository. It does not require Cloud Scheduler, Cloud Storage, a Gemini key, or Google Cloud Billing.

After uploading this project to GitHub, enable Actions and manually run **Orbyte Official Policy Monitor** once. The first successful PDF fetch records a baseline; a second successful fetch is needed before unchanged/changed can be claimed. Detected changes stay pending across future runs until the report is manually reviewed and the workflow is manually dispatched with `acknowledge_detected_changes` enabled; this clears only the review flag for a matching re-fetched hash and never activates rules. The UI reads `/policy-monitoring/status.json` by default. If the app is hosted separately from this repository, set the build-time `VITE_POLICY_MONITORING_STATUS_URL` to the public raw URL for that JSON and rebuild/redeploy. 详细英文说明见 [`docs/GITHUB_ACTIONS_POLICY_MONITORING.md`](docs/GITHUB_ACTIONS_POLICY_MONITORING.md)，中文步骤见 [`docs/GITHUB_ACTIONS_POLICY_MONITORING.zh-CN.md`](docs/GITHUB_ACTIONS_POLICY_MONITORING.zh-CN.md).

Only official-source retrieval and deterministic text comparison are automated. A content difference is not proof of a legal change, and no rule is automatically activated. GitHub Actions has its own platform usage limits; this removes the Google Cloud Billing dependency for policy monitoring, not all possible hosting costs.
