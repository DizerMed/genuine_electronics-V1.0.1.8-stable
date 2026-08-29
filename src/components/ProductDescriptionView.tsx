import React from 'react';
import { CheckCircle2, Info, List, Table as TableIcon, Sparkles } from 'lucide-react';

interface ProductDescriptionViewProps {
  description?: string;
  specs?: Record<string, string>;
  className?: string;
  showCardWrapper?: boolean;
}

/**
 * Parses and renders product descriptions in both Table/Spec format,
 * Rich HTML format, structured list with headers, or plain text.
 */
export const ProductDescriptionView: React.FC<ProductDescriptionViewProps> = ({
  description = '',
  specs,
  className = '',
  showCardWrapper = false,
}) => {
  if (!description && (!specs || Object.keys(specs).length === 0)) {
    return (
      <p className="text-slate-400 dark:text-slate-500 text-sm italic">
        No product description available.
      </p>
    );
  }

  const rawDesc = (description || '').trim();

  // Check if description is formatted HTML
  const isHtml = /<[a-z][\s\S]*>/i.test(rawDesc);

  // Check if description is a Markdown / structured Table with pipe syntax or [Section] headers
  const isMarkdownTable = rawDesc.includes('|') && rawDesc.includes('\n');
  const hasSectionHeaders = /^\[.+\]/m.test(rawDesc) || /^###?\s+/m.test(rawDesc);

  // If HTML format, safely render with refined styling
  if (isHtml) {
    return (
      <div className={`product-description-formatted space-y-4 text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed ${className}`}>
        <div
          className="prose prose-slate dark:prose-invert max-w-none 
            [&_h2]:text-base [&_h2]:sm:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:dark:text-white [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:dark:border-slate-800 [&_h2]:pb-1.5
            [&_h3]:text-sm [&_h3]:sm:text-base [&_h3]:font-bold [&_h3]:text-blue-600 [&_h3]:dark:text-blue-400 [&_h3]:mt-3 [&_h3]:mb-1.5
            [&_p]:mb-3 [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mb-4
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:mb-4
            [&_li]:text-slate-700 [&_li]:dark:text-slate-300
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-xs [&_table]:sm:text-sm [&_table]:rounded-xl [&_table]:overflow-hidden [&_table]:border [&_table]:border-slate-200 [&_table]:dark:border-slate-800
            [&_thead]:bg-slate-100 [&_thead]:dark:bg-slate-800 [&_thead]:text-slate-800 [&_thead]:dark:text-slate-200 [&_thead]:font-bold
            [&_th]:p-3 [&_th]:text-left [&_th]:border-b [&_th]:border-slate-200 [&_th]:dark:border-slate-800
            [&_td]:p-3 [&_td]:border-b [&_td]:border-slate-100 [&_td]:dark:border-slate-800/60
            [&_tr:nth-child(even)]:bg-slate-50/70 [&_tr:nth-child(even)]:dark:bg-slate-900/40
            [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:bg-blue-50/50 [&_blockquote]:dark:bg-blue-950/20 [&_blockquote]:p-3 [&_blockquote]:rounded-r-xl [&_blockquote]:my-3 [&_blockquote]:text-slate-700 [&_blockquote]:dark:text-slate-300
            [&_strong]:text-slate-900 [&_strong]:dark:text-white [&_strong]:font-bold"
          dangerouslySetInnerHTML={{ __html: sanitizeBasicHtml(rawDesc) }}
        />
      </div>
    );
  }

  // If Markdown table or structured sections
  if (isMarkdownTable || hasSectionHeaders) {
    return renderStructuredSections(rawDesc, className);
  }

  // Standard multi-line or bullet format
  const lines = rawDesc.split('\n').filter(l => l.trim().length > 0);
  const isBulletList = lines.every(l => /^[•\-\*\d\.\)\:]/.test(l.trim()));

  if (isBulletList) {
    return (
      <div className={`space-y-2 text-sm sm:text-base ${className}`}>
        {lines.map((line, idx) => {
          const clean = line.replace(/^[•\-\*\d\.\)\:]\s*/, '').trim();
          const hasColon = clean.includes(':');
          if (hasColon) {
            const [label, ...valParts] = clean.split(':');
            return (
              <div key={idx} className="flex items-start gap-2.5 bg-slate-50/60 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <span className="font-bold text-slate-900 dark:text-white">{label.trim()}: </span>
                  <span className="text-slate-600 dark:text-slate-300">{valParts.join(':').trim()}</span>
                </div>
              </div>
            );
          }
          return (
            <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
              <span>{clean}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Plain paragraphs
  return (
    <div className={`space-y-3 text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed ${className}`}>
      {rawDesc.split('\n\n').map((paragraph, idx) => (
        <p key={idx}>{paragraph}</p>
      ))}
    </div>
  );
};

function renderStructuredSections(content: string, className: string) {
  const lines = content.split('\n');
  const sections: { title?: string; type: 'table' | 'text'; rows: { key: string; val: string }[]; text: string[] }[] = [];
  
  let currentSection: { title?: string; type: 'table' | 'text'; rows: { key: string; val: string }[]; text: string[] } = {
    type: 'text',
    rows: [],
    text: [],
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Header match: [Header Name] or ### Header Name
    const headerMatch = line.match(/^\[(.*?)\]$/) || line.match(/^###?\s+(.*)$/);
    if (headerMatch) {
      if (currentSection.rows.length > 0 || currentSection.text.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        title: headerMatch[1].trim(),
        type: 'text',
        rows: [],
        text: [],
      };
      continue;
    }

    // Table line match: | Key | Value | or Key : Value or Key \t Value
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2 && !parts[0].startsWith('---')) {
        currentSection.type = 'table';
        currentSection.rows.push({
          key: parts[0],
          val: parts.slice(1).join(' | '),
        });
        continue;
      }
    } else if (line.includes('\t')) {
      const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        currentSection.type = 'table';
        currentSection.rows.push({
          key: parts[0],
          val: parts.slice(1).join(' '),
        });
        continue;
      }
    } else if (line.includes(':') && !line.startsWith('http')) {
      const [k, ...v] = line.split(':');
      if (k.length < 50) {
        currentSection.type = 'table';
        currentSection.rows.push({
          key: k.trim(),
          val: v.join(':').trim(),
        });
        continue;
      }
    }

    currentSection.text.push(line);
  }

  if (currentSection.rows.length > 0 || currentSection.text.length > 0) {
    sections.push(currentSection);
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {sections.map((sec, idx) => (
        <div key={idx} className="space-y-3">
          {sec.title && (
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {sec.title}
              </h4>
            </div>
          )}

          {sec.rows.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-sm">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sec.rows.map((r, rIdx) => (
                  <div
                    key={rIdx}
                    className={`grid grid-cols-1 sm:grid-cols-3 p-3 sm:px-4 sm:py-3 text-xs sm:text-sm gap-1 sm:gap-4 transition-colors ${
                      rIdx % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-900/30' : 'bg-white dark:bg-slate-900/70'
                    }`}
                  >
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{r.key}</span>
                    <span className="sm:col-span-2 font-bold text-slate-900 dark:text-white">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sec.text.length > 0 && (
            <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {sec.text.map((t, tIdx) => (
                <p key={tIdx}>{t}</p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Basic HTML sanitizer to strip dangerous script tags while preserving styling, tables, and headers.
 */
function sanitizeBasicHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/javascript:/gi, '');
}
