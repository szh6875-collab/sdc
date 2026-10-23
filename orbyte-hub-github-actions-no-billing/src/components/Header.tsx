import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Edit3,
  Globe,
  Compass,
  Play,
  ChevronDown,
  HelpCircle,
  Menu,
  Shield,
  User,
  Sliders,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  Check,
  LogOut,
  Lock,
} from 'lucide-react';
import { RoleType, LanguageType, CompanyEntity } from '../types';

interface HeaderProps {
  currentRole: RoleType;
  onRoleChange: (role: RoleType) => void;
  onRequestRoleSwitch?: (role: RoleType) => void;
  onLogout?: () => void;
  language: LanguageType;
  onLanguageChange: (lang: LanguageType) => void;
  activePolicyVersion: string;
  companyName: string;
  ownerName: string;
  onOpenEditProfile: () => void;
  onRunScenario: (scenarioId: number) => void;
  onOpenMobileMenu?: () => void;
  onOpenDemoGuide?: (scenarioId?: number) => void;
  onOpenWelcomeGuide?: () => void;
  activeCompanyId?: string;
  companies?: CompanyEntity[];
  onCompanySwitch?: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  onRequestRoleSwitch,
  onLogout,
  language,
  onLanguageChange,
  activePolicyVersion,
  companyName,
  ownerName,
  onOpenEditProfile,
  onRunScenario,
  onOpenMobileMenu,
  onOpenDemoGuide,
  onOpenWelcomeGuide,
  activeCompanyId = 'COMP-A',
  companies = [],
  onCompanySwitch,
}) => {
  const isBM = language === 'bm';
  const [isDemoDropdownOpen, setIsDemoDropdownOpen] = useState(false);
  const [isPolicyPopupOpen, setIsPolicyPopupOpen] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const policyRef = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDemoDropdownOpen(false);
      }
      if (policyRef.current && !policyRef.current.contains(e.target as Node)) {
        setIsPolicyPopupOpen(false);
      }
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scenarios = [
    {
      id: 1,
      title: isBM ? '1. Semakan & Pengambilan Invois' : '1. Invoices & e-Invoice Intake',
      desc: isBM ? 'Muat naik atau semak invois dengan peraturan LHDN' : 'Process incoming invoice & check compliance readiness',
      color: 'text-blue-600',
    },
    {
      id: 2,
      title: isBM ? '2. Pelepasan Cukai & Geran PKS' : '2. Tax Relief & Grants Analysis',
      desc: isBM ? 'Semak pengumuman dasar PKS, syarat kelayakan dan tindakan seterusnya' : 'Review SME policy announcements, eligibility conditions & next steps',
      color: 'text-emerald-600',
    },
    {
      id: 3,
      title: isBM ? '3. Pengesahan & Kelulusan e-Invois' : '3. e-Invoice Sign-Off & Validation',
      desc: isBM ? 'Kelulusan rasmi invois oleh pengarah syarikat' : 'Review queue and authorize invoices for issuance',
      color: 'text-indigo-600',
    },
    {
      id: 4,
      title: isBM ? '4. Tetapan Perniagaan & Entiti' : '4. Business Settings & Entities',
      desc: isBM ? 'Urus profil syarikat, entiti, dan nombor cukai TIN' : 'Manage company profiles, entities, and tax identifiers',
      color: 'text-slate-600',
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile trigger & Clickable Company Badge */}
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none cursor-pointer"
              aria-label="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Interactive Company Switcher & Profile Dropdown */}
          <div className="relative" ref={companyRef}>
            <button
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              className="group flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-left cursor-pointer min-w-0"
              title={isBM ? 'Klik untuk tukar atau urus syarikat' : 'Click to switch or manage companies'}
            >
              <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 max-w-[150px] sm:max-w-[200px]">
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-900 flex items-center gap-1.5 truncate">
                  <span className="truncate">{companyName}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {isBM ? 'Pemilik:' : 'Owner:'} <strong className="text-slate-700">{ownerName}</strong>
                </div>
              </div>
            </button>

            {isCompanyDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-2 text-xs z-50 animate-in fade-in duration-150">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    {isBM ? 'Tukar Entiti Perniagaan' : 'Switch Business Entity'}
                  </span>
                  <button
                    onClick={() => {
                      setIsCompanyDropdownOpen(false);
                      onOpenEditProfile();
                    }}
                    className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isBM ? 'Urus Semua' : 'Manage All'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                  {companies.filter(c => c.status === 'active').map((c) => {
                    const isCurrent = c.id === activeCompanyId || c.name === companyName;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setIsCompanyDropdownOpen(false);
                          if (onCompanySwitch) onCompanySwitch(c.id);
                        }}
                        className={`w-full text-left p-2 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isCurrent ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate flex items-center gap-1.5">
                            <span className="truncate">{c.name}</span>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {c.ssm_registration || c.uen_or_tin} • {c.salesDisplay}
                          </div>
                        </div>
                        {c.pendingInvoicesCount && c.pendingInvoicesCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] shrink-0">
                            {c.pendingInvoicesCount}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 px-1">
                  <button
                    onClick={() => {
                      setIsCompanyDropdownOpen(false);
                      onOpenEditProfile();
                    }}
                    className="w-full py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isBM ? '+ Tambah / Daftar Syarikat' : '+ Add / Register Company'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls (Demo Menu, Role Switcher, Language Toggle, Help) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Unified Demo & Pitch Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDemoDropdownOpen(!isDemoDropdownOpen)}
              className="h-9 px-3 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              aria-expanded={isDemoDropdownOpen}
            >
              <Compass className="w-4 h-4 text-sky-700" />
              <span className="hidden sm:inline">{isBM ? 'Pusat Demo' : 'Demo & Pitch'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-sky-600 transition-transform ${isDemoDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDemoDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 text-xs animate-in fade-in duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900 text-sm">
                    {isBM ? 'Demonstrasi 3 Minit' : '3-Minute Live Pitch Demos'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {isBM ? 'Pilih senario untuk jalankan aliran penuh' : 'Select a pre-built flow to test live logic'}
                  </div>
                </div>

                <div className="py-1 space-y-0.5">
                  {scenarios.map((sc) => (
                    <button
                      key={sc.id}
                      onClick={() => {
                        onRunScenario(sc.id);
                        setIsDemoDropdownOpen(false);
                      }}
                      className="w-full p-2.5 rounded-lg text-left hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer group"
                    >
                      <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 mt-0.5 shrink-0 fill-current" />
                      <div>
                        <div className="font-semibold text-slate-900 leading-tight">
                          {sc.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          {sc.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {onOpenDemoGuide && (
                  <div className="pt-1.5 mt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        onOpenDemoGuide(1);
                        setIsDemoDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-900 font-semibold flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-sky-700" />
                        {isBM ? 'Panduan Langkah demi Langkah' : 'Interactive Walkthrough Guide'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Role Switcher with explicit human explanations */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium hidden lg:inline flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Role:</span>
            </span>
            <select
              value={currentRole}
              onChange={(e) => {
                const nextRole = e.target.value as RoleType;
                if (nextRole !== currentRole) {
                  if (onRequestRoleSwitch) {
                    onRequestRoleSwitch(nextRole);
                  } else {
                    onRoleChange(nextRole);
                  }
                }
              }}
              className="h-9 py-1 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs cursor-pointer shadow-2xs"
              title="Click to switch role (requires password)"
            >
              <option value="owner">👑 Owner (SME Owner / Director)</option>
              <option value="clerk">👤 Staff (Finance Clerk / Staff)</option>
              <option value="expert">⚖️ Tax Advisor (Tax Consultant)</option>
            </select>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => onLanguageChange('en')}
              className={`h-7 px-2.5 rounded-md transition-colors cursor-pointer ${
                language === 'en' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageChange('bm')}
              className={`h-7 px-2.5 rounded-md transition-colors cursor-pointer ${
                language === 'bm' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              BM
            </button>
          </div>

          {/* Lock / Switch Account (Logout to initial role login) */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="h-9 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs text-xs font-semibold"
              title={isBM ? 'Kunci & Tukar Pengguna (Perlu Kata Laluan)' : 'Lock & Switch Account (Requires Password)'}
              aria-label="Logout or switch account"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{isBM ? 'Tukar Akaun' : 'Lock/Logout'}</span>
            </button>
          )}

          {/* 60s Onboarding Quick Help (?) Button */}
          {onOpenWelcomeGuide && (
            <button
              onClick={onOpenWelcomeGuide}
              className="w-9 h-9 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              title={isBM ? 'Buka panduan pantas 60 saat' : 'Open 60-second quick guide'}
              aria-label="Open Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
