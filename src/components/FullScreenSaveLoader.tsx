import React, { useEffect, useState } from 'react';
import { Cloud, CloudUpload, Loader2, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export interface FullScreenSaveLoaderProps {
  isVisible: boolean;
  title?: string;
  subtitle?: string;
  tableName?: string;
  action?: string;
  onForceDismiss?: () => void;
}

export const FullScreenSaveLoader: React.FC<FullScreenSaveLoaderProps> = ({
  isVisible,
  title,
  subtitle,
  tableName,
  action,
  onForceDismiss
}) => {
  const [showFailsafe, setShowFailsafe] = useState(false);

  // Failsafe timer: If saving takes more than 10 seconds, show force dismiss option
  useEffect(() => {
    let timer: any;
    if (isVisible) {
      setShowFailsafe(false);
      timer = setTimeout(() => {
        setShowFailsafe(true);
      }, 10000);
    } else {
      setShowFailsafe(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isVisible]);

  // Block ESC key or form interactions when loader is active
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent ESC or any shortcut from dismissing underlying modals or triggering actions while saving
      if (e.key === 'Escape' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  // Derive dynamic title & subtitle based on context if not explicitly provided
  let displayTitle = title || 'Saving & Syncing to Cloud...';
  let displaySubtitle = subtitle || 'Please wait a moment while your changes are securely saved.';

  if (!title && tableName) {
    const formattedTable = tableName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim();

    if (tableName === 'pos_transactions' || tableName === 'posTransactions') {
      displayTitle = action === 'ADD' ? 'Recording POS Sale...' : 'Updating Transaction & Repayments...';
      displaySubtitle = 'Syncing sales ledger, stock deductions, and cloud records.';
    } else if (tableName === 'products') {
      displayTitle = action === 'ADD' ? 'Adding Genuine Product...' : 'Updating Product Catalog...';
      displaySubtitle = 'Processing specs, pricing, stock levels, and cloud storage.';
    } else if (tableName === 'categories') {
      displayTitle = 'Saving Category Details...';
      displaySubtitle = 'Synchronizing store categories & navigation.';
    } else if (tableName === 'store_settings' || tableName === 'settings') {
      displayTitle = 'Publishing Store Settings...';
      displaySubtitle = 'Broadcasting live configurations globally to all visitors.';
    } else if (tableName === 'orders') {
      displayTitle = 'Updating Customer Order...';
      displaySubtitle = 'Saving delivery status, payment records, and timeline.';
    } else {
      displayTitle = `Saving ${formattedTable}...`;
      displaySubtitle = 'Synchronizing changes directly with Cloud Database.';
    }
  }

  return (
    <div
      id="full-screen-save-loader"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      className="fixed inset-0 z-[999999] flex flex-col items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-wait select-none transition-all duration-300 animate-in fade-in"
      onClick={(e) => {
        // Stop any accidental clicks from reaching background elements
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* High-End Glassmorphism Card */}
      <div 
        id="full-screen-save-loader-card"
        className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-3xl p-7 sm:p-8 text-center shadow-2xl shadow-blue-950/50 backdrop-blur-2xl flex flex-col items-center gap-5 animate-in zoom-in-95 duration-200"
      >
        {/* Ambient Glow Background Accent */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Central Animated Cloud & Spinner Visual */}
        <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
          {/* Outer Pulsing Aura */}
          <div className="absolute inset-0 rounded-full bg-blue-500/15 animate-ping opacity-60 duration-1000" />
          
          {/* Outer Glowing Border Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-pulse" />

          {/* Rapid Circular Spinner */}
          <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin" />

          {/* Central Icon Container */}
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
            <CloudUpload className="w-7 h-7 text-blue-400 animate-bounce duration-1000" />
          </div>
        </div>

        {/* Text Details */}
        <div className="flex flex-col items-center gap-2 max-w-xs">
          <h3 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
            <span>{displayTitle}</span>
          </h3>
          <p className="text-xs sm:text-sm font-medium text-slate-400 leading-relaxed">
            {displaySubtitle}
          </p>
        </div>

        {/* Animated Progress Shimmer Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden relative border border-slate-700/50">
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-500 rounded-full animate-[shimmer_1.5s_infinite_linear] [background-size:200%_100%]" 
               style={{
                 animation: 'moveBar 1.6s infinite ease-in-out'
               }}
          />
        </div>

        {/* Status Badges */}
        <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-400 pt-1">
          <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Live Cloud Sync</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Encrypted Data</span>
          </div>
        </div>

        {/* Anti-Interrupt Notice */}
        <p className="text-[10px] text-slate-500 font-medium tracking-wide">
          Please do not close or refresh this tab while saving.
        </p>

        {/* Failsafe Button (Only appears if operation takes longer than 10s) */}
        {showFailsafe && (
          <div className="pt-2 flex flex-col items-center gap-2 w-full animate-in fade-in duration-300">
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Network taking longer than usual</span>
            </div>
            <button
              id="full-screen-save-loader-dismiss-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onForceDismiss) {
                  onForceDismiss();
                } else {
                  window.dispatchEvent(new CustomEvent('supabase-write-end', { detail: { force: true } }));
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-slate-600 transition-colors shadow-lg cursor-pointer"
            >
              Force Dismiss & Continue
            </button>
          </div>
        )}
      </div>

      {/* Global CSS animation for smooth moving bar */}
      <style>{`
        @keyframes moveBar {
          0% { left: 0%; width: 15%; }
          50% { left: 40%; width: 45%; }
          100% { left: 100%; width: 15%; }
        }
      `}</style>
    </div>
  );
};
