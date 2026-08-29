import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertCircle } from 'lucide-react';

export const InternetConnectionBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showRestoredNotice, setShowRestoredNotice] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestoredNotice(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setShowRestoredNotice(false);
      }, 4500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredNotice(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (isOnline && !showRestoredNotice) {
    return null;
  }

  return (
    <div className="fixed top-0 inset-x-0 z-[200] transition-all duration-300 animate-in slide-in-from-top duration-300">
      {!isOnline ? (
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white px-4 py-2.5 shadow-xl border-b border-rose-500/50 flex items-center justify-between gap-3 min-h-[44px]">
          <div className="flex items-center gap-3 max-w-7xl mx-auto w-full">
            <div className="p-1.5 bg-white/20 rounded-xl shrink-0 animate-pulse">
              <WifiOff className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-md border border-white/20">
                  Offline Mode
                </span>
                <span className="text-xs font-bold truncate">No Internet Connection Detected</span>
              </div>
              <p className="text-[11px] text-rose-100 font-medium truncate mt-0.5">
                An active internet connection is required to process orders, save edits, and sync live data. Please reconnect.
              </p>
            </div>
          </div>
        </div>
      ) : showRestoredNotice ? (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-2.5 shadow-xl border-b border-emerald-500/50 flex items-center justify-between gap-3 min-h-[44px]">
          <div className="flex items-center gap-3 max-w-7xl mx-auto w-full">
            <div className="p-1.5 bg-white/20 rounded-xl shrink-0">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-md border border-white/20">
                  Online
                </span>
                <span className="text-xs font-bold">Internet Connection Restored</span>
              </div>
              <p className="text-[11px] text-emerald-100 font-medium truncate mt-0.5">
                Successfully reconnected to live store network and database.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
