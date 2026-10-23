import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  Building2,
  HelpCircle,
  RefreshCw,
  Receipt,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  ShieldCheck,
  FileText,
  Radio,
  Users,
  DollarSign,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { PageHeader, SectionCard, StatusBadge, InfoHint } from './common';
import { FinancialImpactRecalculation, OwnerNotification, InvoiceDraft } from '../types';
import { EXEMPTION_RADAR_THRESHOLD } from '../constants/policyConstants';

interface OverviewViewProps {
  onNavigateTab: (tabId: string) => void;
  language: 'en' | 'bm';
  companyName?: string;
  ownerName?: string;
  onOpenEditProfile?: () => void;
  pendingApprovalsCount?: number;
  isPolicyStale?: boolean;
  onOpenWelcomeGuide?: () => void;
  financialImpact?: FinancialImpactRecalculation | null;
  ownerNotifications?: OwnerNotification[];
  onDismissNotification?: (id: string) => void;
  onRecalculateFinancials?: () => void;
  activePolicyVersion?: string;
  drafts?: InvoiceDraft[];
  activeCompanyId?: string;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigateTab,
  language,
  companyName = 'ABC Trading Sdn. Bhd.',
  ownerName = 'Ahmad Razak',
  onOpenEditProfile,
  pendingApprovalsCount = 0,
  isPolicyStale = true,
  onOpenWelcomeGuide,
  financialImpact,
  ownerNotifications = [],
  onDismissNotification,
  onRecalculateFinancials,
  activePolicyVersion = 'LHDN-General-Guideline-v4.8',
  drafts = [],
  activeCompanyId = 'COMP-A',
}) => {
  const isBM = language === 'bm';
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = async () => {
    if (!onRecalculateFinancials) return;
    setIsRecalculating(true);
    try {
      await onRecalculateFinancials();
    } finally {
      setTimeout(() => setIsRecalculating(false), 400);
    }
  };

  const activeNotification = ownerNotifications.find((n) => !n.dismissed);

  // Actual Application Data Computations
  const pendingInvoices = drafts.filter((d) => d.status !== 'approved');
  const approvedInvoices = drafts.filter((d) => d.status === 'approved');
  const totalPendingAmount = pendingInvoices.reduce(
    (sum, d) => sum + (d.parsedAmount || d.amount || 0),
    0
  );
  const highValuePending = pendingInvoices.filter(
    (d) => (d.parsedAmount || d.amount || 0) > 10000
  );
  const missingTinInvoices = pendingInvoices.filter(
    (d) => !d.buyer_tin && !d.fields?.buyerTIN
  );

  const annualTurnover = financialImpact?.metrics?.annualTurnover || 0;
  const staffCount = financialImpact?.metrics?.staffCount || 0;
  const hasTurnoverData = Number.isFinite(annualTurnover) && annualTurnover > 0;
  const isBelowThresholdReference = hasTurnoverData && annualTurnover < EXEMPTION_RADAR_THRESHOLD;
  const isApproachingThreshold = hasTurnoverData && annualTurnover >= EXEMPTION_RADAR_THRESHOLD * 0.8 && annualTurnover < EXEMPTION_RADAR_THRESHOLD;

  // Build Unified "Today's Priorities" List from actual data
  interface PriorityItem {
    id: string;
    category: 'invoice' | 'policy' | 'data' | 'radar';
    priority: 'urgent' | 'warning' | 'info';
    title: string;
    description: string;
    actionLabel: string;
    targetTab: string;
  }

  const priorities: PriorityItem[] = [];

  // Priority 1: invoices crossing a configured review threshold with missing buyer TIN
  highValuePending
    .filter((d) => !d.buyer_tin && !d.fields?.buyerTIN)
    .forEach((d) => {
      const invNum = d.invoiceNumber || d.draft_id;
      const amountStr = (d.parsedAmount || d.amount || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      priorities.push({
        id: `inv-tin-${d.draft_id}`,
        category: 'invoice',
        priority: 'urgent',
        title: isBM
          ? `Invois #${invNum} (RM ${amountStr}): Tiada No. TIN Pembeli`
          : `Invoice #${invNum} (RM ${amountStr}): Missing Buyer TIN`,
        description: isBM
          ? `Invois ini melepasi ambang semakan RM10,000 (${d.company || 'Pembeli'}) dan tiada TIN pembeli. Sahkan peraturan LHDN serta jenis transaksi sebelum mengeluarkan invois.`
          : `This invoice crosses the configured RM10,000 review threshold (${d.company || 'Buyer'}) and has no buyer TIN. Confirm the applicable LHDN rule and transaction type before issuing it.`,
        actionLabel: isBM ? 'Lengkapkan Invois' : 'Review & Add TIN',
        targetTab: 'invoices',
      });
    });

  // A stale/unverified source is a review reminder, not proof that a policy changed.
  if (isPolicyStale) {
    priorities.push({
      id: 'policy-source-review',
      category: 'policy',
      priority: 'info',
      title: isBM ? 'Sumber dasar perlu disahkan' : 'Official policy source needs verification',
      description: isBM
        ? 'Semakan langsung terkini belum disahkan atau dokumen memerlukan semakan. Ini tidak bermaksud pindaan dasar telah disahkan.'
        : 'A recent live source check is not verified or a document needs review. This does not mean a policy change has been confirmed.',
      actionLabel: isBM ? 'Semak status sumber' : 'Check Source Status',
      targetTab: 'compliance',
    });
  }

  // Priority 3: Other pending invoice sign-offs
  const readyForSignOff = pendingInvoices.filter(
    (d) => d.status === 'Ready' || d.status === 'pending_approval'
  );
  if (readyForSignOff.length > 0) {
    priorities.push({
      id: 'invoices-ready-signoff',
      category: 'invoice',
      priority: 'warning',
      title: isBM
        ? `${readyForSignOff.length} Invois Sedia untuk Tandatangan Pengarah`
        : `${readyForSignOff.length} Ready Invoice(s) Awaiting Owner Sign-Off`,
      description: isBM
        ? `Semua medan statutori telah disahkan. Menunggu kuasa kelulusan daripada ${ownerName} sebelum pengeluaran.`
        : `Structured validations passed. Authorization by ${ownerName} is pending before final export.`,
      actionLabel: isBM ? 'Buka Senarai Kelulusan' : 'Go to Sign-Off Queue',
      targetTab: 'invoices',
    });
  } else if (pendingInvoices.length > 0 && highValuePending.length === 0) {
    priorities.push({
      id: 'invoices-pending-review',
      category: 'invoice',
      priority: 'warning',
      title: isBM
        ? `${pendingInvoices.length} Draf Invois Memerlukan Semakan`
        : `${pendingInvoices.length} Draft Invoice(s) in Intake Queue`,
      description: isBM
        ? `Terdapat draf invois baharu yang dimuat naik dan menunggu pengesahan medan cukai.`
        : `New invoice intakes require field confirmation and tax rate checks.`,
      actionLabel: isBM ? 'Semak Draf Invois' : 'Review Invoices',
      targetTab: 'invoices',
    });
  }

  // Priority 4: Missing SSM Profile Data for accurate tax computation
  if (financialImpact?.missingData && financialImpact.missingData.length > 0) {
    financialImpact.missingData.forEach((m) => {
      priorities.push({
        id: `missing-${m.id}`,
        category: 'data',
        priority: m.severity === 'high' ? 'urgent' : 'warning',
        title: isBM ? `Maklumat Diperlukan: ${m.label}` : `Profile Data Required: ${m.label}`,
        description: isBM
          ? `${m.impact}. Nilai tidak diada-adakan untuk memelihara ketepatan statutori.`
          : `${m.impact}. Value is left unpopulated to protect compliance fidelity.`,
        actionLabel: isBM ? 'Kemas Kini Tetapan' : 'Update Settings',
        targetTab: m.actionTab || 'business',
      });
    });
  }

  // Priority 5: Threshold radar buffer alert
  if (isApproachingThreshold) {
    priorities.push({
      id: 'radar-buffer',
      category: 'radar',
      priority: 'info',
      title: isBM
        ? 'Perolehan menghampiri rujukan RM3 juta'
        : 'Turnover nearing the RM3M reference band',
      description: isBM
        ? `Perolehan berdaftar ialah ${financialImpact?.metrics?.annualTurnoverDisplay || 'belum diketahui'}. Rujukan RM3 juta ialah saringan sahaja; semak syarat pengecualian rasmi dan entiti berkaitan.`
        : `Recorded turnover is ${financialImpact?.metrics?.annualTurnoverDisplay || 'not available'}. The RM3M published threshold is a screening reference only; verify the applicable exemption criteria and related-entity conditions.`,
      actionLabel: isBM ? 'Pantau Radar' : 'View Policies & Benefits',
      targetTab: 'compliance',
    });
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <PageHeader
        tag={isBM ? 'Ruang Kerja PKS' : 'SME Workspace'}
        tagIcon={Sparkles}
        title={isBM ? 'Keutamaan Hari Ini' : "Today's Priorities"}
        description={
          isBM
            ? `Pusat tindakan untuk ${companyName}: invois tertunggak, maklumat yang perlu dilengkapkan dan kemas kini dasar yang relevan.`
            : `A focused action centre for ${companyName}: pending invoices, missing business details, and relevant policy updates.`
        }
        primaryAction={{
          label: isBM ? 'Panduan 60 Saat' : '60-Sec Quick Guide',
          icon: HelpCircle,
          onClick: () => onOpenWelcomeGuide?.(),
          variant: 'secondary',
        }}
        secondaryAction={{
          label: isBM ? 'Tetapan Syarikat' : 'Business Settings',
          icon: Building2,
          onClick: () => onNavigateTab('business'),
          variant: 'ghost',
        }}
      />

      {/* Active business and source verification status */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-sky-400 border border-blue-400/30 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              {isBM ? 'Perniagaan Semasa' : 'Active Business'}
            </div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>{companyName}</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-medium text-slate-300">
                {isBM ? 'Pemilik Perniagaan:' : 'Business Owner:'}{' '}
                <strong className="text-white">{ownerName}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 font-mono flex items-center gap-2">
            <span>Policy:</span>
            <strong className="text-white">{activePolicyVersion}</strong>
            {isPolicyStale && (
              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-400 text-slate-950 uppercase">
                Verify source
              </span>
            )}
          </div>
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Recalculate compliance impact"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin text-sky-400' : 'text-slate-400'}`}
            />
            <span>{isRecalculating ? 'Recalculating...' : 'Recalculate'}</span>
          </button>
        </div>
      </div>

      {/* Owner Notification Alert Banner if present */}
      {activeNotification && (
        <div className="p-4 rounded-xl border border-blue-300 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  Owner Directive
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(activeNotification.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                {activeNotification.title}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {activeNotification.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {activeNotification.recommendedActions?.map((act, idx) => (
              <button
                key={idx}
                onClick={() => onNavigateTab(act.tab)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                {act.label}
              </button>
            ))}
            {onDismissNotification && (
              <button
                onClick={() => onDismissNotification(activeNotification.id)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Three concise status cards based on current business data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: e-Invoice Review Queue */}
        <div
          onClick={() => onNavigateTab('invoices')}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isBM ? 'Invois Menunggu Kelulusan' : 'Pending e-Invoices'}
              </span>
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {pendingInvoices.length}
              <span className="text-xs font-normal text-slate-500 ml-1.5">
                {pendingInvoices.length === 1 ? 'draft' : 'drafts'}
              </span>
            </div>
            <div className="text-xs font-mono font-semibold text-slate-700 mt-1">
              RM{' '}
              {totalPendingAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span
              className={
                highValuePending.length > 0 ? 'text-amber-700 font-semibold' : 'text-slate-500'
              }
            >
              {highValuePending.length > 0
                ? `${highValuePending.length} configured-threshold reviews`
                : 'No configured-threshold reviews'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* KPI 2: Turnover Reference Check */}
        <div
          onClick={() => onNavigateTab('compliance')}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isBM ? 'Unjuran Perolehan Tahunan' : 'Annual Sales Turnover'}
              </span>
              <Radio className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {hasTurnoverData
                ? (financialImpact?.metrics?.annualTurnoverDisplay || `RM ${annualTurnover.toLocaleString()}`)
                : (isBM ? 'Belum diisi' : 'Not provided')}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  !hasTurnoverData
                    ? 'bg-slate-100 text-slate-700'
                    : isBelowThresholdReference
                    ? 'bg-amber-100 text-amber-800'
                    : isApproachingThreshold
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {!hasTurnoverData
                  ? (isBM ? 'LENGKAPKAN PROFIL' : 'COMPLETE PROFILE')
                  : isBelowThresholdReference
                    ? (isBM ? 'BAWAH RUJUKAN RM3J — SEMAK SYARAT' : 'BELOW RM3M REFERENCE — VERIFY CONDITIONS')
                    : isApproachingThreshold
                      ? (isBM ? 'SEMAK HAMPIR AMBANG' : 'REVIEW NEAR REFERENCE')
                      : (isBM ? 'SEMAK KEHENDAK RASMI' : 'CHECK OFFICIAL TIMELINE')}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
              RM3M reference only; verify official exemption criteria
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* KPI 3: Business profile completeness */}
        <div
          onClick={() => onNavigateTab('business')}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isBM ? 'Maklumat Profil Belum Lengkap' : 'Profile Details to Confirm'}
              </span>
              <Building2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {financialImpact?.missingData?.length ?? 0}
              <span className="text-xs font-normal text-slate-500 ml-1.5">{isBM ? 'item' : 'items'}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isBM ? 'Lengkapkan data yang diperlukan untuk semakan yang lebih tepat.' : 'Complete missing details to improve eligibility and compliance screening.'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">
              {isBM ? 'Buka Tetapan Perniagaan' : 'Open Business Settings'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* UNIFIED TODAY'S PRIORITIES LIST */}
      <SectionCard
        title={isBM ? 'Keutamaan Hari Ini' : "Today's Priorities"}
        subtitle={
          isBM
            ? `Senarai tindakan berpusat bagi invois aktif, jurang data SSM, dan kemas kini statutori.`
            : `One action queue for invoice reviews, profile gaps, and relevant policy updates.`
        }
        icon={Clock}
        headerBadge={
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
            {priorities.length} {priorities.length === 1 ? 'Action' : 'Actions'}
          </span>
        }
      >
        {priorities.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">
              {isBM ? 'Semua Keutamaan Selesai' : 'All Priorities Clear'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isBM
                ? 'Tiada invois yang disekat, jurang profil berkanun, atau tindakan dasar menunggu buat masa ini.'
                : 'No current invoice review items or policy actions are recorded.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {priorities.map((item) => (
              <div
                key={item.id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                      item.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-700'
                        : item.priority === 'warning'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {item.priority === 'urgent' ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : item.priority === 'warning' ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      <InfoHint variant="blue" title="" content="" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">{item.title}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          item.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : item.priority === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.priority}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase">
                        [{item.category}]
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab(item.targetTab)}
                  className={`h-8 px-3.5 rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    item.priority === 'urgent'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Policy and benefits teaser: details live in Policies & Benefits */}
      <SectionCard
        title={isBM ? 'Dasar & Faedah untuk Perniagaan Anda' : 'Policies & Benefits for Your Business'}
        subtitle={isBM
          ? 'Lihat sumber rasmi, syarat kelayakan dan langkah seterusnya. Maklumat yang belum disahkan akan dilabel dengan jelas.'
          : 'Review official sources, eligibility conditions, and next steps. Unverified information is clearly labelled.'}
        icon={BookOpen}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            {isBM
              ? 'Dasar, geran dan insentif tidak dipaparkan sebagai kelayakan yang dijamin. Buka halaman Dasar & Faedah untuk menyemak sumber dan syarat yang berkaitan dengan profil perniagaan anda.'
              : 'Policies, grants, and incentives are not presented as guaranteed entitlements. Open Policies & Benefits to review sources and conditions relevant to your business profile.'}
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('compliance')}
            className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>{isBM ? 'Semak Dasar & Faedah' : 'Review Policies & Benefits'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </SectionCard>
    </div>
  );
};
