import React from 'react';
import { Sun, Image as ImageIcon, Layout, Maximize, AlignCenter } from 'lucide-react';
import { StoreSettings } from '../types';

interface TemplatePreviewProps {
  settings: Partial<StoreSettings>;
  onLayoutChange: (layout: 'split' | 'minimal' | 'bold') => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ settings, onLayoutChange }) => {
  const layout = settings.heroLayout || 'split';
  
  const fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800';
  const imgUrl = settings.heroImage || fallbackImage;

  return (
    <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-blue-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Live Template Preview
          </h4>
        </div>
        
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => onLayoutChange('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
              layout === 'split' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            Split
          </button>
          <button
            type="button"
            onClick={() => onLayoutChange('minimal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
              layout === 'minimal' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <AlignCenter className="w-3.5 h-3.5" />
            Minimal
          </button>
          <button
            type="button"
            onClick={() => onLayoutChange('bold')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
              layout === 'bold' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Maximize className="w-3.5 h-3.5" />
            Bold
          </button>
        </div>
      </div>
      
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-inner" style={{ fontFamily: settings.fontFamily || 'inherit' }}>
        {/* Announcement Bar Preview */}
        {settings.showAnnouncement && (
          <div className="text-white text-[10px] sm:text-xs font-medium py-2 px-4 text-center" style={{ backgroundColor: settings.primaryColor || '#0f172a' }}>
            {settings.announcementText || 'Your announcement will appear here'}
          </div>
        )}
        
        {/* Hero Section Preview Renderer */}
        <div className={`relative min-h-[300px] flex w-full overflow-hidden ${layout === 'minimal' ? 'bg-[#F4F7FB] dark:bg-slate-800' : layout === 'bold' ? 'bg-slate-900' : 'bg-[#F4F7FB] dark:bg-slate-800'}`}>
          
          {layout === 'split' && (
            <div className="flex flex-col md:flex-row items-center justify-between w-full p-6 sm:p-8">
              <div className="max-w-sm relative z-10 space-y-4">
                <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-800 shadow-sm border border-slate-100">
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>{settings.heroBadge || 'Hero Badge Pill'}</span>
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                  {settings.heroTitle || 'Your Main Title Headline'}
                </h1>
                
                <p className="text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs leading-relaxed">
                  {settings.heroSubtitle || 'Your subtitle description will appear here to provide more context to your customers.'}
                </p>
                
                <div className="pt-2 flex gap-3">
                  <div className="text-white text-[10px] font-bold px-4 py-2 rounded-full shadow-md" style={{ backgroundColor: settings.primaryColor || '#2563eb' }}>Shop Now</div>
                  <div className="bg-white text-slate-900 text-[10px] font-bold px-4 py-2 rounded-full border border-slate-200 shadow-sm">View Deals</div>
                </div>
              </div>
              
              <div className="w-full md:w-1/2 mt-6 md:mt-0 flex justify-center relative z-10">
                {settings.heroImage ? (
                  <img 
                    src={imgUrl} 
                    alt="Hero Preview" 
                    className="w-full h-auto max-h-[250px] object-contain drop-shadow-md mx-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackImage;
                    }}
                  />
                ) : (
                  <div className="w-full max-h-[250px] aspect-[4/3] bg-transparent rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <span className="text-xs text-slate-500 font-medium">No Image Provided</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {layout === 'minimal' && (
            <div className="flex flex-col items-center justify-center text-center w-full p-6 sm:p-10 relative">
              <div className="max-w-xl relative z-10 space-y-5 flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-800 shadow-sm border border-slate-100">
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>{settings.heroBadge || 'Hero Badge Pill'}</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                  {settings.heroTitle || 'Your Main Title Headline'}
                </h1>
                
                <p className="text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs leading-relaxed max-w-sm">
                  {settings.heroSubtitle || 'Your subtitle description will appear here to provide more context to your customers.'}
                </p>
                
                <div className="pt-2 flex gap-3 justify-center">
                  <div className="text-white text-[10px] font-bold px-6 py-2 rounded-full shadow-md" style={{ backgroundColor: settings.primaryColor || '#2563eb' }}>Shop Now</div>
                </div>
              </div>
              
              {settings.heroImage && (
                <div className="w-full max-w-2xl mt-8 relative z-10 flex justify-center">
                  <img 
                    src={imgUrl} 
                    alt="Hero Preview" 
                    className="w-full h-auto max-h-[220px] object-contain drop-shadow-md mx-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackImage;
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {layout === 'bold' && (
            <div className="relative flex items-center justify-center w-full min-h-[300px] p-6 sm:p-10">
              {/* Background Image */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={imgUrl} 
                  alt="Hero Background" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fallbackImage;
                  }}
                />
                <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
              </div>

              <div className="max-w-xl relative z-10 space-y-5 text-center flex flex-col items-center pt-8">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-white border border-white/20">
                  <Sun className="w-3 h-3 text-amber-300" />
                  <span>{settings.heroBadge || 'Hero Badge Pill'}</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.1] drop-shadow-lg">
                  {settings.heroTitle || 'Your Main Title Headline'}
                </h1>
                
                <p className="text-slate-200 text-[11px] sm:text-xs leading-relaxed max-w-sm drop-shadow">
                  {settings.heroSubtitle || 'Your subtitle description will appear here to provide more context to your customers.'}
                </p>
                
                <div className="pt-2 flex gap-3 justify-center">
                  <div className="bg-white text-slate-900 text-[10px] font-bold px-6 py-2.5 rounded-full shadow-lg">Shop Collection</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
