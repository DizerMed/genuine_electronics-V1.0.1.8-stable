import React, { useEffect } from 'react';
import { ChevronRight, Home, Layers, Tag, Sparkles, Zap, Search } from 'lucide-react';
import { createSEOSlug } from '../lib/seoManager';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  isCurrent?: boolean;
  badge?: string | number;
  subLabel?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHomeIcon?: boolean;
  injectSchema?: boolean;
  theme?: 'dark' | 'light';
  rightContent?: React.ReactNode;
  compactOnMobile?: boolean;
}

/**
 * Dynamic Breadcrumb Component for E-Commerce hierarchy, internal linking,
 * and Search Engine Bot indexing (Google Schema.org BreadcrumbList + Microdata).
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  className = '',
  showHomeIcon = true,
  injectSchema = true,
  theme = 'light',
  rightContent,
  compactOnMobile = false,
}) => {
  if (!items || items.length === 0) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://genuine-electronics.com';

  // Inject Schema.org BreadcrumbList JSON-LD for Googlebot / Search Crawlers
  useEffect(() => {
    if (!injectSchema || typeof document === 'undefined') return;

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': items.map((item, index) => {
        const itemUrl = item.href 
          ? (item.href.startsWith('http') ? item.href : `${currentOrigin}${item.href}`)
          : currentOrigin;

        return {
          '@type': 'ListItem',
          'position': index + 1,
          'name': item.label,
          'item': itemUrl,
        };
      }),
    };

    let scriptTag = document.getElementById('dynamic-breadcrumb-schema') as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'dynamic-breadcrumb-schema';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(schemaData, null, 2);

    return () => {
      // Optional cleanup if component unmounts
    };
  }, [items, injectSchema, currentOrigin]);

  const isDark = theme === 'dark';

  return (
    <nav
      aria-label="Breadcrumb"
      className={`w-full py-2.5 px-3 sm:px-4 rounded-2xl transition-all ${
        isDark
          ? 'bg-slate-800/80 border border-slate-700/80 text-slate-300'
          : 'bg-white/90 border border-slate-200/80 text-slate-600 shadow-xs'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        {/* Semantic Ordered List with Schema.org Microdata */}
        <ol
          itemScope
          itemType="https://schema.org/BreadcrumbList"
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium whitespace-nowrap min-w-0 flex-nowrap"
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1 || item.isCurrent;
            const fullHref = item.href 
              ? (item.href.startsWith('http') ? item.href : `${currentOrigin}${item.href}`)
              : undefined;

            return (
              <li
                key={`${item.label}-${index}`}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
                className={`flex items-center gap-1.5 sm:gap-2 min-w-0 ${
                  compactOnMobile && index < items.length - 2 && index > 0 ? 'hidden md:flex' : 'flex'
                }`}
              >
                {/* Separator icon (not before the first item) */}
                {index > 0 && (
                  <ChevronRight
                    aria-hidden="true"
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                      isDark ? 'text-slate-600' : 'text-slate-300'
                    }`}
                  />
                )}

                {/* Mobile ellipsis indication for collapsed items */}
                {compactOnMobile && index === 1 && items.length > 3 && (
                  <span className="md:hidden text-slate-400 font-bold px-1 select-none">…</span>
                )}

                {isLast ? (
                  // Current Page Item (Active Terminal Node)
                  <span
                    itemProp="item"
                    aria-current="page"
                    className={`inline-flex items-center gap-1.5 font-bold tracking-tight truncate max-w-[200px] sm:max-w-[320px] md:max-w-[450px] px-2 py-0.5 rounded-lg ${
                      isDark
                        ? 'bg-slate-700/60 text-white'
                        : 'bg-slate-100/90 text-slate-900 font-extrabold'
                    }`}
                    title={item.label}
                  >
                    {index === 0 && showHomeIcon && (
                      <Home className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    )}
                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                    <span itemProp="name" className="truncate">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-600 text-white leading-none">
                        {item.badge}
                      </span>
                    )}
                  </span>
                ) : (
                  // Clickable Link Item (Intermediate Nodes)
                  <a
                    itemProp="item"
                    href={item.href || '#'}
                    onClick={(e) => {
                      if (item.onClick) {
                        e.preventDefault();
                        item.onClick();
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 transition-colors px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 ${
                      isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-blue-600'
                    }`}
                    title={`Navigate to ${item.label}`}
                  >
                    {index === 0 && showHomeIcon && (
                      <Home className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 transition-colors shrink-0" />
                    )}
                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                    <span itemProp="name" className="truncate hover:underline">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.badge}
                      </span>
                    )}
                  </a>
                )}

                {/* Schema Position Meta */}
                <meta itemProp="position" content={String(index + 1)} />
                {fullHref && <meta itemProp="url" content={fullHref} />}
              </li>
            );
          })}
        </ol>

        {/* Optional Right Action Area (e.g. Back button, results count, filter tags) */}
        {rightContent && (
          <div className="shrink-0 flex items-center gap-2 pl-2">
            {rightContent}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Breadcrumb;
