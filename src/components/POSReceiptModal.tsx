import React, { useState, useRef, useEffect } from 'react';
import { POSTransaction, formatTZS, formatToGMT3, BRAND_LOGO_URL, StoreSettings } from '../types';
import { Printer, Download, X, Check, Copy, MessageCircle, Stamp, User, Edit3, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { triggerHaptic } from '../utils/haptics';
import { getLoanDueDate, isLoanTransaction as checkIsLoanTransaction } from '../utils/loanUtils';
import { groupCartItemsByTaxStatus } from '../utils/taxUtils';
import { buildReceiptVerificationUrl } from '../services/receiptQrService';

interface POSReceiptModalProps {
  storeSettings?: StoreSettings;
  receipt: POSTransaction;
  onClose: () => void;
}

export const POSReceiptModal: React.FC<POSReceiptModalProps> = ({ receipt, onClose, storeSettings }) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [printDensity, setPrintDensity] = useState<'ultra' | 'bold'>('ultra');
  const [receiptLang, setReceiptLang] = useState<'sw' | 'en' | 'bi'>('sw');
  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const [showBuyerEditor, setShowBuyerEditor] = useState(false);
  const [showShareFormatModal, setShowShareFormatModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Editable Customer / Buyer Business Info State
  const [buyerName, setBuyerName] = useState(receipt.customerName || '');
  const [buyerPhone, setBuyerPhone] = useState(receipt.customerPhone || '');
  const [buyerTin, setBuyerTin] = useState(receipt.customerTin || (receipt as any).tin || '');

  const receiptRef = useRef<HTMLDivElement>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  // Close share dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(event.target as Node)) {
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

  const isSwahili = receiptLang === 'sw';
  const isBilingual = receiptLang === 'bi';
  const isUltra = printDensity === 'ultra';

  const activeCustomerName = buyerName.trim() || receipt.customerName || '';
  const activeCustomerPhone = buyerPhone.trim() || receipt.customerPhone || '';
  const activeCustomerTin = buyerTin.trim() || receipt.customerTin || (receipt as any).tin || '';

  const dbVatRate = (storeSettings?.vatPercentage && Number(storeSettings.vatPercentage) > 0)
    ? Number(storeSettings.vatPercentage)
    : 18;

  const hasReceiptItems = receipt.items && receipt.items.length > 0;
  const allItemsExempt = hasReceiptItems && receipt.items!.every(item => item.product?.isVatInclusive === false);

  const isVatApplicable = (() => {
    if (allItemsExempt) return false;
    if (receipt.includeVat !== undefined) return Boolean(receipt.includeVat);
    if (receipt.vatPercentage !== undefined) return Number(receipt.vatPercentage) > 0;
    if (receipt.tax !== undefined) return Number(receipt.tax) > 0;
    if (storeSettings?.vatPercentage !== undefined) return Number(storeSettings.vatPercentage) > 0;
    return true;
  })();

  const effectiveVatRate = (receipt.vatPercentage !== undefined && Number(receipt.vatPercentage) > 0)
    ? Number(receipt.vatPercentage)
    : dbVatRate;

  const vatPct = isVatApplicable ? effectiveVatRate : 0;
  const receiptTotal = receipt.total ?? receipt.totalAmount ?? 0;
  const discount = receipt.discount ?? 0;

  // Item-level tax classification and subtotal grouping
  const taxAnalysis = groupCartItemsByTaxStatus(receipt.items || [], {
    vatPercentage: vatPct,
    includeVat: isVatApplicable,
    discount,
    extraCosts: receipt.extraCosts || [],
  });

  const tax = taxAnalysis.taxAmount;
  const subtotal = taxAnalysis.netSubtotal;

  // Comprehensive Loan / Credit Transaction Detection & Financial Calculations
  const isLoanTransaction = checkIsLoanTransaction(receipt);

  const downPayment = Number(receipt.downPayment ?? (receipt as any).down_payment ?? 0);
  const loanRepayments = receipt.loanRepayments || (receipt as any).loan_repayments || [];
  const repaymentsSum = loanRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalPaidToDate = Math.min(receiptTotal, downPayment + repaymentsSum);
  const effectiveLoanBalance = receipt.loanBalance !== undefined && (!loanRepayments.length)
    ? Number(receipt.loanBalance)
    : Math.max(0, receiptTotal - totalPaidToDate);

  const isLoanFullyPaid = isLoanTransaction && (effectiveLoanBalance <= 0 || receipt.loanStatus === 'paid');
  // If the buyer has completed payment, the receipt should NO LONGER display loan breakdown and only show like a normal receipt
  const showLoanBreakdown = isLoanTransaction && !isLoanFullyPaid;

  const todayDateStr = new Date().toISOString().split('T')[0];
  const loanDueDate = getLoanDueDate(receipt);
  const isLoanOverdue = Boolean(loanDueDate && loanDueDate < todayDateStr && !isLoanFullyPaid);

  let loanStatusText = 'UNPAID';
  let loanStatusSwahili = 'HAUJALIPWA';
  if (isLoanFullyPaid) {
    loanStatusText = 'FULLY PAID';
    loanStatusSwahili = 'IMELIPWA KIKAMILIFU';
  } else if (isLoanOverdue) {
    loanStatusText = 'OVERDUE';
    loanStatusSwahili = 'IMECHELEWA';
  } else if (totalPaidToDate > 0) {
    loanStatusText = 'PARTIALLY PAID';
    loanStatusSwahili = 'IMELIPWA NUSU';
  }

  const handlePrint = () => {
    triggerHaptic('medium');
    window.print();
  };

  const getReceiptText = () => {
    const lines: string[] = [
      `========================================`,
      `  ${(storeSettings?.storeName || 'GENUINE ELECTRONICS').toUpperCase()}  `,
      showLoanBreakdown ? `  RISITI YA MKOPO / CREDIT RECEIPT  ` : `  RISITI YA MAUZO / CASH RECEIPT  `,
      `========================================`,
      `TIN: ${storeSettings?.tin || '104-982-371'}`,
      `Simu / Tel: ${storeSettings?.phone || '+255 768 929 203'}`,
      `Eneo / Address: ${storeSettings?.address || 'Kariakoo, Dar es Salaam'}`,
      `----------------------------------------`,
      `NAMBA YA RISITI: ${receipt.id}`,
      `TAREHE NA MUDA:  ${formatToGMT3(receipt.createdAt)}`,
      `MUUZAJI:         ${receipt.cashierName}`,
      `NJIA YA MALIPO:  ${receipt.paymentMethod}`,
      `MTEJA:           ${activeCustomerName || 'Mteja wa Kawaida'}`,
      activeCustomerPhone ? `SIMU YA MTEJA:   ${activeCustomerPhone}` : '',
      activeCustomerTin ? `TIN YA MTEJA:    ${activeCustomerTin}` : '',
      receipt.loanNationalId ? `NIDA / KITAMBULISHO: ${receipt.loanNationalId}` : '',
      (showLoanBreakdown && receipt.loanGuarantorName) ? `MDHAMINI: ${receipt.loanGuarantorName} ${receipt.loanGuarantorPhone ? `(${receipt.loanGuarantorPhone})` : ''}` : '',
      `----------------------------------------`,
      `BIDHAA / ITEMS:`,
      ...receipt.items.map(item => {
        const serials = item.serialNumbers && item.serialNumbers.length > 0 ? ` [S/N: ${item.serialNumbers.join(', ')}]` : '';
        const tier = item.priceTier === 'wholesale' ? ' (Wholesale)' : '';
        const taxBadge = taxAnalysis.isMixed
          ? (item.product?.isVatInclusive === false ? ' [NON-VAT]' : ' [VAT]')
          : '';
        return `${item.quantity}x ${item.product.name}${taxBadge}${tier}${serials} = ${formatTZS((item.price || item.product.price) * item.quantity)}`;
      }),
      ...(receipt.extraCosts && receipt.extraCosts.length > 0 ? [
        `----------------------------------------`,
        `GHARAMA ZA ZIADA / EXTRA SERVICES:`,
        ...receipt.extraCosts.map(c => `• ${c.name}: +${formatTZS(c.amount)}`)
      ] : []),
      `----------------------------------------`,
      ...(taxAnalysis.isMixed && taxAnalysis.taxAmount > 0 ? [
        `MCHANGANUO WA KODI / TAX BREAKDOWN:`,
        `JUMLA YA BIDHAA ZENYE VAT (NET): ${formatTZS(taxAnalysis.taxableNetSubtotal)}`,
        `JUMLA YA BIDHAA BILA VAT (EXEMPT): ${formatTZS(taxAnalysis.exemptSubtotal)}`,
        `KODI YA VAT (${vatPct}%): ${formatTZS(taxAnalysis.taxAmount)}`,
        `JUMLA NDOGO (NET SUBTOTAL): ${formatTZS(taxAnalysis.netSubtotal)}`,
      ] : (isVatApplicable && tax > 0 ? [
        `JUMLA KABLA YA KODI (NET): ${formatTZS(taxAnalysis.taxableNetSubtotal)}`,
        `KODI YA VAT (${vatPct}% INCL): ${formatTZS(taxAnalysis.taxAmount)}`,
      ] : [
        `JUMLA YA AWALI (SUBTOTAL): ${formatTZS(receiptTotal + discount)}`,
      ])),
      discount > 0 ? `PUNGUZO LA BEI (DISCOUNT): -${formatTZS(discount)}` : '',
      `----------------------------------------`,
      `JUMLA KUU: ${formatTZS(receipt.total || receipt.totalAmount || 0)}`,
      (!showLoanBreakdown && receipt.tenderedAmount && receipt.tenderedAmount > 0) ? `PESA ILIYOTOLEWA: ${formatTZS(receipt.tenderedAmount)}` : '',
      (!showLoanBreakdown && receipt.changeAmount && receipt.changeAmount > 0) ? `CHENJI ILIYORUDISHWA: ${formatTZS(receipt.changeAmount)}` : '',
      ...(showLoanBreakdown ? [
        `----------------------------------------`,
        `MCHANGANUO WA MKOPO / LOAN DETAILS:`,
        `HALI YA MKOPO: ${loanStatusSwahili} / ${loanStatusText}`,
        `MALIPO YA AWALI (DEPOSIT): ${formatTZS(downPayment)}`,
        repaymentsSum > 0 ? `MALIPO YA AWAMU YALIYOLIPWA: +${formatTZS(repaymentsSum)}` : '',
        `JUMLA ILIYOLIPWA: ${formatTZS(totalPaidToDate)}`,
        `SALIO LA MKOPO (OUTSTANDING BALANCE): ${formatTZS(effectiveLoanBalance)}`,
        loanDueDate ? `TAREHE YA MWISHO (DUE DATE): ${loanDueDate}${isLoanOverdue ? ' (OVERDUE)' : ''}` : '',
      ].filter(Boolean) : []),
      `========================================`,
      `Asante kwa kufanya biashara nasi!`,
      `Bidhaa zilizouzwa hazirudishwi baada ya siku 7.`
    ].filter(Boolean);

    return lines.join('\n');
  };  const generateReceiptCanvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
    return await toCanvas(element, {
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      filter: (node) => {
        if (node instanceof HTMLElement && node.classList.contains('no-print')) {
          return false;
        }
        return true;
      }
    });
  };

  const buildReceiptPDFDoc = (canvas: HTMLCanvasElement): jsPDF => {
    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdfWidthMm = paperWidth === '58mm' ? 58 : 80;
    const imgHeightMm = (canvas.height * pdfWidthMm) / canvas.width;
    const pdfHeightMm = Math.max(imgHeightMm, 60);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, imgHeightMm);
    return pdf;
  };

  const getCleanReceiptFilename = (extension: 'pdf' | 'png') => {
    const cleanReceiptNo = receipt.id.replace('#', '');
    return `Receipt_${cleanReceiptNo}.${extension}`;
  };

  const handleShareMenuClick = () => {
    triggerHaptic('light');
    setShowShareFormatModal(!showShareFormatModal);
  };

  const shareNative = async (format: 'text' | 'image' | 'pdf') => {
    setIsSharing(true);
    setShowShareFormatModal(false);
    triggerHaptic('medium');
    try {
      if (format === 'text') {
        const text = getReceiptText();
        if (navigator.share) {
          try {
            await navigator.share({
              title: `Receipt ${receipt.id}`,
              text: text
            });
          } catch (shareErr: any) {
            if (shareErr?.name !== 'AbortError') {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
              alert("Receipt text copied to clipboard!");
            }
          }
        } else {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          alert("Receipt text copied to clipboard!");
        }
      } else if (format === 'image') {
        if (!receiptRef.current) return;
        const canvas = await generateReceiptCanvas(receiptRef.current);
        
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const fileName = getCleanReceiptFilename('png');
          const file = new File([blob], fileName, { type: 'image/png' });

          let shared = false;
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: `Receipt ${receipt.id}`,
                files: [file]
              });
              shared = true;
            } catch (err: any) {
              if (err?.name !== 'AbortError') {
                console.warn('Share not permitted, falling back to download:', err?.message || err);
              } else {
                shared = true; // User cancelled share dialog intentionally
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
        if (!receiptRef.current) return;
        const canvas = await generateReceiptCanvas(receiptRef.current);
        const pdf = buildReceiptPDFDoc(canvas);
        const pdfBlob = pdf.output('blob');
        const fileName = getCleanReceiptFilename('pdf');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        let shared = false;
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Receipt ${receipt.id}`,
              files: [file]
            });
            shared = true;
          } catch (err: any) {
            if (err?.name !== 'AbortError') {
              console.warn('Share not permitted, falling back to download:', err?.message || err);
            } else {
              shared = true; // User cancelled share dialog intentionally
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
      console.error('Error during share:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyReceiptText = () => {
    triggerHaptic('light');
    const text = getReceiptText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingPDF(true);

    try {
      const canvas = await generateReceiptCanvas(receiptRef.current);
      const pdf = buildReceiptPDFDoc(canvas);
      const filename = getCleanReceiptFilename('pdf');

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
      console.error('Failed to generate PDF receipt:', err);
      alert('Could not generate PDF receipt file directly. Opening print window instead.');
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Print Specific CSS to enforce maximum contrast pure black and exact thermal head density */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          *, *::before, *::after {
            color: #000000 !important;
            border-color: #000000 !important;
            text-shadow: none !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-smooth: never !important;
            -webkit-font-smoothing: antialiased !important;
          }
          body * {
            visibility: hidden;
          }
          .printable-receipt-root, .printable-receipt-root * {
            visibility: visible;
            color: #000000 !important;
            border-color: #000000 !important;
          }
          /* Authentic Blue Ink Stamp in Print / PDF / Color Printers with High Thermal Contrast */
          .printable-receipt-root .official-stamp,
          .printable-receipt-root .official-stamp * {
            color: #0033a0 !important;
            border-color: #0033a0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .printable-receipt-root {
            position: absolute;
            left: 0;
            top: 0;
            width: ${paperWidth === '58mm' ? '54mm' : '76mm'} !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 1.5mm 2.5mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, Consolas, Monaco, monospace !important;
            font-weight: ${isUltra ? '900' : '700'} !important;
            font-size: ${paperWidth === '58mm' ? '10px' : '11px'} !important;
            line-height: 1.2 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print bg-slate-950 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-600 rounded-md flex items-center justify-center font-black text-xs text-white">
              TZ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-xs tracking-tight">Thermal POS Receipt</h3>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-700">
                  Official Receipt
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">{receipt.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Language Toggle: Swahili / English / Bilingual */}
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setReceiptLang('sw')}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  receiptLang === 'sw' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Kiswahili"
              >
                SW
              </button>
              <button
                type="button"
                onClick={() => setReceiptLang('en')}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  receiptLang === 'en' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setReceiptLang('bi')}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  receiptLang === 'bi' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Bilingual (SW / EN)"
              >
                BI
              </button>
            </div>

            {/* Print Contrast / Density Toggle for Faint Thermal Printers */}
            <button
              type="button"
              onClick={() => setPrintDensity(isUltra ? 'bold' : 'ultra')}
              className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all flex items-center gap-1 cursor-pointer ${
                isUltra ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Toggle Ultra High Density Print Mode for faint/low-quality thermal heads"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{isUltra ? 'Ultra Black' : 'Bold'}</span>
            </button>

            {/* Edit / View Customer Info Toggle Button */}
            <button
              type="button"
              onClick={() => setShowBuyerEditor(!showBuyerEditor)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                showBuyerEditor ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
              }`}
              title="Edit Buyer Business Details (Name, Phone, TIN)"
            >
              <User className="w-3 h-3" />
              <span>Buyer Details</span>
              {showBuyerEditor ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>

            {/* 58mm / 80mm Paper Toggle */}
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  paperWidth === '80mm' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  paperWidth === '58mm' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm
              </button>
            </div>

            {/* Official Stamp Toggle Switch */}
            <button
              type="button"
              onClick={() => setShowStamp(!showStamp)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                showStamp ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Toggle Official Verification Stamp / Seal on Receipt"
            >
              <Stamp className="w-3 h-3" />
              <span>Stamp {showStamp ? 'ON' : 'OFF'}</span>
            </button>

            {/* Share Receipt with Dropdown */}
            <div className="relative" ref={shareDropdownRef}>
              <button
                type="button"
                onClick={handleShareMenuClick}
                disabled={isSharing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all disabled:opacity-50 active:scale-95 cursor-pointer shadow-sm"
                title="Share receipt via WhatsApp, PDF, Image or Text"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isSharing ? 'Sharing...' : 'Share'}</span>
              </button>

              {/* Share Format Selection Dropdown */}
              {showShareFormatModal && (
                <div className="absolute top-full mt-2 right-0 w-52 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 p-1.5 space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase px-2.5 py-1">Select Format</div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); shareNative('pdf'); }}
                    className="w-full text-left px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-sm">📄</span>
                    <div>
                      <div className="font-extrabold text-slate-900">Share as PDF</div>
                      <div className="text-[9px] text-slate-500 font-normal">Thermal receipt PDF document</div>
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
                      <div className="text-[9px] text-slate-500 font-normal">High-res thermal image</div>
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
                      <div className="text-[9px] text-slate-500 font-normal">Text message format</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyReceiptText}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all border border-slate-700 active:scale-95 cursor-pointer"
              title="Copy receipt text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all disabled:opacity-50 border border-slate-700 active:scale-95 cursor-pointer"
              title="Download PDF file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPDF ? '...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Customer / Buyer Business Info Editor (Hidden on physical print) */}
        {showBuyerEditor && (
          <div className="no-print bg-slate-950 p-3.5 border-b border-slate-800 text-xs animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-extrabold text-blue-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Edit3 className="w-3.5 h-3.5" />
                Buyer / Customer Business Details
              </span>
              <button
                type="button"
                onClick={() => setShowBuyerEditor(false)}
                className="text-[10px] text-slate-400 hover:text-white font-bold px-2 py-0.5 bg-slate-900 rounded border border-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label htmlFor="receipt-buyer-name" className="block text-[10px] text-slate-400 font-bold mb-1">Customer / Buyer Name</label>
                <input
                  id="receipt-buyer-name"
                  type="text"
                  autoComplete="name"
                  inputMode="text"
                  autoCapitalize="words"
                  spellCheck={false}
                  name="name"
                  placeholder="e.g. Ally Said / Enterprise Ltd"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>
              <div>
                <label htmlFor="receipt-buyer-phone" className="block text-[10px] text-slate-400 font-bold mb-1">Phone Number (Optional)</label>
                <input
                  id="receipt-buyer-phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  name="tel"
                  placeholder="e.g. +255 768 929 203"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>
              <div>
                <label htmlFor="receipt-buyer-tin" className="block text-[10px] text-slate-400 font-bold mb-1">Buyer TIN (Optional for B2B/TRA)</label>
                <input
                  id="receipt-buyer-tin"
                  type="text"
                  autoComplete="off"
                  inputMode="text"
                  name="tax-id"
                  spellCheck={false}
                  placeholder="e.g. 104-982-371"
                  value={buyerTin}
                  onChange={(e) => setBuyerTin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Receipt Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/70 flex justify-center items-start">
          
          {/* Authentic High-Contrast Modern POS Receipt Paper (Optimized for Low-Quality 203 DPI EFD Printers) */}
          <div 
            ref={receiptRef}
            className={`printable-receipt-root font-mono leading-tight bg-white text-black p-4 sm:p-5 shadow-2xl border-0 rounded-none transition-all ${
              paperWidth === '58mm' ? 'w-full max-w-[280px] text-[10.5px]' : 'w-full max-w-[360px] text-[11.5px]'
            }`}
            style={{ 
              backgroundColor: '#ffffff', 
              color: '#000000',
              fontFamily: "'Courier Prime', Consolas, 'Courier New', 'Roboto Mono', 'SF Mono', Monaco, monospace",
              fontWeight: isUltra ? 800 : 700,
              textRendering: 'optimizeLegibility',
              WebkitFontSmoothing: 'antialiased',
              borderRadius: '0px',
              border: 'none'
            }}
          >
            {/* Header / Store Info */}
            <div className="text-center space-y-1 pb-2 border-b-2 border-black">
              <div className="flex items-center justify-center mx-auto mb-1">
                <img 
                  src={BRAND_LOGO_URL} 
                  alt={storeSettings?.storeName || "Genuine Electronics"} 
                  className="h-8 w-auto max-w-[130px] object-contain filter grayscale contrast-200" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <h2 className="font-black text-sm sm:text-base tracking-normal uppercase text-black">
                {storeSettings?.storeName || 'GENUINE ELECTRONICS'}
              </h2>
              <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-black py-0.5">
                {showLoanBreakdown
                  ? (isSwahili ? 'RISITI YA MAUZO YA MKOPO' : isBilingual ? 'RISITI YA MKOPO / CREDIT SALE RECEIPT' : 'CREDIT SALE / LOAN RECEIPT')
                  : (isSwahili ? 'RISITI YA MAUZO' : isBilingual ? 'RISITI YA MAUZO / CASH RECEIPT' : 'OFFICIAL SALES RECEIPT')}
              </div>
              <p className="text-[10px] text-black font-extrabold leading-tight">
                {storeSettings?.address || 'Kariakoo, Dar es Salaam Tanzania'}
              </p>
              <p className="text-[10px] text-black font-black">
                TEL: {storeSettings?.phone || '+255 768 929 203'}
              </p>
              <div className="text-[9.5px] font-black text-black border-t border-b border-black py-0.5 mt-1 tracking-wide">
                <span>TIN: {storeSettings?.tin || '104-982-371'}</span>
                <span className="mx-1.5 font-black">|</span>
                </div>
            </div>

            {/* Transaction Metadata & Customer / Buyer Business Info */}
            <div className="space-y-1 py-2 border-b-2 border-dashed border-black text-[10.5px] text-black font-bold">
              <div className="flex justify-between">
                <span>{isSwahili ? 'NAMBA YA RISITI:' : isBilingual ? 'NAMBA YA RISITI / RECEIPT NO:' : 'RECEIPT NO:'}</span>
                <span className="font-black tracking-tight">{receipt.id}</span>
              </div>
              <div className="flex justify-between">
                <span>{isSwahili ? 'TAREHE NA MUDA:' : isBilingual ? 'TAREHE / DATE & TIME:' : 'DATE / TIME:'}</span>
                <span className="font-black">{formatToGMT3(receipt.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isSwahili ? 'MUUZAJI:' : isBilingual ? 'MUUZAJI / CASHIER:' : 'CASHIER:'}</span>
                <span className="font-black">{receipt.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>{isSwahili ? 'NJIA YA MALIPO:' : isBilingual ? 'NJIA YA MALIPO / PAYMENT:' : 'PAYMENT METHOD:'}</span>
                <span className="font-black uppercase">{receipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-start pt-1 border-t border-black text-black gap-1">
                <span className="font-black shrink-0">{isSwahili ? 'MTEJA:' : isBilingual ? 'MTEJA / CUSTOMER:' : 'CUSTOMER / BUYER:'}</span>
                <span className="font-black text-right break-words max-w-[200px]">
                  {activeCustomerName || (isSwahili ? 'Mteja wa Kawaida' : isBilingual ? 'Mteja wa Kawaida / Walk-in' : 'Walk-in Customer')}
                </span>
              </div>
              {activeCustomerPhone && (
                <div className="flex justify-between items-start gap-1">
                  <span className="font-black shrink-0">{isSwahili ? 'SIMU YA MTEJA:' : isBilingual ? 'SIMU / PHONE:' : 'PHONE:'}</span>
                  <span className="font-black text-right break-words max-w-[200px]">
                    {activeCustomerPhone}
                  </span>
                </div>
              )}
              {activeCustomerTin && (
                <div className="flex justify-between items-start gap-1">
                  <span className="font-black shrink-0">{isSwahili ? 'TIN YA MTEJA:' : isBilingual ? 'TIN YA MTEJA / BUYER TIN:' : 'BUYER TIN:'}</span>
                  <span className="font-black text-right break-words max-w-[200px]">
                    {activeCustomerTin}
                  </span>
                </div>
              )}
              {receipt.loanNationalId && (
                <div className="flex justify-between items-start gap-1">
                  <span className="font-black shrink-0">{isSwahili ? 'KITAMBULISHO (NIDA):' : isBilingual ? 'NIDA / NAT ID:' : 'NATIONAL ID / NIDA:'}</span>
                  <span className="font-black text-right break-words max-w-[200px]">
                    {receipt.loanNationalId}
                  </span>
                </div>
              )}
              {showLoanBreakdown && receipt.loanGuarantorName && (
                <div className="flex justify-between items-start gap-1">
                  <span className="font-black shrink-0">{isSwahili ? 'MDHAMINI WA MKOPO:' : isBilingual ? 'MDHAMINI / GUARANTOR:' : 'GUARANTOR:'}</span>
                  <span className="font-black text-right break-words max-w-[200px]">
                    {receipt.loanGuarantorName} {receipt.loanGuarantorPhone ? `(${receipt.loanGuarantorPhone})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-2 border-b-2 border-dashed border-black space-y-1.5">
              <div className="flex justify-between font-black text-[10.5px] text-black border-b-2 border-black pb-0.5 uppercase tracking-wide">
                <span>{isSwahili ? 'MAELEZO YA BIDHAA' : isBilingual ? 'BIDHAA / ITEM' : 'ITEM DESCRIPTION'}</span>
                <span>{isSwahili ? 'KIASI (TZS)' : isBilingual ? 'KIASI / AMOUNT' : 'AMOUNT (TZS)'}</span>
              </div>
              {receipt.items.map((item, idx) => {
                const isItemVat = item.product?.isVatInclusive !== false;
                return (
                  <div key={idx} className="space-y-0.5 border-b border-dotted border-black/30 pb-1 last:border-b-0">
                    <div className="text-[11px] text-black font-black leading-snug">
                      {idx + 1}. {item.product.name}
                      {item.priceTier === 'wholesale' && (
                        <span className="ml-1 text-[9px] bg-black text-white px-1 py-0.2 font-black uppercase">WHOLESALE</span>
                      )}
                      {taxAnalysis.isMixed && (
                        isItemVat ? (
                          <span className="ml-1 text-[8.5px] border border-black px-1 py-0.2 font-black uppercase tracking-tight">VAT</span>
                        ) : (
                          <span className="ml-1 text-[8.5px] bg-black text-white px-1 py-0.2 font-black uppercase tracking-tight">NON-VAT</span>
                        )
                      )}
                    </div>
                    {item.serialNumbers && item.serialNumbers.length > 0 && (
                      <div className="text-[9.5px] text-black font-black tracking-tight pl-2">
                        S/N: {item.serialNumbers.join(', ')}
                      </div>
                    )}
                    <div className="flex justify-between text-[10.5px] text-black font-extrabold pl-2">
                      <span>{item.quantity} x {formatTZS(item.price || item.product.price)}</span>
                      <span className="font-black">{formatTZS((item.price || item.product.price) * item.quantity)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals & Breakdown */}
            <div className="py-2 border-b-2 border-dashed border-black space-y-1 text-[10.5px] text-black font-bold">
              {taxAnalysis.isMixed && taxAnalysis.taxAmount > 0 ? (
                <>
                  {/* Two separate subtotal summaries for mixed VAT orders */}
                  <div className="flex justify-between text-black">
                    <span>{isSwahili ? '1. BIDHAA ZENYE VAT (KABLA YA KODI):' : isBilingual ? '1. BIDHAA ZENYE VAT / TAXABLE (NET):' : '1. TAXABLE SUBTOTAL (EXCL. VAT):'}</span>
                    <span className="font-black">{formatTZS(taxAnalysis.taxableNetSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-black">
                    <span>{isSwahili ? '2. BIDHAA BILA VAT (MSAMAHA WA KODI):' : isBilingual ? '2. BIDHAA BILA VAT / EXEMPT SUBTOTAL:' : '2. NON-VAT / EXEMPT SUBTOTAL:'}</span>
                    <span className="font-black">{formatTZS(taxAnalysis.exemptSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-black">
                    <span>{isSwahili ? `KODI YA VAT (${vatPct}% KWENYE BIDHAA HUSIKA):` : isBilingual ? `KODI YA VAT (${vatPct}%) / VAT (ON TAXABLE):` : `VAT (${vatPct}% ON TAXABLE):`}</span>
                    <span className="font-black">{formatTZS(taxAnalysis.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-black pt-0.5 border-t border-dotted border-black/50 font-black">
                    <span>{isSwahili ? 'JUMLA YA AWALI BILA KODI (NET):' : isBilingual ? 'JUMLA BILA KODI / TOTAL NET SUBTOTAL:' : 'TOTAL NET SUBTOTAL:'}</span>
                    <span>{formatTZS(taxAnalysis.netSubtotal)}</span>
                  </div>
                </>
              ) : isVatApplicable && tax > 0 ? (
                <>
                  <div className="flex justify-between">
                    <span>{isSwahili ? 'JUMLA KABLA YA KODI (BILA VAT):' : isBilingual ? 'JUMLA BILA KODI / NET SUBTOTAL:' : 'SUBTOTAL (NET):'}</span>
                    <span className="font-black">{formatTZS(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isSwahili ? `KODI YA ONGEZEKO LA THAMANI (VAT ${vatPct}%):` : isBilingual ? `KODI YA VAT (${vatPct}%) / VAT:` : `VAT (${vatPct}% INCL):`}</span>
                    <span className="font-black">{formatTZS(tax)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>{isSwahili ? 'JUMLA YA AWALI:' : isBilingual ? 'JUMLA NDOGO / SUBTOTAL:' : 'SUBTOTAL:'}</span>
                  <span className="font-black">{formatTZS(receiptTotal + discount)}</span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex justify-between font-black text-black">
                  <span>{isSwahili ? 'PUNGUZO LA BEI:' : isBilingual ? 'PUNGUZO / DISCOUNT:' : 'DISCOUNT:'}</span>
                  <span>-{formatTZS(discount)}</span>
                </div>
              )}

              {receipt.extraCosts && receipt.extraCosts.length > 0 && (
                <div className="space-y-0.5 pt-0.5 border-t border-dashed border-black/40">
                  <div className="flex justify-between font-black text-black">
                    <span>{isSwahili ? 'GHARAMA ZA ZIADA:' : isBilingual ? 'GHARAMA ZA ZIADA / EXTRA SERVICES:' : 'EXTRA COSTS & SERVICES:'}</span>
                    <span>+{formatTZS(receipt.extraCosts.reduce((s, c) => s + (Number(c.amount) || 0), 0))}</span>
                  </div>
                  {receipt.extraCosts.map((cost, cIdx) => (
                    <div key={cIdx} className="flex justify-between text-[10px] pl-2 text-black font-semibold">
                      <span>• {cost.name}:</span>
                      <span className="font-bold">+{formatTZS(cost.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Prominent High-Contrast Grand Total Line (Clean Bordered, No Dark Block) */}
              <div className="flex justify-between items-center py-1.5 my-1 border-t-2 border-b-2 border-black text-black px-1">
                <span className="font-black text-xs sm:text-sm">
                  {showLoanBreakdown 
                    ? (isSwahili ? 'THAMANI YA MKOPO (JUMLA):' : isBilingual ? 'JUMLA YA MKOPO / TOTAL VALUE:' : 'TOTAL LOAN VALUE:')
                    : (isSwahili ? 'JUMLA KUU (TZS):' : isBilingual ? 'JUMLA KUU / TOTAL (TZS):' : 'TOTAL PAID (TZS):')}
                </span>
                <span className="text-sm sm:text-base font-black tracking-tight">{formatTZS(receiptTotal)}</span>
              </div>

              {receipt.splitPayments && receipt.splitPayments.length > 0 ? (
                <div className="space-y-0.5 pt-1 border-t border-black text-[10px]">
                  <p className="font-black uppercase">{isSwahili ? 'MCHANGANUO WA MALIPO:' : isBilingual ? 'MCHANGANUO WA MALIPO / SPLIT TENDER:' : 'SPLIT PAYMENT BREAKDOWN:'}</p>
                  {receipt.splitPayments.map((sp, sIdx) => (
                    <div key={sIdx} className="flex justify-between pl-2">
                      <span>• {sp.method} {sp.reference ? `(${sp.reference})` : ''}:</span>
                      <span className="font-black">{formatTZS(sp.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : receipt.tenderedAmount !== undefined && receipt.tenderedAmount > 0 && !showLoanBreakdown && (
                <div className="flex justify-between pt-0.5">
                  <span>{isSwahili ? 'PESA ILIYOTOLEWA:' : isBilingual ? 'PESA ILIYOTOLEWA / CASH TENDERED:' : 'CASH TENDERED:'}</span>
                  <span className="font-black">{formatTZS(receipt.tenderedAmount)}</span>
                </div>
              )}

              {receipt.changeAmount !== undefined && receipt.changeAmount > 0 && !showLoanBreakdown && (
                <div className="flex justify-between font-black pt-0.5">
                  <span>{isSwahili ? 'CHENJI ILIYORUDISHWA:' : isBilingual ? 'CHENJI / CHANGE DUE:' : 'CHANGE DUE:'}</span>
                  <span className="font-black">{formatTZS(receipt.changeAmount)}</span>
                </div>
              )}

              {/* Loan / Credit Sale Financial Breakdown - ONLY DISPLAYED WHEN LOAN IS ACTIVE/UNPAID */}
              {showLoanBreakdown && (
                <div className="space-y-1 pt-1.5 border-t-2 border-black text-[10.5px]">
                  <div className="flex justify-between items-center border-b border-black pb-0.5">
                    <span className="font-black uppercase tracking-wide">
                      {isSwahili ? 'MCHANGANUO WA MKOPO:' : isBilingual ? 'MCHANGANUO WA MKOPO / LOAN BREAKDOWN:' : 'LOAN & CREDIT BREAKDOWN:'}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${
                      isLoanOverdue 
                        ? 'bg-white text-black border-2 border-black underline' 
                        : 'bg-black/10 text-black border-black'
                    }`}>
                      {isSwahili ? loanStatusSwahili : isBilingual ? `${loanStatusSwahili} / ${loanStatusText}` : loanStatusText}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>{isSwahili ? 'MALIPO YA AWALI (DEPOSIT):' : isBilingual ? 'MALIPO YA AWALI / DOWN PAYMENT:' : 'DOWN PAYMENT / DEPOSIT:'}</span>
                    <span className="font-black">{formatTZS(downPayment)}</span>
                  </div>

                  {repaymentsSum > 0 && (
                    <div className="flex justify-between">
                      <span>{isSwahili ? 'MALIPO YA AWAMU YALIYOLIPWA:' : isBilingual ? 'MALIPO YA AWAMU / REPAYMENTS PAID:' : 'TOTAL REPAYMENTS PAID:'}</span>
                      <span className="font-black">+{formatTZS(repaymentsSum)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-dotted border-black/40 pt-0.5">
                    <span>{isSwahili ? 'JUMLA ILIYOLIPWA HADI SASA:' : isBilingual ? 'JUMLA ILIYOLIPWA / TOTAL PAID:' : 'TOTAL PAID TO DATE:'}</span>
                    <span className="font-black">{formatTZS(totalPaidToDate)}</span>
                  </div>

                  {/* Prominent High-Contrast Outstanding Balance Line */}
                  <div className="flex justify-between items-center py-1 my-0.5 border-t border-b-2 border-black bg-black/5 px-1">
                    <span className="font-black text-[11px] sm:text-xs">
                      {isSwahili ? 'SALIO LINALODAIWA (MKOPO):' : isBilingual ? 'SALIO LA MKOPO / BALANCE DUE:' : 'REMAINING LOAN BALANCE:'}
                    </span>
                    <span className="text-xs sm:text-sm font-black tracking-tight">
                      {formatTZS(effectiveLoanBalance)}
                    </span>
                  </div>

                  {loanDueDate && (
                    <div className="flex justify-between items-center text-[10px] font-black pt-0.5">
                      <span>{isSwahili ? 'TAREHE YA MWISHO WA MALIPO:' : isBilingual ? 'TAREHE YA MWISHO / DUE DATE:' : 'PAYMENT DUE DATE:'}</span>
                      <span className={`${isLoanOverdue ? 'underline uppercase' : ''}`}>
                        {loanDueDate} {isLoanOverdue ? '(IMECHELEWA)' : ''}
                      </span>
                    </div>
                  )}

                  {/* Repayment History Log (Removed for conciseness) */}
                </div>
              )}
            </div>

            {/* Optional Official Digital Stamp (Authentic Deep Blue Rubber Stamp Ink in Preview & Print) */}
            {showStamp && (
              <div className="py-2.5 border-b-2 border-dashed border-black flex justify-center">
                <div className="official-stamp border-2 border-dashed border-[#0033a0] text-[#0033a0] bg-blue-50/80 p-2 px-4 text-center rounded-lg rotate-[-1.5deg] shadow-sm select-none">
                  <p className="text-[9px] font-black tracking-widest uppercase">★ {storeSettings?.storeName || 'GENUINE ELECTRONICS'} ★</p>
                  <p className="text-[10.5px] font-black uppercase tracking-wider my-0.5">
                    {showLoanBreakdown
                      ? (isSwahili ? 'MAUZO YA MKOPO (CREDIT)' : isBilingual ? 'MKOPO / CREDIT SALE' : 'OFFICIAL CREDIT SALE')
                      : (isSwahili ? 'IMELIPWA KIKAMILIFU' : isBilingual ? 'IMELIPWA / PAID' : 'OFFICIAL STAMP • PAID')}
                  </p>
                  <p className="text-[8.5px] font-mono font-black">
                    TAREHE: {formatToGMT3(receipt.createdAt).split(',')[0]} • VERIFIED
                  </p>
                  {showLoanBreakdown && (
                    <p className="text-[8px] font-mono font-black border-t border-[#0033a0]/30 pt-0.5 mt-0.5">
                      SALIO: {formatTZS(effectiveLoanBalance)} • DUE: {loanDueDate || 'In 30 Days'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Official EFD QR Code and Footer (Pure high contrast black & white) */}
            <div className="text-center space-y-1.5 pt-2">
              <div className="flex justify-center">
                <div className="p-1 bg-white border border-black/30 inline-block rounded-none">
                  <QRCodeSVG 
                    value={buildReceiptVerificationUrl({
                      orderNo: (receipt as any).orderNumber || receipt.id,
                      receiptNo: receipt.receiptNumber || receipt.id,
                      totalAmount: receiptTotal
                    })} 
                    size={paperWidth === '58mm' ? 68 : 80} 
                    level="M"
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
              </div>
              <div className="space-y-0.5 text-black font-black">
                <p className="text-[10px] font-black uppercase tracking-wide text-black">
                  {isSwahili ? 'UTHIBITISHO WA RISITI' : isBilingual ? 'UTHIBITISHO WA RISITI / VERIFICATION' : 'RECEIPT VERIFICATION'}
                </p>
                <p className="text-[9.5px] font-mono font-black text-black">
                  SIGNATURE: {receipt.id.slice(-10).toUpperCase()}
                </p>
                <p className="text-[9.5px] pt-1 font-black text-black">
                  {isSwahili ? 'Asante kwa kufanya biashara nasi!' : isBilingual ? 'Asante kwa Biashara / Thank You!' : 'Thank you for your business!'}
                </p>
                <p className="text-[9px] font-extrabold text-black">
                  {isSwahili ? 'Bidhaa zilizouzwa hazirudishwi baada ya siku 7 • Tunza risiti hii kwa ajili ya dhamana (warranty)' : isBilingual ? 'Hazirudishwi baada ya siku 7 • Keep receipt for warranty' : 'Goods non-refundable after 7 days • Keep receipt for warranty'}
                </p>
                <p className="text-[8.5px] font-black pt-0.5 text-black">
                  *** {isSwahili ? 'MWISHO WA RISITI' : isBilingual ? 'MWISHO WA RISITI / END OF RECEIPT' : 'END OF RECEIPT'} ***
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
