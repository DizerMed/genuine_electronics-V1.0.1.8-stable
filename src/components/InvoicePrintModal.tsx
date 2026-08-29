import React from 'react';
import { Order, StoreSettings } from '../types';
import { InvoiceGenerator } from './InvoiceGenerator';

export interface InvoicePrintModalProps {
  order: Order;
  onClose: () => void;
  storeSettings?: StoreSettings;
  autoPrint?: boolean;
  defaultIncludeVat?: boolean;
  defaultDocType?: 'tax' | 'proforma' | 'delivery';
  isClientView?: boolean;
  hideTypeSwitcher?: boolean;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ 
  order, 
  onClose, 
  storeSettings,
  autoPrint = false,
  defaultIncludeVat,
  defaultDocType,
  isClientView = false,
  hideTypeSwitcher = false,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-700/80 w-full max-w-4xl max-h-[95vh] h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        <InvoiceGenerator
          order={order}
          onClose={onClose}
          storeSettings={storeSettings}
          autoPrint={autoPrint}
          defaultIncludeVat={defaultIncludeVat}
          defaultDocType={defaultDocType}
          isClientView={isClientView}
          hideTypeSwitcher={hideTypeSwitcher}
          showControls={true}
          className="h-full flex flex-col min-h-0"
        />
      </div>
    </div>
  );
};

export { InvoiceGenerator };
export default InvoicePrintModal;
