import React, { useState, useEffect } from 'react';
import { Cookie, Check, ShieldCheck, Settings2, X } from 'lucide-react';
import { getCookieConsentStatus, setCookieConsentStatus, CookieConsentLevel } from '../lib/visitorTrackingService';

export const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  useEffect(() => {
    // Check if user has already made a choice
    const status = getCookieConsentStatus();
    if (!status) {
      // Small delay for smooth entry
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const handleAcceptAll = () => {
    setCookieConsentStatus('all');
    setVisible(false);
  };

  const handleAcceptEssential = () => {
    setCookieConsentStatus('essential');
    setVisible(false);
  };

  const handleSaveCustom = () => {
    setCookieConsentStatus(analyticsEnabled ? 'all' : 'essential');
    setVisible(false);
  };

  return (
    <div 
      id="buydil-cookie-banner" 
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-4 sm:p-5">
        {!showSettings ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                <Cookie className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Cookie &amp; Privacy Preferences</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  We use cookies and anonymous local storage to remember your cart, keep your session active, and optimize store loading speed. No personal tracking or third-party ads.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                id="btn-cookie-accept-all"
                onClick={handleAcceptAll}
                className="flex-1 min-w-[120px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Accept All</span>
              </button>

              <button
                type="button"
                id="btn-cookie-essential"
                onClick={handleAcceptEssential}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all border border-slate-700 active:scale-95 cursor-pointer"
              >
                Essential Only
              </button>

              <button
                type="button"
                id="btn-cookie-customize"
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Customize settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-white">Customize Cookie Choices</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {/* Essential Cookies */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Strictly Necessary</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Always Active</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Cart, currency preference, secure checkout authentication.</div>
                </div>
              </div>

              {/* Performance & Analytics */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="pr-2">
                  <div className="font-bold text-white">Store Analytics &amp; Performance</div>
                  <div className="text-[11px] text-slate-400">Anonymous visitor counts, heatmap load balancing, search suggestions.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
