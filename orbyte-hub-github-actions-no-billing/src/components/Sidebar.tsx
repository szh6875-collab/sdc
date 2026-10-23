import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Receipt,
  TrendingUp,
  X,
  Sparkles,
  Shield,
} from 'lucide-react';
import { RoleType, LanguageType } from '../types';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  pendingApprovalsCount?: number;
  isPolicyStale?: boolean;
  currentRole: RoleType;
  language: LanguageType;
  onCloseMobile?: () => void;
  companyName?: string;
  ownerName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingApprovalsCount = 0,
  isPolicyStale = false,
  currentRole,
  language,
  onCloseMobile,
  companyName = 'ABC Trading Sdn. Bhd.',
  ownerName = 'Ahmad Razak',
}) => {
  const isBM = language === 'bm';

  // Exactly four main sections: Home, e-Invoice, Policies & Benefits, Business Settings
  const navItems = [
    {
      id: 'overview',
      label: isBM ? 'Utama' : 'Home',
      subtext: isBM ? 'Papan pemuka eksekutif & metrik' : 'Executive pulse & metrics',
      icon: LayoutDashboard,
    },
    {
      id: 'invoices',
      label: isBM ? 'e-Invois' : 'e-Invoice',
      subtext: isBM ? 'Pengambilan fail & pengesahan' : 'InvoisReady & file intake',
      icon: Receipt,
      badge: pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined,
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300',
    },
    {
      id: 'compliance',
      label: isBM ? 'Dasar & Faedah' : 'Policies & Benefits',
      subtext: isBM ? 'Pelepasan cukai, geran & faedah' : 'Tax relief, grants & benefits',
      icon: TrendingUp,
      badge: isPolicyStale ? (isBM ? 'Semak sumber' : 'Verify source') : undefined,
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse',
    },
    {
      id: 'business',
      label: isBM ? 'Tetapan Perniagaan' : 'Business Settings',
      subtext: isBM ? 'Profil syarikat & entiti' : 'Company profile & entities',
      icon: Building2,
    },
  ];

  const renderNavButton = (item: (typeof navItems)[0]) => {
    const Icon = item.icon;
    const isActive =
      (item.id === 'overview' && (activeTab === 'overview' || activeTab === 'home')) ||
      (item.id === 'invoices' && (activeTab === 'invoices' || activeTab === 'invois' || activeTab === 'decisions' || activeTab === 'approvals')) ||
      (item.id === 'compliance' && (activeTab === 'compliance' || activeTab === 'policies' || activeTab === 'policy' || activeTab === 'eligibility' || activeTab === 'radar')) ||
      (item.id === 'business' && (activeTab === 'business' || activeTab === 'settings'));

    return (
      <button
        key={item.id}
        onClick={() => {
          onTabChange(item.id);
          if (onCloseMobile) onCloseMobile();
        }}
        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs transition-all text-left cursor-pointer group ${
          isActive
            ? 'bg-slate-900 text-white shadow-xs'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-700'
            }`}
          />
          <div className="min-w-0 flex-1">
            <div
              className={`font-semibold text-xs leading-tight truncate ${
                isActive ? 'text-white font-bold' : 'text-slate-800'
              }`}
            >
              {item.label}
            </div>
            {item.subtext && (
              <div
                className={`text-[11px] truncate leading-tight mt-0.5 ${
                  isActive ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {item.subtext}
              </div>
            )}
          </div>
        </div>

        {item.badge !== undefined && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ml-1.5 ${
              item.badgeColor || 'bg-slate-100 text-slate-700'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-64 sm:w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-full select-none">
      <div className="flex-1 overflow-y-auto">
        {/* Brand Section */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">
                ORBYTE HUB
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                Business &amp; Compliance Hub
              </div>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation List: Exactly four main sections */}
        <nav className="p-3 space-y-1.5 mt-2">
          <div className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isBM ? 'Menu Utama' : 'Main Navigation'}
          </div>
          {navItems.map(renderNavButton)}
        </nav>
      </div>

      {/* Governed SME Footer Card */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-600 space-y-2.5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isBM ? 'Syarikat Semasa' : 'Active Company'}
          </div>
          <div className="font-bold text-slate-900 text-xs truncate" title={companyName}>
            {companyName}
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            {isBM ? 'Pemilik Sah:' : 'Owner:'} <strong className="text-slate-800">{ownerName}</strong>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-slate-500 text-[11px]">
          <div className="flex items-center gap-1 font-semibold text-slate-600">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>Fiscal Year 2026/27</span>
          </div>
          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
            ACTIVE
          </span>
        </div>
      </div>
    </aside>
  );
};
