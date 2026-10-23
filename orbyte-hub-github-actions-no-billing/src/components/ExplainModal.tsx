import React from 'react';
import { X, BookOpen, ExternalLink, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { RuleResult } from '../types';

interface ExplainModalProps {
  rule: RuleResult | null;
  onClose: () => void;
}

export const ExplainModal: React.FC<ExplainModalProps> = ({ rule, onClose }) => {
  if (!rule) return null;

  const isBlocked = rule.status === 'BLOCKED' || rule.status === 'FAIL';
  const isReview = rule.status === 'REVIEW_REQUIRED' || rule.status === 'WARN' || rule.status === 'MISSING_DATA';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-base tracking-wide">
              Rule Explainability & Legal Citation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Rule Identifier</span>
              <div className="text-base font-mono font-bold text-slate-800">{rule.rule_id || rule.rule}</div>
            </div>
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                isBlocked
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : isReview
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {rule.status}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Deterministic Outcome Explanation
            </h4>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700 leading-relaxed font-sans">
              {rule.explanation}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Configured Demo Rule Reference
            </h4>
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3.5 space-y-2">
              <div className="font-semibold text-blue-900 text-xs">
                {rule.reference || 'Orbyte local demo rule (source not verified)'}
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                This result is produced by Orbyte's locally configured demo rules. The source labels and thresholds shown here have not been independently checked against current official guidance. This prototype does not verify TIN/BRN with LHDN and does not submit invoices to MyInvois.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Suggested next step:</strong> Review the source document and the configured demo rule result. Confirm current official requirements independently before making a compliance decision.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Close Citation
          </button>
        </div>
      </div>
    </div>
  );
};
