import React from 'react';
import { ShieldCheck, MapPin, Phone, Mail, Globe, Lock, Award, Heart, Download } from 'lucide-react';
import { BRAND_LOGO_URL } from '../types';
import { useLanguage } from '../i18n/LanguageContext';


interface FooterProps {
  categoriesList?: any[];
  storeSettings?: any;
}

export const Footer: React.FC<FooterProps> = ({ categoriesList = [], storeSettings }) => {
  const { language, t } = useLanguage();

  return (
    <footer className="w-full bg-slate-900 text-slate-300 pt-12 pb-20 sm:pb-12 border-t border-slate-800 text-xs mt-auto">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          
            {/* Brand & Compliance */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-auto flex items-center justify-center shrink-0">
                  <img src={BRAND_LOGO_URL} alt="Genuine Electronics Trust" className="h-10 w-auto max-w-[120px] object-contain" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <span className="font-extrabold text-white text-base tracking-tight block">{t('footer.brandName')}</span>
                  <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">{t('footer.brandSubtitle')}</span>
                </div>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {t('footer.description')}
              </p>
              <div className="pt-1 text-[10px] font-mono text-slate-400 space-y-0.5">
                <p>TIN: {storeSettings?.tin || '104-982-371'}</p>
                <p>Authorized Technology Partner</p>
              </div>
            </div>

          {/* Quick Categories */}
          <div className="space-y-2.5">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">{t('footer.topCategories')}</h4>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li><span className="hover:text-white cursor-pointer transition-colors">Smartphones & Wearables</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Computers & Laptops</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Home Appliances & ACs</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Gaming Consoles & PC</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Audio & Surround Sound</span></li>
            </ul>
          </div>

          {/* Customer Service & Support */}
          <div className="space-y-2.5">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">{t('footer.customerCare')}</h4>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li><span className="hover:text-white cursor-pointer transition-colors">Order Tracking & Status</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Warranty Claims & Returns</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Same-Day Delivery FAQ</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Wholesale & B2B Inquiries</span></li>
              <li>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
                  className="hover:text-blue-400 cursor-pointer transition-colors flex items-center gap-1.5 text-blue-300 font-bold"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>{language === 'sw' ? 'Pakua App (PWA)' : 'Install App (PWA)'}</span>
                </button>
              </li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Store Locator & Hours</span></li>
            </ul>
          </div>

          {/* Contact & Location */}
          <div className="space-y-2.5">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">{t('footer.visitContact')}</h4>
            <div className="space-y-2 text-[11px] text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Kariakoo / Ndanda na Masasi Street, Dar es Salaam Tanzania</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>+255 768 929 203</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <span>sales@genuine-electronics.com</span>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-300">M-Pesa</span>
              <span className="px-2 py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-300">Mixx By Yas</span>
              <span className="px-2 py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-300">CRDB Bank</span>
              <span className="px-2 py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-300">Visa / MC</span>
              <a 
                href="https://www.orbifinancial.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900 text-[10px] font-extrabold text-purple-200 border border-purple-700/80 flex items-center gap-1 transition-colors cursor-pointer"
                title="Visit Orbi Financial Services"
              >
                <span>Orbi Pay</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <p>{t('footer.copyright')}</p>
            <div className="flex items-center gap-2 pl-0 sm:pl-4 sm:border-l border-slate-800">
              <span className="text-slate-400 font-medium">Powered by</span>
              <a href="https://orbifinancial.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                <img 
                  src="https://media-stock.orbifinancial.com/Orbi%20logo%20White.png" 
                  alt="Orbi" 
                  className="h-6 w-auto object-contain" 
                  referrerPolicy="no-referrer" 
                />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">{t('footer.privacyPolicy')}</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">{t('footer.termsOfService')}</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">{t('footer.authenticityGuarantee')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
