import {
  RoleType,
  SystemState,
  InvoiceDraft,
  SyntheticCompany,
  PolicyRule,
  AuditEntry,
  CompanyEntity,
  PortfolioOverview,
  PolicyMonitoringStatus,
  FinancialImpactRecalculation,
  OwnerNotification,
} from '../types';

/**
 * In-Memory Demo Authentication State
 * NOTE: For demonstration purposes, authentication tokens are stored in module-level memory
 * (no localStorage) and refreshed when switching demo accounts.
 */
let sessionToken: string | null = null;
let currentRole: RoleType = 'owner';

export const DEMO_CREDENTIALS: Record<RoleType, { username: string; password: string; roleLabel: string; name: string }> = {
  owner: { username: 'owner_ahmad', password: 'owner123', roleLabel: 'Owner', name: 'Ahmad Razak' },
  clerk: { username: 'clerk_siti', password: 'clerk123', roleLabel: 'Staff', name: 'Siti Aminah' },
  expert: { username: 'expert_farhan', password: 'expert123', roleLabel: 'Tax Advisor', name: 'Dr. Farhan Ismail' },
};

export function getClientRole(): RoleType {
  return currentRole;
}

export function getSessionToken(): string | null {
  return sessionToken;
}

export function clearSession(): void {
  sessionToken = null;
}

/**
 * Switch active role by authenticating with explicit or demo credentials against POST /api/login.
 * Saves the returned server-issued session token in module memory.
 */
export async function setClientRole(role: RoleType, password?: string): Promise<string> {
  currentRole = role;
  const creds = DEMO_CREDENTIALS[role];
  const pwd = password || creds.password;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.username, password: pwd, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || `Login failed for role ${role}: HTTP ${res.status}`);
    }
    sessionToken = data.token;
    return sessionToken!;
  } catch (err) {
    console.warn(`[api] Login for role '${role}' failed:`, err);
    throw err;
  }
}

/**
 * Validates password for a specific role without immediately changing session
 */
export async function verifyRolePassword(role: RoleType, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  const creds = DEMO_CREDENTIALS[role];
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.username, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.message || data.error || 'Incorrect password' };
    }
    return { success: true, token: data.token };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error verifying password' };
  }
}

/**
 * Explicit login method with arbitrary username/password or role/password
 */
export async function login(usernameOrRole: string, password: string): Promise<any> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: usernameOrRole, role: usernameOrRole, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Authentication failed');
  }
  sessionToken = data.token;
  if (data.role) {
    currentRole = data.role as RoleType;
  }
  return data;
}

/**
 * Ensures an active session token exists before issuing requests
 */
async function ensureToken(): Promise<string> {
  if (sessionToken) {
    return sessionToken;
  }
  return await setClientRole(currentRole);
}

/**
 * Returns authentic authorization headers using the server-issued session token
 * (Never includes 'x-user-role' header)
 */
async function getHeaders(): Promise<HeadersInit> {
  const token = await ensureToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function filenameFromDisposition(disposition: string, fallback: string): string {
  const star = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (star?.[1]) {
    try { return decodeURIComponent(star[1].trim().replace(/^"|"$/g, '')); } catch { /* use classic filename */ }
  }
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ? match[1].trim() : fallback;
}

async function readDownloadError(res: Response): Promise<string> {
  try {
    const body = await res.text();
    if (!body) return '';
    try {
      const data = JSON.parse(body);
      return String(data.message || data.error || data.details || `HTTP ${res.status}`);
    } catch {
      return body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240) || `HTTP ${res.status}`;
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function validateZipWorkbookBlob(blob: Blob, label: string): Promise<void> {
  if (!blob || blob.size < 1000) throw new Error(`${label} is empty or too small to be a valid Excel workbook.`);
  const prefix = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (prefix[0] !== 0x50 || prefix[1] !== 0x4b || prefix[2] !== 0x03 || prefix[3] !== 0x04) {
    throw new Error(`${label} did not contain an OpenXML ZIP signature. No file was saved.`);
  }
}

async function validateCsvBlob(blob: Blob): Promise<void> {
  if (!blob || blob.size < 10) throw new Error('CSV report is empty. No file was saved.');
  const text = (await blob.slice(0, 8192).text()).replace(/^\uFEFF/, '');
  if (/^\s*</.test(text) || /^\s*\{/.test(text) || !/^"?Event_ID"?,/i.test(text)) {
    throw new Error('The server response is not a valid activity CSV. No file was saved.');
  }
}

export const api = {
  async login(username: string, password: string): Promise<any> {
    return login(username, password);
  },

  async getState(): Promise<SystemState> {
    const headers = await getHeaders();
    const res = await fetch('/api/state', { headers });
    if (!res.ok) throw new Error('Failed to fetch system state');
    return res.json();
  },

  async getDrafts(companyId?: string): Promise<InvoiceDraft[]> {
    const headers = await getHeaders();
    const url = companyId ? `/api/drafts?company_id=${encodeURIComponent(companyId)}` : '/api/drafts';
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Failed to fetch invoice drafts');
    return res.json();
  },

  async uploadInvoiceFile(file: File, confidence?: number, amount?: number, companyId?: string): Promise<any> {
    const token = await ensureToken();
    const formData = new FormData();
    formData.append('receipt', file);
    if (confidence !== undefined) formData.append('confidence', confidence.toString());
    if (amount !== undefined) formData.append('amount', amount.toString());
    if (companyId) formData.append('company_id', companyId);

    const res = await fetch('/api/upload_invoice', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Upload failed with status ${res.status}`);
    }
    return data;
  },

  async uploadInvoiceText(params: {
    text: string;
    confidence?: number;
    amount?: number;
    buyerTIN?: string | null;
    buyerName?: string;
    company_id?: string;
  }): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/upload_invoice_text', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to process invoice text');
    }
    return data;
  },

  async confirmDraftFields(draftId: string, payload: any): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch(`/api/drafts/${draftId}/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload.fields ? payload : { fields: payload, ...payload }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || `HTTP ${res.status} Error`);
    }
    return data;
  },

  async approveItem(id: string): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers,
      body: JSON.stringify({ id }),
    });

    const data = await res.json();
    if (!res.ok) {
      const err: any = new Error(data.message || data.error || `HTTP ${res.status} Error`);
      err.code = res.status;
      err.details = data;
      throw err;
    }
    return data;
  },

  async getAuditLedger(companyId?: string): Promise<{ entries: AuditEntry[]; total: number }> {
    const headers = await getHeaders();
    const url = companyId ? `/api/audit?company_id=${encodeURIComponent(companyId)}` : '/api/audit';
    const res = await fetch(url, {
      headers,
    });
    if (!res.ok) throw new Error('Failed to fetch audit ledger');
    return res.json();
  },

  async verifyAuditChain(): Promise<{ verified: boolean; failed_at?: number | null; first_bad_index?: number; total_entries_checked?: number; status?: string; message?: string }> {
    const headers = await getHeaders();
    const res = await fetch('/api/audit/verify', {
      headers,
    });
    const data = await res.json();
    // HTTP 409 is an expected integrity-failure result, not a transport failure.
    if (!res.ok && !(res.status === 409 && data?.valid === false)) {
      throw new Error(data?.message || data?.error || 'Failed to verify audit chain');
    }
    return data;
  },

  async tamperAuditRecord(index: number = 1): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/audit/tamper', {
      method: 'POST',
      headers,
      body: JSON.stringify({ index }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Tamper action failed');
    return data;
  },

  async restoreAuditRecord(): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/audit/restore', {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Restore failed');
    return data;
  },

  async getActivePolicy(): Promise<{ version: string; last_synced?: string | null; lastSyncedDaysAgo: number | null; isStale: boolean; mode?: string; liveSync?: boolean; syncStatus?: string; message?: string; rules: PolicyRule[]; drafts?: PolicyRule[] }> {
    const headers = await getHeaders();
    const res = await fetch('/api/policy/active', {
      headers,
    });
    if (!res.ok) throw new Error('Failed to fetch active policy');
    return res.json();
  },

  async parsePolicyDraft(text: string): Promise<{ success: boolean; count: number; drafts: PolicyRule[] }> {
    const headers = await getHeaders();
    const res = await fetch('/api/policies/parse-draft', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err: any = new Error(data.message || data.error || `HTTP ${res.status} Error`);
      err.code = res.status;
      err.details = data;
      throw err;
    }
    return data;
  },

  async getPolicyDrafts(): Promise<PolicyRule[]> {
    const headers = await getHeaders();
    const res = await fetch('/api/policies/drafts', {
      headers,
    });
    if (!res.ok) throw new Error('Failed to fetch policy drafts');
    const data = await res.json();
    return data.drafts || [];
  },

  async approvePolicyRule(id: string, status: 'in_force' | 'awaiting_details' = 'in_force', notes?: string): Promise<{ success: boolean; rule: PolicyRule; message: string }> {
    const headers = await getHeaders();
    const res = await fetch(`/api/policies/rules/${id}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ status, notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err: any = new Error(data.message || data.error || `HTTP ${res.status} Error`);
      err.code = res.status;
      throw err;
    }
    return data;
  },

  async deletePolicyRule(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const headers = await getHeaders();
    const res = await fetch(`/api/policies/rules/${id}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err: any = new Error(data.message || data.error || `HTTP ${res.status} Error`);
      err.code = res.status;
      throw err;
    }
    return data;
  },

  async syncPolicyDiff(): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/policy/sync', {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Policy sync diff failed');
    return data;
  },

  async syncPolicy(): Promise<any> {
    return this.syncPolicyDiff();
  },

  async approvePolicyPack(version: string = 'Budget2027-LHDNv4.9'): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/policy/approve', {
      method: 'POST',
      headers,
      body: JSON.stringify({ version }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err: any = new Error(data.message || data.error || `HTTP ${res.status} Error`);
      err.code = res.status;
      throw err;
    }
    return data;
  },

  async getEligibility(): Promise<{ companies: SyntheticCompany[]; rulesEvaluated: string[] }> {
    const headers = await getHeaders();
    const res = await fetch('/api/eligibility', {
      headers,
    });
    if (!res.ok) throw new Error('Failed to fetch eligibility records');
    return res.json();
  },

  async generateActionList(companyId: string): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/eligibility/generate_action_list', {
      method: 'POST',
      headers,
      body: JSON.stringify({ companyId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Failed to generate action list');
    return data;
  },

  async updateRadarRevenue(monthlyRevenue: number): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/radar/update', {
      method: 'POST',
      headers,
      body: JSON.stringify({ monthlyRevenue }),
    });
    if (!res.ok) throw new Error('Failed to update revenue');
    return res.json();
  },

  async getPendingActions(companyId?: string): Promise<any[]> {
    const headers = await getHeaders();
    const url = companyId ? `/api/pending-actions?company_id=${encodeURIComponent(companyId)}` : '/api/pending-actions';
    const res = await fetch(url, {
      headers,
    });
    if (!res.ok) throw new Error('Failed to fetch pending actions');
    return res.json();
  },

  async getCompanies(includeArchived: boolean = false): Promise<CompanyEntity[]> {
    const headers = await getHeaders();
    const res = await fetch(`/api/companies?includeArchived=${includeArchived}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch company directory');
    return res.json();
  },

  async getPortfolioOverview(): Promise<PortfolioOverview> {
    const headers = await getHeaders();
    const res = await fetch('/api/companies/overview', { headers });
    if (!res.ok) throw new Error('Failed to fetch business portfolio overview');
    return res.json();
  },

  async getCompany(id: string): Promise<CompanyEntity> {
    const headers = await getHeaders();
    const res = await fetch(`/api/companies/${encodeURIComponent(id)}`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch company ${id}`);
    return res.json();
  },

  async createCompany(data: Partial<CompanyEntity>): Promise<{ success: boolean; company: CompanyEntity; audit_id: string; message: string }> {
    const headers = await getHeaders();
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || resData.error || 'Failed to create company');
    return resData;
  },

  async updateCompany(id: string, data: Partial<CompanyEntity>): Promise<{ success: boolean; company: CompanyEntity; audit_id: string; message: string }> {
    const headers = await getHeaders();
    const res = await fetch(`/api/companies/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || resData.error || 'Failed to update company');
    return resData;
  },

  async archiveCompany(id: string): Promise<{ success: boolean; message: string; audit_id: string }> {
    const headers = await getHeaders();
    const res = await fetch(`/api/companies/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      headers,
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || resData.error || 'Failed to archive company');
    return resData;
  },

  async restoreCompany(id: string): Promise<{ success: boolean; message: string; audit_id: string }> {
    const headers = await getHeaders();
    const res = await fetch(`/api/companies/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
      headers,
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || resData.error || 'Failed to restore company');
    return resData;
  },

  async switchCompany(id: string): Promise<{ success: boolean; activeCompany: CompanyEntity; message: string }> {
    const headers = await getHeaders();
    const res = await fetch(`/api/companies/${encodeURIComponent(id)}/switch`, {
      method: 'POST',
      headers,
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || resData.error || 'Failed to switch company');
    return resData;
  },

  async deleteCompany(id: string): Promise<{ success: boolean; message: string; audit_id: string }> {
    const headers = await getHeaders();
    const res = await fetch(`/api/companies/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || resData.error || 'Failed to delete company');
    return resData;
  },

  async getPolicyCurrent(): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/policies/current', {
      headers,
    });
    if (!res.ok) throw new Error('Failed to fetch current policy');
    return res.json();
  },

  async runTestSuite(): Promise<{ summary: { total: number; passed: number; failed: number; durationMs: number }; results: any[] }> {
    const headers = await getHeaders();
    const res = await fetch('/api/tests/run', {
      method: 'POST',
      headers,
    });
    if (!res.ok) throw new Error('Failed to execute test suite');
    return res.json();
  },

  async updateCompanyProfile(params: { companyName?: string; ownerName?: string }): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/company/update', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Failed to update company profile');
    return data;
  },

  async evaluateCustomEligibility(params: { sales: number; paidUpCapital: number | null; staff: number; chargeableIncome?: number | null }): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/eligibility/evaluate', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to evaluate custom eligibility');
    return data;
  },

  async updateCompanyMetrics(companyId: string, params: { paidUpCapital?: number | null; sales?: number; staff?: number; chargeableIncome?: number }): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch(`/api/eligibility/company/${companyId}/update`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update company metrics');
    return data;
  },

  async runReplay(): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/replay/run', {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to run policy replay simulation');
    return data;
  },

  async getPolicyMonitoringStatus(): Promise<PolicyMonitoringStatus> {
    let apiStatus: PolicyMonitoringStatus | null = null;
    let apiError: unknown = null;

    // Keep the existing authenticated server status for manual checks and review actions.
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/policy/monitoring/status', { headers });
      if (res.ok) apiStatus = await res.json();
      else apiError = new Error('Failed to fetch policy monitoring status');
    } catch (error) {
      apiError = error;
    }

    // GitHub Actions writes a public, read-only status feed. When configured, it lets the
    // UI display scheduled checks without Cloud Scheduler or Cloud Storage. For a separately
    // hosted app, set VITE_POLICY_MONITORING_STATUS_URL to the repository's raw status.json URL.
    const configuredUrl = String(import.meta.env.VITE_POLICY_MONITORING_STATUS_URL || '').trim();
    const statusUrl = configuredUrl || '/policy-monitoring/status.json';
    const separator = statusUrl.includes('?') ? '&' : '?';
    try {
      const response = await fetch(`${statusUrl}${separator}_=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) {
        const feed = await response.json();
        if (feed?.provider === 'github_actions' && feed?.workflowConfigured === true) {
          const feedTime = feed.lastCheckedTime ? Date.parse(feed.lastCheckedTime) : 0;
          const apiTime = apiStatus?.lastCheckedTime ? Date.parse(apiStatus.lastCheckedTime) : 0;
          const feedShouldWin = !apiStatus
            || apiStatus.schedulerMode === 'not_configured'
            || (Number.isFinite(feedTime) && feedTime > apiTime);
          if (feedShouldWin) {
            return {
              ...(apiStatus || {} as PolicyMonitoringStatus),
              ...feed,
              // A GitHub feed is a monitoring mirror, not the server's review/approval queue.
              // Compute freshness in the browser so an old status file does not look current
              // if GitHub Actions has been disabled or stopped running.
              isStale: !feed.lastCheckedTime || !Number.isFinite(Date.parse(feed.lastCheckedTime)) || (Date.now() - Date.parse(feed.lastCheckedTime) > 24 * 60 * 60 * 1000),
              // Preserve a real server-side pending candidate if one exists.
              pendingUpdate: apiStatus?.pendingUpdate || null,
              activeVersion: apiStatus?.activeVersion || feed.activeVersion || 'human-approved-policy-rules-unchanged',
            } as PolicyMonitoringStatus;
          }
        }
      }
    } catch {
      // Static status may not exist in preview or local development; continue with API status.
    }

    if (apiStatus) return apiStatus;
    throw apiError instanceof Error ? apiError : new Error('Unable to fetch policy monitoring status from the app API or configured GitHub Actions feed.');
  },

  async checkPolicyMonitoring(triggerTestUpdate: boolean = false): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/policy/monitoring/check', {
      method: 'POST',
      headers,
      body: JSON.stringify({ triggerTestUpdate }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Failed to check official policy sources');
    return data;
  },

  async importOfficialPolicyDocument(payload: {
    sourceId: string;
    documentTitle: string;
    documentText: string;
    versionName?: string;
    gazetteDate?: string;
    effectiveDate?: string;
  }): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/policy/import-document', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Failed to import official policy document');
    return data;
  },

  async verifyAndActivatePolicy(candidateVersion?: string, notes?: string): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/policy/verify-and-activate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ candidateVersion, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Failed to verify and activate policy update');
    return data;
  },

  async getFinancialImpact(companyId?: string): Promise<FinancialImpactRecalculation> {
    const headers = await getHeaders();
    const url = companyId ? `/api/financial/impact?company_id=${encodeURIComponent(companyId)}` : '/api/financial/impact';
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Failed to fetch financial impact calculation');
    return res.json();
  },

  async recalculateFinancialImpact(companyId?: string): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch('/api/financial/recalculate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ company_id: companyId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Failed to recalculate financial impact');
    return data;
  },

  async getOwnerNotifications(): Promise<OwnerNotification[]> {
    const headers = await getHeaders();
    const res = await fetch('/api/owner-notifications', { headers });
    if (!res.ok) throw new Error('Failed to fetch owner notifications');
    return res.json();
  },

  async dismissOwnerNotification(id: string): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch(`/api/owner-notifications/${encodeURIComponent(id)}/dismiss`, {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to dismiss notification');
    return data;
  },

  async getSampleInvoices(): Promise<{ files: Array<{ filename: string; size: number; sizeDisplay: string; type: string; mimetype: string; downloadUrl: string; previewUrl: string }>; zipPackUrl: string }> {
    const res = await fetch('/api/sample-invoices');
    if (!res.ok) throw new Error('Failed to fetch sample invoices list');
    return res.json();
  },

  async downloadDraftFile(draftId: string, companyId?: string): Promise<{ blob: Blob; filename: string }> {
    if (!companyId) throw new Error('Select a company before downloading an invoice source file.');
    const token = await ensureToken();
    const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}/file?download=true&company_id=${encodeURIComponent(companyId)}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Company-Id': companyId },
    });
    if (!res.ok) {
      const message = await readDownloadError(res);
      throw new Error(message || `Download failed with status ${res.status}`);
    }
    const disposition = res.headers.get('Content-Disposition') || '';
    if (!/attachment|inline/i.test(disposition) || !/filename\*?=/i.test(disposition)) {
      throw new Error('The server response is not a source-file download. Please retry after refreshing the page.');
    }
    const filename = filenameFromDisposition(disposition, `${draftId}_invoice_file`);
    const blob = await res.blob();
    if (blob.size === 0) throw new Error('The source-file download is empty.');
    return { blob, filename };
  },

  async exportDraftExcel(draftId: string, companyId?: string): Promise<{ blob: Blob; filename: string }> {
    if (!companyId) throw new Error('Select a company before exporting an e-Invoice.');
    const token = await ensureToken();
    const url = `/api/drafts/${encodeURIComponent(draftId)}/export-excel?company_id=${encodeURIComponent(companyId)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'X-Company-Id': companyId } });
    if (!res.ok) {
      const message = await readDownloadError(res);
      throw new Error(message || `Failed to export e-Invoice Excel (HTTP ${res.status}).`);
    }
    const contentType = (res.headers.get('Content-Type') || '').toLowerCase();
    if (!contentType.includes('application/vnd.ms-excel.sheet.macroenabled.12')) {
      throw new Error(`The server returned an unexpected file type (${contentType || 'unknown'}), not an Excel workbook.`);
    }
    const disposition = res.headers.get('Content-Disposition') || '';
    const filename = filenameFromDisposition(disposition, `${draftId}_eInvoice.xlsm`);
    const blob = await res.blob();
    await validateZipWorkbookBlob(blob, 'e-Invoice XLSM');
    return { blob, filename };
  },

  // Kept as an internal API only for interoperability; there is no JSON export control in owner UI.
  async exportDraftJSON(draftId: string): Promise<Blob> {
    const token = await ensureToken();
    const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}/export-json?download=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await readDownloadError(res) || 'Failed to export draft JSON');
    const contentType = (res.headers.get('Content-Type') || '').toLowerCase();
    if (!contentType.includes('application/json')) throw new Error('The server did not return a JSON payload.');
    return res.blob();
  },

  async exportAuditLedger(format: 'xlsm' | 'csv' | 'json' = 'xlsm', companyId?: string): Promise<{ blob: Blob; filename: string }> {
    if (!companyId) throw new Error('Select a company before exporting activity history.');
    if (format === 'json') throw new Error('JSON export is not available in the owner-facing interface.');
    const token = await ensureToken();
    const url = `/api/audit/export?format=${format}&company_id=${encodeURIComponent(companyId)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'X-Company-Id': companyId } });
    if (!res.ok) throw new Error(await readDownloadError(res) || `Failed to export activity history (HTTP ${res.status}).`);
    const contentType = (res.headers.get('Content-Type') || '').toLowerCase();
    const expectedType = format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel.sheet.macroenabled.12';
    if (!contentType.includes(expectedType)) {
      throw new Error(`The server returned an unexpected file type (${contentType || 'unknown'}), not ${format.toUpperCase()}.`);
    }
    const disposition = res.headers.get('Content-Disposition') || '';
    const filename = filenameFromDisposition(disposition, `orbyte_activity_${companyId}.${format}`);
    const blob = await res.blob();
    if (format === 'xlsm') await validateZipWorkbookBlob(blob, 'Activity XLSM');
    else await validateCsvBlob(blob);
    return { blob, filename };
  },
};

/**
 * Universal browser-safe download helpers that work reliably within iframes and sandboxes
 */
export function triggerBrowserDownload(blob: Blob, filename: string) {
  try {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 200);
  } catch (err) {
    console.error('triggerBrowserDownload error:', err);
    throw err;
  }
}

export function triggerUrlDownload(url: string, filename?: string) {
  try {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    if (filename) a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 200);
  } catch (err) {
    console.error('triggerUrlDownload error:', err);
    throw err;
  }
}

