import React from 'react';
import { 
  X, 
  Keyboard, 
  Sparkles, 
  Plus, 
  Save, 
  Search, 
  Layers, 
  QrCode, 
  ShoppingBag, 
  FileText, 
  Users, 
  Globe, 
  Moon, 
  Settings, 
  Zap,
  Tag
} from 'lucide-react';

interface AdminShortcutCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const AdminShortcutCheatSheetModal: React.FC<AdminShortcutCheatSheetModalProps> = ({
  isOpen,
  onClose,
  isDark = true,
}) => {
  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcutGroups = [
    {
      group: 'Core Manager Actions',
      items: [
        {
          keys: [modKey, 'N'],
          label: 'Add Genuine Product',
          description: 'Opens new inventory form with auto-generated SKU & Barcode',
          icon: <Plus className="w-4 h-4" />,
          colorScheme: 'blue'
        },
        {
          keys: [modKey, 'S'],
          label: 'Save Settings & Changes',
          description: 'Saves current store configuration, SEO tags, or active form',
          icon: <Save className="w-4 h-4" />,
          colorScheme: 'emerald'
        },
        {
          keys: [modKey, 'K'],
          label: 'Quick Command Palette',
          description: 'Instant search & jump across catalog, orders, POS, and settings',
          icon: <Search className="w-4 h-4" />,
          colorScheme: 'purple'
        },
        {
          keys: [modKey, 'B'],
          label: 'Scan QR / Barcode',
          description: 'Opens interactive camera scanner for stock and POS checkouts',
          icon: <QrCode className="w-4 h-4" />,
          colorScheme: 'amber'
        },
        {
          keys: ['Esc'],
          label: 'Close Active Modal',
          description: 'Dismisses open dialogs, forms, scanners, and command palettes',
          icon: <X className="w-4 h-4" />,
          colorScheme: 'rose'
        },
      ]
    },
    {
      group: 'POS Terminal Pro',
      items: [
        {
          keys: ['F2'],
          label: 'Focus Customer Name',
          description: 'Jump instantly to the customer name field in POS',
          icon: <Users className="w-4 h-4" />,
          colorScheme: 'blue'
        },
        {
          keys: ['F4'],
          label: 'Focus Search/Scanner',
          description: 'Jump to the Barcode & Manual Product Search box',
          icon: <Search className="w-4 h-4" />,
          colorScheme: 'indigo'
        },
        {
          keys: ['F9'],
          label: 'Quick Checkout',
          description: 'Instantly finalize the POS transaction',
          icon: <Zap className="w-4 h-4" />,
          colorScheme: 'emerald'
        },
      ]
    },
    {
      group: 'Instant Tab Switching',
      items: [
        { keys: [modKey, '1'], label: 'Dashboard & Analytics', icon: <Layers className="w-4 h-4" />, colorScheme: 'slate' },
        { keys: [modKey, '2'], label: 'Inventory Management', icon: <ShoppingBag className="w-4 h-4" />, colorScheme: 'blue' },
        { keys: [modKey, '3'], label: 'POS Checkout Terminal', icon: <Zap className="w-4 h-4" />, colorScheme: 'amber' },
        { keys: [modKey, '4'], label: 'Customer Orders', icon: <FileText className="w-4 h-4" />, colorScheme: 'emerald' },
        { keys: [modKey, '5'], label: 'POS Sales History', icon: <FileText className="w-4 h-4" />, colorScheme: 'indigo' },
        { keys: [modKey, '6'], label: 'Staff & Roles', icon: <Users className="w-4 h-4" />, colorScheme: 'rose' },
        { keys: [modKey, '7'], label: 'Customers CRM', icon: <Users className="w-4 h-4" />, colorScheme: 'cyan' },
        { keys: [modKey, '8'], label: 'Offers & Discounts', icon: <Tag className="w-4 h-4" />, colorScheme: 'amber' },
        { keys: [modKey, '9'], label: 'SEO & Metadata', icon: <Globe className="w-4 h-4" />, colorScheme: 'emerald' },
        { keys: [modKey, '0'], label: 'Admin Settings', icon: <Settings className="w-4 h-4" />, colorScheme: 'slate' },
        { keys: [modKey, 'Shift', 'A'], label: 'Audit Logs & Security', icon: <FileText className="w-4 h-4" />, colorScheme: 'emerald' },
      ]
    },
    {
      group: 'System & Utility',
      items: [
        {
          keys: ['?'],
          label: 'Open Shortcuts Helper',
          description: 'Press Shift + ? or click shortcut button anywhere in Admin',
          icon: <Keyboard className="w-4 h-4" />,
          colorScheme: 'blue'
        },
        {
          keys: [modKey, 'Shift', 'L'],
          label: 'Toggle Dark / Light Theme',
          description: 'Switches between high-contrast dark and light mode',
          icon: <Moon className="w-4 h-4" />,
          colorScheme: 'indigo'
        },
      ]
    }
  ];

  const getColorClasses = (scheme: string) => {
    switch (scheme) {
      case 'blue':
        return isDark 
          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' 
          : 'bg-blue-100 text-blue-600 border-blue-200';
      case 'emerald':
        return isDark 
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
          : 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'purple':
        return isDark 
          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' 
          : 'bg-purple-100 text-purple-600 border-purple-200';
      case 'amber':
        return isDark 
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
          : 'bg-amber-100 text-amber-600 border-amber-200';
      case 'rose':
        return isDark 
          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
          : 'bg-rose-100 text-rose-600 border-rose-200';
      case 'indigo':
        return isDark 
          ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' 
          : 'bg-indigo-100 text-indigo-600 border-indigo-200';
      case 'cyan':
        return isDark 
          ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' 
          : 'bg-cyan-100 text-cyan-600 border-cyan-200';
      case 'slate':
      default:
        return isDark 
          ? 'bg-slate-800 text-slate-300 border-slate-700' 
          : 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-6 border-b flex items-center justify-between gap-4 ${
          isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50/90'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-sm ${
              isDark 
                ? 'bg-blue-600/15 text-blue-400 border-blue-500/30' 
                : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}>
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Admin Keyboard Shortcuts</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  isDark 
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  Pro Speed
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Navigate the Genuine Electronics Admin Portal with rapid single-stroke keystrokes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors ${
              isDark 
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <span>{group.group}</span>
                <div className={`h-px flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isDark 
                        ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700' 
                        : 'bg-slate-50/80 border-slate-200/90 hover:border-slate-300 hover:bg-white shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl border shrink-0 shadow-xs flex items-center justify-center ${getColorClasses(item.colorScheme)}`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          {item.label}
                        </div>
                        {item.description && (
                          <div className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className={`min-w-[24px] h-6 px-2 text-[11px] font-mono font-bold rounded-lg border flex items-center justify-center shadow-xs ${
                            isDark 
                              ? 'bg-slate-800 border-slate-700 text-slate-200 shadow-slate-950' 
                              : 'bg-white border-slate-300 text-slate-800 shadow-slate-100'
                          }`}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between text-xs ${
          isDark ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <span className="flex items-center gap-1.5">
            <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            <span className="font-medium">Shortcuts are active across all admin screens & POS modules.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

