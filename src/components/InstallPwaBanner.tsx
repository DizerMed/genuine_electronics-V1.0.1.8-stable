import React, { useState, useEffect, useRef } from 'react';
import { Download, Smartphone, X, Share, PlusSquare, MoreVertical, Monitor, RefreshCw, Copy, Check, CheckCircle, Sparkles } from 'lucide-react';
import { BRAND_LOGO_URL } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { safeLocalStorage } from '../utils/storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPwaBannerProps {
  theme?: 'dark' | 'light';
}

export const InstallPwaBanner: React.FC<InstallPwaBannerProps> = ({ theme = 'light' }) => {
  const isDark = theme === 'dark';
  const { language } = useLanguage();
  const isSw = language === 'sw';

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const [activeDeviceTab, setActiveDeviceTab] = useState<'ios' | 'android' | 'desktop'>('ios');
  const [copiedLink, setCopiedLink] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'updated'>('idle');
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkSwUpdates = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    setUpdateStatus('checking');

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        reg.onupdatefound = () => {
          setUpdateStatus('checking');
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateStatus('available');
              } else if (installingWorker.state === 'activated') {
                setUpdateStatus('updated');
                setTimeout(() => setUpdateStatus('idle'), 6000);
              }
            };
          }
        };

        if (reg.waiting) {
          setUpdateStatus('available');
        } else {
          await reg.update().catch(() => {});
        }
      }
    } catch (err) {
      console.warn('SW update check failed:', err);
    }

    const now = new Date();
    setLastCheckTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    setTimeout(() => {
      setUpdateStatus(prev => (prev === 'checking' ? 'idle' : prev));
    }, 3500);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Automatically trigger update check when SW registers or component mounts
      checkSwUpdates();

      const handleControllerChange = () => {
        setUpdateStatus('updated');
        setTimeout(() => setUpdateStatus('idle'), 6000);
      };

      const handleGlobalCheck = () => {
        checkSwUpdates();
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      window.addEventListener('check-pwa-update', handleGlobalCheck);

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        window.removeEventListener('check-pwa-update', handleGlobalCheck);
      };
    }
  }, []);

  useEffect(() => {
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(checkStandalone);

    if (checkStandalone) {
      setIsInstalled(true);
      setShowToast(false);
    } else {
      // If user dismissed recent toast in this session, don't auto-popup banner every page change
      const dismissedTime = safeLocalStorage.getItem('ge_pwa_dismissed_until');
      const isDismissedRecently = dismissedTime && Date.now() < Number(dismissedTime);
      
      if (!isDismissedRecently) {
        setShowToast(true);
      }
    }

    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setActiveDeviceTab('ios');
    } else if (/Android/i.test(ua)) {
      setActiveDeviceTab('android');
    } else {
      setActiveDeviceTab('desktop');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstalled(false);
      safeLocalStorage.removeItem('ge_pwa_installed');
      window.dispatchEvent(new CustomEvent('pwa-installed-changed'));
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowToast(false);
      setShowManualModal(false);
      safeLocalStorage.setItem('ge_pwa_installed', 'true');
      window.dispatchEvent(new CustomEvent('pwa-installed-changed'));
    };

    const handleGlobalOpenModal = () => {
      setShowManualModal(true);
      setShowToast(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('open-pwa-install', handleGlobalOpenModal);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-pwa-install', handleGlobalOpenModal);
    };
  }, []);

  useEffect(() => {
    if (!showToast || isHovered) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const durationMs = 60000;
    const intervalMs = 100;
    const decrement = (intervalMs / durationMs) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev <= decrement) {
          clearInterval(progressIntervalRef.current!);
          setShowToast(false);
          return 0;
        }
        return prev - decrement;
      });
    }, intervalMs);

    timerRef.current = setTimeout(() => {
      setShowToast(false);
    }, durationMs);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showToast, isInstalled, isHovered]);

  const dismissToast = () => {
    setShowToast(false);
    // Suppress auto toast for 4 hours
    safeLocalStorage.setItem('ge_pwa_dismissed_until', String(Date.now() + 4 * 60 * 60 * 1000));
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setShowToast(false);
          safeLocalStorage.setItem('ge_pwa_installed', 'true');
        } else {
          setShowManualModal(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Native install prompt failed, switching to manual guide UI:', err);
        setShowManualModal(true);
      }
    } else {
      setShowManualModal(true);
    }
  };

  const handleCopyAppUrl = () => {
    try {
      navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPwa = async () => {
    safeLocalStorage.removeItem('ge_pwa_installed');
    safeLocalStorage.removeItem('ge_pwa_dismissed_until');
    setIsInstalled(false);
    window.dispatchEvent(new CustomEvent('pwa-installed-changed'));
    
    if (deferredPrompt) {
      // Trigger prompt immediately to preserve the required user gesture
      handleInstallClick();
      return;
    }

    // Otherwise, we need a clean slate to force the browser to re-evaluate on next reload
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
        
        // Also clear caches to force a fresh state
        const cacheKeys = await caches.keys();
        for (let key of cacheKeys) {
          await caches.delete(key);
        }
      } catch (err) {
        console.warn('Failed to unregister SW or clear caches during PWA reset:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleReloadApp = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  if (isStandalone) return null;

  return (
    <>
      {showToast && (
        <div 
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className={`relative overflow-hidden rounded-2xl shadow-2xl border p-3.5 sm:p-4 transition-all ${
            isDark ? 'bg-slate-900 border-slate-700/80 shadow-black/50 text-white' : 'bg-white border-slate-200 shadow-slate-200/50 text-slate-900'
          }`}>
            <div className={`absolute top-0 left-0 right-0 h-1 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div 
                className="h-full bg-blue-600 transition-all duration-100 ease-linear rounded-r-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                <img 
                  src="/icon-192.png" 
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = BRAND_LOGO_URL;
                  }}
                  alt="Genuine Electronics App Icon" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-sm tracking-tight truncate">
                    Genuine Electronics
                  </h4>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                    isDark ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-100 text-blue-700'
                  }`}>
                    App
                  </span>
                </div>
                <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isSw ? 'Weka App / Shortcut kwa ununuzi wa haraka bila mtandao' : 'Install App / Shortcut for fast & offline shopping'}
                </p>

                {/* Service Worker Update Indicator Pill */}
                {updateStatus === 'checking' && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
                    <span>{isSw ? 'Inakagua sasisho...' : 'Checking for updates...'}</span>
                  </div>
                )}
                {updateStatus === 'available' && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{isSw ? 'Sasisho jipya linapatikana!' : 'New version available!'}</span>
                    <button onClick={handleReloadApp} className="ml-1 underline font-black hover:text-amber-700 dark:hover:text-amber-300">
                      {isSw ? 'Sasisha' : 'Reload'}
                    </button>
                  </div>
                )}
                {updateStatus === 'updated' && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>{isSw ? 'Toleo la hivi karibuni' : 'App up to date'}</span>
                  </div>
                )}
              </div>

              <button
                onClick={dismissToast}
                className={`p-1 rounded-lg transition-colors shrink-0 ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={isSw ? 'Funga' : 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 justify-end">
              <button
                onClick={dismissToast}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {isSw ? 'Baadaye' : 'Not Now'}
              </button>
              <button
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30 active:scale-95 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isSw ? 'Pakua App' : 'Install App'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showManualModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`relative w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white shadow-black/50' : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
          }`}>
            
            <div className={`p-5 sm:p-6 border-b flex items-start justify-between gap-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700/80 p-1.5 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                  <img 
                    src="/icon-192.png" 
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = BRAND_LOGO_URL;
                    }}
                    alt="Genuine Electronics App Icon" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    {isSw ? 'Weka Genuine App / Shortcut' : 'Install Genuine App / Shortcut'}
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isSw ? 'Weka Genuine Electronics kwenye Home Screen ya simu au kompyuta yako' : 'Add Genuine Electronics icon directly to your phone or PC Home Screen'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className={`p-1.5 rounded-xl transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {/* Service Worker Update Indicator Bar */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all ${
                updateStatus === 'checking'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
                  : updateStatus === 'available'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                  : updateStatus === 'updated'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                  : isDark ? 'bg-slate-800/50 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  {updateStatus === 'checking' ? (
                    <RefreshCw className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                  ) : updateStatus === 'available' ? (
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : updateStatus === 'updated' ? (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold truncate">
                      {updateStatus === 'checking'
                        ? (isSw ? 'Inakagua sasisho za App...' : 'Checking for updates...')
                        : updateStatus === 'available'
                        ? (isSw ? 'Sasisho jipya la PWA linapatikana!' : 'New PWA version available!')
                        : updateStatus === 'updated'
                        ? (isSw ? 'App imesasishwa kikamilifu!' : 'App updated to latest version!')
                        : (isSw ? 'Toleo jipya limewashwa (PWA active)' : 'Latest version active (PWA online)')}
                    </p>
                    {lastCheckTime && (
                      <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {isSw ? `Ilaguliwa: ${lastCheckTime}` : `Checked: ${lastCheckTime}`}
                      </p>
                    )}
                  </div>
                </div>

                {updateStatus === 'available' ? (
                  <button
                    onClick={handleReloadApp}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 transition-all shadow-xs"
                  >
                    {isSw ? 'Sasisha Sasa' : 'Update Now'}
                  </button>
                ) : (
                  <button
                    onClick={checkSwUpdates}
                    disabled={updateStatus === 'checking'}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shrink-0 transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />
                    <span>{updateStatus === 'checking' ? (isSw ? 'Inakagua...' : 'Checking...') : (isSw ? 'Kagua Sasisho' : 'Check Updates')}</span>
                  </button>
                )}
              </div>

              {/* Uninstalled banner tip */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                isDark ? 'bg-blue-950/40 border-blue-800/60 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{isSw ? 'Kama ulifuta App (uninstalled), unaweza kuipakua tena hapa.' : 'If you previously uninstalled the App, you can re-install it here.'}</span>
                </div>
                <button
                  onClick={handleResetPwa}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shrink-0 transition-colors shadow-sm"
                >
                  {isSw ? 'Weka Upya' : 'Re-Install'}
                </button>
              </div>

              {isInstalled ? (
                <div className={`p-5 rounded-2xl border text-center ${
                  isDark ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className={`text-sm font-black mb-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {isSw ? 'App Tayari Imewekwa' : 'App Already Installed'}
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {isSw 
                      ? 'App ya Genuine Electronics ipo kwenye simu/kompyuta yako. Tafuta icon yetu kwenye Home Screen au App Library yako ili kuifungua.' 
                      : 'The Genuine Electronics app is already installed. Look for our icon on your Home Screen or App Library to open it.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className={`flex items-center p-1 rounded-2xl text-xs font-bold ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                <button
                  onClick={() => setActiveDeviceTab('ios')}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    activeDeviceTab === 'ios'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>iPhone / iOS</span>
                </button>
                <button
                  onClick={() => setActiveDeviceTab('android')}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    activeDeviceTab === 'android'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                </button>
                <button
                  onClick={() => setActiveDeviceTab('desktop')}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    activeDeviceTab === 'desktop'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Computer / PC</span>
                </button>
              </div>

              <div className="space-y-3">
                {activeDeviceTab === 'ios' && (
                  <>
                    <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                        isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        1
                      </div>
                      <div className="text-xs">
                        <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{isSw ? 'Fungua kwenye Safari Browser' : 'Open in Safari Browser'}</p>
                        <p className={`mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isSw ? 'Kwenye iPhone/iPad, tumia kivinjari cha Safari. Kama unatumia Chrome, nakili Link ya App kisha ifungue kwenye Safari.' : 'On iPhone/iPad, use Safari browser. If using Chrome, copy the link and open it in Safari.'}
                        </p>
                        <button
                          onClick={handleCopyAppUrl}
                          className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-[11px] transition-colors"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />}
                          <span>{copiedLink ? (isSw ? 'Imenakiliwa!' : 'Copied!') : (isSw ? 'Nakili Link ya App' : 'Copy App Link')}</span>
                        </button>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                        isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        2
                      </div>
                      <div className="text-xs">
                        <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{isSw ? 'Bofya Share Icon' : 'Tap Share Icon'}</p>
                        <p className={`mt-0.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isSw ? 'Bofya alama ya' : 'Tap the'} <Share className={`w-3.5 h-3.5 inline ${isDark ? 'text-blue-400' : 'text-blue-600'}`} /> {isSw ? 'iliyopo chini ya kivinjari cha Safari.' : 'icon in Safari toolbar.'}
                        </p>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                        isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        3
                      </div>
                      <div className="text-xs">
                        <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{isSw ? 'Chagua "Add to Home Screen"' : 'Select "Add to Home Screen"'}</p>
                        <p className={`mt-0.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isSw ? 'Sogeza chini kisha chagua' : 'Scroll down and tap'} <PlusSquare className={`w-3.5 h-3.5 inline ${isDark ? 'text-blue-400' : 'text-blue-600'}`} /> <b>Add to Home Screen</b>.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activeDeviceTab === 'android' && (
                  <>
                    <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                        isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        1
                      </div>
                      <div className="text-xs">
                        <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{isSw ? 'Fungua Menu ya Chrome / Browser' : 'Open Browser Menu'}</p>
                        <p className={`mt-0.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isSw ? 'Bofya nukta tatu' : 'Tap three dots'} <MoreVertical className={`w-3.5 h-3.5 inline ${isDark ? 'text-blue-400' : 'text-blue-600'}`} /> {isSw ? 'juu kulia ya kivinjari chako cha Chrome.' : 'in top right corner of Chrome.'}
                        </p>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                        isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        2
                      </div>
                      <div className="text-xs">
                        <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{isSw ? 'Chagua "Install App" au "Add to Home screen"' : 'Select "Install app" or "Add to Home screen"'}</p>
                        <p className={`mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isSw 
                            ? 'Bofya "Install app" au "Add to Home screen / Create shortcut". Zote zitaweka icon rasmi ya Genuine Electronics kwenye kioo cha simu yako.' 
                            : 'Tap "Install app" or "Add to Home screen / Create shortcut". Both will place the official high-resolution Genuine Electronics icon on your home screen.'}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activeDeviceTab === 'desktop' && (
                  <>
                    <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                        isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        1
                      </div>
                      <div className="text-xs">
                        <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{isSw ? 'Bofya Alama ya Download kwenye Address Bar' : 'Click Address Bar Download Icon'}</p>
                        <p className={`mt-0.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isSw ? 'Tazama upande wa kulia wa Address bar yenye alama ya' : 'Look at the right side of address bar for'} <Download className={`w-3.5 h-3.5 inline ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />.
                        </p>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                        isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        2
                      </div>
                      <div className="text-xs">
                        <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{isSw ? 'Thibitisha Install' : 'Confirm Installation'}</p>
                        <p className={`mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isSw ? 'Bofya "Install" ili kuweka App icon kwenye Desktop ya kompyuta yako.' : 'Click "Install" to create desktop app shortcut.'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
              </>
              )}
            </div>

            <div className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'
            }`}>
              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/30"
                >
                  <Download className="w-4 h-4" />
                  <span>{isSw ? 'Pakua Moja kwa Moja (Direct Install)' : 'Direct Install App'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowManualModal(false)}
                  className={`w-full font-bold text-xs py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>{isSw ? 'Nimeelewa, Ahsante!' : 'Got It, Thanks!'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

