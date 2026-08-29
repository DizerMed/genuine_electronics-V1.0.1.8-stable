import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Strikethrough,
  Type,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Sparkles,
  ClipboardPaste,
  Eye,
  Edit3,
  CheckCircle2,
  ShieldCheck,
  Zap,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Info,
  RotateCcw
} from 'lucide-react';
import { ProductDescriptionView } from './ProductDescriptionView';

interface TableRowItem {
  id: string;
  type: 'row' | 'header';
  key: string;
  value: string;
}

interface ProductDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDark?: boolean;
  category?: string;
}

export const ProductDescriptionEditor: React.FC<ProductDescriptionEditorProps> = ({
  value,
  onChange,
  isDark = false,
  category = 'General',
}) => {
  // Detect initial mode: If value contains table tags or markdown table/brackets, or starts with table
  const [mode, setMode] = useState<'table' | 'rich'>('table');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Table State
  const [tableRows, setTableRows] = useState<TableRowItem[]>(() => parseInitialValueToTable(value));
  
  // Rich Editor ref
  const richEditorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef(value);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Synchronize incoming external value changes if needed
  useEffect(() => {
    // Determine if initial content looks like rich HTML vs table
    if (value && value.includes('<table') || value.includes('class="prose') || value.includes('<h2>') || value.includes('<h3>')) {
      // Keep rich or table
    }
  }, []);

  // Update contentEditable when value changes externally
  useEffect(() => {
    if (mode === 'rich' && richEditorRef.current) {
      if (value !== lastHtmlRef.current) {
        richEditorRef.current.innerHTML = value || '';
        // Strip hardcoded theme-breaking colors
        const elements = richEditorRef.current.querySelectorAll('*');
        elements.forEach(el => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style.color === 'rgb(0, 0, 0)' || htmlEl.style.color === '#000000' || htmlEl.style.color === 'black') {
            htmlEl.style.color = '';
          }
          if (htmlEl.style.backgroundColor === 'rgb(255, 255, 255)' || htmlEl.style.backgroundColor === '#ffffff' || htmlEl.style.backgroundColor === 'white') {
            htmlEl.style.backgroundColor = '';
          }
        });
        
        lastHtmlRef.current = richEditorRef.current.innerHTML;
        if (value !== lastHtmlRef.current) {
           onChange(lastHtmlRef.current);
        }
      }
    }
  }, [mode, value]);

  // Update tableRows and propagate to parent
  const updateTableRows = (newRows: TableRowItem[]) => {
    setTableRows(newRows);
    const generatedHtml = exportTableToHtml(newRows);
    onChange(generatedHtml);
  };

  const handleAddRow = (afterIndex?: number) => {
    const newRow: TableRowItem = {
      id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      type: 'row',
      key: '',
      value: '',
    };
    if (afterIndex !== undefined) {
      const copy = [...tableRows];
      copy.splice(afterIndex + 1, 0, newRow);
      updateTableRows(copy);
    } else {
      updateTableRows([...tableRows, newRow]);
    }

    // Auto-focus next input on next tick
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('.spec-key-input, .spec-val-input');
      if (inputs.length > 0) {
        inputs[inputs.length - 2]?.focus();
      }
    }, 50);
  };

  const handleAddHeader = () => {
    const newHeader: TableRowItem = {
      id: 'hdr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      type: 'header',
      key: 'New Section Header',
      value: '',
    };
    updateTableRows([...tableRows, newHeader]);
  };

  const handleRowChange = (id: string, field: 'key' | 'value', val: string) => {
    const updated = tableRows.map((r) => (r.id === id ? { ...r, [field]: val } : r));
    updateTableRows(updated);
  };

  const handleDeleteRow = (id: string) => {
    const updated = tableRows.filter((r) => r.id !== id);
    updateTableRows(updated);
  };

  const handleMoveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === tableRows.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const copy = [...tableRows];
    const item = copy[index];
    copy.splice(index, 1);
    copy.splice(targetIdx, 0, item);
    updateTableRows(copy);
  };

  // Quick Preset Importer
  const handleLoadPreset = (presetName: string) => {
    const presets: Record<string, TableRowItem[]> = {
      electronics: [
        { id: 'h1', type: 'header', key: 'Performance & Display', value: '' },
        { id: 'r1', type: 'row', key: 'Display Type / Size', value: '4K Ultra HD Mini-LED' },
        { id: 'r2', type: 'row', key: 'Refresh Rate', value: '120Hz Native / 144Hz VRR' },
        { id: 'r3', type: 'row', key: 'Sound Output', value: 'Dolby Atmos 2.1ch Surround' },
        { id: 'h2', type: 'header', key: 'Connectivity & Power', value: '' },
        { id: 'r4', type: 'row', key: 'HDMI Ports', value: '4x HDMI 2.1 (eARC Supported)' },
        { id: 'r5', type: 'row', key: 'Power Consumption', value: '120W Eco Inverter' },
        { id: 'h3', type: 'header', key: 'Box Contents & Warranty', value: '' },
        { id: 'r6', type: 'row', key: 'In the Box', value: 'Smart Remote, Power Cable, Wall Mount, Manual' },
        { id: 'r7', type: 'row', key: 'Official Warranty', value: '2 Years Manufacturer SLA Warranty' },
      ],
      appliances: [
        { id: 'h1', type: 'header', key: 'Capacity & Cooling', value: '' },
        { id: 'r1', type: 'row', key: 'Net Capacity', value: '575 Litres Total' },
        { id: 'r2', type: 'row', key: 'Cooling Technology', value: 'Dual Inverter No-Frost' },
        { id: 'r3', type: 'row', key: 'Energy Rating', value: '5-Star Inverter Eco Efficiency' },
        { id: 'h2', type: 'header', key: 'Dimensions & Build', value: '' },
        { id: 'r4', type: 'row', key: 'Material / Finish', value: 'Anti-Fingerprint Stainless Steel' },
        { id: 'r5', type: 'row', key: 'Noise Level', value: 'Super Quiet 37 dB(A)' },
        { id: 'r6', type: 'row', key: 'Warranty', value: '10 Years Compressor Warranty' },
      ],
      machinery: [
        { id: 'h1', type: 'header', key: 'Engine & Output Specifications', value: '' },
        { id: 'r1', type: 'row', key: 'Cylinder Displacement', value: '70.7 cm³ / 4.3 cu.inch' },
        { id: 'r2', type: 'row', key: 'Power Output', value: '3.6 kW / 4.8 hp @ 9000 rpm' },
        { id: 'r3', type: 'row', key: 'Fuel Tank Volume', value: '0.75 Litre Heavy Duty Tank' },
        { id: 'h2', type: 'header', key: 'Cutting & Bar Specs', value: '' },
        { id: 'r4', type: 'row', key: 'Recommended Bar Length', value: '20" - 24" (50 - 60 cm)' },
        { id: 'r5', type: 'row', key: 'Chain Pitch', value: '3/8" High Strength' },
        { id: 'r6', type: 'row', key: 'Genuine Certification', value: '100% Original Sealed Import' },
      ],
    };

    const chosen = presets[presetName] || presets.electronics;
    updateTableRows(chosen);
  };

  // Fast Bulk Paste Parser
  const handleApplyPaste = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split('\n');
    const parsedRows: TableRowItem[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Section header: [Header] or ### Header
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        parsedRows.push({
          id: 'hdr-' + idx + '-' + Date.now(),
          type: 'header',
          key: trimmed.slice(1, -1).trim(),
          value: '',
        });
        return;
      }
      if (trimmed.startsWith('#')) {
        parsedRows.push({
          id: 'hdr-' + idx + '-' + Date.now(),
          type: 'header',
          key: trimmed.replace(/^#+\s*/, '').trim(),
          value: '',
        });
        return;
      }

      // Tab separated (Excel / Google Sheets)
      if (trimmed.includes('\t')) {
        const [k, ...v] = trimmed.split('\t');
        parsedRows.push({
          id: 'row-' + idx + '-' + Date.now(),
          type: 'row',
          key: k.trim(),
          value: v.join(' ').trim(),
        });
        return;
      }

      // Pipe separated (Markdown table)
      if (trimmed.includes('|')) {
        const parts = trimmed.split('|').map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2 && !parts[0].startsWith('---')) {
          parsedRows.push({
            id: 'row-' + idx + '-' + Date.now(),
            type: 'row',
            key: parts[0],
            value: parts.slice(1).join(' | '),
          });
          return;
        }
      }

      // Colon separated
      if (trimmed.includes(':')) {
        const [k, ...v] = trimmed.split(':');
        parsedRows.push({
          id: 'row-' + idx + '-' + Date.now(),
          type: 'row',
          key: k.trim(),
          value: v.join(':').trim(),
        });
        return;
      }

      // Plain bullet line
      parsedRows.push({
        id: 'row-' + idx + '-' + Date.now(),
        type: 'row',
        key: 'Feature',
        value: trimmed.replace(/^[•\-\*]\s*/, ''),
      });
    });

    if (parsedRows.length > 0) {
      updateTableRows([...tableRows, ...parsedRows]);
      setPasteText('');
      setPasteModalOpen(false);
    }
  };

  // Rich Text Editor Commands
  const executeRichCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (richEditorRef.current) {
      const html = richEditorRef.current.innerHTML;
      lastHtmlRef.current = html;
      onChange(html);
    }
  };

  const handleInsertRichTable = () => {
    const tableHtml = `
      <table class="w-full border-collapse my-3 text-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <thead>
          <tr class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            <th class="p-2.5 text-left border-b border-slate-200 dark:border-slate-700">Specification</th>
            <th class="p-2.5 text-left border-b border-slate-200 dark:border-slate-700">Detail / Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="p-2.5 border-b border-slate-100 dark:border-slate-800 font-semibold">Model / SKU</td>
            <td class="p-2.5 border-b border-slate-100 dark:border-slate-800">Genuine Series 2026</td>
          </tr>
          <tr>
            <td class="p-2.5 border-b border-slate-100 dark:border-slate-800 font-semibold">Power Rating</td>
            <td class="p-2.5 border-b border-slate-100 dark:border-slate-800">220-240V ~ 50Hz Eco Inverter</td>
          </tr>
          <tr>
            <td class="p-2.5 border-b border-slate-100 dark:border-slate-800 font-semibold">Warranty</td>
            <td class="p-2.5 border-b border-slate-100 dark:border-slate-800">Official 2-Year Manufacturer SLA</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    executeRichCommand('insertHTML', tableHtml);
  };

  const handleInsertCallout = () => {
    const calloutHtml = `
      <blockquote class="border-l-4 border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 p-3 rounded-r-xl my-3 text-slate-800 dark:text-slate-200 text-sm">
        <strong>⚡ 100% Certified Genuine:</strong> Direct authorized import with factory-sealed serial number and official East African warranty support.
      </blockquote>
      <p><br></p>
    `;
    executeRichCommand('insertHTML', calloutHtml);
  };

  return (
    <div className={`rounded-2xl border ${isDark ? 'bg-slate-900/90 border-slate-700' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
      {/* Top Header & Mode Switcher */}
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/60">
        {/* Two Options Selector */}
        <div className="flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setMode('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              mode === 'table'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Table / Spec Sheet Format</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('rich')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              mode === 'rich'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Formatted Rich Text</span>
          </button>
        </div>

        {/* View / Preview Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'editor' ? 'preview' : 'editor')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            {activeTab === 'preview' ? (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Back to Editor</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                <span>Live Storefront Preview</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Body */}
      {activeTab === 'preview' ? (
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-900/50 min-h-[300px]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Eye className="w-4 h-4 text-blue-500" />
            <span>Customer-Facing Description Preview</span>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/70 shadow-sm">
            <ProductDescriptionView description={value} />
          </div>
        </div>
      ) : (
        <div>
          {/* MODE 1: Table / Spec Sheet Format Editor */}
          {mode === 'table' && (
            <div className="p-4 sm:p-5 space-y-4">
              {/* Presets and Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-bold text-slate-400 text-[11px] uppercase mr-1">Load Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('electronics')}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold text-[11px] hover:bg-blue-100 transition-colors"
                  >
                    Smart TVs & Audio
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('appliances')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 font-bold text-[11px] hover:bg-emerald-100 transition-colors"
                  >
                    Fridges & Ovens
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('machinery')}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 font-bold text-[11px] hover:bg-amber-100 transition-colors"
                  >
                    Chainsaws & Power Tools
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPasteModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl border border-dashed border-blue-400 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300 text-xs font-bold hover:bg-blue-100/60 transition-all flex items-center gap-1.5"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste Table / Excel List</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddHeader}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:border-blue-500 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-500" />
                    <span>+ Add Section Header</span>
                  </button>
                </div>
              </div>

              {/* Table Rows List */}
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {tableRows.length === 0 ? (
                  <div className="text-center py-10 border border-dashed rounded-2xl border-slate-300 dark:border-slate-700 p-6 text-slate-400">
                    <Table className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold">No specifications added yet</p>
                    <p className="text-xs mt-1 text-slate-500">Click below or paste your table from Excel / Google Sheets</p>
                    <div className="mt-4 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleAddRow()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500"
                      >
                        + Add First Row
                      </button>
                    </div>
                  </div>
                ) : (
                  tableRows.map((item, index) => {
                    if (item.type === 'header') {
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 mt-4 first:mt-0"
                        >
                          <Sparkles className="w-4 h-4 text-blue-500 shrink-0 ml-1" />
                          <input
                            type="text"
                            value={item.key}
                            onChange={(e) => handleRowChange(item.id, 'key', e.target.value)}
                            placeholder="Section Header (e.g., Performance, Connectivity, Box Contents)"
                            className="flex-1 bg-transparent font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider focus:outline-none border-none"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveRow(index, 'up')}
                              disabled={index === 0}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30"
                              title="Move Up"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRow(index, 'down')}
                              disabled={index === tableRows.length - 1}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30"
                              title="Move Down"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(item.id)}
                              className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500 rounded"
                              title="Delete Header"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 group hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                      >
                        {/* Key Column */}
                        <div className="w-1/3 sm:w-2/5 min-w-[110px]">
                          <input
                            type="text"
                            value={item.key}
                            onChange={(e) => handleRowChange(item.id, 'key', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddRow(index);
                              }
                            }}
                            placeholder="Feature / Key (e.g. Wattage)"
                            className="spec-key-input w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        {/* Value Column */}
                        <div className="flex-1 min-w-[120px]">
                          <input
                            type="text"
                            value={item.value}
                            onChange={(e) => handleRowChange(item.id, 'value', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddRow(index);
                              }
                            }}
                            placeholder="Detail / Value (e.g. 100W Inverter)"
                            className="spec-val-input w-full px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleAddRow(index)}
                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg"
                            title="Insert Row Below"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveRow(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 disabled:opacity-30"
                            title="Move Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveRow(index, 'down')}
                            disabled={index === tableRows.length - 1}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 disabled:opacity-30"
                            title="Move Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(item.id)}
                            className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500 rounded-lg"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Add Row Button */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleAddRow()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Specification Row</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateTableRows([])}
                  className="px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg font-semibold transition-colors"
                >
                  Clear All Rows
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: Rich Formatted Text Editor */}
          {mode === 'rich' && (
            <div className="p-4 sm:p-5 space-y-3">
              {/* Rich Text Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                
                {/* Font Family & Size */}
                <select
                  onChange={(e) => executeRichCommand('fontName', e.target.value)}
                  className="p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                  title="Font Family"
                >
                  <option value="">Font Family</option>
                  <option value="Arial" style={{ fontFamily: 'Arial' }}>Arial</option>
                  <option value="Courier New" style={{ fontFamily: 'Courier New' }}>Courier New</option>
                  <option value="Georgia" style={{ fontFamily: 'Georgia' }}>Georgia</option>
                  <option value="Impact" style={{ fontFamily: 'Impact' }}>Impact</option>
                  <option value="Tahoma" style={{ fontFamily: 'Tahoma' }}>Tahoma</option>
                  <option value="Times New Roman" style={{ fontFamily: 'Times New Roman' }}>Times New Roman</option>
                  <option value="Trebuchet MS" style={{ fontFamily: 'Trebuchet MS' }}>Trebuchet MS</option>
                  <option value="Verdana" style={{ fontFamily: 'Verdana' }}>Verdana</option>
                  <option value="'Plus Jakarta Sans', sans-serif" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Jakarta (Modern)</option>
                  <option value="Inter, sans-serif" style={{ fontFamily: 'Inter, sans-serif' }}>Inter (Clean)</option>
                  <option value="'Playfair Display', serif" style={{ fontFamily: "'Playfair Display', serif" }}>Playfair (Elegant)</option>
                  <option value="'Poppins', sans-serif" style={{ fontFamily: "'Poppins', sans-serif" }}>Poppins (Friendly)</option>
                  <option value="'Cinzel', serif" style={{ fontFamily: "'Cinzel', serif" }}>Cinzel (Luxury)</option>
                  <option value="'Oswald', sans-serif" style={{ fontFamily: "'Oswald', sans-serif" }}>Oswald (Bold)</option>
                  <option value="'Roboto', sans-serif" style={{ fontFamily: "'Roboto', sans-serif" }}>Roboto (Tech)</option>
                </select>

                <select
                  onChange={(e) => executeRichCommand('fontSize', e.target.value)}
                  className="p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                  title="Font Size"
                >
                  <option value="">Size</option>
                  <option value="1">Small</option>
                  <option value="2">Normal</option>
                  <option value="3">Large</option>
                  <option value="4">Huge</option>
                  <option value="5">Title</option>
                </select>
                
                <input 
                  type="color" 
                  onChange={(e) => executeRichCommand('foreColor', e.target.value)}
                  className="w-7 h-7 p-0 border-0 rounded cursor-pointer bg-transparent"
                  title="Text Color"
                />
                <input 
                  type="color" 
                  onChange={(e) => executeRichCommand('hiliteColor', e.target.value)}
                  className="w-7 h-7 p-0 border-0 rounded cursor-pointer bg-transparent"
                  title="Background Color"
                />


                <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

                {/* Headings */}
                <button
                  type="button"
                  onClick={() => executeRichCommand('formatBlock', '<h2>')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-extrabold flex items-center gap-1"
                  title="Heading 2"
                >
                  <Heading2 className="w-4 h-4" />
                  <span>H2</span>
                </button>
                <button
                  type="button"
                  onClick={() => executeRichCommand('formatBlock', '<h3>')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-extrabold flex items-center gap-1"
                  title="Heading 3"
                >
                  <Heading3 className="w-4 h-4" />
                  <span>H3</span>
                </button>

                <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

                {/* Inline Styles */}
                <button
                  type="button"
                  onClick={() => executeRichCommand('bold')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeRichCommand('italic')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 italic"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeRichCommand('underline')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 underline"
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeRichCommand('strikethrough')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 line-through"
                  title="Strikethrough"
                >
                  <Strikethrough className="w-4 h-4" />
                </button>


                <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

                
                <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

                {/* Alignment */}
                <button
                  type="button"
                  onClick={() => executeRichCommand('justifyLeft')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  title="Align Left"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeRichCommand('justifyCenter')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  title="Align Center"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeRichCommand('justifyRight')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  title="Align Right"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeRichCommand('justifyFull')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  title="Justify"
                >
                  <AlignJustify className="w-4 h-4" />
                </button>

                {/* Lists */}
                <button
                  type="button"
                  onClick={() => executeRichCommand('insertUnorderedList')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeRichCommand('insertOrderedList')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

                {/* Insert Elements */}
                <button
                  type="button"
                  onClick={handleInsertRichTable}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-600 shadow-sm"
                  title="Insert 2-Column Specifications Table"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>+ Specs Table</span>
                </button>

                <button
                  type="button"
                  onClick={handleInsertCallout}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-600 shadow-sm"
                  title="Insert Genuine Verified Box"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>+ Genuine Callout</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeRichCommand('removeFormat')}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 ml-auto"
                  title="Clear Formatting"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Editable Surface */}
              <div
                ref={richEditorRef}
                contentEditable
                suppressContentEditableWarning
                onPaste={(e) => {
                  setTimeout(() => {
                    if (richEditorRef.current) {
                      const elements = richEditorRef.current.querySelectorAll('*');
                      elements.forEach(el => {
                        const htmlEl = el as HTMLElement;
                        // Only strip colors if they are purely black or white which breaks dark mode,
                        // or just strip all background/color styles on paste to be safe.
                        if (htmlEl.style.color === 'rgb(0, 0, 0)' || htmlEl.style.color === '#000000' || htmlEl.style.color === 'black') {
                          htmlEl.style.color = '';
                        }
                        if (htmlEl.style.backgroundColor === 'rgb(255, 255, 255)' || htmlEl.style.backgroundColor === '#ffffff' || htmlEl.style.backgroundColor === 'white') {
                          htmlEl.style.backgroundColor = '';
                        }
                      });
                      const html = richEditorRef.current.innerHTML;
                      lastHtmlRef.current = html;
                      onChange(html);
                    }
                  }, 10);
                }}
                onInput={(e) => {
                  const html = e.currentTarget.innerHTML;
                  lastHtmlRef.current = html;
                  onChange(html);
                }}
                className="w-full min-h-[260px] max-h-[450px] overflow-y-auto p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />

              {/* Paste helper note */}
              <p className="text-[11px] text-slate-400">
                You can directly paste formatted text, tables from Word / Web, or bullet lists here. Press <strong>Shift+Enter</strong> for a single line break or <strong>Enter</strong> for a new paragraph / list item.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Paste Modal for Table Format */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Paste Excel / Spec Sheet Text</h3>
              </div>
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paste rows copied from Excel, Google Sheets, PDF tables, or colon-separated text (e.g. <code>Display: 75 Inch 4K</code>). Add <code>[Section Header]</code> to create grouped headers.
            </p>

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="[Display & Video]&#10;Screen Size: 75 Inch&#10;Resolution: 3840 x 2160 4K UHD&#10;HDR Format: Dolby Vision IQ&#10;&#10;[Audio & Power]&#10;Speaker Power: 60W 2.1.2ch&#10;Power Supply: 220-240V ~ 50Hz"
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPaste}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20"
              >
                Import into Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Converts table rows back to structured HTML representation
 */
function exportTableToHtml(rows: TableRowItem[]): string {
  if (rows.length === 0) return '';

  let html = '<div class="product-specs-table-container space-y-4">';
  let inTable = false;

  rows.forEach((r) => {
    if (r.type === 'header') {
      if (inTable) {
        html += '</tbody></table>';
        inTable = false;
      }
      html += `<h3 class="text-sm font-bold text-blue-600 dark:text-blue-400 mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">${escapeHtml(r.key)}</h3>`;
    } else {
      if (!inTable) {
        html += '<table class="w-full border-collapse my-2 text-xs sm:text-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800"><tbody>';
        inTable = true;
      }
      html += `<tr class="border-b border-slate-100 dark:border-slate-800/80">
        <td class="p-2.5 sm:px-3.5 sm:py-2.5 font-semibold text-slate-600 dark:text-slate-300 w-1/3 bg-slate-50/50 dark:bg-slate-900/30">${escapeHtml(r.key)}</td>
        <td class="p-2.5 sm:px-3.5 sm:py-2.5 font-bold text-slate-900 dark:text-white">${escapeHtml(r.value)}</td>
      </tr>`;
    }
  });

  if (inTable) {
    html += '</tbody></table>';
  }

  html += '</div>';
  return html;
}

function parseInitialValueToTable(val: string): TableRowItem[] {
  if (!val) {
    return [
      { id: 'h1', type: 'header', key: 'General Specifications', value: '' },
      { id: 'r1', type: 'row', key: 'Model / Series', value: 'Certified Genuine 2026' },
      { id: 'r2', type: 'row', key: 'Power / Wattage', value: '100W Eco Inverter' },
      { id: 'r3', type: 'row', key: 'Warranty & SLA', value: '1 Year Manufacturer Warranty' },
    ];
  }

  const rows: TableRowItem[] = [];
  const lines = val.split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('<h3') || trimmed.startsWith('<h2>') || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      const cleanHeader = trimmed.replace(/<[^>]+>/g, '').replace(/[\[\]]/g, '').trim();
      rows.push({
        id: 'hdr-' + idx,
        type: 'header',
        key: cleanHeader,
        value: '',
      });
    } else if (trimmed.includes('<tr') || trimmed.includes('<td')) {
      const cells = trimmed.match(/<td[^>]*>(.*?)<\/td>/gi);
      if (cells && cells.length >= 2) {
        const k = cells[0].replace(/<[^>]+>/g, '').trim();
        const v = cells[1].replace(/<[^>]+>/g, '').trim();
        rows.push({
          id: 'row-' + idx,
          type: 'row',
          key: k,
          value: v,
        });
      }
    } else if (trimmed.includes(':') && !trimmed.startsWith('http')) {
      const [k, ...v] = trimmed.split(':');
      rows.push({
        id: 'row-' + idx,
        type: 'row',
        key: k.trim(),
        value: v.join(':').trim(),
      });
    } else if (trimmed.includes('\t')) {
      const [k, ...v] = trimmed.split('\t');
      rows.push({
        id: 'row-' + idx,
        type: 'row',
        key: k.trim(),
        value: v.join(' ').trim(),
      });
    }
  });

  if (rows.length === 0) {
    return [
      { id: 'h1', type: 'header', key: 'General Overview', value: '' },
      { id: 'r1', type: 'row', key: 'Product Details', value: val.replace(/<[^>]+>/g, '') },
    ];
  }

  return rows;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
