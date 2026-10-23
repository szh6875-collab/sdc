import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { StalenessBanner } from './components/StalenessBanner';
import { OverviewView } from './components/OverviewView';
import { MyBusinessView } from './components/MyBusinessView';
import { InvoisReadyView } from './components/InvoisReadyView';
import { ComplianceOpportunitiesView } from './components/ComplianceOpportunitiesView';
import { RoleLoginGateway } from './components/RoleLoginGateway';
import { RoleSwitchModal } from './components/RoleSwitchModal';
import { ExplainModal } from './components/ExplainModal';
import { CompanyProfileModal } from './components/CompanyProfileModal';
import { DemoScenarioModal } from './components/DemoScenarioModal';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { WelcomeGuideModal } from './components/WelcomeGuideModal';

import {
  RoleType,
  LanguageType,
  InvoiceDraft,
  SyntheticCompany,
  CompanyEntity,
  AuditEntry,
  RuleResult,
  FinancialImpactRecalculation,
  OwnerNotification,
} from './types';
import { api, setClientRole, clearSession } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [currentRole, setCurrentRole] = useState<RoleType>('owner');
  const [language, setLanguage] = useState<LanguageType>('en');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pendingRoleSwitch, setPendingRoleSwitch] = useState<RoleType | null>(null);

  // Backend state
  const [activePolicyVersion, setActivePolicyVersion] = useState<string>('LHDN-General-Guideline-v4.8');
  const [isPolicyStale, setIsPolicyStale] = useState<boolean>(true);
  const [policyStaleDays, setPolicyStaleDays] = useState<number>(8);
  const [activeCompanyId, setActiveCompanyId] = useState<string>('COMP-A');
  const [companyName, setCompanyName] = useState<string>('ABC Trading Sdn. Bhd.');
  const [ownerName, setOwnerName] = useState<string>('Ahmad Razak');
  const [projectedRevenue, setProjectedRevenue] = useState<number>(1200000);

  // Financial recalculation and owner notifications state
  const [financialImpact, setFinancialImpact] = useState<FinancialImpactRecalculation | null>(null);
  const [ownerNotifications, setOwnerNotifications] = useState<OwnerNotification[]>([]);

  // Data collections
  const [drafts, setDrafts] = useState<InvoiceDraft[]>([]);
  const [companies, setCompanies] = useState<CompanyEntity[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  // Modals & Toasts
  const [explainedRule, setExplainedRule] = useState<RuleResult | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [demoScenarioId, setDemoScenarioId] = useState<number>(1);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isWelcomeGuideOpen, setIsWelcomeGuideOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('orbyte_seen_welcome_v1') !== 'true';
    } catch {
      return false;
    }
  });

  const handleCloseWelcomeGuide = () => {
    setIsWelcomeGuideOpen(false);
    try {
      localStorage.setItem('orbyte_seen_welcome_v1', 'true');
    } catch {
      // ignore
    }
  };

  // Add toast helper
  const showToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Data Fetch & Refresh
  const refreshAllData = async (compOverrideId?: string) => {
    try {
      const stateData = await api.getState();
      setActivePolicyVersion(stateData.activePolicyVersion);
      setIsPolicyStale(stateData.isStale);
      setPolicyStaleDays(stateData.policyLastSyncedDaysAgo ?? 0);
      
      const targetCompId = compOverrideId || stateData.activeCompanyId || activeCompanyId;
      if (stateData.activeCompanyId && !compOverrideId) {
        setActiveCompanyId(stateData.activeCompanyId);
      }
      if (stateData.companyName) setCompanyName(stateData.companyName);
      if (stateData.ownerName) setOwnerName(stateData.ownerName);
      if (stateData.projectedAnnualRevenue) setProjectedRevenue(stateData.projectedAnnualRevenue);

      const [companiesData, draftsData, auditData, impactData, notificationsData] = await Promise.all([
        api.getCompanies(true),
        api.getDrafts(targetCompId),
        api.getAuditLedger(targetCompId),
        api.getFinancialImpact(targetCompId).catch(() => null),
        api.getOwnerNotifications().catch(() => []),
      ]);

      setCompanies(companiesData || []);
      const uniqueDrafts = (draftsData || []).filter((d: InvoiceDraft, index: number, self: InvoiceDraft[]) =>
        index === self.findIndex((t) => t.draft_id === d.draft_id)
      );
      setDrafts(uniqueDrafts);
      setAuditEntries(auditData.entries || []);
      if (impactData) setFinancialImpact(impactData);
      if (notificationsData) setOwnerNotifications(notificationsData);
    } catch (err: any) {
      console.error('Data refresh error:', err);
    }
  };

  const handleCompanySwitch = async (newCompanyId: string) => {
    try {
      const res = await api.switchCompany(newCompanyId);
      setActiveCompanyId(res.activeCompany.id);
      setCompanyName(res.activeCompany.name);
      setOwnerName(res.activeCompany.director_name);
      setProjectedRevenue(res.activeCompany.sales);
      await refreshAllData(newCompanyId);

      showToast(
        'success',
        language === 'bm' ? 'Syarikat Ditukar' : 'Company Workspace Switched',
        language === 'bm'
          ? `Ruang kerja ditukar kepada "${res.activeCompany.name}". Invois dan kelayakan diasingkan.`
          : `Active entity switched to "${res.activeCompany.name}". Invoices, approvals, and PolicyMatch isolated.`
      );
    } catch (err: any) {
      showToast('error', 'Company Switch Failed', err.message);
    }
  };

  const handleSaveCompanyProfile = async (newCompany: string, newOwner: string) => {
    try {
      const res = await api.updateCompanyProfile({ companyName: newCompany, ownerName: newOwner });
      setCompanyName(res.companyName);
      setOwnerName(res.ownerName);
      showToast(
        'success',
        'Company Profile Updated',
        `Business profile updated for "${res.companyName}". The change has been recorded in the audit log.`
      );
      await refreshAllData();
    } catch (err: any) {
      showToast('error', 'Profile Update Error', err.message);
      throw err;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshAllData();
    }
  }, [isAuthenticated, currentRole]);

  // Initial sign in callback
  const handleLoginSuccess = async (role: RoleType) => {
    setCurrentRole(role);
    setIsAuthenticated(true);
    await refreshAllData();
    showToast(
      'success',
      language === 'bm' ? 'Log Masuk Berjaya' : 'Authentication Successful',
      language === 'bm'
        ? `Selamat kembali! Berjaya log masuk sebagai ${role === 'owner' ? 'Pemilik PKS' : role === 'clerk' ? 'Staf' : 'Penasihat Cukai'}.`
        : `Welcome! Successfully authenticated as ${role === 'owner' ? 'SME Owner' : role === 'clerk' ? 'Staff' : 'Tax Advisor'}.`
    );
  };

  // User requested a role switch from the UI dropdown (opens password modal)
  const handleRequestRoleSwitch = (targetRole: RoleType) => {
    if (targetRole === currentRole) return;
    setPendingRoleSwitch(targetRole);
  };

  // User entered password and confirmed the role switch in modal
  const handleConfirmRoleSwitch = async (role: RoleType, password: string) => {
    await setClientRole(role, password);
    setCurrentRole(role);
    setPendingRoleSwitch(null);
    await refreshAllData();

    if (role === 'clerk') {
      showToast(
        'warning',
        language === 'bm' ? 'Peranan: Staf / Kerani (Mod Paparan Sahaja)' : 'Role: Staff / Finance Clerk (View-Only)',
        language === 'bm'
          ? 'Kawalan akses (RBAC) aktif: Anda hanya boleh melihat data dengan TIN tersembunyi. Tindakan meluluskan invois dihadkan.'
          : 'Staff permissions active: intake allowed with masked TINs. Sign-offs restricted.'
      );
    } else if (role === 'owner') {
      showToast(
        'info',
        language === 'bm' ? 'Peranan: Pemilik PKS (Hak Kelulusan Penuh)' : 'Role: SME Owner (Full Approval Rights)',
        language === 'bm'
          ? 'Akses penuh aktif: Anda boleh meluluskan e-invois serta menandatangani lejar audit SHA-256.'
          : 'Owner permissions active: Full sign-off rights and cryptographic SHA-256 audit ledger authority.'
      );
    } else {
      showToast(
        'info',
        language === 'bm' ? 'Peranan: Penasihat Cukai (Tadbir Urus & Dasar)' : 'Role: Tax Advisor (Policy & Governance)',
        language === 'bm'
          ? 'Akses penasihat cukai aktif: Anda mempunyai keistimewaan menyemak Diff dasar Belanjawan 2027 dan mengesahkan jadual berkanun.'
          : 'Tax Advisor active: review official-source evidence, preliminary eligibility, and compliance actions.'
      );
    }
  };

  // Direct role change (e.g. from automated demo scenario scripts)
  const handleRoleChange = async (role: RoleType) => {
    setCurrentRole(role);
    try {
      await setClientRole(role);
      await refreshAllData();
    } catch (err) {
      console.warn('Role switch auth failed:', err);
    }
  };

  // Logout / Lock session
  const handleLogout = () => {
    clearSession();
    setIsAuthenticated(false);
    showToast(
      'info',
      language === 'bm' ? 'Sesi Dikunci' : 'Session Locked',
      language === 'bm'
        ? 'Anda telah keluar. Sila pilih peranan dan masukkan kata laluan untuk masuk semula.'
        : 'You have signed out. Please select role and enter password to sign in.'
    );
  };

  // Synchronize policy provisions or navigate directly to Policy Center
  const handleSyncPolicy = async () => {
    setActiveTab('compliance');
    showToast(
      'info',
      language === 'bm' ? 'Pusat Dasar & Faedah Dibuka' : 'Policies & Benefits Opened',
      language === 'bm'
        ? 'Membuka sumber dasar, syarat kelayakan dan status pengesahan. Tindakan ini tidak menjalankan penyegerakan langsung.'
        : 'Opening policy sources, eligibility details and verification status. A navigation action does not perform a live sync.'
    );
  };

  // Executive Walkthrough Scenarios
  const handleRunScenario = async (scenarioId: number) => {
    if (scenarioId === 1) {
      // Scenario 1: Invoice Processing & Validation
      setActiveTab('invoices');
      showToast(
        'info',
        language === 'bm' ? 'Senario 1: Semakan Invois' : 'Scenario 1: Invoice Processing',
        language === 'bm'
          ? 'Memproses invois dan menyemak petunjuk pengesahan serta nombor cukai TIN.'
          : 'Processing invoice intake and reviewing configurable validation prompts and buyer tax IDs.'
      );
    } else if (scenarioId === 2) {
      // Scenario 2: Tax Relief & Grants
      setActiveTab('compliance');
      showToast(
        'info',
        language === 'bm' ? 'Senario 2: Pelepasan Cukai & Geran' : 'Scenario 2: Tax Relief & Grants',
        language === 'bm'
          ? 'Menyemak senario kadar cukai yang diumumkan dan subsidi premium tahun pertama MediAsas; sahkan syarat akhir.'
          : 'Reviewing an announced tax-rate scenario and the proposed MediAsas first-year premium subsidy; verify final terms.'
      );
    } else if (scenarioId === 3) {
      // Scenario 3: e-Invoice & Authorizations
      setActiveTab('invoices');
      showToast(
        'info',
        language === 'bm' ? 'Senario 3: Kelulusan e-Invois' : 'Scenario 3: e-Invoice Authorizations',
        language === 'bm'
          ? 'Menyemak senarai invois sedia dan kuasa kelulusan pemilik syarikat.'
          : 'Reviewing invoice queue for director sign-off and authorization.'
      );
    } else if (scenarioId === 4) {
      // Scenario 4: Business Settings
      setActiveTab('business');
      showToast(
        'success',
        language === 'bm' ? 'Senario 4: Tetapan Perniagaan' : 'Scenario 4: Business Settings',
        language === 'bm'
          ? 'Mengurus profil entiti perniagaan dan pendaftaran SST/TIN.'
          : 'Managing business entity profiles and registered tax identifiers.'
      );
    }
  };

  const pendingApprovalsCount = drafts.filter((d) => d.status !== 'approved').length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        <RoleLoginGateway
          onLoginSuccess={handleLoginSuccess}
          language={language}
          onLanguageChange={setLanguage}
        />
        <NotificationToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 font-sans antialiased overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingApprovalsCount={pendingApprovalsCount}
          isPolicyStale={isPolicyStale}
          currentRole={currentRole}
          language={language}
          companyName={companyName}
          ownerName={ownerName}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 bg-white h-full shadow-2xl">
            <Sidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              pendingApprovalsCount={pendingApprovalsCount}
              isPolicyStale={isPolicyStale}
              currentRole={currentRole}
              language={language}
              onCloseMobile={() => setMobileMenuOpen(false)}
              companyName={companyName}
              ownerName={ownerName}
            />
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <Header
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          onRequestRoleSwitch={handleRequestRoleSwitch}
          onLogout={handleLogout}
          language={language}
          onLanguageChange={setLanguage}
          activePolicyVersion={activePolicyVersion}
          companyName={companyName}
          ownerName={ownerName}
          onOpenEditProfile={() => setIsProfileModalOpen(true)}
          onRunScenario={handleRunScenario}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenDemoGuide={(scenarioId) => {
            setDemoScenarioId(scenarioId || 1);
            setIsDemoModalOpen(true);
          }}
          onOpenWelcomeGuide={() => setIsWelcomeGuideOpen(true)}
          activeCompanyId={activeCompanyId}
          companies={companies}
          onCompanySwitch={handleCompanySwitch}
        />

        {/* Staleness Warning Banner */}
        <StalenessBanner
          isStale={isPolicyStale}
          daysAgo={policyStaleDays}
          onSyncClick={handleSyncPolicy}
          language={language}
        />

        {/* Dynamic Content Views - 6 Core Owner Functions */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'overview' && (
            <OverviewView
              onNavigateTab={setActiveTab}
              language={language}
              companyName={companyName}
              ownerName={ownerName}
              onOpenEditProfile={() => setIsProfileModalOpen(true)}
              pendingApprovalsCount={drafts.filter((d) => d.status !== 'approved').length}
              isPolicyStale={isPolicyStale}
              onOpenWelcomeGuide={() => setIsWelcomeGuideOpen(true)}
              financialImpact={financialImpact}
              ownerNotifications={ownerNotifications}
              onDismissNotification={async (id) => {
                await api.dismissOwnerNotification(id);
                setOwnerNotifications((prev) => prev.filter((n) => n.id !== id));
              }}
              onRecalculateFinancials={async () => {
                const res = await api.recalculateFinancialImpact(activeCompanyId);
                if (res.impact) setFinancialImpact(res.impact);
                showToast('success', 'Recalculation Complete', 'Active company financial impact updated.');
              }}
              activePolicyVersion={activePolicyVersion}
              drafts={drafts}
              activeCompanyId={activeCompanyId}
            />
          )}

          {(activeTab === 'invoices' || activeTab === 'invois') && (
            <InvoisReadyView
              currentRole={currentRole}
              onExplainRule={(rule) => setExplainedRule(rule)}
              onDraftCreatedOrUpdated={refreshAllData}
              language={language}
              onShowToast={showToast}
              companyName={companyName}
              ownerName={ownerName}
              onOpenEditProfile={() => setIsProfileModalOpen(true)}
              activeCompanyId={activeCompanyId}
            />
          )}

          {(activeTab === 'compliance' || activeTab === 'policies' || activeTab === 'policy' || activeTab === 'eligibility' || activeTab === 'radar') && (
            <ComplianceOpportunitiesView
              companies={companies}
              language={language}
              onShowToast={showToast}
              currentRole={currentRole}
              companyName={companyName}
              ownerName={ownerName}
              onOpenEditProfile={() => setIsProfileModalOpen(true)}
              activeCompanyId={activeCompanyId}
              initialRevenue={projectedRevenue}
              initialSubTab={activeTab === 'policy' || activeTab === 'policies' ? 'policies' : activeTab === 'radar' ? 'actions' : 'policies'}
              activePolicyVersion={activePolicyVersion}
              isPolicyStale={isPolicyStale}
              onPolicyUpdated={(newVer) => {
                setActivePolicyVersion(newVer);
                setIsPolicyStale(false);
                refreshAllData();
              }}
            />
          )}

          {(activeTab === 'business' || activeTab === 'settings') && (
            <MyBusinessView
              companies={companies}
              activeCompanyId={activeCompanyId}
              onCompanySwitch={handleCompanySwitch}
              onOpenEditProfile={() => setIsProfileModalOpen(true)}
              language={language}
              onShowToast={showToast}
              onRefreshData={refreshAllData}
              currentRole={currentRole}
            />
          )}
        </main>
      </div>

      {/* Role Switch Verification Modal */}
      {pendingRoleSwitch && (
        <RoleSwitchModal
          isOpen={pendingRoleSwitch !== null}
          onClose={() => setPendingRoleSwitch(null)}
          targetRole={pendingRoleSwitch}
          currentRole={currentRole}
          onConfirmSwitch={handleConfirmRoleSwitch}
          language={language}
        />
      )}

      {/* Rule Explainability Citation Modal */}
      {explainedRule && (
        <ExplainModal
          rule={explainedRule}
          onClose={() => setExplainedRule(null)}
        />
      )}

      {/* Edit Company & Owner Profile Modal */}
      {isProfileModalOpen && (
        <CompanyProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentCompanyName={companyName}
          currentOwnerName={ownerName}
          onSave={handleSaveCompanyProfile}
          language={language}
          activeCompanyId={activeCompanyId}
          onCompanySwitched={handleCompanySwitch}
          onCompaniesChanged={() => refreshAllData()}
        />
      )}

      {/* Interactive Multi-step Demo Scenario Runner */}
      {isDemoModalOpen && (
        <DemoScenarioModal
          isOpen={isDemoModalOpen}
          scenarioId={demoScenarioId}
          onClose={() => setIsDemoModalOpen(false)}
          onNavigateTab={setActiveTab}
          onRoleChange={handleRoleChange}
          onRefreshAllData={refreshAllData}
          companyName={companyName}
          ownerName={ownerName}
          language={language}
        />
      )}

      {/* 60-Second Onboarding Welcome Guide */}
      {isWelcomeGuideOpen && (
        <WelcomeGuideModal
          isOpen={isWelcomeGuideOpen}
          onClose={handleCloseWelcomeGuide}
          onNavigateTab={setActiveTab}
          language={language}
        />
      )}

      {/* Toast Notifications */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
