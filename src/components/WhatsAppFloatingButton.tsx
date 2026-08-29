import React, { useState } from 'react';
import { StoreSettings } from '../types';

interface WhatsAppFloatingButtonProps {
  storeSettings?: StoreSettings;
  customPhone?: string;
  defaultMessage?: string;
}

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  storeSettings,
  customPhone,
  defaultMessage,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Target support number defaults strictly to +255 624 057 166
  const rawPhone = customPhone || storeSettings?.whatsappNumber || storeSettings?.phone || '+255624057166';
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '') || '255624057166';
  const targetPhone = cleanPhone.startsWith('0') ? `255${cleanPhone.slice(1)}` : cleanPhone;

  const message = defaultMessage || `Habari Genuine Electronics Tanzania! Nahitaji msaada / maelezo kuhusu bidhaa na huduma zenu.`;
  const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <aside
      aria-label="WhatsApp Support Chat"
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2.5 pointer-events-auto select-none no-print group"
    >
      {/* Interactive Tooltip / Label */}
      <div
        className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-950 text-xs font-bold shadow-xl border border-slate-700/50 dark:border-slate-200/50 backdrop-blur-md transition-all duration-300 pointer-events-none ${
          isHovered
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 translate-x-2 scale-95'
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Msaada WhatsApp</span>
        <span className="text-[10px] text-emerald-400 dark:text-emerald-600 font-mono font-extrabold">
          +255 624 057 166
        </span>
      </div>

      {/* Main WhatsApp Raised Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Wasiliana Nasi WhatsApp (+255 624 057 166)"
        className="relative flex items-center justify-center w-12 h-12 sm:w-[50px] sm:h-[50px] rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-600/35 hover:shadow-2xl hover:shadow-emerald-500/60 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
      >
        {/* Continuous 5-Second Heartbeat Radar Wave Ring 1 */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] -z-10 animate-whatsapp-wave pointer-events-none" />

        {/* Continuous 5-Second Heartbeat Radar Wave Ring 2 (Offset) */}
        <span
          className="absolute inset-0 rounded-full bg-emerald-400 -z-10 animate-whatsapp-wave pointer-events-none"
          style={{ animationDelay: '0.4s' }}
        />

        {/* Outer subtle glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-600 to-green-400 opacity-80" />

        {/* Inner Heartbeat Animated WhatsApp Icon */}
        <div className="relative z-10 animate-whatsapp-heartbeat flex items-center justify-center">
          <svg
            className="w-6 h-6 sm:w-7 sm:h-7 fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
            viewBox="0 0 24 24"
          >
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.044c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.227.608 4.314 1.667 6.11l-1.675 6.124 6.284-1.648c1.722.946 3.702 1.414 5.724 1.414 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12zm0 22.083c-1.875 0-3.64-.528-5.154-1.444l-.369-.222-3.83 1.004 1.023-3.731-.243-.387c-1.026-1.632-1.57-3.535-1.57-5.303 0-5.568 4.529-10.097 10.143-10.097 5.606 0 10.14 4.529 10.14 10.097 0 5.568-4.534 10.083-10.09 10.083z" />
          </svg>
        </div>

        {/* Small Active Badge Dot on top right of the icon */}
        <span className="absolute top-0 right-0 -mt-0.5 -mr-0.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-300 border-2 border-white dark:border-slate-900"></span>
        </span>
      </a>
    </aside>
  );
};
