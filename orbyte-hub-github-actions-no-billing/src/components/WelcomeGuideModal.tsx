import React from 'react';
import { X, ArrowRight, FileCheck, ShieldCheck, CheckCircle2, Sparkles, Building2 } from 'lucide-react';
import { LanguageType } from '../types';

interface WelcomeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
  language: LanguageType;
}

export const WelcomeGuideModal: React.FC<WelcomeGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  language,
}) => {
  if (!isOpen) return null;
  const isBM = language === 'bm';

  const steps = [
    {
      num: '1',
      title: isBM ? 'Pengambilan & Semakan Invois' : 'Upload & Verify Invoices',
      desc: isBM
        ? 'Muat naik fail invois (PDF/Imej) atau tampal pesanan WhatsApp. Sistem menyemak nombor cukai (TIN) dan had ambang secara automatik.'
        : 'Upload an invoice (PDF, image, XML/JSON) or paste WhatsApp order text. The system automatically verifies amounts and buyer tax IDs.',
      actionLabel: isBM ? 'Buka Invois' : 'Go to Invoices',
      tabId: 'invoices',
      icon: FileCheck,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      num: '2',
      title: isBM ? 'Pelepasan Cukai & Peluang PKS' : 'Tax Relief & Grants Pre-check',
      desc: isBM
        ? 'Semak padanan awal dasar PKS, pengumuman subsidi premium MediAsas tahun pertama (RM200 seorang, maksimum 50 pekerja) dan rujukan ambang perolehan e-Invois RM3 juta. Sahkan semua syarat melalui sumber rasmi.'
        : 'Review preliminary SME policy matches, the announced MediAsas first-year premium subsidy (RM200 per employee, capped at 50 employees per company), and the RM3M published e-Invoice turnover threshold reference. Verify all conditions against official sources.',
      actionLabel: isBM ? 'Peluang Perniagaan' : 'Explore Opportunities',
      tabId: 'compliance',
      icon: Sparkles,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      num: '3',
      title: isBM ? 'Tetapan Perniagaan & Profil Entiti' : 'Business Settings & Entities',
      desc: isBM
        ? 'Urus profil syarikat anda, nombor pengenalan cukai (TIN), perolehan tahunan, dan tukar ruang kerja antara entiti perniagaan.'
        : 'Manage your company profile, tax identifiers (TIN), annual turnover, and switch workspaces across business entities.',
      actionLabel: isBM ? 'Tetapan Perniagaan' : 'Business Settings',
      tabId: 'business',
      icon: ShieldCheck,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              {isBM ? 'Panduan Mula Pantas 60 Saat' : '60-Second Quick Start Guide'}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {isBM ? 'Selamat Datang ke Orbyte Hub' : 'Welcome to Orbyte Hub'}
            </h2>
            <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
              {isBM
                ? 'Platform bantuan e-Invois dan pematuhan dasar untuk PKS Malaysia. Fahami aliran kerja penuh dalam 3 langkah:'
                : 'Malaysian SME e-Invoice and policy compliance workflow. Complete the loop in three simple steps:'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Steps */}
        <div className="p-6 space-y-4">
          <div className="grid gap-3">
            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.num}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold border text-sm ${st.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-900">
                        {st.title}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-md">
                        {st.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onNavigateTab(st.tabId);
                      onClose();
                    }}
                    className="h-8 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 self-end sm:self-center shrink-0 cursor-pointer shadow-2xs"
                  >
                    <span>{st.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-xs text-slate-500 flex items-center gap-2">
            <span className="font-semibold text-slate-700">💡 Demo Note:</span>
            <span>
              {isBM
                ? 'Gunakan butang "Pusat Demo" di atas untuk mencuba senario demonstrasi 3-minit bila-bila masa.'
                : 'You can test 4 pre-built 3-minute pitch scenarios anytime from the Demo & Walkthrough menu in the top bar.'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {isBM ? 'Panduan ini boleh dibuka semula bila-bila masa.' : 'Accessible anytime from the top bar help icon.'}
          </span>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {isBM ? 'Faham, Mari Mulakan' : 'Got it, let’s begin'}
          </button>
        </div>
      </div>
    </div>
  );
};
