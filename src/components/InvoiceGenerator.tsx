import React, { useState, useRef, useEffect } from 'react';
import { Order, formatTZS, formatToGMT3, BRAND_LOGO_URL, StoreSettings } from '../types';
import { 
  Printer, Download, X, CheckCircle2, ShieldCheck, Smartphone, 
  Building2, QrCode, Share2, FileText, CreditCard,
  Check, Copy, Percent, Stamp, Truck, AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { groupCartItemsByTaxStatus } from '../utils/taxUtils';
import { buildReceiptVerificationUrl } from '../services/receiptQrService';

export interface InvoiceGeneratorProps {
  order: Order;
  onClose?: () => void;
  storeSettings?: StoreSettings;
  autoPrint?: boolean;
  showControls?: boolean;
  className?: string;
  defaultIncludeVat?: boolean;
  defaultDocType?: 'tax' | 'proforma' | 'delivery';
  isClientView?: boolean;
  hideTypeSwitcher?: boolean;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ 
  order, 
  onClose, 
  storeSettings,
  autoPrint = false,
  showControls = true,
  className = '',
  defaultIncludeVat,
  defaultDocType = (order.paymentStatus === 'Paid' || order.status === 'Completed' ? 'tax' : 'proforma'),
  isClientView = false,
  hideTypeSwitcher = false,
}) => {
  const [docType, setDocType] = useState<'tax' | 'proforma' | 'delivery'>(defaultDocType);
  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copiedInvoiceNo, setCopiedInvoiceNo] = useState(false);
  const [showShareFormatModal, setShowShareFormatModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Determine initial VAT checked state:
  // 1. Explicit prop override if provided
  // 2. If all products in order items are explicitly VAT exempt / non-VAT, set to false
  // 3. Order's includeVat boolean if present
  // 4. Store settings VAT rate
  const initialVatChecked = (() => {
    if (defaultIncludeVat !== undefined) return defaultIncludeVat;
    if (order.items && order.items.length > 0) {
      const allItemsExempt = order.items.every(item => item.product?.isVatInclusive === false);
      if (allItemsExempt) return false;
    }
    if (order.includeVat !== undefined) {
      if (order.includeVat === false) return false;
      if (order.vatPercentage !== undefined && Number(order.vatPercentage) === 0) return false;
      if (order.tax !== undefined && Number(order.tax) === 0) return false;
      return true;
    }
    if (order.vatPercentage !== undefined && Number(order.vatPercentage) === 0) return false;
    if (order.tax !== undefined && Number(order.tax) === 0) return false;
    if (storeSettings?.vatPercentage !== undefined && Number(storeSettings.vatPercentage) === 0) return false;
    if (order.items && order.items.length > 0) {
      const hasExplicitVatInfo = order.items.some(item => item.product?.isVatInclusive !== undefined);
      if (hasExplicitVatInfo) {
        return order.items.some(item => item.product?.isVatInclusive !== false);
      }
    }
    return true;
  })();

  const [includeVat, setIncludeVat] = useState<boolean>(initialVatChecked);

  const shareDropdownRef = useRef<HTMLDivElement>(null);
  const shareDropdownActionRef = useRef<HTMLDivElement>(null);

  // Close share dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shareDropdownRef.current && !shareDropdownRef.current.contains(event.target as Node) &&
        shareDropdownActionRef.current && !shareDropdownActionRef.current.contains(event.target as Node)
      ) {
        setShowShareFormatModal(false);
      }
    };
    if (showShareFormatModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareFormatModal]);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  /**
   * Unified, high-fidelity canvas generation builder for A4 Invoices.
   * Standardizes element width, font rendering, resolution scale, and removes no-print items.
   */
  const generateInvoiceCanvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
    return await toCanvas(element, {
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      filter: (node) => { if (node instanceof HTMLElement && node.classList.contains('no-print')) return false; return true; },
    });
  };

  /**
   * Unified PDF document builder that converts a high-res canvas to an A4 PDF.
   */
  const buildInvoicePDFDoc = (canvas: HTMLCanvasElement): jsPDF => {
    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // Single-page A4 document check: if height is close to A4 (up to 25% taller), scale to fit 1 page cleanly
    if (imgHeight <= pdfHeight * 1.25) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, imgHeight));
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 15) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
    }

    return pdf;
  };

  const getCleanInvoiceFilename = (extension: 'pdf' | 'png') => {
    const cleanNo = (order.id || 'ORDER').replace('#', '');
    const docPrefix = docType === 'delivery' ? 'DeliveryNote' : docType === 'proforma' ? 'Proforma' : 'TaxInvoice';
    return `${docPrefix}_${invoiceNo}_${cleanNo}.${extension}`;
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsGeneratingPDF(true);

    try {
      const canvas = await generateInvoiceCanvas(invoiceRef.current);
      const pdf = buildInvoicePDFDoc(canvas);
      const filename = getCleanInvoiceFilename('pdf');

      try {
        pdf.save(filename);
      } catch (e) {
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to generate PDF invoice:', err);
      alert('Could not generate PDF file directly. Opening system print window instead.');
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Pricing & Tax Calculations based on VAT Check status and item-level product details
  const defaultStoreVatPct = Math.min(100, Math.max(0, Number(storeSettings?.vatPercentage ?? 18)));
  const baseOrderVatPct = (order.vatPercentage !== undefined && order.vatPercentage > 0)
    ? order.vatPercentage
    : defaultStoreVatPct;

  const activeVatPercentage = includeVat ? baseOrderVatPct : 0;
  const discountAmount = order.discount ?? 0;

  // Dynamic extra costs list or fallback to difference/provided fee
  const orderExtraCosts = (order.extraCosts && Array.isArray(order.extraCosts) && order.extraCosts.length > 0)
    ? order.extraCosts
    : [];

  const taxAnalysis = groupCartItemsByTaxStatus(order.items || [], {
    vatPercentage: activeVatPercentage,
    includeVat,
    discount: discountAmount,
    extraCosts: orderExtraCosts,
  });

  const calculatedTax = taxAnalysis.taxAmount;
  const calculatedSubtotal = taxAnalysis.netSubtotal;

  const extraCostsTotal = orderExtraCosts.length > 0
    ? taxAnalysis.extraCostsTotal
    : (order.totalAmount && order.totalAmount > taxAnalysis.totalBeforeExtra
        ? (order.totalAmount - taxAnalysis.totalBeforeExtra)
        : 0);

  const grandTotal = taxAnalysis.totalBeforeExtra + extraCostsTotal;

  const cleanOrderNo = (order.id || 'ORDER').replace('#', '');
  const invoiceNo = `INV-${cleanOrderNo}`;
  const orderDate = order.createdAt ? formatToGMT3(order.createdAt) : new Date().toLocaleDateString('en-GB');

  const getInvoiceText = () => {
    const docTitle = docType === 'tax' 
      ? (includeVat && activeVatPercentage > 0 ? 'OFFICIAL TRA TAX INVOICE' : 'COMMERCIAL SALES INVOICE')
      : docType === 'proforma' 
      ? 'PROFORMA INVOICE / PRICE QUOTATION' 
      : 'DELIVERY NOTE & PACKING SLIP';

    let msg = `🧾 *${docTitle}*\n`;
    msg += `*${storeSettings?.storeName || 'Genuine Electronics Tanzania Ltd'}*\n`;
    msg += `📍 ${storeSettings?.address || 'Kariakoo, Dar es Salaam Tanzania'}\n`;
    msg += `📞 Hotline: ${storeSettings?.phone || '+255 768 929 203'} | TIN: ${storeSettings?.tin || '104-982-371'}\n`;
    msg += `----------------------------------------\n`;
    msg += `📄 *Doc Reference:* ${invoiceNo}\n`;
    msg += `📅 *Date & Time:* ${orderDate}\n`;
    if (order.customerName) msg += `👤 *Customer / Buyer:* ${order.customerName}\n`;
    if (order.customerPhone) msg += `📞 *Phone:* ${order.customerPhone}\n`;
    if (order.customerTin) msg += `🏢 *Buyer TIN:* ${order.customerTin}\n`;
    if (order.shippingAddress) msg += `📍 *Delivery Address:* ${order.shippingAddress}${order.city ? `, ${order.city}` : ''}\n`;
    msg += `----------------------------------------\n*ORDER ITEMS:*\n`;
    
    (order.items || []).forEach((item, idx) => {
      const price = item.price || item.product?.price || 0;
      const total = price * item.quantity;
      const vatTag = includeVat && item.product?.isVatInclusive !== false ? ' [VAT]' : '';
      msg += `${idx + 1}. ${item.product?.name || 'Item'}${vatTag}\n   Qty: ${item.quantity} x ${formatTZS(price)} = ${formatTZS(total)}\n`;
    });
    
    if (orderExtraCosts.length > 0) {
      msg += `----------------------------------------\n*EXTRA SERVICES & DELIVERY:*\n`;
      orderExtraCosts.forEach(c => {
        msg += `• ${c.name}: +${formatTZS(c.amount)}\n`;
      });
    }

    msg += `----------------------------------------\n`;
    if (includeVat && activeVatPercentage > 0 && calculatedTax > 0) {
      msg += `Net Subtotal: ${formatTZS(calculatedSubtotal)}\n`;
      msg += `TRA VAT (${activeVatPercentage}%): ${formatTZS(calculatedTax)}\n`;
    } else {
      msg += `Subtotal: ${formatTZS(calculatedSubtotal)}\n`;
    }
    if (discountAmount > 0) {
      msg += `Discount Applied: -${formatTZS(discountAmount)}\n`;
    }
    msg += `💰 *GRAND TOTAL:* ${formatTZS(grandTotal)}\n`;

    if (order.isLoan) {
      const total = Number(order.totalAmount ?? grandTotal);
      const repayments = order.loanRepayments || [];
      const repaymentsSum = repayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const initialDeposit = Number(order.downPayment ?? 0);
      const totalPaid = Math.min(total, initialDeposit + repaymentsSum);
      const remainingBalance = Math.max(0, total - totalPaid);

      msg += `----------------------------------------\n`;
      msg += `📋 *CREDIT / INSTALLMENT STATUS:*\n`;
      msg += `Down Payment: ${formatTZS(initialDeposit)}\n`;
      msg += `Total Paid: ${formatTZS(totalPaid)}\n`;
      msg += `Remaining Loan Balance: ${formatTZS(remainingBalance)}\n`;
      if (order.loanDueDate) msg += `Repayment Due: ${order.loanDueDate}\n`;
    }
    
    if (docType !== 'delivery' && selectedMethod) {
      msg += `----------------------------------------\n*OFFICIAL SETTLEMENT ACCOUNT:*\n`;
      msg += `Payment Type: ${selectedMethod.provider} (${selectedMethod.type})\n`;
      msg += `Account / Till: ${selectedMethod.accountNumber}\n`;
      msg += `Account Name: ${selectedMethod.accountName}\n`;
      if (selectedMethod.instructions) msg += `Instructions: ${selectedMethod.instructions}\n`;
    }

    if (showStamp) {
      msg += `\n★ OFFICIALLY STAMPED & AUTHORIZED - Genuine Electronics Tanzania Ltd ★\n`;
    }

    msg += `\nVerify Authenticity Online: https://genuine-electronics.com/verify-invoice?id=${invoiceNo}\n`;
    msg += `Thank you for choosing Genuine Electronics!`;

    return msg;
  };

  const handleShareMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareFormatModal(!showShareFormatModal);
  };

  const shareNative = async (format: 'text' | 'image' | 'pdf') => {
    setIsSharing(true);
    setShowShareFormatModal(false);
    try {
      if (format === 'text') {
        const text = getInvoiceText();
        if (navigator.share) {
          try {
            await navigator.share({
              title: `${docType === 'tax' ? 'Invoice' : docType === 'proforma' ? 'Proforma' : 'Delivery Note'} ${invoiceNo}`,
              text: text
            });
          } catch (shareErr: any) {
            if (shareErr?.name !== 'AbortError') {
              await navigator.clipboard.writeText(text);
              alert("Invoice summary copied to clipboard!");
            }
          }
        } else {
          await navigator.clipboard.writeText(text);
          alert("Invoice summary copied to clipboard!");
        }
      } else if (format === 'image') {
        if (!invoiceRef.current) return;
        const canvas = await generateInvoiceCanvas(invoiceRef.current);
        
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const fileName = getCleanInvoiceFilename('png');
          const file = new File([blob], fileName, { type: 'image/png' });

          let shared = false;
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: `${docType === 'tax' ? 'Invoice' : docType === 'proforma' ? 'Proforma' : 'Delivery Note'} ${invoiceNo}`,
                files: [file]
              });
              shared = true;
            } catch (err: any) {
              if (err?.name !== 'AbortError') {
                console.warn('Share not permitted, falling back to download:', err?.message || err);
              } else {
                shared = true;
              }
            }
          }
          if (!shared) {
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }, 'image/png', 1.0);
        
      } else if (format === 'pdf') {
        if (!invoiceRef.current) return;
        const canvas = await generateInvoiceCanvas(invoiceRef.current);
        const pdf = buildInvoicePDFDoc(canvas);
        const pdfBlob = pdf.output('blob');
        const fileName = getCleanInvoiceFilename('pdf');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        let shared = false;
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `${docType === 'tax' ? 'Invoice' : docType === 'proforma' ? 'Proforma' : 'Delivery Note'} ${invoiceNo}`,
              files: [file]
            });
            shared = true;
          } catch (err: any) {
            if (err?.name !== 'AbortError') {
              console.warn('Share not permitted, falling back to download:', err?.message || err);
            } else {
              shared = true;
            }
          }
        }
        if (!shared) {
          try {
            pdf.save(fileName);
          } catch (e) {
            const blobUrl = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      }
    } catch (err) {
      console.error('Error during share export:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const copyInvoiceText = () => {
    navigator.clipboard.writeText(invoiceNo);
    setCopiedInvoiceNo(true);
    setTimeout(() => setCopiedInvoiceNo(false), 2000);
  };

  const whatsappMessage = encodeURIComponent(
    `Hi Genuine Electronics, I have placed Order ${order.id} (Invoice: ${invoiceNo}) for ${formatTZS(grandTotal)}. Here is my payment verification inquiry.`
  );

  const defaultPaymentMethods = [
    { id: '1', type: 'Bank Transfer' as const, provider: 'CRDB Bank Tanzania PLC', accountName: 'Genuine Electronics Ltd', accountNumber: '0150 8829 4100', instructions: 'Transfer directly to CRDB account. Quote invoice number as reference.', isActive: true },
    { id: '2', type: 'Mobile Money' as const, provider: 'M-Pesa / Mixx By Yas / Airtel Money', accountName: 'Genuine Electronics Ltd', accountNumber: '0768 929 203', instructions: 'Pay via Till/Lipa Namba 0768 929 203.', isActive: true },
    { id: '3', type: 'Orbi Pay' as const, provider: 'Orbi Pay Wallet', accountName: 'Genuine Electronics Ltd', accountNumber: 'ORBI-9901', instructions: 'Pay via Orbi Pay barcode/wallet tag.', isActive: true }
  ];

  const availableMethods = (storeSettings?.paymentMethods && storeSettings.paymentMethods.length > 0) 
    ? storeSettings.paymentMethods 
    : defaultPaymentMethods;

  const selectedMethod = availableMethods.find((m) => {
    const pMethod = (order.paymentMethod || '').toLowerCase();
    const mType = (m.type || '').toLowerCase();
    const mProvider = (m.provider || '').toLowerCase();
    const mId = (m.id || '').toLowerCase();
    return (
      mId === pMethod ||
      mType === pMethod ||
      mProvider.includes(pMethod) ||
      pMethod.includes(mType) ||
      pMethod.includes(mProvider)
    );
  });

  return (
    <div className={`invoice-generator-container flex flex-col h-full min-h-0 overflow-hidden ${className}`}>
      {/* Embedded CSS Print Styles specifically configured for professional A4 physical printing */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background-color: #ffffff !important;
          }

          .no-print,
          .no-print * {
            display: none !important;
          }

          .printable-invoice-root {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          .keep-together {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          thead {
            display: table-header-group !important;
          }
        }
      `}</style>

      {/* Pending Payment Notification Banner */}
      {showControls && order.paymentStatus !== 'Paid' && order.status !== 'Completed' && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-semibold text-amber-300 no-print flex items-center justify-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Payment Confirmation Pending — Displaying Proforma Invoice for Order #{order.id}. Official Payment Receipt unlocks once payment is confirmed.</span>
        </div>
      )}

      {/* Action Controls Bar (Hidden during physical printing) */}
      {showControls && (
        <div className="no-print bg-slate-900 text-white px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-auto flex items-center justify-center shrink-0">
              <img src={BRAND_LOGO_URL} alt="Genuine Electronics" className="h-8 w-auto max-w-[100px] object-contain" referrerPolicy="no-referrer" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-extrabold text-sm tracking-tight">
                  {docType === 'tax' ? (includeVat ? 'Tax Invoice' : 'Commercial Invoice') : docType === 'proforma' ? 'Proforma Invoice' : 'Delivery Note'} — {invoiceNo}
                </h2>
                <button 
                  onClick={copyInvoiceText} 
                  title="Copy Invoice Number"
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedInvoiceNo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                {docType === 'tax' 
                  ? (includeVat && activeVatPercentage > 0 && calculatedTax > 0 ? `TRA-Compliant Fiscal Sales Invoice (${activeVatPercentage}% VAT Included)` : 'Commercial Sales Invoice')
                  : docType === 'proforma'
                  ? 'Formal Price Quotation & Proforma (Valid for 14 Days)'
                  : 'Official Consignment Packing Slip & Delivery Verification'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center flex-wrap gap-2">
            {/* Document Type Switcher (Hidden in client view or when hideTypeSwitcher is true) */}
            {!isClientView && !hideTypeSwitcher && (
              <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setDocType('tax')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    docType === 'tax' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('proforma')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    docType === 'proforma' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Proforma
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('delivery')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    docType === 'delivery' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Delivery Note
                </button>
              </div>
            )}

            {/* TRA VAT Toggle Switch (Hidden in client view or when hideTypeSwitcher is true) */}
            {!isClientView && !hideTypeSwitcher && docType !== 'delivery' && (
              <label 
                title="Toggle TRA VAT (18%) Inclusion like in POS Checkout"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer select-none border border-slate-700 transition-all active:scale-95"
              >
                <input
                  type="checkbox"
                  checked={includeVat}
                  onChange={(e) => setIncludeVat(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                />
                <div className="flex items-center gap-1">
                  <Percent className="w-3 h-3 text-slate-400" />
                  <span className="font-bold text-[11px] text-slate-200">
                    TRA VAT ({baseOrderVatPct}%)
                  </span>
                </div>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded transition-colors ${
                  includeVat ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-slate-200'
                }`}>
                  {includeVat ? 'Active' : 'Off'}
                </span>
              </label>
            )}

            {/* Official Stamp Toggle Switch */}
            {!isClientView && (
              <label 
                title="Toggle Official Verification Stamp / Seal on Document"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer select-none border border-slate-700 transition-all active:scale-95"
              >
                <input
                  type="checkbox"
                  checked={showStamp}
                  onChange={(e) => setShowStamp(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                />
                <div className="flex items-center gap-1">
                  <Stamp className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-bold text-[11px] text-slate-200">
                    Official Stamp
                  </span>
                </div>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded transition-colors ${
                  showStamp ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-200'
                }`}>
                  {showStamp ? 'ON' : 'OFF'}
                </span>
              </label>
            )}

            {/* Share Invoice Dropdown in Action Bar */}
            <div className="relative" ref={shareDropdownActionRef}>
              <button
                type="button"
                onClick={handleShareMenuClick}
                disabled={isSharing}
                className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-700 shadow-sm cursor-pointer disabled:opacity-50"
                title="Share invoice via WhatsApp, PDF, Image or Text"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isSharing ? 'Sharing...' : 'Share'}</span>
              </button>

              {showShareFormatModal && (
                <div className="absolute top-full mt-2 right-0 w-52 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 p-1.5 space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase px-2.5 py-1">Export & Share Format</div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); shareNative('pdf'); }}
                    className="w-full text-left px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-sm">📄</span>
                    <div>
                      <div className="font-extrabold text-slate-900">Share as PDF</div>
                      <div className="text-[9px] text-slate-500 font-normal">Standard A4 Document format</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); shareNative('image'); }}
                    className="w-full text-left px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-sm">📸</span>
                    <div>
                      <div className="font-extrabold text-slate-900">Share as Image (PNG)</div>
                      <div className="text-[9px] text-slate-500 font-normal">High resolution picture</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); shareNative('text'); }}
                    className="w-full text-left px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-sm">📝</span>
                    <div>
                      <div className="font-extrabold text-slate-900">Share as Text</div>
                      <div className="text-[9px] text-slate-500 font-normal">WhatsApp summary format</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPDF ? 'Exporting...' : 'Save PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print {docType === 'delivery' ? 'Delivery Note' : 'Invoice'}</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Printable Invoice Document Body (Engineered for standard physical printers & PDF rendering) */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-6 md:p-8 bg-slate-900/90 dark:bg-slate-950 flex justify-center items-start min-h-0 w-full touch-pan-y custom-scrollbar">
        <div 
          ref={invoiceRef} 
          className="printable-invoice-root p-6 sm:p-8 space-y-4 bg-white text-slate-900 text-xs shadow-2xl rounded-2xl border border-slate-300 w-full max-w-[210mm] shrink-0 my-0 sm:my-3 mb-16"
          style={{ width: '100%', maxWidth: '210mm' }}
        >
          {/* Header Section: Brand Logo, Legal Company Info & Invoice Metadata */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-4 border-b-2 border-slate-900 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-auto flex items-center justify-center shrink-0">
                <img 
                  src={BRAND_LOGO_URL} 
                  alt={storeSettings?.storeName || "Genuine Electronics"} 
                  className="h-12 w-auto max-w-[140px] object-contain" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
                  {storeSettings?.storeName || 'GENUINE ELECTRONICS'}
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                </h1>
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                  Authorized Consumer & Enterprise Technology Retailer
                </p>
              </div>
            </div>
            <div className="text-[11px] text-slate-700 mt-2 space-y-0.5">
              <p className="font-bold text-slate-900">{storeSettings?.storeName || 'Genuine Electronics Tanzania Ltd'} • {storeSettings?.address || 'Kariakoo / Ndanda na Masasi Street, Dar es Salaam Tanzania'}</p>
              <p>Hotline: {storeSettings?.phone || '+255 768 929 203'} | Email: {storeSettings?.email || 'sales@genuine-electronics.com'}</p>
              <p className="font-mono text-[10px] text-slate-600">TRA TIN: {storeSettings?.tin || '104-982-371'}</p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-300 w-full sm:w-auto shrink-0 space-y-1">
            <div className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${
              docType === 'tax'
                ? (includeVat ? 'border-slate-900 bg-white text-slate-900' : 'border-slate-400 bg-slate-100 text-slate-700')
                : docType === 'proforma'
                ? 'border-blue-900 bg-blue-50 text-blue-900'
                : 'border-emerald-900 bg-emerald-50 text-emerald-900'
            }`}>
              {docType === 'tax' 
                ? (includeVat && activeVatPercentage > 0 && calculatedTax > 0 ? 'OFFICIAL TAX INVOICE' : 'COMMERCIAL SALES INVOICE')
                : docType === 'proforma'
                ? 'PROFORMA INVOICE / QUOTATION'
                : 'DELIVERY NOTE & PACKING SLIP'}
            </div>
            <p className="text-base font-black text-slate-900 font-mono tracking-tight">
              {docType === 'delivery' ? `DN-${cleanOrderNo}` : docType === 'proforma' ? `PRO-${cleanOrderNo}` : invoiceNo}
            </p>
            <div className="text-[11px] text-slate-700 space-y-0.5">
              <p><span className="font-semibold text-slate-600">Issue Date:</span> <strong className="text-slate-900">{orderDate}</strong></p>
              <p><span className="font-semibold text-slate-600">Order ID:</span> <span className="font-mono font-bold text-slate-900">{order.id}</span></p>
              {docType !== 'delivery' && includeVat && activeVatPercentage > 0 && calculatedTax > 0 && (
                <p>
                  <span className="font-semibold text-slate-600">VAT Status:</span>{' '}
                  <strong className="text-emerald-700">
                    TRA VAT {activeVatPercentage}% Included
                  </strong>
                </p>
              )}
              {order.trackingNumber && (
                <p><span className="font-semibold text-slate-600">Tracking:</span> <span className="font-mono font-bold text-slate-900">{order.trackingNumber}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Billing Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-slate-300 keep-together">
          <div>
            <p className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              BILLED & SHIPPED TO:
            </p>
            <p className="font-bold text-slate-900 text-sm">{order.customerName || 'Valued Customer'}</p>
            {order.customerTin && (
              <p className="text-slate-900 text-[11px] font-mono font-bold">
                <span className="text-slate-600 font-sans font-semibold">Buyer TIN:</span> {order.customerTin}
              </p>
            )}
            <p className="text-slate-600 text-[11px]">{order.customerEmail || 'N/A'}</p>
            <p className="text-slate-600 text-[11px] font-medium">{order.customerPhone || order.phone || 'N/A'}</p>
            <p className="text-slate-800 mt-1 font-medium bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px]">
              {order.shippingAddress || 'Dar es Salaam, Tanzania'}
              {order.city ? `, ${order.city}` : ''}
            </p>
            {order.deliveryNotes && (
              <p className="text-slate-600 text-[10px] mt-1 italic">
                <span className="font-bold not-italic">Delivery Instructions:</span> {order.deliveryNotes}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              ORDER & SETTLEMENT DETAILS:
            </p>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Payment Method:</span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                  {order.paymentMethod || 'Mobile Money'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Payment Status:</span>
                <span className={`font-black px-2 py-0.5 rounded border ${
                  (order.paymentStatus === 'Paid' || order.status === 'Delivered')
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                    : 'text-amber-800 bg-amber-50 border-amber-300'
                }`}>
                  {(order.paymentStatus || order.status || 'Pending').toUpperCase()}
                </span>
              </div>
              {includeVat && activeVatPercentage > 0 && calculatedTax > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Tax Calculation:</span>
                  <span className="font-bold text-slate-900">
                    Tax Included ({activeVatPercentage}%)
                  </span>
                </div>
              )}
              {order.courierName && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Dispatched Courier:</span>
                  <span className="font-bold text-slate-900">{order.courierName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Order Line Items Table */}
        <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-900 font-black">
                <th className="p-2.5">Item Description & Specifications</th>
                <th className="p-2.5 text-center">Category</th>
                <th className="p-2.5 text-center">Qty</th>
                <th className="p-2.5 text-right">Unit Price</th>
                <th className="p-2.5 text-right">Total (TZS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(order.items || []).map((item, idx) => {
                const unitPrice = item.price || item.product?.price || 0;
                const lineTotal = unitPrice * item.quantity;
                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{item.product?.name || 'Product Item'}</div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                        <span>SKU: {item.product?.sku || `SKU-${idx + 1}`}</span>
                        {item.product?.brand && <span>• Brand: {item.product.brand}</span>}
                        {includeVat && activeVatPercentage > 0 && calculatedTax > 0 && (
                          item.product?.isVatInclusive !== false ? (
                            <span className="text-[8px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
                              VAT Applicable
                            </span>
                          ) : (
                            <span className="text-[8px] font-extrabold text-slate-700 bg-slate-100 border border-slate-300 px-1 py-0.2 rounded">
                              Non-VAT / Exempt
                            </span>
                          )
                        )}
                      </div>
                    </td>
                    <td className="p-2.5 text-center text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[10px] font-semibold">
                        {item.product?.category || 'Electronics'}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-bold text-slate-900">{item.quantity}</td>
                    <td className="p-2.5 text-right text-slate-800">{formatTZS(unitPrice)}</td>
                    <td className="p-2.5 text-right font-black text-slate-900">{formatTZS(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Loan / Credit Repayment Details (if applicable) */}
        {order.isLoan && (() => {
          const total = Number(order.totalAmount ?? 0);
          const repayments = order.loanRepayments || [];
          const repaymentsSum = repayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
          const initialDeposit = Number(order.downPayment ?? 0);
          const totalPaid = Math.min(total, initialDeposit + repaymentsSum);
          const remainingBalance = Math.max(0, total - totalPaid);
          const todayStr = new Date().toISOString().split('T')[0];
          const dueDate = order.loanDueDate || '';
          const isOverdue = dueDate && dueDate < todayStr && remainingBalance > 0;

          let statusLabel = 'ACTIVE / UNPAID';
          let badgeClass = 'bg-amber-200/80 text-amber-900 border-amber-300';
          if (remainingBalance <= 0) {
            statusLabel = 'FULLY PAID & CLEARED ✅';
            badgeClass = 'bg-emerald-200/80 text-emerald-900 border-emerald-300';
          } else if (isOverdue) {
            statusLabel = 'OVERDUE ⚠️';
            badgeClass = 'bg-rose-200/80 text-rose-900 border-rose-300';
          } else if (totalPaid > 0) {
            statusLabel = 'PARTIALLY PAID ⏳';
            badgeClass = 'bg-blue-200/80 text-blue-900 border-blue-300';
          }

          return (
            <div className="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-200 text-[11px] keep-together space-y-2.5">
              <div className="flex items-center justify-between font-extrabold text-amber-950">
                <span>CREDIT & INSTALLMENT LOAN AGREEMENT</span>
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded border font-black ${badgeClass}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-slate-800 pt-1 border-t border-amber-200/60">
                <div>
                  <span className="text-slate-500 text-[10px] block font-medium">Down Payment:</span>
                  <strong className="text-slate-900 font-bold">{formatTZS(initialDeposit)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block font-medium">Total Paid:</span>
                  <strong className="text-emerald-800 font-black">{formatTZS(totalPaid)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block font-medium">Remaining Balance:</span>
                  <strong className="text-rose-900 font-black">{formatTZS(remainingBalance)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block font-medium">Repayment Due:</span>
                  <strong className="text-slate-900 font-bold">{dueDate || 'In 30 Days'}</strong>
                </div>
              </div>

              {repayments.length > 0 && (
                <div className="pt-2 border-t border-amber-200/60 text-[10px] space-y-1">
                  <span className="font-bold text-amber-950 uppercase">Installment Payments History ({repayments.length}):</span>
                  <div className="space-y-0.5 pl-1">
                    {repayments.map((rep, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700 font-medium">
                        <span>• {rep.date ? formatToGMT3(rep.date).split(',')[0] : 'Payment'} ({rep.paymentMethod || 'Cash'})</span>
                        <span className="font-bold text-emerald-700">+{formatTZS(rep.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Credit Sale Summary */}
            </div>
          );
        })()}

        {/* Warranty Statement & Financial Totals Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-1 keep-together">
          <div className="text-[11px] text-slate-700 max-w-sm bg-slate-50 p-3 rounded-xl border border-slate-300 space-y-1">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              1-Year Genuine Warranty & Service Guarantee
            </p>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              All Genuine Electronics products include an official 1-Year manufacturer warranty and local Dar es Salaam service support. Please retain this physical tax invoice for servicing, warranty verifications, and insurance claims.
            </p>
          </div>

          <div className="w-full sm:w-80 bg-white p-3.5 rounded-xl border-2 border-slate-900 space-y-2 text-[11px]">
            {taxAnalysis.isMixed && taxAnalysis.taxAmount > 0 ? (
              <>
                <div className="flex justify-between text-slate-700">
                  <span className="font-medium">1. Taxable Subtotal (Net):</span>
                  <span className="font-bold text-slate-900">{formatTZS(taxAnalysis.taxableNetSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="font-medium">2. Non-VAT / Exempt Subtotal:</span>
                  <span className="font-bold text-slate-900">{formatTZS(taxAnalysis.exemptSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="font-medium">TRA VAT ({activeVatPercentage}% on Taxable):</span>
                  <span className="font-bold text-slate-900">{formatTZS(taxAnalysis.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-800 pt-1 border-t border-dotted border-slate-300 font-bold">
                  <span>Total Net Subtotal:</span>
                  <span>{formatTZS(taxAnalysis.netSubtotal)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-slate-700">
                  <span className="font-medium">
                    {includeVat && activeVatPercentage > 0 && calculatedTax > 0 ? 'Subtotal (Excl. Tax):' : 'Subtotal:'}
                  </span>
                  <span className="font-bold text-slate-900">{formatTZS(calculatedSubtotal)}</span>
                </div>

                {/* TRA VAT Line Item (Only show if VAT is enabled, percentage > 0 and tax > 0) */}
                {includeVat && activeVatPercentage > 0 && calculatedTax > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span className="font-medium">TRA VAT ({activeVatPercentage}% Incl.):</span>
                    <span className="font-bold text-slate-900">{formatTZS(calculatedTax)}</span>
                  </div>
                )}
              </>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span className="font-medium">Discount Applied:</span>
                <span className="font-bold">-{formatTZS(discountAmount)}</span>
              </div>
            )}

            {orderExtraCosts.length > 0 ? (
              orderExtraCosts.map((cost, cIdx) => (
                <div key={cIdx} className="flex justify-between text-slate-700">
                  <span className="font-medium">{cost.name || 'Additional Service'}:</span>
                  <span className="font-bold text-slate-900">+{formatTZS(cost.amount)}</span>
                </div>
              ))
            ) : extraCostsTotal > 0 ? (
              <div className="flex justify-between text-slate-700">
                <span className="font-medium">Delivery & Handling:</span>
                <span className="font-bold text-slate-900">+{formatTZS(extraCostsTotal)}</span>
              </div>
            ) : null}
            
            <div className="flex justify-between pt-2 border-t-2 border-slate-900 font-black text-base text-slate-900 bg-slate-100 p-2 rounded">
              <span>GRAND TOTAL:</span>
              <span>{formatTZS(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment Remittance & Instructions Box */}
        <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50 space-y-2.5 text-[11px] keep-together">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-700" />
              OFFICIAL SETTLEMENT & REMITTANCE CHANNELS (TRA Verified)
            </span>
            <span className="text-[9px] font-black bg-blue-100 text-blue-900 border border-blue-300 px-2.5 py-0.5 rounded uppercase">
              Method: {order.paymentMethod || 'Selected at Checkout'}
            </span>
          </div>

          {selectedMethod ? (
            <div className="bg-white p-3 rounded-xl border border-slate-300 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-slate-900 font-extrabold text-xs flex items-center gap-1.5">
                  {selectedMethod.type === 'Mobile Money' ? (
                    <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : selectedMethod.type === 'Orbi Pay' ? (
                    <QrCode className="w-4 h-4 text-purple-600 shrink-0" />
                  ) : (
                    <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                  )}
                  <span>{selectedMethod.provider} ({selectedMethod.type})</span>
                </div>
                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                  Verified Merchant Account
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[9px] font-bold block uppercase">Account / Till Number:</span>
                  <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">{selectedMethod.accountNumber}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[9px] font-bold block uppercase">Account Name:</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedMethod.accountName}</span>
                </div>
              </div>
              {selectedMethod.instructions && (
                <div className="text-slate-600 text-[10px] pt-1 border-t border-slate-100 mt-1">
                  <span className="font-bold text-slate-800">Payment Instructions:</span> {selectedMethod.instructions}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-3 rounded-xl border border-slate-300 space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-slate-900 font-extrabold text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-700" />
                  <span>{order.paymentMethod || 'Selected Payment Method'}</span>
                </div>
                <span className="bg-blue-50 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded border border-blue-200">
                  Direct Payment
                </span>
              </div>
              <p className="text-slate-600 text-[10px] pt-1">
                Selected payment option: <strong className="text-slate-900">{order.paymentMethod}</strong>. Please quote invoice reference <strong className="text-slate-900">{invoiceNo}</strong> during deposit.
              </p>
            </div>
          )}

          <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[10px]">
            <span className="text-slate-700">Please quote Invoice Number <strong className="text-slate-900">{invoiceNo}</strong> as payment reference for automated reconciliation.</span>
            <div className="relative no-print">
              <button
                type="button"
                onClick={handleShareMenuClick}
                disabled={isSharing}
                className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Share2 className="w-3 h-3" />
                <span>Share Invoice</span>
              </button>

              {/* Share Format Selection Dropdown */}
              {showShareFormatModal && (
                <div className="absolute bottom-full mb-2 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-2 flex flex-col gap-1">
                    <div className="text-[10px] font-black text-slate-500 uppercase px-2 mb-1">Select Format</div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); shareNative('image'); }}
                      className="text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      📸 Share as Image
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); shareNative('pdf'); }}
                      className="text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      📄 Share as PDF
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); shareNative('text'); }}
                      className="text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      📝 Share as Text
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Goods Dispatch & Reception Signatures (For Delivery Note) */}
        {docType === 'delivery' && (
          <div className="grid grid-cols-2 gap-4 p-3 rounded-xl border border-slate-300 bg-slate-50 text-[10px] keep-together">
            <div className="space-y-4">
              <p className="font-bold uppercase text-slate-800">Dispatched by (Warehouse/Store Cashier):</p>
              <div className="border-b border-dashed border-slate-400 pt-4" />
              <p className="text-slate-600">Name & Signature / Date</p>
            </div>
            <div className="space-y-4">
              <p className="font-bold uppercase text-slate-800">Received in Good Order by Customer/Carrier:</p>
              <div className="border-b border-dashed border-slate-400 pt-4" />
              <p className="text-slate-600">Recipient Name & Signature / Date</p>
            </div>
          </div>
        )}

        {/* Official Electronic Verification QR Code & Authorized Seal / Stamp Footer */}
        <div className="pt-3 flex justify-between items-center text-[10px] text-slate-600 border-t-2 border-slate-900 keep-together">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white rounded-lg border-2 border-slate-900 shadow-sm">
              <QRCodeSVG 
                value={buildReceiptVerificationUrl({
                  orderNo: (order as any).orderNumber || order.id || invoiceNo,
                  receiptNo: invoiceNo,
                  totalAmount: order.totalAmount || 0
                })} 
                size={52} 
                level="M" 
              />
            </div>
            <div>
              <p className="font-black text-slate-900 text-xs">Genuine Electronics Tanzania Ltd</p>
              <p className="text-[10px] text-slate-600">Scan QR Code to verify document authenticity & fiscal status online.</p>
              <p className="text-[9px] text-slate-500">
                {docType === 'tax' 
                  ? (includeVat && activeVatPercentage > 0 && calculatedTax > 0 ? 'TRA Compliant Commercial Electronic Tax Invoice' : 'Commercial Electronic Sales Invoice')
                  : docType === 'proforma'
                  ? 'Official Proforma Quotation Document'
                  : 'Official Consignment & Delivery Manifest'}
              </p>
            </div>
          </div>

          <div className="text-right flex items-center gap-3">
            {/* Digital Stamp */}
            {showStamp && (
              <div className="border-2 border-dashed border-[#0033a0] rounded-full w-24 h-24 flex flex-col items-center justify-center p-1 text-center text-[#0033a0] select-none rotate-[-4deg] bg-blue-50/80 shadow-sm shrink-0">
                <div className="border border-[#0033a0]/80 rounded-full w-full h-full flex flex-col items-center justify-center p-0.5">
                  <span className="text-[7.5px] font-black uppercase tracking-wider leading-none text-[#0033a0]">
                    ★ GENUINE ELEC. ★
                  </span>
                  <span className="text-[7px] font-black border-y border-[#0033a0] py-0.5 my-0.5 uppercase tracking-widest text-[#002270] w-full">
                    {docType === 'tax' ? 'TAX INVOICE' : docType === 'proforma' ? 'QUOTATION' : 'DISPATCHED'}
                  </span>
                  <span className="text-[6.5px] font-bold font-mono leading-none text-[#0033a0]">
                    {orderDate.split(' ')[0] || 'VERIFIED'}
                  </span>
                  <span className="text-[6px] font-black text-emerald-800 uppercase tracking-tighter mt-0.5">
                    {order.paymentStatus === 'Paid' ? 'PAID & VERIFIED' : 'OFFICIAL SEAL'}
                  </span>
                </div>
              </div>
            )}

            <div>
              <div className="inline-block border-2 border-slate-900 px-3 py-1 rounded bg-slate-50 mb-1">
                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest block">
                  APPROVED & AUTHORIZED
                </span>
              </div>
              <p className="font-bold text-slate-800 text-[10px]">Financial Operations & Logistics Dept.</p>
              <p className="text-[9px] text-slate-500">Dar es Salaam, Tanzania</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
