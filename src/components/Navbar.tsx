import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, User, Menu, ChevronDown, ShoppingBag, Star, TrendingUp, Sparkles, Tag, X, SlidersHorizontal, ShieldCheck, ArrowRight, Globe, Sun, Moon, Lock, Zap, Monitor, Download, ExternalLink } from 'lucide-react';
import { Product, formatTZS, StoreSettings, BRAND_LOGO_URL } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { safeLocalStorage } from '../utils/storage';

interface NavbarProps {
  currentView: 'client' | 'admin';
  setCurrentView: (view: 'client' | 'admin') => void;
  cartCount: number;
  wishlistCount?: number;
  onOpenCart: () => void;
  onOpenWishlist?: () => void;
  onOpenOrders?: () => void;
  onOpenProfile?: () => void;
  onOpenAiAssistant?: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  products: Product[];
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  clientThemeMode?: 'system' | 'dark' | 'light';
  storeSettings?: StoreSettings;
  categoriesList?: any[];
  user?: any;
  profile?: any;
  onLogout?: () => void;
  onLoginClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  cartCount,
  wishlistCount = 0,
  onOpenCart,
  onOpenWishlist,
  onOpenOrders,
  onOpenProfile,
  searchTerm,
  setSearchTerm,
  products,
  theme = 'light',
  onToggleTheme,
  clientThemeMode,
  storeSettings,
  categoriesList = [],
  user,
  profile,
  onLogout,
  onLoginClick,
}) => {
  const [activeTab, setActiveTab] = useState('home');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  useEffect(() => {
    const checkPwaInstalled = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone);
      const installed = standalone || safeLocalStorage.getItem('ge_pwa_installed') === 'true';
      setIsPwaInstalled(!!installed);
      setIsStandalone(!!standalone);
    };
    
    checkPwaInstalled();
    
    // If the browser fires beforeinstallprompt, it confirms the app is not currently installed
    const handleBeforeInstallPrompt = () => {
      safeLocalStorage.removeItem('ge_pwa_installed');
      setIsPwaInstalled(false);
    };

    window.addEventListener('appinstalled', checkPwaInstalled);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-installed-changed', checkPwaInstalled);
    
    return () => {
      window.removeEventListener('appinstalled', checkPwaInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-installed-changed', checkPwaInstalled);
    };
  }, []);

  const { language, setLanguage, t } = useLanguage();
  const isDark = theme === 'dark';

  const [isDesktopFocused, setIsDesktopFocused] = useState(false);
  const [isMobileFocused, setIsMobileFocused] = useState(false);

  const desktopSearchRef = React.useRef<HTMLDivElement>(null);
  const mobileSearchRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(event.target as Node)) {
        setIsDesktopFocused(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setIsMobileFocused(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const popularSearches = ['TV', 'Subwoofer', 'Hisense', 'Samsung', 'Fridge', 'AC', 'Boss'];

  const matchingProducts = React.useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) {
      // If empty, show featured/popular products
      return products.filter((p) => p.featured || (p.rating && p.rating >= 4.8)).slice(0, 6);
    }
    return products.filter(
      (p) =>
        (p.name && String(p.name || "").toLowerCase().includes(term)) ||
        (p.brand && String(p.brand || "").toLowerCase().includes(term)) ||
        (p.category && String(p.category || "").toLowerCase().includes(term)) ||
        (p.description && String(p.description || "").toLowerCase().includes(term))
    );
  }, [searchTerm, products]);

  const renderSearchDropdown = (isFocused: boolean, setIsFocused: (f: boolean) => void) => {
    if (!isFocused) return null;
    
    return (
      <div className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border shadow-2xl p-4 z-[90] animate-in fade-in slide-in-from-top-1 duration-150 ${
        isDark 
          ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-md' 
          : 'bg-white border-slate-200 text-slate-900 shadow-xl'
      }`}>
        {/* Popular Searches Pills */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Popular Searches
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((pill) => (
              <button
                key={pill}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSearchTerm(pill);
                  setIsFocused(false);
                  window.dispatchEvent(new CustomEvent('nav-action', { detail: 'shop' }));
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-150 hover:scale-105 active:scale-95 flex items-center gap-1 ${
                  isDark 
                    ? 'border-slate-800 bg-slate-900/40 hover:bg-blue-600 hover:text-white hover:border-transparent text-slate-300' 
                    : 'border-slate-200 bg-slate-50 hover:bg-blue-600 hover:text-white hover:border-transparent text-slate-700 hover:shadow-sm'
                }`}
              >
                <span className="w-1 h-1 rounded-full bg-blue-500" />
                <span>{pill}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Matching Results List */}
        <div>
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {searchTerm.trim() ? 'Matching Electronics' : 'Featured & Trending'}
            </span>
            {searchTerm.trim() && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold bg-blue-500/10 px-2 py-0.5 rounded-full">
                {matchingProducts.length} results
              </span>
            )}
          </div>

          {matchingProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              No genuine electronics found for "{searchTerm}"
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 font-sans">
              {matchingProducts.slice(0, 5).map((prod) => (
                <div
                  key={prod.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('nav-action', { detail: `product_${prod.id}` }));
                    setSearchTerm('');
                    setIsFocused(false);
                  }}
                  className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${
                    isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-10 h-10 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-200/50"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold truncate text-slate-900 dark:text-white">
                      {prod.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">{prod.brand}</span>
                      <span className="text-[10px] text-slate-300 dark:text-slate-700">•</span>
                      <span className={`text-[10px] font-extrabold ${prod.stock && prod.stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        {prod.stock && prod.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                      {formatTZS(prod.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const handleNavAction = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (['home', 'shop', 'deals', 'new-arrivals', 'brands', 'contact'].includes(customEvent.detail)) {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('nav-action', handleNavAction);
    return () => window.removeEventListener('nav-action', handleNavAction);
  }, []);

  const topProducts = products.filter(p => p.featured).slice(0, 3);
  const newArrivals = [...products].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 3);
  const brands = Array.from(new Set(products.map((p) => p.brand))).slice(0, 8);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'sw' : 'en');
  };

  return (
    <header className={`sticky top-0 z-50 w-full transition-colors duration-200 font-sans`} style={{ fontFamily: storeSettings?.fontFamily || 'inherit' }}>
      {/* Announcement Bar */}
      {storeSettings?.showAnnouncement && (
        <div className="text-white text-[11px] sm:text-xs font-semibold py-2 px-4 text-center shadow-sm w-full" style={{ backgroundColor: storeSettings?.primaryColor || '#0f172a' }}>
          {storeSettings.announcementText}
        </div>
      )}
      
      <div className={`w-full backdrop-blur-md border-b transition-colors duration-200 ${
      isDark ? 'bg-slate-950/95 border-slate-800/80 text-white shadow-md shadow-black/40' : 'bg-white/95 border-slate-200/80 text-slate-900 shadow-sm'
    }`}>
      {/* Top Bar Row */}
      <div className="py-3 px-4 md:px-6 lg:px-10 xl:px-16 max-w-[1920px] mx-auto w-full flex items-center justify-between gap-4 md:gap-8">
        
        {/* Brand Logo & Name */}
        <div 
          className="flex items-center gap-3 cursor-pointer shrink-0 select-none group" 
          onClick={() => {
            setCurrentView('client');
            window.dispatchEvent(new CustomEvent('nav-action', { detail: 'home' }));
          }}
        >
          <div className="relative h-10 md:h-11 w-auto flex items-center justify-center shrink-0">
            <img 
              src={storeSettings?.logoUrl || BRAND_LOGO_URL} 
              alt={storeSettings?.storeName || 'Genuine Electronics'} 
              className="h-10 md:h-11 w-auto max-w-[140px] object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to text if image fails
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="hidden sm:flex flex-col">
            <h1 className={`text-lg md:text-xl font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Genuine<span className="text-blue-600 font-black">.</span>
            </h1>
            <span className={`text-[9px] md:text-[10px] font-extrabold tracking-[0.15em] uppercase mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              ELECTRONICS TRUST
            </span>
          </div>
        </div>

        {/* Unified Search Bar */}
        <div ref={desktopSearchRef} className="hidden md:block flex-1 max-w-xl lg:max-w-2xl relative">
          <div className={`flex w-full rounded-full transition-all items-center border ${
            isDark 
              ? 'bg-slate-900/40 border-slate-700/50 focus-within:bg-slate-900 focus-within:border-blue-500 focus-within:shadow-[0_0_0_1px_rgba(59,130,246,0.5)]' 
              : 'bg-slate-50 border-slate-200 focus-within:bg-white focus-within:border-blue-500 focus-within:shadow-[0_0_0_1px_rgba(59,130,246,0.2)]'
          }`}>
            <Search className={`w-4 h-4 ml-4 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsDesktopFocused(true)}
              className={`flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none min-w-0 ${
                isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className={`p-1.5 rounded-full transition-colors mr-1 shrink-0 ${
                  isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button className="w-8 h-8 mr-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 transition-colors">
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
          {renderSearchDropdown(isDesktopFocused, setIsDesktopFocused)}
        </div>

        {/* Right Actions Header Group */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          
          {/* Install PWA Button */}
          {!isStandalone && !isPwaInstalled && (
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all border active:scale-95 ${
                isDark ? 'bg-blue-950/70 hover:bg-blue-900 text-blue-300 border-blue-800/80' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-xs'
              }`}
              title={language === 'sw' ? 'Pakua App' : 'Install App'}
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="hidden sm:inline">
                {language === 'sw' ? 'Pakua App' : 'Install App'}
              </span>
            </button>
          )}

          {/* Theme Toggle */}
          {onToggleTheme && (
            <button 
              onClick={onToggleTheme}
              className={`flex items-center justify-center w-9 h-9 rounded-full opacity-80 hover:opacity-100 transition-all ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} 
              title="Toggle Theme"
            >
              {clientThemeMode === 'dark' ? <Moon className="w-5 h-5 text-indigo-300" /> : clientThemeMode === 'light' ? <Sun className="w-5 h-5 text-amber-500" /> : <Monitor className="w-5 h-5 text-slate-500" />}
            </button>
          )}

          {/* Language Switcher */}
          <button 
            onClick={toggleLanguage}
            className={`flex items-center justify-center w-9 h-9 rounded-full opacity-80 hover:opacity-100 transition-all ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} 
            title={t('nav.language')}
          >
            {language === 'en' ? (
              <img src="https://flagcdn.com/gb.svg" width="20" alt="English" className="rounded-sm shadow-sm object-cover" />
            ) : (
              <img src="https://flagcdn.com/tz.svg" width="20" alt="Swahili" className="rounded-sm shadow-sm object-cover" />
            )}
          </button>

          {/* User Account / Profile */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => user ? setShowUserMenu(!showUserMenu) : onLoginClick?.()}
              className={`group flex items-center gap-2 pl-1 pr-2.5 sm:pr-3 py-1 sm:py-1.5 rounded-full transition-all border ${
                isDark
                  ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-100 border-slate-700/70 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 shadow-sm active:scale-95'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-extrabold shadow-sm transition-transform group-hover:scale-105 ${
                user ? 'bg-gradient-to-tr from-blue-700 to-blue-500 ring-2 ring-blue-500/20' : 'bg-slate-100 text-slate-400'
              }`}>
                {user ? (
                  (profile?.displayName || profile?.fullName || profile?.full_name || user.email || 'U').charAt(0).toUpperCase()
                ) : (
                  <User className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="hidden sm:flex flex-col items-start text-left min-w-0">
                <span className="text-[11px] font-extrabold leading-tight text-slate-900 dark:text-white truncate max-w-[90px]">
                  {user ? (profile?.displayName || profile?.fullName || profile?.full_name || user.email?.split('@')[0] || 'My Account') : 'Sign In'}
                </span>
                {user && (
                  <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold leading-none tracking-tight">
                    {profile?.role === 'admin' ? 'Administrator' : 'Verified Buyer'}
                  </span>
                )}
              </div>
              {user && <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180 text-blue-600' : ''}`} />}
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && user && (
              <div className={`absolute right-0 mt-2.5 w-64 rounded-2xl shadow-2xl border py-2 z-[70] animate-in fade-in slide-in-from-top-2 backdrop-blur-xl ${
                isDark ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-white/95 border-slate-100 text-slate-800'
              }`}>
                <div className="px-4 py-3 border-b mb-1 border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-black truncate text-slate-900 dark:text-white">
                    {profile?.displayName || profile?.fullName || profile?.full_name || user.email}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {profile?.role === 'admin' ? 'Admin Portal' : 'Verified Buyer'}
                    </span>
                  </div>
                </div>
                
                {profile?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setCurrentView('admin');
                      setShowUserMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-colors ${
                      isDark ? 'text-slate-200 hover:bg-slate-800 hover:text-blue-400' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span>Admin Dashboard</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenOrders?.();
                    window.dispatchEvent(new CustomEvent('nav-action', { detail: 'orders' }));
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors ${
                    isDark ? 'text-slate-200 hover:bg-slate-800 hover:text-blue-400' : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <span>My Orders & Tracking</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-600 font-extrabold">Live</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenProfile?.();
                    window.dispatchEvent(new CustomEvent('nav-action', { detail: 'profile' }));
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-colors ${
                    isDark ? 'text-slate-200 hover:bg-slate-800 hover:text-blue-400' : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                  }`}
                >
                  <User className="w-4 h-4 text-indigo-500" />
                  <span>Profile & Delivery Address</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenWishlist?.();
                    window.dispatchEvent(new CustomEvent('nav-action', { detail: 'wishlist' }));
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors ${
                    isDark ? 'text-slate-200 hover:bg-slate-800 hover:text-blue-400' : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>Wishlist</span>
                  </div>
                  {wishlistCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 font-bold">
                      {wishlistCount}
                    </span>
                  )}
                </button>

                <div className={`my-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`} />

                <button
                  onClick={() => {
                    onLogout?.();
                    setShowUserMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-colors ${
                    isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Cart Button with Count Badge */}
          <button 
            onClick={onOpenCart} 
            className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-all relative group border ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-500 text-white border-transparent'
                : 'bg-blue-600 hover:bg-blue-700 text-white border-transparent shadow-sm'
            }`}
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4 md:w-4 md:h-4 group-hover:scale-110 transition-transform" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2.5 min-w-[16px] h-[16px] px-1 bg-white text-blue-700 rounded-full text-[10px] font-black flex items-center justify-center shadow-sm">
                  {cartCount}
                </span>
              )}
            </div>
            <div className="hidden xs:block">
              <span className="text-xs font-semibold">{t('nav.cart')}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Second Row Search Bar */}
      <div ref={mobileSearchRef} className="md:hidden px-4 pb-3 pt-0 relative">
        <div className={`flex w-full rounded-full transition-all items-center border ${
          isDark 
            ? 'bg-slate-900/40 border-slate-700/50 focus-within:bg-slate-900 focus-within:border-blue-500 focus-within:shadow-[0_0_0_1px_rgba(59,130,246,0.5)]' 
            : 'bg-slate-50 border-slate-200 focus-within:bg-white focus-within:border-blue-500 focus-within:shadow-[0_0_0_1px_rgba(59,130,246,0.2)]'
        }`}>
          <Search className={`w-4 h-4 ml-4 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder={t('nav.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsMobileFocused(true)}
            className={`flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none min-w-0 ${
              isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
            }`}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className={`p-1.5 rounded-full transition-colors mr-1 shrink-0 ${
                isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button className="w-8 h-8 mr-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 transition-colors">
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
        {renderSearchDropdown(isMobileFocused, setIsMobileFocused)}
      </div>

      {/* Navigation Category Links Bar */}
      <div className={`hidden md:block border-t relative transition-colors ${
        isDark ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-100'
      }`}>
        <div className="flex items-center px-3 sm:px-6 lg:px-10 xl:px-16 max-w-[1920px] mx-auto w-full">
          <div 
            className={`relative group flex items-center gap-1.5 sm:gap-2 border-r py-2.5 sm:py-3 pr-4 sm:pr-6 mr-4 sm:mr-6 cursor-pointer hover:text-blue-500 transition-colors font-bold text-[10px] sm:text-xs capitalize tracking-wider shrink-0 ${
              isDark ? 'border-slate-800 text-slate-200' : 'border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2" onClick={() => window.dispatchEvent(new CustomEvent('nav-action', { detail: 'categories' }))}>
              <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
              <span className="whitespace-nowrap">{t('nav.allCategories')}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </div>

            {/* All Categories Hover Submenu - Pills */}
            <div className="absolute top-full left-0 mt-0 pt-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className={`w-[480px] sm:w-[560px] rounded-2xl shadow-2xl border p-5 ${
                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
              }`}>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-extrabold tracking-wider text-blue-600 dark:text-blue-400 uppercase">Shop by Category</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{categoriesList.length} Categories</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {categoriesList.map((cat) => {
                    const isSwahili = language === 'sw';
                    const displayName = isSwahili && cat.swahiliName ? cat.swahiliName : cat.name;
                    
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('nav-action', { detail: `category_${cat.name}` }));
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-150 transform hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
                          isDark 
                            ? 'border-slate-800 bg-slate-900/60 hover:bg-blue-600 hover:text-white hover:border-transparent text-slate-300' 
                            : 'border-slate-200 bg-slate-50 hover:bg-blue-600 hover:text-white hover:border-transparent text-slate-700 hover:shadow-sm'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span>{displayName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <nav className={`flex items-center gap-5 sm:gap-8 text-[10px] sm:text-xs font-bold capitalize tracking-wider min-w-max pr-4 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            {/* Home */}
            <a 
              href="#home" 
              onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('nav-action', { detail: 'home' })) }} 
              className={`py-3 border-b-2 transition-all block whitespace-nowrap ${activeTab === 'home' ? 'text-blue-500 border-blue-500' : 'hover:text-blue-500 border-transparent hover:border-blue-500'}`}
            >
              {t('nav.home')}
            </a>
            
            {/* Shop All - Mega Menu (Left Categories, Right Sample Product Cards) */}
            <div className="relative group">
              <a 
                href="#shop" 
                onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('nav-action', { detail: 'shop' })) }} 
                className={`py-3 border-b-2 transition-all flex items-center gap-1 block whitespace-nowrap ${activeTab === 'shop' ? 'text-blue-500 border-blue-500' : 'hover:text-blue-500 border-transparent hover:border-blue-500'}`}
              >
                <span>{t('nav.shopAll')}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </a>
              
              {/* Shop All Mega Hover Submenu */}
              <div className="absolute top-full left-0 mt-0 pt-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className={`w-[720px] lg:w-[840px] rounded-2xl shadow-2xl border p-5 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
                }`}>
                  <div className="grid grid-cols-12 gap-6">
                    {/* Left: Category Pills */}
                    <div className="col-span-6 border-r border-slate-100 dark:border-slate-800 pr-5">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-extrabold tracking-wider text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
                          <Menu className="w-3.5 h-3.5" />
                          <span>Shop Categories</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{categoriesList.length} Categories</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
                        {categoriesList.map((cat) => {
                          const isSwahili = language === 'sw';
                          const displayName = isSwahili && cat.swahiliName ? cat.swahiliName : cat.name;
                          
                          return (
                            <button
                              key={cat.id}
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent('nav-action', { detail: `category_${cat.name}` }));
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-150 transform hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
                                isDark 
                                  ? 'border-slate-800 bg-slate-900/60 hover:bg-blue-600 hover:text-white hover:border-transparent text-slate-300' 
                                  : 'border-slate-200 bg-slate-50 hover:bg-blue-600 hover:text-white hover:border-transparent text-slate-700 hover:shadow-sm'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              <span>{displayName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Sample Product Cards from DB */}
                    <div className="col-span-6 pl-1">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-extrabold tracking-wider text-amber-500 uppercase flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Featured Products</span>
                        </span>
                        <button 
                          onClick={() => window.dispatchEvent(new CustomEvent('nav-action', { detail: 'shop' }))}
                          className="text-[10px] text-blue-500 hover:underline font-bold flex items-center gap-0.5"
                        >
                          <span>View All</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {topProducts.slice(0, 2).map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => window.dispatchEvent(new CustomEvent('nav-action', { detail: `product_${prod.id}` }))}
                            className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 ${
                              isDark ? 'bg-slate-900/80 border-slate-800 hover:border-blue-500' : 'bg-slate-50 border-slate-200/80 hover:border-blue-500 hover:bg-white shadow-xs'
                            }`}
                          >
                            <div className="w-full h-24 rounded-lg overflow-hidden mb-2 bg-white flex items-center justify-center p-1 relative">
                              <img src={prod.image} alt={prod.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                              <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md">GENUINE</span>
                            </div>
                            <h4 className="text-[11px] font-bold line-clamp-1 group-hover:text-blue-500 transition-colors leading-tight mb-1">
                              {prod.name}
                            </h4>
                            <div className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400">
                              {formatTZS(prod.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hot Deals Submenu */}
            <div className="relative group">
              <a 
                href="#deals" 
                onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('nav-action', { detail: 'deals' })) }} 
                className={`py-3 border-b-2 transition-all flex items-center gap-1 block whitespace-nowrap ${activeTab === 'deals' ? 'text-blue-500 border-blue-500' : 'hover:text-blue-500 border-transparent hover:border-blue-500'}`}
              >
                <span>{t('nav.hotDeals')}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </a>

              {/* Hot Deals Mega Hover Submenu */}
              <div className="absolute top-full left-0 mt-0 pt-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className={`w-[640px] rounded-2xl shadow-2xl border p-5 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
                }`}>
                  <div className="grid grid-cols-12 gap-5">
                    {/* Left: Deal Category Pills */}
                    <div className="col-span-5 border-r border-slate-100 dark:border-slate-800 pr-4">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-extrabold tracking-wider text-rose-500 uppercase flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5" />
                          <span>Offer Filters</span>
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {['Flash Discount Deals', 'Best Price Genuine', 'Under TZS 1,000,000', 'Clearance Electronics'].map((dealTag, idx) => (
                      <button
                            key={idx}
                            onClick={() => window.dispatchEvent(new CustomEvent('nav-action', { detail: `deals_${String(dealTag || "").toLowerCase().replace(/ /g, '_')}` }))}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all duration-150 transform hover:scale-102 flex items-center justify-between cursor-pointer ${
                              isDark 
                                ? 'border-slate-800 bg-slate-900/60 hover:bg-rose-600 hover:text-white hover:border-transparent text-slate-300' 
                                : 'border-slate-200 bg-slate-50 hover:bg-rose-600 hover:text-white hover:border-transparent text-slate-700'
                            }`}
                          >
                            <span>{dealTag}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right: Deal Product Cards from DB */}
                    <div className="col-span-7 pl-1">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-extrabold tracking-wider text-rose-500 uppercase">Top Savings Products</span>
                        <button onClick={() => window.dispatchEvent(new CustomEvent('nav-action', { detail: 'deals' }))} className="text-[10px] text-rose-500 hover:underline font-bold">View Deals</button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {products.slice(0, 2).map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => window.dispatchEvent(new CustomEvent('nav-action', { detail: `product_${prod.id}` }))}
                            className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 ${
                              isDark ? 'bg-slate-900/80 border-slate-800 hover:border-rose-500' : 'bg-slate-50 border-slate-200/80 hover:border-rose-500 hover:bg-white shadow-xs'
                            }`}
                          >
                            <div className="w-full h-24 rounded-lg overflow-hidden mb-2 bg-white flex items-center justify-center p-1 relative">
                              <img src={prod.image} alt={prod.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-md">HOT</span>
                            </div>
                            <h4 className="text-[11px] font-bold line-clamp-1 group-hover:text-rose-500 transition-colors leading-tight mb-1">
                              {prod.name}
                            </h4>
                            <div className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400">
                              {formatTZS(prod.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* New Arrivals Submenu */}
            <div className="relative group">
              <a 
                href="#new-arrivals" 
                onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('nav-action', { detail: 'new-arrivals' })) }} 
                className={`py-3 border-b-2 transition-all flex items-center gap-1 block whitespace-nowrap ${activeTab === 'new-arrivals' ? 'text-blue-500 border-blue-500' : 'hover:text-blue-500 border-transparent hover:border-blue-500'}`}
              >
                <span>{t('nav.newArrivals')}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </a>

              {/* New Arrivals Mega Hover Submenu */}
              <div className="absolute top-full left-0 mt-0 pt-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className={`w-[640px] rounded-2xl shadow-2xl border p-5 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
                }`}>
                  <div className="grid grid-cols-12 gap-5">
                    {/* Left: New Arrival Pills */}
                    <div className="col-span-5 border-r border-slate-100 dark:border-slate-800 pr-4">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-extrabold tracking-wider text-emerald-500 uppercase flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Fresh Categories</span>
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {categoriesList.slice(0, 6).map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => window.dispatchEvent(new CustomEvent('nav-action', { detail: `category_${cat.name}` }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-150 transform hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
                              isDark 
                                ? 'border-slate-800 bg-slate-900/60 hover:bg-emerald-600 hover:text-white hover:border-transparent text-slate-300' 
                                : 'border-slate-200 bg-slate-50 hover:bg-emerald-600 hover:text-white hover:border-transparent text-slate-700'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right: New Arrival Products from DB */}
                    <div className="col-span-7 pl-1">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-extrabold tracking-wider text-emerald-500 uppercase">Newly Added Units</span>
                        <button onClick={() => window.dispatchEvent(new CustomEvent('nav-action', { detail: 'new-arrivals' }))} className="text-[10px] text-emerald-500 hover:underline font-bold">Browse All</button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {newArrivals.slice(0, 2).map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => window.dispatchEvent(new CustomEvent('nav-action', { detail: `product_${prod.id}` }))}
                            className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 ${
                              isDark ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500' : 'bg-slate-50 border-slate-200/80 hover:border-emerald-500 hover:bg-white shadow-xs'
                            }`}
                          >
                            <div className="w-full h-24 rounded-lg overflow-hidden mb-2 bg-white flex items-center justify-center p-1 relative">
                              <img src={prod.image} alt={prod.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                              <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded-md">NEW</span>
                            </div>
                            <h4 className="text-[11px] font-bold line-clamp-1 group-hover:text-emerald-500 transition-colors leading-tight mb-1">
                              {prod.name}
                            </h4>
                            <div className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatTZS(prod.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Brands Submenu */}
            <div className="relative group">
              <a 
                href="#brands" 
                onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('nav-action', { detail: 'brands' })) }} 
                className={`py-3 border-b-2 transition-all flex items-center gap-1 block whitespace-nowrap ${activeTab === 'brands' ? 'text-blue-500 border-blue-500' : 'hover:text-blue-500 border-transparent hover:border-blue-500'}`}
              >
                <span>{t('nav.topBrands')}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </a>

              {/* Top Brands Hover Submenu */}
              <div className="absolute top-full left-0 mt-0 pt-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className={`w-[520px] rounded-2xl shadow-2xl border p-5 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-extrabold tracking-wider text-indigo-500 uppercase flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Genuine Manufacturers</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{brands.length} Brands</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {brands.map((b, idx) => (
                      <button
                        key={idx}
                        onClick={() => window.dispatchEvent(new CustomEvent('nav-action', { detail: 'brands' }))}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-all duration-150 transform hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
                          isDark 
                            ? 'border-slate-800 bg-slate-900 hover:bg-indigo-600 hover:text-white hover:border-transparent text-slate-200' 
                            : 'border-slate-200 bg-slate-50 hover:bg-indigo-600 hover:text-white hover:border-transparent text-slate-800 hover:shadow-xs'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>{b}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Submenu */}
            <div className="relative group">
              <a 
                href="#contact" 
                onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('nav-action', { detail: 'contact' })) }} 
                className={`py-3 border-b-2 transition-all flex items-center gap-1 block whitespace-nowrap ${activeTab === 'contact' ? 'text-blue-500 border-blue-500' : 'hover:text-blue-500 border-transparent hover:border-blue-500'}`}
              >
                <span>{t('nav.contact')}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </a>

              {/* Contact Hover Submenu */}
              <div className="absolute top-full left-0 mt-0 pt-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className={`w-[480px] rounded-2xl shadow-2xl border p-5 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-extrabold tracking-wider text-blue-500 uppercase">Customer Service & Location</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div 
                      onClick={() => window.dispatchEvent(new CustomEvent('nav-action', { detail: 'contact' }))}
                      className={`p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-between ${
                        isDark ? 'border-slate-800 bg-slate-900 hover:border-blue-500' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Dar es Salaam Showroom & Store</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">Kariakoo / City Center</span>
                    </div>

                    <div 
                      onClick={() => window.dispatchEvent(new CustomEvent('nav-action', { detail: 'contact' }))}
                      className={`p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-between ${
                        isDark ? 'border-slate-800 bg-slate-900 hover:border-blue-500' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>WhatsApp & Phone Support</span>
                      </div>
                      <span className="text-[10px] text-blue-500 font-extrabold">{storeSettings?.whatsappNumber || storeSettings?.phone || '+255 768 929 203'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </nav>

        </div>
      </div>
      </div>
    </header>
  );
};
