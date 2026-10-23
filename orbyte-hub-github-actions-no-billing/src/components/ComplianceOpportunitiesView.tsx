import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Radio,
  FileCheck2,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  DollarSign,
  Users,
  ShieldCheck,
  ArrowRight,
  Download,
  RefreshCw,
  Calculator,
  BookOpen,
  ExternalLink,
  Calendar,
  FileText,
  Clock,
  Check,
  AlertCircle,
  SlidersHorizontal,
  FileUp,
  Info,
  X,
  Hash,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader, SectionCard, StatusBadge, InfoHint } from './common';
import { CustomEligibilityOutcome, RoleType, CompanyEntity, PolicyMonitoringStatus } from '../types';
import { api } from '../services/api';
import {
  MSME_SALES_MAX,
  MSME_CAPITAL_MAX,
  INVOICE_REVIEW_THRESHOLD,
  EXEMPTION_RADAR_THRESHOLD,
  MEDIASAS_STAFF_MAX,
  MEDIASAS_GRANT_PER_EMPLOYEE,
  MEDIASAS_MAX_SUBSIDIZED_EMPLOYEES,
  calculateTaxSaving,
} from '../constants/policyConstants';

interface ComplianceOpportunitiesViewProps {
  companies: CompanyEntity[];
  language: 'en' | 'bm';
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
  currentRole: RoleType;
  companyName?: string;
  ownerName?: string;
  onOpenEditProfile?: () => void;
  activeCompanyId?: string;
  initialRevenue?: number;
  initialSubTab?: 'policies' | 'incentives' | 'actions' | 'radar' | 'action_plan';
  activePolicyVersion?: string;
  isPolicyStale?: boolean;
  onPolicyUpdated?: (newVer: string) => void;
}

export const ComplianceOpportunitiesView: React.FC<ComplianceOpportunitiesViewProps> = ({
  companies,
  language,
  onShowToast,
  currentRole,
  companyName = 'ABC Trading Sdn. Bhd.',
  ownerName = 'Ahmad Razak',
  onOpenEditProfile,
  activeCompanyId = 'COMP-A',
  initialRevenue = 0,
  initialSubTab = 'policies',
  activePolicyVersion = 'LHDN-General-Guideline-v4.8',
  isPolicyStale = false,
  onPolicyUpdated,
}) => {
  const isBM = language === 'bm';
  const isOwner = currentRole === 'owner';
  const isExpert = currentRole === 'expert';
  const canActivate = isOwner || isExpert;

  // Map initialSubTab into 3 main groups: 'policies' | 'incentives' | 'actions'
  const resolveTab = (tab?: string): 'policies' | 'incentives' | 'actions' => {
    if (tab === 'incentives') return 'incentives';
    if (tab === 'actions' || tab === 'action_plan' || tab === 'radar') return 'actions';
    return 'policies';
  };

  const [activeSubTab, setActiveSubTab] = useState<'policies' | 'incentives' | 'actions'>(
    resolveTab(initialSubTab)
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(resolveTab(initialSubTab));
    }
  }, [initialSubTab]);

  // Active Company Metrics
  const activeCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];
  const [calcSales, setCalcSales] = useState<number>(activeCompany?.sales ?? initialRevenue ?? 0);
  const [calcCapital, setCalcCapital] = useState<number>(activeCompany?.paidUpCapital ?? 0);
  const [calcStaff, setCalcStaff] = useState<number>(activeCompany?.staff ?? activeCompany?.staffCount ?? 0);
  const [calcChargeableIncome, setCalcChargeableIncome] = useState<number | null>(activeCompany?.chargeableIncome ?? null);

  // Evaluated result from server deterministic rules
  const [evalOutcome, setEvalOutcome] = useState<CustomEligibilityOutcome | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(true);

  // Radar revenue state
  const [radarMonthly, setRadarMonthly] = useState<number>(Math.round(calcSales / 12));
  const [radarProjectedAnnual, setRadarProjectedAnnual] = useState<number>(calcSales);
  const radarThreshold = EXEMPTION_RADAR_THRESHOLD;
  const radarPercent = Math.min(100, Math.round((radarProjectedAnnual / radarThreshold) * 1000) / 10);
  const hasRadarTurnoverData = Number.isFinite(radarProjectedAnnual) && radarProjectedAnnual > 0;
  const isBelowReference = hasRadarTurnoverData && radarProjectedAnnual < radarThreshold;
  const isApproaching = hasRadarTurnoverData && radarProjectedAnnual >= radarThreshold * 0.8 && radarProjectedAnnual < radarThreshold;

  // Policy Monitoring state (from Policy Center)
  const [monitoringStatus, setMonitoringStatus] = useState<PolicyMonitoringStatus | null>(null);
  const [isCheckingLive, setIsCheckingLive] = useState<boolean>(false);
  const [isActivatingPolicy, setIsActivatingPolicy] = useState<boolean>(false);
  const [isSimulatingFeed, setIsSimulatingFeed] = useState<boolean>(false);

  // Manual Official Document Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importSourceId, setImportSourceId] = useState<string>('lhdn-portal');
  const [importTitle, setImportTitle] = useState<string>('Document for source review');
  const [importVersionName, setImportVersionName] = useState<string>('manual-source-review');
  const [importText, setImportText] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const sampleGazettePreset = `DEMO ONLY — SAMPLE POLICY DOCUMENT FOR UI TESTING.
This text is fictional test content and is not an official LHDN or MOF document.
Do not treat this sample as evidence of a statutory change. Import a document only after checking its official source.`;

  // Sync inputs when active company changes
  useEffect(() => {
    if (activeCompany) {
      if (activeCompany.sales !== undefined && activeCompany.sales !== null) {
        setCalcSales(activeCompany.sales);
        setRadarProjectedAnnual(activeCompany.sales);
        setRadarMonthly(Math.round(activeCompany.sales / 12));
      }
      if (activeCompany.paidUpCapital !== undefined && activeCompany.paidUpCapital !== null) setCalcCapital(activeCompany.paidUpCapital);
      const staffVal = activeCompany.staff ?? activeCompany.staffCount;
      if (staffVal !== undefined && staffVal !== null) setCalcStaff(staffVal);
      setCalcChargeableIncome(activeCompany.chargeableIncome !== undefined && activeCompany.chargeableIncome !== null ? activeCompany.chargeableIncome : null);
    }
  }, [activeCompanyId, activeCompany]);

  // Fetch policy monitoring status
  useEffect(() => {
    api.getPolicyMonitoringStatus()
      .then((data) => setMonitoringStatus(data))
      .catch(() => null);
  }, [activePolicyVersion]);

  // Evaluate eligibility via debounced API (350ms)
  useEffect(() => {
    let isCancelled = false;
    setIsEvaluating(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.evaluateCustomEligibility({
          sales: calcSales,
          paidUpCapital: calcCapital,
          staff: calcStaff,
          chargeableIncome: calcChargeableIncome,
        });
        if (!isCancelled) {
          setEvalOutcome(res);
        }
      } catch (err: any) {
        if (!isCancelled) {
          onShowToast(
            'error',
            isBM ? 'Ralat Penilaian' : 'Evaluation Error',
            err.message || 'Failed to evaluate business eligibility metrics.'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsEvaluating(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [calcSales, calcCapital, calcStaff, calcChargeableIncome, isBM, onShowToast]);

  const handleRadarMonthlyChange = async (val: number) => {
    const monthly = Math.max(0, val);
    setRadarMonthly(monthly);
    const annual = Math.round(monthly * 12);
    setRadarProjectedAnnual(annual);

    try {
      await api.updateRadarRevenue(monthly);
    } catch {
      // quiet fallback
    }
  };

  const handleGenerateActionPlan = async () => {
    try {
      const res = await api.generateActionList(activeCompanyId);
      onShowToast(
        'success',
        isBM ? 'Pelan Tindakan Disahkan' : 'Compliance Action Plan Ready',
        isBM
          ? `Pelan tindakan bagi ${companyName} telah dikemas kini dan dicincang ke lejar audit [ID: ${res.audit_id}].`
          : `Compliance action roadmap for ${companyName} generated and recorded to SHA-256 audit ledger [ID: ${res.audit_id}].`
      );
    } catch (err: any) {
      onShowToast('error', isBM ? 'Gagal Menjana' : 'Generation Failed', err.message);
    }
  };

  const handleCheckOfficialSources = async () => {
    setIsCheckingLive(true);
    try {
      const res = await api.checkPolicyMonitoring(false);
      const updated = await api.getPolicyMonitoringStatus();
      setMonitoringStatus(updated);

      if (res.hasNetworkRestriction || res.hasError) {
        onShowToast(
          'warning',
          isBM ? 'Semakan sumber belum lengkap' : 'Source check incomplete',
          res.message || (isBM
            ? 'Sekurang-kurangnya satu sumber tidak dapat diambil atau dibandingkan dengan pasti.'
            : 'At least one source could not be retrieved or compared reliably.')
        );
      } else {
        const lastStatuses = (res.monitoredSources || []).map((source: any) => source.lastStatus);
        const containsDocumentChange = (res.monitoredDocuments || []).some((document: any) => document.lastStatus === 'changed');
        const containsChange = lastStatuses.includes('changed') || containsDocumentChange;
        const containsUnverifiable = lastStatuses.includes('unverifiable') || (res.monitoredDocuments || []).some((document: any) => ['unverifiable', 'document_not_found'].includes(document.lastStatus));
        onShowToast(
          containsChange || containsUnverifiable ? 'warning' : 'info',
          isBM ? 'Status sumber dikemas kini' : 'Source status updated',
          res.message || (containsChange
            ? 'Halaman sumber berubah; ini belum mengesahkan perubahan undang-undang.'
            : containsUnverifiable
              ? 'Perbandingan belum dapat disahkan; jangan anggap dasar terkini.'
              : 'Kandungan halaman dibandingkan. Ini tidak mengesahkan status undang-undang.')
        );
      }
    } catch (err: any) {
      onShowToast('error', 'Check Failed', err.message);
    } finally {
      setIsCheckingLive(false);
    }
  };

  const handleSimulateFeed = async () => {
    setIsSimulatingFeed(true);
    try {
      await api.checkPolicyMonitoring(true);
      const updated = await api.getPolicyMonitoringStatus();
      setMonitoringStatus(updated);
      onShowToast(
        'info',
        isBM ? 'Ujian Simulasi Dimuatkan' : 'Simulation Feed Loaded',
        isBM
          ? 'Item semakan simulasi sahaja telah dibuat. Tiada dokumen rasmi diambil dan status penyegerakan langsung tidak diubah.'
          : 'Demo-only source-review item created. No official document was fetched and no live sync status was changed.'
      );
    } catch (err: any) {
      onShowToast('error', 'Simulation Failed', err.message);
    } finally {
      setIsSimulatingFeed(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim() || importText.trim().length < 20) {
      onShowToast(
        'error',
        'Invalid Document Content',
        'Please provide at least 20 characters of statutory or guideline text.'
      );
      return;
    }

    setIsImporting(true);
    try {
      const res = await api.importOfficialPolicyDocument({
        sourceId: importSourceId,
        documentTitle: importTitle,
        documentText: importText,
        versionName: importVersionName,
      });

      setIsImportModalOpen(false);
      const updated = await api.getPolicyMonitoringStatus();
      setMonitoringStatus(updated);

      onShowToast(
        'success',
        isBM ? 'Dokumen Diterima untuk Semakan' : 'Document Received for Review',
        isBM
          ? `Cap jari dokumen [${res.snapshotHash?.slice(0, 16)}...] direkodkan. Ketulenan sumber belum disahkan secara bebas; tiada peraturan operasi diubah.`
          : `Document fingerprint [${res.snapshotHash?.slice(0, 16)}...] recorded. Authenticity was not independently verified; no operational rule was changed.`
      );
    } catch (err: any) {
      onShowToast('error', 'Import Failed', err.message || 'Failed to import official document');
    } finally {
      setIsImporting(false);
    }
  };

  const handleActivatePolicyDiff = async () => {
    if (!canActivate) {
      onShowToast(
        'error',
        'Permission Denied',
        'Only SME Owners or Tax Advisors can record a source review.'
      );
      return;
    }

    setIsActivatingPolicy(true);
    try {
      const targetVersion = monitoringStatus?.pendingUpdate?.candidateVersion;
      if (!targetVersion) throw new Error('No pending source review is available to verify.');
      const reviewResult = await api.verifyAndActivatePolicy(targetVersion);
      if (reviewResult?.operationalRulesChanged === true && onPolicyUpdated) {
        onPolicyUpdated(targetVersion);
      }
      const updated = await api.getPolicyMonitoringStatus();
      setMonitoringStatus(updated);
      onShowToast(
        'success',
        isBM ? 'Semakan Sumber Direkodkan' : 'Source Review Recorded',
        isBM
          ? `Semakan sumber ${targetVersion} direkodkan. Peraturan operasi tidak berubah melainkan set peraturan yang disahkan benar-benar diaktifkan.`
          : `Source review ${targetVersion} was recorded. Operating rules were not changed by this review.`
      );
    } catch (err: any) {
      onShowToast('error', 'Activation Failed', err.message);
    } finally {
      setIsActivatingPolicy(false);
    }
  };

  // Status for Active Company
  const hasCapital = Boolean(activeCompany?.paidUpCapital);
  const isCapitalEligible = hasCapital && (activeCompany.paidUpCapital || 0) <= MSME_CAPITAL_MAX;
  const hasTurnoverData = activeCompany?.sales !== undefined && activeCompany?.sales !== null;
  const isTurnoverEligible = hasTurnoverData && (activeCompany?.sales ?? 0) <= MSME_SALES_MAX;
  const isTaxScreenBandMatch = isCapitalEligible && isTurnoverEligible;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <PageHeader
        tag={isBM ? 'Dasar & Faedah Perniagaan' : 'Policies & Benefits'}
        tagIcon={BookOpen}
        title={isBM ? 'Dasar Kerajaan, Manfaat & Geran PKS' : 'Government Policies, Benefits & Grants'}
        description={
          isBM
            ? `Panduan praktikal kepada sumber dasar rasmi, keperluan e-Invois, potensi manfaat PKS dan langkah seterusnya untuk ${companyName}. Kelayakan dan status undang-undang perlu disahkan melalui panduan rasmi yang terpakai.`
            : `A practical guide to official policy sources, e-Invoice requirements, potential SME benefits, and next steps for ${companyName}. Eligibility and legal status must be verified against applicable official guidance.`
        }
        primaryAction={{
          label: isBM ? 'Jana Pelan Tindakan' : 'Generate Action Roadmap',
          icon: FileCheck2,
          onClick: handleGenerateActionPlan,
          variant: 'primary',
        }}
        secondaryAction={
          onOpenEditProfile
            ? {
                label: isBM ? 'Tukar Entiti' : 'Switch Entity',
                icon: Building2,
                onClick: onOpenEditProfile,
                variant: 'secondary',
              }
            : undefined
        }
      />

      {/* THREE MAIN SECTION GROUPS NAVIGATION */}
      <div className="flex flex-col sm:flex-row bg-white rounded-2xl p-1.5 border border-slate-200 shadow-2xs gap-1">
        {/* Group 1: Government Policies & Compliance */}
        <button
          type="button"
          onClick={() => setActiveSubTab('policies')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2.5 text-xs font-semibold cursor-pointer ${
            activeSubTab === 'policies'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className={`w-4 h-4 ${activeSubTab === 'policies' ? 'text-sky-400' : 'text-slate-400'}`} />
          <div className="text-left">
            <div className="leading-tight flex items-center gap-2">
              <span>{isBM ? 'Dasar Kerajaan & Pematuhan' : 'Government Policies & Compliance'}</span>
              {isPolicyStale && (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-400 text-slate-950 uppercase">
                  Verify source
                </span>
              )}
            </div>
            <div className={`text-[10px] mt-0.5 font-normal ${activeSubTab === 'policies' ? 'text-slate-300' : 'text-slate-400'}`}>
              {isBM ? 'Garis panduan LHDN & ambang e-invois' : 'Official sources, implementation dates & eligibility'}
            </div>
          </div>
        </button>

        {/* Group 2: Grants & Tax Incentives */}
        <button
          type="button"
          onClick={() => setActiveSubTab('incentives')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2.5 text-xs font-semibold cursor-pointer ${
            activeSubTab === 'incentives'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <DollarSign className={`w-4 h-4 ${activeSubTab === 'incentives' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <div className="text-left">
            <div className="leading-tight">
              {isBM ? 'Geran & Pelepasan Cukai' : 'Grants & Tax Incentives'}
            </div>
            <div className={`text-[10px] mt-0.5 font-normal ${activeSubTab === 'incentives' ? 'text-slate-300' : 'text-slate-400'}`}>
              {isBM ? 'Semakan awal, sumber & tindakan seterusnya' : 'Preliminary eligibility, sources & next steps'}
            </div>
          </div>
        </button>

        {/* Group 3: Relevant Actions for My Business */}
        <button
          type="button"
          onClick={() => setActiveSubTab('actions')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2.5 text-xs font-semibold cursor-pointer ${
            activeSubTab === 'actions'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileCheck2 className={`w-4 h-4 ${activeSubTab === 'actions' ? 'text-indigo-400' : 'text-slate-400'}`} />
          <div className="text-left">
            <div className="leading-tight">
              {isBM ? 'Tindakan Berkaitan Perniagaan Saya' : 'Relevant Actions for My Business'}
            </div>
            <div className={`text-[10px] mt-0.5 font-normal ${activeSubTab === 'actions' ? 'text-slate-300' : 'text-slate-400'}`}>
              {isBM ? 'Pelan tindakan & kalkulator interaktif' : 'Tailored roadmap & live calculator'}
            </div>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* GROUP 1: GOVERNMENT POLICIES & COMPLIANCE                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'policies' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Regulatory Diff / Update Candidate Banner if detected */}
          {(monitoringStatus?.pendingUpdate || isPolicyStale) && (
            <div className="p-5 rounded-2xl border border-amber-300 bg-amber-50/90 shadow-xs flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                        {monitoringStatus?.pendingUpdate ? 'SOURCE REVIEW PENDING' : 'LIVE SOURCE NOT VERIFIED'}
                      </span>
                      {monitoringStatus?.pendingUpdate?.isSimulated && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded">
                          Simulated Test Data
                        </span>
                      )}
                      {monitoringStatus?.pendingUpdate?.importMethod === 'manual_import' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded">
                          Manual Import — Not Authenticated
                        </span>
                      )}
                      {monitoringStatus?.pendingUpdate?.importMethod === 'live_network' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded">
                          Live Source Check
                        </span>
                      )}
                      {monitoringStatus?.pendingUpdate && (
                        <span className="text-xs font-mono font-bold text-slate-800">
                          Candidate: {monitoringStatus.pendingUpdate.candidateVersion}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      {monitoringStatus?.pendingUpdate
                        ? (isBM ? 'Semakan sumber menunggu pengesahan manusia' : 'Source review pending human verification')
                        : (isBM ? 'Sumber rasmi belum disahkan secara langsung' : 'Official source has not been verified live')}
                    </h3>
                    <p className="text-xs text-slate-700 mt-0.5 leading-relaxed max-w-2xl">
                      {monitoringStatus?.pendingUpdate?.aiSummary?.executiveSummary ||
                        (isBM
                          ? 'Tiada semakan sumber langsung yang disahkan dalam sesi ini. Buka portal rasmi atau cuba semula apabila capaian rangkaian tersedia; jangan anggap dasar terkini.'
                          : 'No verified live source check is available in this session. Open the official portal or retry when network access is available; do not assume the policy is current.')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5 shrink-0 self-end md:self-center">
                  {monitoringStatus?.pendingUpdate && (
                    <button
                      type="button"
                      onClick={handleActivatePolicyDiff}
                      disabled={!canActivate || isActivatingPolicy || Boolean(monitoringStatus?.pendingUpdate?.isSimulated)}
                      className={`h-9 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                        !canActivate
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{isActivatingPolicy ? 'Recording...' : (isBM ? 'Rekod Semakan Sumber' : 'Record Source Review')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Source attribution & metadata */}
              {monitoringStatus?.pendingUpdate && (
                <div className="pt-3 border-t border-amber-200/60 grid sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-500">Source:</span>{' '}
                    <span className="font-semibold text-slate-800">{monitoringStatus.pendingUpdate.sourceName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Detected/Imported By:</span>{' '}
                    <span className="font-semibold text-slate-800">{monitoringStatus.pendingUpdate.importedBy || 'Automated Sync'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Timestamp:</span>{' '}
                    <span className="font-mono text-slate-800">
                      {new Date(monitoringStatus.pendingUpdate.detectedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Policy Specification & Source Verification Card */}
          <SectionCard
            title={isBM ? 'Spesifikasi Dasar Berkanun & Pemantauan Rasmi' : 'Policy Source Monitoring & Local Rule Reference'}
            subtitle={
              isBM
                ? `Set rujukan tempatan (${activePolicyVersion}) untuk semakan awal bagi ${companyName}. Status sumber rasmi langsung dipaparkan secara berasingan.`
                : `Local reference dataset (${activePolicyVersion}) used for preliminary checks for ${companyName}. Live official-source status is shown separately.`
            }
            icon={ShieldCheck}
            headerAction={
              <div className="flex items-center gap-2 flex-wrap">
                {canActivate && <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="h-8 px-3 rounded-lg border border-blue-300 bg-blue-50/80 hover:bg-blue-100/80 text-blue-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                >
                  <FileUp className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isBM ? 'Import Dokumen untuk Semakan' : 'Import Document for Review'}</span>
                </button>}
                <button
                  type="button"
                  onClick={handleCheckOfficialSources}
                  disabled={isCheckingLive}
                  className="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingLive ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                  <span>{isCheckingLive ? 'Checking...' : (isBM ? 'Semak Sumber Rasmi' : 'Check Official Sources')}</span>
                </button>
                {canActivate && <button
                  type="button"
                  onClick={handleSimulateFeed}
                  disabled={!canActivate || isSimulatingFeed}
                  title="Run sandbox simulation feed (clearly tagged as simulation)"
                  className="h-8 px-2.5 rounded-lg border border-purple-200 bg-purple-50/80 hover:bg-purple-100 text-purple-800 text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isSimulatingFeed ? 'Simulating...' : (isBM ? 'Simulasi' : 'Simulate')}</span>
                </button>}
              </div>
            }
          >
            <div className="space-y-4">
              {/* Honest Network Isolation Banner if applicable */}
              {monitoringStatus?.hasNetworkRestriction && (
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 text-xs text-amber-950 flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <span>Network Isolation Notice</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 font-bold uppercase">
                        Honest Status Enforced
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Live source retrieval is unavailable in this runtime. The last successful retrieval is preserved. Imported text is not independently authenticated and does not activate operational rules.
                    </p>
                  </div>
                </div>
              )}

              {monitoringStatus?.schedulerMode === 'github_actions' && (
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/80 text-xs text-blue-950 flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold">{isBM ? 'Semakan automatik melalui GitHub Actions' : 'Automatic checks via GitHub Actions'}</div>
                    <p className="text-[11px] leading-relaxed">{isBM
                      ? (!monitoringStatus.lastCheckedTime
                        ? 'Aliran kerja sudah disediakan dalam projek. Muat naik ke GitHub, aktifkan Actions dan jalankan Orbyte Official Policy Monitor sekali untuk membina garis dasar pertama.'
                        : (monitoringStatus.isStale
                          ? 'Status terakhir berusia lebih 24 jam. Semak log di GitHub Actions dan jalankan semakan sekali lagi; jangan anggap status lama sebagai bukti bahawa dasar masih terkini.'
                          : 'Pemeriksaan dijadualkan setiap 12 jam. Suapan status ini hanya-baca; perubahan kandungan PDF perlu disahkan oleh manusia dan tidak mengaktifkan peraturan pematuhan secara automatik.'))
                      : (!monitoringStatus.lastCheckedTime
                        ? 'The workflow is included in the project but has not run yet. Push the files to GitHub, enable Actions, then run Orbyte Official Policy Monitor once to establish the first baseline.'
                        : (monitoringStatus.isStale
                          ? 'The latest saved status is over 24 hours old. Check the GitHub Actions logs and run the monitor again; do not treat the old status as proof that the policy is current.'
                          : 'Checks are scheduled every 12 hours. This is a read-only status feed; PDF text changes require human verification and never activate compliance rules automatically.'))}</p>
                    {monitoringStatus.reportUrl && (
                      <a href={monitoringStatus.reportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 hover:text-blue-950">
                        {isBM ? 'Buka laporan pemantauan' : 'Open monitoring report'} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {monitoringStatus?.schedulerMode === 'not_configured' && (
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/80 text-xs text-blue-950 flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold">{isBM ? 'Semakan automatik belum dikonfigurasi' : 'Automatic checks are not configured'}</div>
                    <p className="text-[11px] leading-relaxed">{isBM ? 'Laluan tanpa Google Cloud Billing menggunakan GitHub Actions: muat naik repo, aktifkan Actions, kemudian jalankan Orbyte Official Policy Monitor. Jika aplikasi dihoskan berasingan, tetapkan VITE_POLICY_MONITORING_STATUS_URL. Cloud Scheduler lama hanyalah pilihan.' : 'The no-Google-Cloud-Billing path uses GitHub Actions: push this repository, enable Actions, and run Orbyte Official Policy Monitor. For a separately hosted app, set VITE_POLICY_MONITORING_STATUS_URL. Legacy Cloud Scheduler is optional.'}</p>
                  </div>
                </div>
              )}
              {monitoringStatus?.persistenceWarning && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/80 text-xs text-rose-950 flex items-start gap-3">
                  <Info className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold">{isBM ? 'Storan keadaan dasar bermasalah' : 'Policy state persistence warning'}</div>
                    <p className="text-[11px] leading-relaxed">{monitoringStatus.persistenceWarning}</p>
                  </div>
                </div>
              )}

              {/* Monitored Official Source Endpoints */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                {(monitoringStatus?.monitoredSources || [
                  {
                    id: 'lhdn-guidelines',
                    name: 'LHDN e-Invoicing Guidelines',
                    url: 'https://www.hasil.gov.my/en/e-invoicing/',
                    documentType: 'Official guidelines listing (not yet fetched)',
                    lastChecked: null,
                    lastSuccessfulRetrieval: null,
                    lastStatus: 'unavailable',
                    httpStatus: null,
                    monitoredVersion: 'Not verified in this session',
                    hasUpdate: false,
                    snapshotHash: null,
                    snapshotSnippet: null,
                    retrievalMethod: 'none',
                    checkIntervalHours: 6,
                  },
                  {
                    id: 'myinvois-sdk',
                    name: 'MyInvois Developer SDK & Specs',
                    url: 'https://sdk.myinvois.hasil.gov.my/guidelines/',
                    documentType: 'Technical validation & schema guidance (not yet fetched)',
                    lastChecked: null,
                    lastSuccessfulRetrieval: null,
                    lastStatus: 'unavailable',
                    httpStatus: null,
                    monitoredVersion: 'Not verified in this session',
                    hasUpdate: false,
                    snapshotHash: null,
                    snapshotSnippet: null,
                    retrievalMethod: 'none',
                    checkIntervalHours: 6,
                  },
                  {
                    id: 'mof-budget',
                    name: 'Ministry of Finance (MOF) Gazette',
                    url: 'https://budget.mof.gov.my/',
                    documentType: 'Official budget and policy announcements (not yet fetched)',
                    lastChecked: null,
                    lastSuccessfulRetrieval: null,
                    lastStatus: 'unavailable',
                    httpStatus: null,
                    monitoredVersion: 'Not verified in this session',
                    hasUpdate: false,
                    snapshotHash: null,
                    snapshotSnippet: null,
                    retrievalMethod: 'none',
                    checkIntervalHours: 6,
                  },
                ]).map((src) => {
                  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                  let badgeLabel = String(src.lastStatus).toUpperCase();

                  if (src.lastStatus === 'changed' || src.hasUpdate) {
                    badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                    badgeLabel = 'SOURCE PAGE CHANGED — REVIEW';
                  } else if (src.lastStatus === 'unchanged' || src.lastStatus === 'connected') {
                    badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
                    badgeLabel = 'PAGE CONTENT UNCHANGED';
                  } else if (src.lastStatus === 'unavailable') {
                    badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                    badgeLabel = 'UNAVAILABLE';
                  } else if (src.lastStatus === 'failed') {
                    badgeClass = 'bg-red-100 text-red-900 border-red-300 font-bold';
                    badgeLabel = src.httpStatus === 404 ? 'SOURCE URL NOT FOUND' : 'SOURCE REQUEST FAILED';
                  } else if (src.lastStatus === 'unverifiable') {
                    badgeClass = 'bg-slate-100 text-slate-800 border-slate-300 font-bold';
                    badgeLabel = 'UNVERIFIABLE';
                  } else if (src.lastStatus === 'simulated') {
                    badgeClass = 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
                    badgeLabel = 'SIMULATED';
                  } else if (src.lastStatus === 'checking') {
                    badgeClass = 'bg-blue-100 text-blue-900 border-blue-300 font-bold animate-pulse';
                    badgeLabel = 'CHECKING...';
                  }

                  return (
                    <div
                      key={src.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="font-bold text-slate-900 text-xs leading-snug">{src.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${badgeClass}`}>
                            {badgeLabel}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-relaxed">
                          {src.documentType}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-[11px]">
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Method:</span>
                          <span className="font-mono font-semibold text-slate-700 capitalize">
                            {src.retrievalMethod ? src.retrievalMethod.replace('_', ' ') : 'Live Network'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-500">
                          <span>Last Checked:</span>
                          <span className="font-mono text-slate-700">
                            {src.lastChecked
                              ? new Date(src.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Never'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-500">
                          <span>Last Success:</span>
                          <span className="font-mono text-slate-700">
                            {src.lastSuccessfulRetrieval
                              ? new Date(src.lastSuccessfulRetrieval).toLocaleDateString([], {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Pending'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-500">
                          <span>SHA-256 Hash:</span>
                          <span
                            className="font-mono text-slate-600 truncate max-w-[120px]"
                            title={src.snapshotHash || ''}
                          >
                            {src.snapshotHash ? `${src.snapshotHash.slice(0, 12)}...` : 'None'}
                          </span>
                        </div>

                        {src.errorMessage && (
                          <p className="text-[10px] text-rose-700 bg-rose-50/70 p-1.5 rounded border border-rose-200 leading-tight">
                            {src.errorMessage}
                          </p>
                        )}

                        <div className="pt-1 flex items-center justify-between">
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 text-[11px]"
                          >
                            <span>Official Portal</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="text-slate-400 font-mono text-[10px]">
                            {src.detectedVersion || src.monitoredVersion}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(monitoringStatus?.monitoredDocuments || []).length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-xs text-slate-900">
                      {isBM ? 'Dokumen Rasmi yang Dipantau' : 'Official Guideline Documents'}
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      {isBM ? 'Kandungan PDF dibandingkan secara berasingan' : 'PDF content is compared separately from portal pages'}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3.5 text-xs">
                    {(monitoringStatus?.monitoredDocuments || []).map((doc: any) => {
                      const statusMap: Record<string, { label: string; cls: string }> = {
                        baseline_saved: { label: 'BASELINE SAVED — NO PRIOR COMPARISON', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
                        unchanged: { label: 'PDF CONTENT UNCHANGED', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                        changed: { label: 'PDF CONTENT CHANGED — REVIEW', cls: 'bg-amber-50 text-amber-900 border-amber-300' },
                        document_not_found: { label: 'DOCUMENT URL NOT FOUND', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
                        unavailable: { label: 'DOWNLOAD UNAVAILABLE', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
                        failed: { label: 'DOWNLOAD FAILED', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
                        unverifiable: { label: 'DOCUMENT NOT VERIFIED', cls: 'bg-slate-100 text-slate-800 border-slate-300' },
                        checking: { label: 'FETCHING PDF…', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
                      };
                      const status = statusMap[doc.lastStatus] || { label: String(doc.lastStatus || 'NOT CHECKED').toUpperCase(), cls: 'bg-slate-100 text-slate-700 border-slate-200' };
                      return (
                        <div key={doc.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900 leading-snug">{doc.title}</span>
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <span className={`text-[9px] px-2 py-1 rounded-full border font-bold text-center ${status.cls}`}>{status.label}</span>
                              {doc.hasUpdate && doc.lastStatus !== 'changed' && (
                                <span className="text-[9px] px-2 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-900 font-bold text-center">
                                  {isBM ? 'MENUNGGU SEMAKAN' : 'REVIEW PENDING'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                            <div>
                              <div>Detected version</div>
                              <div className="font-mono font-semibold text-slate-800">{doc.detectedVersion || 'Not detected'}</div>
                            </div>
                            <div>
                              <div>Last successful PDF fetch</div>
                              <div className="font-mono font-semibold text-slate-800">{doc.lastSuccessfulRetrieval ? new Date(doc.lastSuccessfulRetrieval).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}</div>
                            </div>
                            <div>
                              <div>Pages / extracted chars</div>
                              <div className="font-mono font-semibold text-slate-800">{doc.pageCount ?? '—'} / {doc.textLength || 0}</div>
                            </div>
                            <div>
                              <div>SHA-256</div>
                              <div className="font-mono font-semibold text-slate-800" title={doc.sha256 || ''}>{doc.sha256 ? `${doc.sha256.slice(0, 12)}…` : 'None'}</div>
                            </div>
                          </div>
                          {doc.errorMessage && <p className="text-[10px] leading-relaxed text-rose-700 bg-rose-50 p-2 rounded border border-rose-100">{doc.errorMessage}</p>}
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900">
                            {isBM ? 'Lihat dokumen rasmi' : 'Open official PDF'} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Statutory Policy Cards List */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              {isBM ? 'Rujukan Dasar dan Keperluan' : 'Policy & Requirements Reference'}
            </h3>

            {/* Policy 1: Configurable invoice review threshold (not a universal mandate) */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                      CONFIGURABLE REVIEW CHECK
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Transaction and Consolidation Review — RM10,000 reference
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 pt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Check the current LHDN implementation timeline
                    </span>
                    <span className="text-slate-300">•</span>
                    <a
                      href="https://www.hasil.gov.my/en/e-invois/pelaksanaan-e-invois-di-malaysia/garis-masa-pelaksanaan-e-invois/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <span>Official LHDN e-Invoice guidance</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    LOCAL REVIEW RULE — VERIFY
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-900 block">Review conditions:</span>
                  <ul className="space-y-1 text-slate-600 list-disc list-inside leading-relaxed">
                    <li>This RM10,000 amount is an Orbyte review threshold, not a universal legal mandate.</li>
                    <li>For amounts above the threshold, check the relevant LHDN guideline, transaction type and any consolidation exceptions.</li>
                    <li>TIN and business registration details depend on the applicable transaction and reporting requirements; verify before submission.</li>
                    <li>Do not infer whether consolidation is allowed from amount alone.</li>
                  </ul>
                </div>

                <div className="space-y-1.5 bg-blue-50/50 p-3.5 rounded-xl border border-blue-200/60">
                  <span className="font-bold text-blue-950 block">Verification Status for {companyName}:</span>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    The configured threshold can prompt a human review. Missing buyer details should be checked against the applicable official requirements; this check does not by itself block an invoice on legal grounds.
                  </p>
                  <div className="pt-1.5 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600">Review approach:</span>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300">
                      Deterministic review prompt
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Policy 2: e-Invoice exemption reference screening; never a standalone exemption determination. */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-md">
                      SCREENING REFERENCE
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Turnover reference screening: RM {radarThreshold.toLocaleString('en-MY')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 pt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Screening reference only — verify current official criteria
                    </span>
                    <span className="text-slate-300">•</span>
                    <a
                      href="https://www.hasil.gov.my/en/e-invois/pelaksanaan-e-invois-di-malaysia/garis-masa-pelaksanaan-e-invois/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <span>Official LHDN e-Invoice guidance</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    isBelowReference
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {!hasRadarTurnoverData ? 'TURNOVER NOT PROVIDED' : isBelowReference ? 'BELOW RM3M REFERENCE — VERIFY CONDITIONS' : 'CHECK OFFICIAL TIMELINE'}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-900 block">Eligibility &amp; Exemption Conditions:</span>
                  <ul className="space-y-1 text-slate-600 list-disc list-inside leading-relaxed">
                    <li>LHDN's published implementation timeline lists annual turnover/revenue below RM3,000,000 as exempt from e-Invoice implementation. Verify the applicable exemption criteria, relevant turnover year, ownership and related-entity conditions before making a determination.</li>
                    <li>Do not determine exemption or consolidation treatment from turnover alone; confirm the applicable LHDN guidance for the business and transaction type.</li>
                    <li>Businesses at or above the RM3,000,000 threshold reference should check the official implementation timeline and any applicable exceptions.</li>
                  </ul>
                </div>

                <div className="space-y-1.5 bg-sky-50/50 p-3.5 rounded-xl border border-sky-200/60">
                  <span className="font-bold text-sky-950 block">Current Trajectory for {companyName}:</span>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    Registered annual sales of <strong>{activeCompany?.sales != null ? `RM ${activeCompany.sales.toLocaleString()}` : 'Not provided'}</strong>. {activeCompany?.sales != null ? `This is ${radarPercent}% of the RM3,000,000 screening reference. ` : ''}Turnover alone does not confirm exemption.
                  </p>
                  <div className="pt-1.5 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600">Buffer Status:</span>
                    <span className="text-xs font-bold text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-300">
                      {!hasRadarTurnoverData ? 'Add turnover to screen eligibility' : isBelowReference ? 'Potential screening match — verify' : 'Check official implementation timeline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Policy 3: Current minimum-wage reference and Budget 2027 announcement scenario */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md">
                      LABOR &amp; WAGE REGULATION
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Budget 2027 Minimum-Wage Announcement Scenario
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 pt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Current wage order dates; verify official applicability
                    </span>
                    <span className="text-slate-300">•</span>
                    <a
                      href="https://www.mohr.gov.my/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <span>KESUMA Wage Order P.U. (A) 349/2024</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ANNOUNCEMENT SCENARIO — VERIFY
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-900 block">Eligibility &amp; Exemption Conditions:</span>
                  <ul className="space-y-1 text-slate-600 list-disc list-inside leading-relaxed">
                    <li>This card represents a Budget 2027 announcement scenario only; final rules and applicability must be checked.</li>
                    <li>The Budget 2027 announcement uses SME criteria; confirm the final programme definition and any related-entity rules.</li>
                    <li>No payroll saving or exemption is confirmed by this pre-check.</li>
                  </ul>
                </div>

                <div className="space-y-1.5 bg-purple-50/50 p-3.5 rounded-xl border border-purple-200/60">
                  <span className="font-bold text-purple-950 block">Status for {companyName}:</span>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    Current turnover is RM {(activeCompany?.sales ?? initialRevenue).toLocaleString()}. This is only a scenario comparison; do not change payroll based on this screen without checking final official rules.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GROUP 2: GRANTS & TAX INCENTIVES                                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'incentives' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <InfoHint
            title={isBM ? 'Pengumuman Insentif & Geran' : 'Announced Incentives & Grants'}
            content={
              isBM
                ? 'Padanan awal berdasarkan maklumat profil perniagaan yang diberikan. Kelayakan, ketersediaan semasa dan syarat akhir perlu disahkan melalui sumber rasmi.'
                : 'Preliminary matches use the business profile information provided. Eligibility, current availability, effective dates, and final programme terms must be checked against official sources.'
            }
            variant="blue"
          />

          <div className="space-y-4">
            {/* Incentive 1: 15% MSME Preferential Corporate Tax Rate */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
                      ANNOUNCEMENT SCENARIO
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Budget 2027 Corporate Tax Rate Announcement Scenario
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 pt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Announcement scenario — confirm formal effective date
                    </span>
                    <span className="text-slate-300">•</span>
                    <a
                      href="https://www.hasil.gov.my/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <span>Income Tax Act 1967 (Sched. 1)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    !hasCapital
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : isTaxScreenBandMatch
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {!hasCapital
                      ? 'REQUIRES SSM CAPITAL INPUT'
                      : isTaxScreenBandMatch
                      ? 'SCREENING BAND MATCH — VERIFY LAW'
                      : 'OUTSIDE SCREENING BAND — VERIFY'}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-900 block">Eligibility Conditions:</span>
                  <ul className="space-y-1 text-slate-600 list-disc list-inside leading-relaxed">
                    <li>Paid-up share capital in respect of ordinary shares &le; RM 2,500,000.</li>
                    <li>Gross income from all business sources &le; RM 50,000,000.</li>
                    <li>Enterprise is not a subsidiary of a corporation exceeding the capital cap.</li>
                    <li>Budget 2027 announced a possible rate change; final law, effective date and all eligibility conditions must be confirmed before relying on it.</li>
                  </ul>
                </div>

                <div className="space-y-1.5 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/60">
                  <span className="font-bold text-emerald-950 block">Calculated Benefit for {companyName}:</span>
                  <div className="text-slate-700 leading-relaxed text-[11px] space-y-1">
                    <div>
                      Capital: <strong>{activeCompany?.paidUpCapital ? `RM ${activeCompany.paidUpCapital.toLocaleString()}` : 'Unspecified'}</strong>
                    </div>
                    <div>
                      Turnover: <strong>{activeCompany?.sales != null ? `RM ${activeCompany.sales.toLocaleString()}` : 'Not provided'}</strong>
                    </div>
                    <div className="text-emerald-800 font-mono font-bold pt-1 text-sm">
                      {isTaxScreenBandMatch && calcChargeableIncome !== null
                        ? `Illustrative scenario difference: ${evalOutcome?.r1_tax?.estimatedSaving && evalOutcome.r1_tax.estimatedSaving !== 'Not estimated' ? evalOutcome.r1_tax.estimatedSaving : `RM ${calculateTaxSaving(calcChargeableIncome).toLocaleString()}/year (scenario)`}`
                        : 'No estimate without chargeable income and a matching screening profile; verify current law and all conditions'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Incentive 2: Announced MediAsas first-year premium subsidy; final terms require verification */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                      CASH GRANT &amp; SUBSIDY
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      MediAsas: First-Year Premium Subsidy Announcement
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 pt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Announced start: January 2027 — final terms to confirm
                    </span>
                    <span className="text-slate-300">•</span>
                    <a
                      href="https://www.mof.gov.my/portal/en/news/speech/speech-the-fifth-madani-budget-2027"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <span>MOF Budget 2027 announcement</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ANNOUNCEMENT SCENARIO — VERIFY
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-900 block">Eligibility Conditions:</span>
                  <ul className="space-y-1 text-slate-600 list-disc list-inside leading-relaxed">
                    <li>Active Malaysian MSME registered with PERKESO/SOCSO.</li>
                    <li>Announced headline criterion: fewer than 75 employees; final eligibility details must be verified.</li>
                    <li>Announced first-year premium subsidy: RM200 per eligible employee, capped at 50 employees per company (maximum RM10,000). This is not confirmed entitlement.</li>
                  </ul>
                </div>

                <div className="space-y-1.5 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-200/60">
                  <span className="font-bold text-indigo-950 block">Entitlement for {companyName}:</span>
                  <div className="text-slate-700 leading-relaxed text-[11px] space-y-1">
                    <div>
                      Headcount: <strong>{calcStaff} local staff</strong>
                    </div>
                    <div>
                      Per-Employee First-Year Subsidy (announced): <strong>RM 200</strong>
                    </div>
                    <div className="text-indigo-800 font-mono font-bold pt-1 text-sm">
                      Indicative First-Year Ceiling: RM {(Math.min(Math.max(0, calcStaff), MEDIASAS_MAX_SUBSIDIZED_EMPLOYEES) * MEDIASAS_GRANT_PER_EMPLOYEE).toLocaleString()} (eligibility unconfirmed)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Incentive 3: Digitalisation Support — Verify Current Programme */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                      DIGITAL ACCELERATION GRANT
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      MDEC / BSN Digitalisation Support — Verify Current Programme
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 pt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Availability and application window not verified
                    </span>
                    <span className="text-slate-300">•</span>
                    <a
                      href="https://mdec.my/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <span>MDEC official programme information</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    DISCOVERY ITEM — VERIFY
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-900 block">What to verify:</span>
                  <ul className="space-y-1 text-slate-600 list-disc list-inside leading-relaxed">
                    <li>Confirm the programme is currently open and whether a new application window exists.</li>
                    <li>Verify ownership, operating-history, sales, and product eligibility requirements on the official programme page.</li>
                    <li>Do not rely on a grant cap or reimbursement rate until current official terms are confirmed.</li>
                  </ul>
                </div>

                <div className="space-y-1.5 bg-blue-50/50 p-3.5 rounded-xl border border-blue-200/60">
                  <span className="font-bold text-blue-950 block">Status for {companyName}:</span>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    Potentially relevant digitalisation support is listed for discovery only. Availability, funding limits and current application conditions must be verified on the official programme page before making a claim.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GROUP 3: RELEVANT ACTIONS FOR MY BUSINESS                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'actions' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Action Roadmap Card */}
          <SectionCard
            title={isBM ? `Langkah Seterusnya: ${companyName}` : `Recommended Next Steps: ${companyName}`}
            subtitle={
              isBM
                ? `Langkah keutamaan berdasarkan perolehan, modal berbayar, dan status invois semasa syarikat.`
                : `Actionable next steps derived directly from active company turnover, share capital, and invoice intake status.`
            }
            icon={FileCheck2}
            headerAction={
              <button
                type="button"
                onClick={handleGenerateActionPlan}
                className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>{isBM ? 'Perbaharui Pelan Tindakan' : 'Update & Hash Plan'}</span>
              </button>
            }
          >
            <div className="space-y-3.5 text-xs">
              {/* Action Item 1 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        Review Buyer TIN and transaction details
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 uppercase">
                        Review
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                      Review buyer TIN and the applicable LHDN transaction/consolidation requirements. The configured RM10,000 threshold is a review prompt, not a universal legal conclusion.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Review reminder
                  </span>
                </div>
              </div>

              {/* Action Item 2 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        Verify SSM Share Capital in Business Settings
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 uppercase">
                        Tax Prerequisite
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                      Confirm the relevant paid-up capital, shareholder and chargeable-income conditions against current LHDN guidance before relying on a preferential-rate scenario.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {onOpenEditProfile && (
                    <button
                      type="button"
                      onClick={onOpenEditProfile}
                      className="h-8 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      {isBM ? 'Urus Profil' : 'Edit Capital'}
                    </button>
                  )}
                </div>
              </div>

              {/* Action Item 3 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        Review announced MediAsas first-year subsidy estimate: RM {(Math.min(Math.max(0, calcStaff), MEDIASAS_MAX_SUBSIDIZED_EMPLOYEES) * MEDIASAS_GRANT_PER_EMPLOYEE).toLocaleString()} (not confirmed entitlement)
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 uppercase">
                        Cash Grant
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                      The announcement describes a first-year premium subsidy. Final eligibility, application channel, and programme rules must be confirmed from official guidance.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Up to RM {(Math.min(Math.max(0, calcStaff), MEDIASAS_MAX_SUBSIDIZED_EMPLOYEES) * MEDIASAS_GRANT_PER_EMPLOYEE).toLocaleString()} first year
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Interactive Custom SME Policy Match Calculator */}
          <SectionCard
            title={isBM ? 'Kalkulator Penyesuaian Dasar PKS Interaktif' : 'Interactive Budget 2027 Policy Match Calculator'}
            subtitle={
              isBM
                ? `Laraskan perolehan, modal berbayar, dan bilangan staf untuk menilai kelayakan berkanun secara langsung.`
                : `Adjust turnover, paid-up capital, and headcount to test configured demo rules deterministically.`
            }
            icon={Calculator}
          >
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual Turnover (RM)
                  </label>
                  <input
                    type="number"
                    step="50000"
                    value={calcSales}
                    onChange={(e) => setCalcSales(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-[11px] text-slate-500 mt-1.5 flex justify-between">
                    <span>Threshold cap:</span>
                    <strong className="text-slate-700">RM 50,000,000</strong>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paid-Up Capital (RM)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={calcCapital}
                    onChange={(e) => setCalcCapital(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-[11px] text-slate-500 mt-1.5 flex justify-between">
                    <span>Illustrative screening cap:</span>
                    <strong className="text-slate-700">RM 2,500,000*</strong>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chargeable Income (RM)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={calcChargeableIncome ?? ''}
                    placeholder="Enter from tax computation"
                    onChange={(e) => setCalcChargeableIncome(e.target.value.trim() === '' ? null : Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-[11px] text-slate-500 mt-1.5 flex justify-between">
                    <span>Input required for:</span>
                    <strong className="text-slate-700">Scenario comparison only</strong>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full-Time Staff (Pax)
                  </label>
                  <input
                    type="number"
                    value={calcStaff}
                    onChange={(e) => setCalcStaff(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-[11px] text-slate-500 mt-1.5 flex justify-between">
                    <span>Announcement criteria:</span>
                    <strong className="text-slate-700">&lt;75 staff; cap 50 subsidised</strong>
                  </div>
                </div>
              </div>

              {/* Dynamic Live Evaluation Outcomes */}
              <div className="relative">
                {isEvaluating && (
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full shadow-2xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Evaluating via deterministic rules...</span>
                  </div>
                )}

                <div className={`grid md:grid-cols-3 gap-4 text-xs transition-opacity duration-200 ${isEvaluating ? 'opacity-70' : 'opacity-100'}`}>
                  {/* R1 Outcome */}
                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>R1: Announced Tax-Rate Scenario</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {evalOutcome?.r1_tax?.status || 'WARN'}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {evalOutcome?.r1_tax?.label || 'Verify current rules'}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {evalOutcome?.r1_tax?.details || 'Illustrative announcement scenario only; verify chargeable income, current legislation, and eligibility.'}
                    </p>
                    <div className="font-mono text-sm font-extrabold text-amber-800 pt-1">
                      {evalOutcome?.r1_tax?.estimatedSaving ? `Scenario: ${evalOutcome.r1_tax.estimatedSaving}` : 'No estimate without chargeable income'}
                    </div>
                  </div>

                  {/* R2 Outcome */}
                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>R2: Minimum-Wage Policy Notice</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {evalOutcome?.r2_wage?.status || 'WARN'}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {evalOutcome?.r2_wage?.label || 'Verify official rules'}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {evalOutcome?.r2_wage?.details || 'Announcement scenario only; verify current minimum-wage law and final implementation rules.'}
                    </p>
                    <div className="font-mono text-sm font-extrabold text-slate-800 pt-1">
                      Reference only; no exemption inferred
                    </div>
                  </div>

                  {/* R3 Outcome */}
                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>MediAsas First-Year Premium Subsidy</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {evalOutcome?.r3_mediasas?.status || 'WARN'}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {evalOutcome?.r3_mediasas?.label || 'Potential match — verify'}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {evalOutcome?.r3_mediasas?.details || 'Announcement scenario only; final eligibility and programme terms are not confirmed.'}
                    </p>
                    <div className="font-mono text-sm font-extrabold text-indigo-800 pt-1">
                      First-year estimate: RM {(Math.min(Math.max(0, calcStaff), MEDIASAS_MAX_SUBSIDIZED_EMPLOYEES) * MEDIASAS_GRANT_PER_EMPLOYEE).toLocaleString()} (eligibility unconfirmed)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Manual Official Document Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <FileUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {isBM ? 'Import Dokumen untuk Semakan' : 'Import Document for Review'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isBM
                      ? 'Rekod cap jari SHA-256; dokumen tidak disahkan secara automatik'
                      : 'Record a SHA-256 fingerprint; document authenticity is not automatically verified'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleImportSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Monitored Source
                </label>
                <select
                  value={importSourceId}
                  onChange={(e) => setImportSourceId(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lhdn-portal">LHDN e-Invoicing Guidelines &amp; General Operations</option>
                  <option value="myinvois-sdk">MyInvois Developer SDK &amp; Technical Specs</option>
                  <option value="mof-budget">Ministry of Finance (MOF) Budget Gazette</option>
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Document Title / Reference
                  </label>
                  <input
                    type="text"
                    required
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                    placeholder="e.g. LHDN Statutory Guideline Addendum v4.9"
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Candidate Version Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={importVersionName}
                    onChange={(e) => setImportVersionName(e.target.value)}
                    placeholder="e.g. LHDN-General-Guideline-v4.8-review"
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Official Gazette Text / Statutory Clause Diff
                  </label>
                  <button
                    type="button"
                    onClick={() => setImportText(sampleGazettePreset)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    + Load Clearly Labelled Demo Sample
                  </button>
                </div>
                <textarea
                  required
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste statutory gazette paragraphs, clauses, schedule tables, or guideline text here..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  The supplied text will be fingerprinted for review. This does not independently authenticate the source or prove a legal change. Review alone does not activate operating rules.
                </p>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting || !importText.trim()}
                  className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <FileUp className="w-4 h-4" />
                  <span>{isImporting ? 'Registering Snapshot...' : 'Import & Compute Snapshot'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
