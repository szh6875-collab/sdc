import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_PATH = path.join(ROOT, 'policy-monitoring', 'state.json');
const STATUS_PATH = path.join(ROOT, 'public', 'policy-monitoring', 'status.json');
const REPORT_PATH = path.join(ROOT, 'public', 'policy-monitoring', 'latest-report.md');
const NOW = new Date();
const NOW_ISO = NOW.toISOString();
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const MAX_HTML_BYTES = 5 * 1024 * 1024;
const USER_AGENT = 'Orbyte-Hub-Policy-Monitor/1.0 (+official-document-change-detection)';

const SOURCES = [
  {
    id: 'lhdn-portal',
    name: 'LHDN Official e-Invoice Guidelines Portal',
    url: 'https://www.hasil.gov.my/e-invois/rujukan-pelaksanaan-e-invois/garis-panduan/',
    documentType: 'Official guideline listing page',
    allowedDomains: ['hasil.gov.my'],
    isGuidelineIndex: true,
  },
  {
    id: 'myinvois-sdk',
    name: 'MyInvois Developer SDK & Technical Specs',
    url: 'https://sdk.myinvois.hasil.gov.my/guidelines/',
    documentType: 'Official technical guidelines page',
    allowedDomains: ['myinvois.hasil.gov.my'],
  },
  {
    id: 'mof-budget',
    name: 'Ministry of Finance (MOF) Budget Portal',
    url: 'https://budget.mof.gov.my/',
    documentType: 'Official budget announcements and policy publications',
    allowedDomains: ['mof.gov.my'],
  },
];

const DOCUMENTS = [
  {
    id: 'lhdn-general-guideline',
    title: 'LHDN General e-Invoice Guideline',
    sourceId: 'lhdn-portal',
    sourceIndexUrl: SOURCES[0].url,
    fallbackUrl: 'https://www.hasil.gov.my/wp-content/uploads/Garis-Panduan-e-Invois-LHDNM.pdf',
    allowedDomains: ['hasil.gov.my'],
    kind: 'general',
  },
  {
    id: 'lhdn-specific-guideline',
    title: 'LHDN Specific e-Invoice Guideline',
    sourceId: 'lhdn-portal',
    sourceIndexUrl: SOURCES[0].url,
    fallbackUrl: 'https://www.hasil.gov.my/wp-content/uploads/LHDN-Garis-Panduan-Spesifik-e-Invois.pdf',
    allowedDomains: ['hasil.gov.my'],
    kind: 'specific',
  },
];

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function isAllowedHttpsUrl(rawUrl, allowedDomains) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && allowedDomains.some((domain) => url.hostname.toLowerCase() === domain || url.hostname.toLowerCase().endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function htmlToText(html) {
  return decodeHtml(String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|br|hr|table|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizePdfText(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\u00ad/g, '')
    .replace(/\r/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchWithRetries(rawUrl, allowedDomains, maxBytes, attempts = 3) {
  if (!isAllowedHttpsUrl(rawUrl, allowedDomains)) {
    return { ok: false, status: null, error: 'URL is not HTTPS on an approved official domain.', url: rawUrl };
  }
  let lastError = 'Unknown retrieval error';
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(rawUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/pdf,application/xhtml+xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      const finalUrl = response.url || rawUrl;
      if (!isAllowedHttpsUrl(finalUrl, allowedDomains)) {
        return { ok: false, status: response.status, error: 'Redirect left the approved official domain.', url: finalUrl };
      }
      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < attempts - 1) {
        lastError = `Temporary HTTP ${response.status}`;
        await response.arrayBuffer().catch(() => undefined);
        await new Promise((resolve) => setTimeout(resolve, 800 * (2 ** attempt)));
        continue;
      }
      if (!response.ok) {
        return { ok: false, status: response.status, error: `Official source returned HTTP ${response.status}.`, url: finalUrl };
      }
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > maxBytes) {
        return { ok: false, status: response.status, error: `Response exceeded the ${maxBytes} byte safety limit.`, url: finalUrl };
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > maxBytes) {
        return { ok: false, status: response.status, error: `Response exceeded the ${maxBytes} byte safety limit.`, url: finalUrl };
      }
      return {
        ok: true,
        status: response.status,
        url: finalUrl,
        contentType: response.headers.get('content-type') || '',
        bytes: buffer,
        retrievedAt: new Date().toISOString(),
      };
    } catch (error) {
      lastError = error?.name === 'AbortError' ? 'Request timed out.' : String(error?.message || error).slice(0, 220);
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 800 * (2 ** attempt)));
    } finally {
      clearTimeout(timeout);
    }
  }
  return { ok: false, status: null, error: lastError, url: rawUrl };
}

function discoverPdfLink(indexHtml, document) {
  const anchors = [...String(indexHtml || '').matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi)];
  const candidates = [];
  for (const match of anchors) {
    const href = decodeHtml(match[2]).trim();
    const anchorText = htmlToText(match[3]);
    if (!href) continue;
    let absoluteUrl;
    try { absoluteUrl = new URL(href, document.sourceIndexUrl).toString(); } catch { continue; }
    if (!isAllowedHttpsUrl(absoluteUrl, document.allowedDomains)) continue;
    const combined = `${absoluteUrl} ${anchorText}`.toLowerCase();
    if (!/\.pdf(?:[?#]|$)/i.test(absoluteUrl)) continue;
    if (document.kind === 'general') {
      if (/specific|spesifik|khusus|technical/.test(combined)) continue;
      if (!/general|umum|garis-panduan-e-invois|garis-panduan-invois|e-invoice-guideline|e-invois/.test(combined)) continue;
    } else {
      if (!/specific|spesifik|khusus/.test(combined)) continue;
    }
    candidates.push({ url: absoluteUrl, text: anchorText });
  }
  return candidates[0]?.url || null;
}

function detectVersion(text) {
  const patterns = [
    /(?:version|versi|v)\s*[:.]?\s*(\d+(?:\.\d+){1,3})/i,
    /(?:general|specific|spesifik)\s+(?:e-)?invoice\s+guideline\s*(\d+(?:\.\d+){1,3})/i,
  ];
  for (const pattern of patterns) {
    const match = String(text || '').match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function diffExcerpt(previous, current, limit = 900) {
  const oldLines = String(previous || '').split('\n');
  const newLines = String(current || '').split('\n');
  let start = 0;
  while (start < oldLines.length && start < newLines.length && oldLines[start] === newLines[start]) start += 1;
  let oldEnd = oldLines.length - 1;
  let newEnd = newLines.length - 1;
  while (oldEnd >= start && newEnd >= start && oldLines[oldEnd] === newLines[newEnd]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  const excerpt = (lines, end) => lines.slice(Math.max(0, start - 2), Math.min(lines.length, Math.max(start + 8, end + 3))).join('\n').slice(0, limit);
  return { oldText: excerpt(oldLines, oldEnd), newText: excerpt(newLines, newEnd) };
}

function nextMalaysiaCheck(now) {
  // Malaysia is UTC+08:00 and does not observe daylight saving time.
  const localWall = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  let year = localWall.getUTCFullYear();
  let month = localWall.getUTCMonth();
  let day = localWall.getUTCDate();
  const localHour = localWall.getUTCHours();
  let targetHour;
  if (localHour < 12) targetHour = 12;
  else {
    targetHour = 0;
    const nextDay = new Date(Date.UTC(year, month, day + 1));
    year = nextDay.getUTCFullYear();
    month = nextDay.getUTCMonth();
    day = nextDay.getUTCDate();
  }
  return new Date(Date.UTC(year, month, day, targetHour) - 8 * 60 * 60 * 1000).toISOString();
}

function sourceStatusRecord(source, oldRecord, retrieval, text) {
  const hash = sha256(text);
  const previousHash = oldRecord?.sha256 || null;
  let status;
  if (!oldRecord?.sha256 || typeof oldRecord.snapshotText !== 'string') status = 'connected';
  else if (hash === previousHash) status = 'unchanged';
  else status = 'changed';
  return {
    id: source.id,
    name: source.name,
    url: retrieval.url,
    documentType: source.documentType,
    lastChecked: NOW_ISO,
    lastSuccessfulRetrieval: retrieval.retrievedAt,
    lastStatus: status,
    httpStatus: retrieval.status,
    errorMessage: null,
    monitoredVersion: oldRecord?.detectedVersion || 'Version not established from page metadata',
    detectedVersion: detectVersion(text),
    hasUpdate: status === 'changed',
    sourceSnippet: text.slice(0, 350),
    snapshotHash: hash,
    snapshotSnippet: text.slice(0, 350),
    retrievalMethod: 'live_network',
    checkIntervalHours: 12,
    sha256: hash,
    snapshotText: text,
  };
}

async function run() {
  const state = readJson(STATE_PATH, { schemaVersion: 1, sources: {}, documents: {}, pendingChanges: {} });
  if (state.schemaVersion !== 1 || !state.sources || typeof state.sources !== 'object' || Array.isArray(state.sources) || !state.documents || typeof state.documents !== 'object' || Array.isArray(state.documents)) {
    throw new Error('Existing monitor state has an unsupported schema. Refusing to overwrite the last known-good state.');
  }

  if (!state.pendingChanges || typeof state.pendingChanges !== 'object' || Array.isArray(state.pendingChanges)) state.pendingChanges = {};
  const pendingChangesAtStart = JSON.parse(JSON.stringify(state.pendingChanges));
  const acknowledgeRequested = ['true', '1', 'yes'].includes(String(process.env.ACKNOWLEDGE_POLICY_CHANGES || '').toLowerCase());
  const acknowledgedThisRun = [];

  const sourceRecords = [];
  const indexHtmlBySource = new Map();
  const sourceChanges = [];
  const sourceFailures = [];

  for (const source of SOURCES) {
    const old = state.sources[source.id];
    const retrieval = await fetchWithRetries(source.url, source.allowedDomains, MAX_HTML_BYTES, 3);
    if (!retrieval.ok) {
      sourceRecords.push({
        id: source.id,
        name: source.name,
        url: source.url,
        documentType: source.documentType,
        lastChecked: NOW_ISO,
        lastSuccessfulRetrieval: old?.lastSuccessfulRetrieval || null,
        lastStatus: retrieval.status === 404 || retrieval.status === 410 ? 'document_not_found' : retrieval.status === 401 || retrieval.status === 403 || retrieval.status === 429 ? 'unverifiable' : 'unavailable',
        httpStatus: retrieval.status,
        errorMessage: `${retrieval.error} Last known-good source snapshot was retained.`,
        monitoredVersion: old?.detectedVersion || 'Not yet established from a live source',
        detectedVersion: old?.detectedVersion || null,
        hasUpdate: false,
        sourceSnippet: 'No current source content was verified during this run.',
        snapshotHash: old?.sha256 || null,
        snapshotSnippet: old?.snapshotText?.slice(0, 350) || null,
        retrievalMethod: 'none',
        checkIntervalHours: 12,
      });
      sourceFailures.push({ name: source.name, error: retrieval.error });
      continue;
    }
    const bodyText = retrieval.bytes.toString('utf8');
    const text = htmlToText(bodyText);
    if (text.length < 100) {
      sourceRecords.push({
        id: source.id,
        name: source.name,
        url: retrieval.url,
        documentType: source.documentType,
        lastChecked: NOW_ISO,
        lastSuccessfulRetrieval: old?.lastSuccessfulRetrieval || null,
        lastStatus: 'unverifiable',
        httpStatus: retrieval.status,
        errorMessage: 'The page returned too little readable text to establish a source snapshot. Previous snapshot retained.',
        monitoredVersion: old?.detectedVersion || 'Not yet established from a live source',
        detectedVersion: old?.detectedVersion || null,
        hasUpdate: false,
        sourceSnippet: 'Content extraction was not sufficient for verification.',
        snapshotHash: old?.sha256 || null,
        snapshotSnippet: old?.snapshotText?.slice(0, 350) || null,
        retrievalMethod: 'none',
        checkIntervalHours: 12,
      });
      sourceFailures.push({ name: source.name, error: 'Page text extraction was insufficient.' });
      continue;
    }
    const record = sourceStatusRecord(source, old, retrieval, text);
    sourceRecords.push(record);
    state.sources[source.id] = record;
    if (source.isGuidelineIndex) indexHtmlBySource.set(source.id, bodyText);
    if (record.lastStatus === 'changed') sourceChanges.push({ name: source.name, url: retrieval.url, ...diffExcerpt(old.snapshotText, text, 600) });
  }

  const documentRecords = [];
  const documentChanges = [];
  const documentFailures = [];
  const lhdnIndex = indexHtmlBySource.get('lhdn-portal') || null;

  for (const document of DOCUMENTS) {
    const old = state.documents[document.id];
    const discovered = lhdnIndex ? discoverPdfLink(lhdnIndex, document) : null;
    const candidateUrls = [...new Set([discovered, document.fallbackUrl].filter(Boolean))];
    let retrieval = null;
    for (const candidateUrl of candidateUrls) {
      const candidate = await fetchWithRetries(candidateUrl, document.allowedDomains, MAX_PDF_BYTES, 3);
      if (candidate.ok) {
        retrieval = candidate;
        break;
      }
      retrieval = candidate;
      // A bad discovered link should not prevent one fallback attempt.
      if (candidateUrl === candidateUrls[candidateUrls.length - 1]) break;
    }

    if (!retrieval?.ok) {
      const notFound = retrieval?.status === 404 || retrieval?.status === 410;
      const record = {
        id: document.id,
        title: document.title,
        sourceId: document.sourceId,
        sourceIndexUrl: document.sourceIndexUrl,
        url: retrieval?.url || discovered || document.fallbackUrl,
        lastChecked: NOW_ISO,
        lastSuccessfulRetrieval: old?.lastSuccessfulRetrieval || null,
        lastStatus: notFound ? 'document_not_found' : retrieval?.status === 401 || retrieval?.status === 403 || retrieval?.status === 429 ? 'unverifiable' : 'unavailable',
        httpStatus: retrieval?.status ?? null,
        detectedVersion: old?.detectedVersion || null,
        sha256: old?.sha256 || null,
        previousSha256: old?.previousSha256 || null,
        textLength: old?.textLength || 0,
        pageCount: old?.pageCount || null,
        errorMessage: `${retrieval?.error || 'Official PDF retrieval failed.'} Last known-good document snapshot was retained.`,
        hasUpdate: false,
      };
      documentRecords.push(record);
      documentFailures.push({ name: document.title, error: record.errorMessage });
      continue;
    }

    if (retrieval.bytes.byteLength < 100 || retrieval.bytes.subarray(0, 5).toString('ascii') !== '%PDF-' || /text\/html/i.test(retrieval.contentType)) {
      const record = {
        id: document.id,
        title: document.title,
        sourceId: document.sourceId,
        sourceIndexUrl: document.sourceIndexUrl,
        url: retrieval.url,
        lastChecked: NOW_ISO,
        lastSuccessfulRetrieval: old?.lastSuccessfulRetrieval || null,
        lastStatus: 'unverifiable',
        httpStatus: retrieval.status,
        detectedVersion: old?.detectedVersion || null,
        sha256: old?.sha256 || null,
        previousSha256: old?.previousSha256 || null,
        textLength: old?.textLength || 0,
        pageCount: old?.pageCount || null,
        errorMessage: 'The response was not a valid PDF; no snapshot was changed.',
        hasUpdate: false,
      };
      documentRecords.push(record);
      documentFailures.push({ name: document.title, error: record.errorMessage });
      continue;
    }

    let parsed;
    const parser = new PDFParse({ data: retrieval.bytes });
    try {
      parsed = await parser.getText();
    } finally {
      try { await parser.destroy?.(); } catch { /* Best effort parser cleanup. */ }
    }
    const extractedText = normalizePdfText(typeof parsed === 'string' ? parsed : String(parsed?.text || ''));
    if (extractedText.length < 500) {
      const record = {
        id: document.id,
        title: document.title,
        sourceId: document.sourceId,
        sourceIndexUrl: document.sourceIndexUrl,
        url: retrieval.url,
        lastChecked: NOW_ISO,
        lastSuccessfulRetrieval: old?.lastSuccessfulRetrieval || null,
        lastStatus: 'unverifiable',
        httpStatus: retrieval.status,
        detectedVersion: old?.detectedVersion || null,
        sha256: old?.sha256 || null,
        previousSha256: old?.previousSha256 || null,
        textLength: extractedText.length,
        pageCount: Array.isArray(parsed?.pages) ? parsed.pages.length : (typeof parsed?.total === 'number' ? parsed.total : null),
        errorMessage: 'PDF downloaded, but fewer than 500 readable characters were extracted. Previous snapshot retained.',
        hasUpdate: false,
      };
      documentRecords.push(record);
      documentFailures.push({ name: document.title, error: record.errorMessage });
      continue;
    }

    const currentHash = sha256(extractedText);
    const previousHash = old?.sha256 || null;
    let status;
    if (!previousHash || typeof old?.snapshotText !== 'string') status = 'baseline_saved';
    else if (currentHash === previousHash) status = 'unchanged';
    else status = 'changed';
    const currentVersion = detectVersion(extractedText);

    if (status === 'changed') {
      const change = {
        id: document.id,
        title: document.title,
        url: retrieval.url,
        detectedAt: NOW_ISO,
        previousVersion: old?.detectedVersion || null,
        currentVersion,
        previousHash,
        currentHash,
        ...diffExcerpt(old.snapshotText, extractedText, 1200),
      };
      state.pendingChanges[document.id] = change;
      documentChanges.push(change);
    }

    const pendingReview = state.pendingChanges[document.id] || null;
    const record = {
      id: document.id,
      title: document.title,
      sourceId: document.sourceId,
      sourceIndexUrl: document.sourceIndexUrl,
      url: retrieval.url,
      lastChecked: NOW_ISO,
      lastSuccessfulRetrieval: retrieval.retrievedAt,
      lastStatus: status,
      httpStatus: retrieval.status,
      detectedVersion: currentVersion,
      sha256: currentHash,
      previousSha256: previousHash,
      textLength: extractedText.length,
      pageCount: Array.isArray(parsed?.pages) ? parsed.pages.length : (typeof parsed?.total === 'number' ? parsed.total : null),
      errorMessage: status === 'baseline_saved' ? 'First successful source snapshot recorded. There is no prior version to compare, so no change claim is made.' : null,
      hasUpdate: Boolean(pendingReview),
      pendingChangeDetectedAt: pendingReview?.detectedAt || null,
    };
    documentRecords.push(record);
    state.documents[document.id] = {
      ...record,
      // Store only the latest successfully extracted text. The previous snapshot is still
      // available in memory for this run's diff and in Git history, without doubling state size.
      snapshotText: extractedText,
    };

  }

  if (acknowledgeRequested) {
    const successfullyCompared = new Map(documentRecords
      .filter((doc) => doc.lastStatus === 'unchanged' && typeof doc.sha256 === 'string')
      .map((doc) => [doc.id, doc]));
    for (const [documentId, pendingAtStart] of Object.entries(pendingChangesAtStart)) {
      const current = successfullyCompared.get(documentId);
      // Only clear an older pending flag when this run fetched the same hash again.
      // If the document changed again or retrieval failed, the new/current issue remains pending.
      if (current && pendingAtStart?.currentHash && current.sha256 === pendingAtStart.currentHash) {
        delete state.pendingChanges[documentId];
        acknowledgedThisRun.push(pendingAtStart);
      }
    }
  }

  for (const [documentId, savedDocument] of Object.entries(state.documents)) {
    if (!savedDocument || typeof savedDocument !== 'object') continue;
    const pending = state.pendingChanges[documentId] || null;
    savedDocument.hasUpdate = Boolean(pending);
    savedDocument.pendingChangeDetectedAt = pending?.detectedAt || null;
  }

  state.schemaVersion = 1;
  state.updatedAt = NOW_ISO;
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  const publicRepository = process.env.GITHUB_REPOSITORY || '';
  const branch = process.env.GITHUB_REF_NAME || 'main';
  let repositoryIsPrivate = true;
  if (process.env.GITHUB_EVENT_PATH) {
    try {
      const eventPayload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      if (typeof eventPayload?.repository?.private === 'boolean') repositoryIsPrivate = eventPayload.repository.private;
    } catch { /* If visibility is unknown, do not assume a repository is public. */ }
  }
  const rawBase = publicRepository && !repositoryIsPrivate
    ? `https://raw.githubusercontent.com/${publicRepository}/${encodeURIComponent(branch)}`
    : null;
  const reportUrl = rawBase ? `${rawBase}/public/policy-monitoring/latest-report.md` : '/policy-monitoring/latest-report.md';
  const statusUrl = rawBase ? `${rawBase}/public/policy-monitoring/status.json` : '/policy-monitoring/status.json';
  const generatedAt = NOW_ISO;
  const pendingReviewChanges = Object.values(state.pendingChanges);
  const publicDocumentRecords = documentRecords.map((doc) => ({
    ...doc,
    hasUpdate: Boolean(state.pendingChanges[doc.id]),
    pendingChangeDetectedAt: state.pendingChanges[doc.id]?.detectedAt || null,
  }));
  const newlyChangedDocuments = documentRecords.filter((doc) => doc.lastStatus === 'changed');
  const changedDocuments = pendingReviewChanges;
  const failedDocuments = publicDocumentRecords.filter((doc) => ['failed', 'unavailable', 'document_not_found', 'unverifiable'].includes(doc.lastStatus));
  const hasBaseline = publicDocumentRecords.some((doc) => doc.lastSuccessfulRetrieval);
  const hasUpdate = pendingReviewChanges.length > 0;
  const hasAnyFailure = sourceFailures.length > 0 || documentFailures.length > 0;
  const lastSuccessfulRetrievals = [
    ...sourceRecords.map((source) => source.lastSuccessfulRetrieval),
    ...documentRecords.map((document) => document.lastSuccessfulRetrieval),
  ].filter(Boolean).sort();

  const publicStatus = {
    schemaVersion: 1,
    provider: 'github_actions',
    workflowConfigured: true,
    generatedAt,
    lastCheckedTime: generatedAt,
    nextScheduledCheck: nextMalaysiaCheck(NOW),
    lastSuccessfulRetrieval: lastSuccessfulRetrievals.at(-1) || null,
    autoCheckEnabled: true,
    checkIntervalHours: 12,
    schedulerMode: 'github_actions',
    persistenceMode: 'github_repository',
    persistenceWarning: null,
    overallStatus: hasUpdate ? 'update_pending' : hasAnyFailure ? (hasBaseline ? 'network_restricted' : 'check_failed') : hasBaseline ? 'active_monitoring' : 'idle',
    activeVersion: 'human-approved-policy-rules-unchanged',
    isStale: false,
    monitoredSources: sourceRecords.map(({ snapshotText, sha256: internalHash, ...source }) => source),
    monitoredDocuments: publicDocumentRecords,
    pendingUpdate: null,
    hasNetworkRestriction: sourceRecords.some((source) => ['unavailable', 'network_error'].includes(source.lastStatus)) || failedDocuments.some((doc) => doc.lastStatus === 'unavailable'),
    networkRestrictionNote: 'GitHub Actions retrieves official source pages and PDFs. Retrieval failures preserve the last known-good text; a content difference is a review signal, not proof of a legal change.',
    connectionNote: 'Monitoring runs in GitHub Actions. Results are read-only; changes do not activate compliance rules. If the app is hosted separately, configure VITE_POLICY_MONITORING_STATUS_URL to the public raw status.json URL so the live UI reads the latest report.',
    reportUrl,
    statusUrl,
    changedDocuments: changedDocuments.map((doc) => ({ id: doc.id, title: doc.title, url: doc.url, previousSha256: doc.previousHash, sha256: doc.currentHash, detectedAt: doc.detectedAt })),
    pendingChanges: changedDocuments.map((doc) => ({ id: doc.id, title: doc.title, url: doc.url, previousSha256: doc.previousHash, sha256: doc.currentHash, detectedAt: doc.detectedAt })),
    failedDocuments: failedDocuments.map((doc) => ({ id: doc.id, title: doc.title, errorMessage: doc.errorMessage, lastStatus: doc.lastStatus })),
    summary: {
      sourceCount: sourceRecords.length,
      documentCount: documentRecords.length,
      changedDocumentCount: changedDocuments.length,
      newlyChangedDocumentCount: newlyChangedDocuments.length,
      failedDocumentCount: failedDocuments.length,
      firstBaselinePending: documentRecords.some((doc) => doc.lastStatus === 'baseline_saved'),
    },
  };

  fs.mkdirSync(path.dirname(STATUS_PATH), { recursive: true });
  fs.writeFileSync(STATUS_PATH, `${JSON.stringify(publicStatus, null, 2)}\n`, 'utf8');

  const lines = [
    '# Orbyte Hub — Official Policy Monitoring Report',
    '',
    `- Checked at (UTC): ${generatedAt}`,
    `- Next scheduled check (Malaysia time): ${publicStatus.nextScheduledCheck}`,
    '- Schedule: 00:00 and 12:00 Asia/Kuala_Lumpur (GitHub Actions)',
    '- Rule activation: **not automatic**; every potential change requires authorised human review.',
    '',
    '## Summary',
    `- Official portal checks: ${sourceRecords.length}`,
    `- Guideline PDFs: ${documentRecords.length}`,
    `- New PDF text changes detected in this run: ${newlyChangedDocuments.length}`,
    `- Changes still pending human review: ${pendingReviewChanges.length}`,
    `- PDF checks needing attention: ${failedDocuments.length}`,
    ...(acknowledgedThisRun.length ? [`- Pending review flags acknowledged in this run: ${acknowledgedThisRun.length} (rules were not changed)`] : []),
    '',
    '## Guideline PDFs',
  ];
  for (const doc of documentRecords) {
    lines.push('', `### ${doc.title}`, '', `- Status: **${doc.lastStatus.toUpperCase()}**`, `- URL: ${doc.url}`, `- HTTP: ${doc.httpStatus ?? 'not available'}`, `- Detected version: ${doc.detectedVersion || 'not detected'}`, `- SHA-256: ${doc.sha256 || 'no verified hash'}`, `- Last successful retrieval: ${doc.lastSuccessfulRetrieval || 'none'}`);
    if (doc.errorMessage) lines.push(`- Note: ${doc.errorMessage}`);
  }
  if (pendingReviewChanges.length) {
    lines.push('', '## Pending PDF Content Changes — Human Review Required', '', 'These items remain pending until an authorised reviewer examines the official source and manually acknowledges them in a GitHub Actions run. No compliance rules were activated.');
    for (const change of pendingReviewChanges) {
      lines.push('', `### ${change.title}`, '', `- First detected at (UTC): ${change.detectedAt}`, `- Official PDF: ${change.url}`, `- Previous detected version: ${change.previousVersion || 'not detected'}`, `- Current detected version: ${change.currentVersion || 'not detected'}`, `- Previous SHA-256: ${change.previousHash}`, `- Current SHA-256: ${change.currentHash}`, '', '**Previous text excerpt**', '```text', change.oldText || '(no prior excerpt)', '```', '', '**Current text excerpt**', '```text', change.newText || '(no current excerpt)', '```', '', 'This is a textual difference only. Verify the official document, legal meaning, and effective date before changing any compliance rules.');
    }
  } else {
    lines.push('', '## Pending PDF Content Changes', '', 'No unreviewed PDF text changes are currently pending. Review the source/document check statuses below; a failed retrieval is not evidence that a policy is unchanged. A first baseline also cannot establish a change/no-change result.');
  }
  if (acknowledgedThisRun.length) {
    lines.push('', '## Review Acknowledgement Recorded', '', 'The manually requested acknowledgement cleared pending-review flags for the same successfully re-fetched document hashes. This action did not update or activate compliance rules.');
    for (const item of acknowledgedThisRun) lines.push(`- ${item.title}: ${item.currentHash}`);
  }

  if (sourceChanges.length) {
    lines.push('', '## Portal Page Changes (not proof of a guideline change)');
    for (const change of sourceChanges) lines.push('', `### ${change.name}`, `- URL: ${change.url}`, '', '**Previous excerpt**', '```text', change.oldText || '(not available)', '```', '', '**Current excerpt**', '```text', change.newText || '(not available)', '```');
  }
  if (sourceFailures.length || documentFailures.length) {
    lines.push('', '## Checks Needing Attention');
    for (const failure of [...sourceFailures, ...documentFailures]) lines.push(`- **${failure.name}:** ${failure.error}`);
  }
  lines.push('', '## Sources', ...SOURCES.map((source) => `- ${source.name}: ${source.url}`), '', 'Generated automatically by `.github/workflows/policy-monitor.yml`. This report does not provide legal advice.', '');
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

  console.log(JSON.stringify({
    success: !hasAnyFailure,
    checkedAt: generatedAt,
    sourceCount: sourceRecords.length,
    documentCount: documentRecords.length,
    changedDocuments: newlyChangedDocuments.map((doc) => doc.id),
    pendingReviewChanges: changedDocuments.map((doc) => doc.id),
    acknowledgedReviewFlags: acknowledgedThisRun.map((doc) => doc.id),
    failedDocuments: failedDocuments.map((doc) => doc.id),
    statusPath: path.relative(ROOT, STATUS_PATH),
    reportPath: path.relative(ROOT, REPORT_PATH),
  }, null, 2));

  // A failed official source must be visible and should fail the job for attention, but all good
  // snapshots/status/report have already been written so that the failure itself is recorded.
  if (hasAnyFailure) process.exitCode = 2;
}

run().catch((error) => {
  console.error('[policy-monitor] Fatal error; no successful state should be inferred:', error?.stack || error);
  process.exitCode = 1;
});
