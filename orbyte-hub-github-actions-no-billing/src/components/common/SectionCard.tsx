import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode;
  headerBadge?: React.ReactNode;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  footer?: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  icon,
  headerBadge,
  badge,
  headerAction,
  children,
  className = '',
  noPadding = false,
  footer,
}) => {
  const effectiveBadge = badge ?? headerBadge;
  const hasHeader = Boolean(title || effectiveBadge || headerAction);

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="w-4 h-4" />;
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden ${className}`}>
      {hasHeader && (
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                {renderIcon()}
              </div>
            )}
            <div>
              {title && (
                <h2 className="text-base font-semibold text-slate-900 leading-tight">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {effectiveBadge}
            {headerAction}
          </div>
        </div>
      )}

      <div className={noPadding ? '' : 'p-5 sm:p-6'}>
        {children}
      </div>

      {footer && (
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-600">
          {footer}
        </div>
      )}
    </div>
  );
};
