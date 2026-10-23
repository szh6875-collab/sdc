import React, { useState } from 'react';
import {
  Shield,
  Crown,
  UserCheck,
  Scale,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Building2,
  Globe,
  Sparkles,
} from 'lucide-react';
import { RoleType, LanguageType } from '../types';
import { DEMO_CREDENTIALS, setClientRole } from '../services/api';

interface RoleLoginGatewayProps {
  onLoginSuccess: (role: RoleType) => void;
  language: LanguageType;
  onLanguageChange: (lang: LanguageType) => void;
}

export const RoleLoginGateway: React.FC<RoleLoginGatewayProps> = ({
  onLoginSuccess,
  language,
  onLanguageChange,
}) => {
  const isBM = language === 'bm';
  const [selectedRole, setSelectedRole] = useState<RoleType>('owner');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const roles = [
    {
      id: 'owner' as RoleType,
      title: isBM ? 'Pemilik PKS / Pengarah' : 'SME Owner / Director',
      badge: isBM ? 'Kuasa Penuh' : 'Full Authority',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: Crown,
      iconBg: 'bg-amber-500/10 text-amber-600 border-amber-200',
      user: 'Ahmad Razak',
      desc: isBM
        ? 'Kuasa penuh meluluskan e-Invois, menandatangani rekod SHA-256, dan mengurus entiti syarikat.'
        : 'Full authority to authorize e-invoices, commit cryptographically chained SHA-256 records, and manage companies.',
      demoPassword: DEMO_CREDENTIALS.owner.password,
    },
    {
      id: 'clerk' as RoleType,
      title: isBM ? 'Staf / Kerani Kewangan' : 'Staff / Finance Clerk',
      badge: isBM ? 'Mod Paparan Sahaja' : 'Intake & View-Only',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
      icon: UserCheck,
      iconBg: 'bg-blue-500/10 text-blue-600 border-blue-200',
      user: 'Siti Aminah',
      desc: isBM
        ? 'Pengambilan fail invois, semakan data, dan paparan terlindung dengan nombor cukai TIN bertapis.'
        : 'Process incoming invoice files, review parsed data, and operate in safe view-only mode with masked TINs.',
      demoPassword: DEMO_CREDENTIALS.clerk.password,
    },
    {
      id: 'expert' as RoleType,
      title: isBM ? 'Penasihat / Pakar Cukai' : 'Tax Advisor / Consultant',
      badge: isBM ? 'Tadbir Urus Dasar' : 'Policy & Governance',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      icon: Scale,
      iconBg: 'bg-purple-500/10 text-purple-600 border-purple-200',
      user: 'Dr. Farhan Ismail',
      desc: isBM
        ? 'Akses kepada Pusat Dasar LHDN Belanjawan 2027, semakan Diff peraturan, dan pelan operasi.'
        : 'Access statutory policy schedule diffs, Budget 2027 LHDN guidelines, and compliance simulation test suite.',
      demoPassword: DEMO_CREDENTIALS.expert.password,
    },
  ];

  const handleRoleSelect = (roleId: RoleType) => {
    setSelectedRole(roleId);
    setPassword('');
    setErrorMsg(null);
  };

  const handleQuickFill = () => {
    setPassword(DEMO_CREDENTIALS[selectedRole].password);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg(isBM ? 'Sila masukkan kata laluan untuk peranan ini.' : 'Please enter the password for this role.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await setClientRole(selectedRole, password.trim());
      onLoginSuccess(selectedRole);
    } catch (err: any) {
      setErrorMsg(
        err.message?.includes('401') || err.message?.includes('credentials')
          ? (isBM
              ? `Kata laluan salah bagi peranan "${DEMO_CREDENTIALS[selectedRole].roleLabel}". Sila cuba lagi.`
              : `Incorrect password for role "${DEMO_CREDENTIALS[selectedRole].roleLabel}". Please try again.`)
          : (err.message || 'Authentication error')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRoleConfig = roles.find((r) => r.id === selectedRole) || roles[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background radial gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Language Toggle */}
      <header className="h-16 px-6 sm:px-10 flex items-center justify-between border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center font-bold shadow-md">
            <Shield className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-white leading-tight">
              ORBYTE HUB
            </div>
            <div className="text-[11px] font-semibold text-slate-400">
              Malaysian SME e-Invoice &amp; Tax Compliance
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-semibold">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              language === 'en' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('bm')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              language === 'bm' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bahasa Melayu
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-sky-400 text-xs font-bold tracking-wide uppercase">
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isBM ? 'Akses Terkawal Berasaskan Peranan (RBAC)' : 'Role-Based Access Control (RBAC)'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isBM ? 'Pilih Peranan & Masukkan Kata Laluan' : 'Select Your Role & Enter Password'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              {isBM
                ? 'Sila pilih sama ada anda Pemilik (Owner), Staf (Staff), atau Penasihat Cukai (Tax Advisor) sebelum menggunakan platform.'
                : 'Select whether you are the SME Owner, Staff, or Tax Advisor and enter your password to enter the hub.'}
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {roles.map((r) => {
              const Icon = r.icon;
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleSelect(r.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${r.iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700" />
                      )}
                    </div>
                    <div className="font-bold text-sm text-white leading-snug">
                      {r.title}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {r.user}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {r.desc}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${r.badgeColor}`}>
                      {r.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Password Entry Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    {isBM ? `Kata Laluan untuk ${activeRoleConfig.title}` : `Password for ${activeRoleConfig.title}`}
                  </span>
                </label>

                {/* Convenient 1-Click Demo Fill */}
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                  title="Click to fill demo password"
                >
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>
                    {isBM ? `Isi Kata Laluan: "${activeRoleConfig.demoPassword}"` : `Fill Demo Password: "${activeRoleConfig.demoPassword}"`}
                  </span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder={isBM ? `Masukkan kata laluan ${activeRoleConfig.title}...` : `Enter password for ${activeRoleConfig.title}...`}
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isBM ? 'Masuk ke Platform Orbyte Hub' : 'Enter Orbyte Hub Platform'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Guide */}
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-500 font-semibold">
              {isBM ? 'Kredensial Demo Setempat:' : 'Local Demo Credentials:'}
            </span>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              <span className="text-slate-300">
                <strong className="text-amber-400">owner:</strong> owner123
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">
                <strong className="text-blue-400">staff:</strong> clerk123
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">
                <strong className="text-purple-400">tax advisor:</strong> expert123
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 px-6 flex items-center justify-between border-t border-slate-800/80 text-[11px] text-slate-500 relative z-10">
        <div>
          Orbyte Hub — SME Policy &amp; e-Invoice Compliance Platform
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <span>Local demo environment</span>
        </div>
      </footer>
    </div>
  );
};
