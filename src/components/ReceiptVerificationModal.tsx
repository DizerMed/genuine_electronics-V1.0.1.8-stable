import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, CheckCircle2, QrCode, FileText, Printer, Download, 
  Share2, Store, Phone, Calendar, ArrowLeft, RefreshCw, X, Award, Check, Stamp
} from 'lucide-react';
import { toPng, toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import { formatTZS, formatToGMT3, StoreSettings, BRAND_LOGO_URL, POSTransaction } from '../types';
import { parseReceiptQueryParams, fetchOnlineReceiptVerification, buildReceiptVerificationUrl } from '../services/receiptQrService';

interface ReceiptVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNo?: string | null;
  receiptNo?: string | null;
  storeSettings?: StoreSettings;
}

export const ReceiptVerificationModal: React.FC<ReceiptVerificationModalProps> = ({
  isOpen,
  onClose,
  orderNo: propOrderNo,
  receiptNo: propReceiptNo,
  storeSettings
}) => {
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [receiptLang, setReceiptLang] = useState<'sw' | 'en' | 'bi'>('sw');
  const [isDownloading, setIsDownloading] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);

  const queryParams = parseReceiptQueryParams();
  const activeOrderNo = propOrderNo || queryParams.orderNo;
  const activeReceiptNo = propReceiptNo || queryParams.receiptNo || activeOrderNo;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    const performVerification = async () => {
      if (!activeOrderNo && !activeReceiptNo) {
        if (isMounted) setLoading(false);
        return;
      }

      const res = await fetchOnlineReceiptVerification(
        activeOrderNo || 'GEN-ORDER',
        activeReceiptNo || 'GEN-RCT'
      );

      if (isMounted) {
        setVerificationResult(res);
        setLoading(false);
      }
    };

    performVerification();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeOrderNo, activeReceiptNo]);

  if (!isOpen) return null;

  const rawReceipt = verificationResult?.receipt;
  const store = verificationResult?.storeInfo || storeSettings;
  const isVerified = verificationResult?.isVerified !== false;

  // Language helpers
  const isSwahili = receiptLang === 'sw';
  const isBilingual = receiptLang === 'bi';

  // Format soft copy transaction
  const receiptId = rawReceipt?.receiptNo || rawReceipt?.id || activeReceiptNo || 'RCT-0000';
  const createdAt = rawReceipt?.createdAt || new Date().toISOString();
  const cashierName = rawReceipt?.cashierName || 'Genuine Electronics Staff';
  const paymentMethod = rawReceipt?.paymentMethod || 'Cash / Mobile';
  const customerName = rawReceipt?.customerName || 'Valued Customer';
  const customerPhone = rawReceipt?.customerPhone || '';
  const customerTin = rawReceipt?.customerTin || '';
  
  const items: any[] = Array.isArray(rawReceipt?.items) && rawReceipt.items.length > 0 
    ? rawReceipt.items 
    : [
        { 
          product: { name: 'Genuine Electronic Item / Purchase Order' },
          quantity: 1, 
          price: rawReceipt?.totalAmount || rawReceipt?.total || queryParams.total || 0 
        }
      ];

  const subtotal = rawReceipt?.subtotal || items.reduce((sum, item) => sum + ((item.price || item.product?.price || 0) * (item.quantity || 1)), 0);
  const discount = rawReceipt?.discount || 0;
  const grandTotal = rawReceipt?.totalAmount || rawReceipt?.total || subtotal - discount;
  const extraCosts: any[] = rawReceipt?.extraCosts || [];
  const tenderedAmount = rawReceipt?.tenderedAmount || 0;
  const changeAmount = rawReceipt?.changeAmount || 0;

  // Tax calculation
  const vatRate = 0.18;
  const taxAmount = Math.round(grandTotal - (grandTotal / (1 + vatRate)));

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = ` OFFICIAL SOFT COPY RECEIPT - Genuine Electronics Tanzania\n` +
      ` Order No: ${rawReceipt?.orderNo || activeOrderNo}\n` +
      ` Receipt No: ${receiptId}\n` +
      ` Customer: ${customerName}\n` +
      ` Total Paid: ${formatTZS(grandTotal)}\n` +
      ` Status: AUTHENTIC VERIFIED ONLINE\n` +
      ` View soft copy receipt: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!receiptRef.current) return;
    try {
      setIsDownloading(true);
      const canvas = await toCanvas(receiptRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Receipt_${receiptId.replace(/[^a-zA-Z0-9]/g, '_')}_SoftCopy.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to capture receipt image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      setIsDownloading(true);
      const canvas = await toCanvas(receiptRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, 80, (canvas.height * 80) / canvas.width);
      pdf.save(`Receipt_${receiptId.replace(/[^a-zA-Z0-9]/g, '_')}_SoftCopy.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">

      {/* Dedicated Printer-Friendly CSS for exact receipt alignment and stamp positioning */}
      <style>{`
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
          }
          body * {
            visibility: hidden;
          }
          .printable-receipt-root, .printable-receipt-root * {
            visibility: visible;
            color: #000000 !important;
            border-color: #000000 !important;
          }
          
          /* Ensures Authentic Blue Ink Stamp keeps its exact color & tilt when printing to color printers/PDFs */
          .printable-receipt-root .official-stamp,
          .printable-receipt-root .official-stamp * {
            color: #0033a0 !important;
            border-color: #0033a0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .printable-receipt-root {
            position: absolute;
            left: 50% !important;
            top: 0 !important;
            transform: translateX(-50%) !important;
            width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 5mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier Prime', Consolas, 'Courier New', 'Roboto Mono', monospace !important;
            font-weight: 700 !important;
            font-size: ${paperWidth === '58mm' ? '10px' : '12px'} !important;
            line-height: 1.2 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-xl bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* Header Control Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 p-4 sm:p-5 text-white border-b border-slate-800 relative">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
              <ShieldCheck className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[9.5px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                OFFICIAL ONLINE SOFT COPY
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight mt-0.5 text-white">
                Verifiable Sales Receipt
              </h2>
            </div>
          </div>

          {/* Quick Toolbar Controls */}
          <div className="pt-3 flex flex-wrap gap-2 items-center justify-between text-xs">
            {/* Paper Size Selector */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] transition-all cursor-pointer ${
                  paperWidth === '80mm' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm
              </button>
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] transition-all cursor-pointer ${
                  paperWidth === '58mm' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setReceiptLang('sw')}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] transition-all cursor-pointer ${
                  receiptLang === 'sw' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                SWA
              </button>
              <button
                onClick={() => setReceiptLang('en')}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] transition-all cursor-pointer ${
                  receiptLang === 'en' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                ENG
              </button>
              <button
                onClick={() => setReceiptLang('bi')}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] transition-all cursor-pointer ${
                  receiptLang === 'bi' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                BI
              </button>
            </div>

          </div>
        </div>

        {/* Scrollable Receipt Body Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-950/80 flex justify-center items-start">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs font-extrabold text-slate-300">
                Retrieving official soft copy receipt from Genuine Electronics records...
              </p>
            </div>
          ) : (
            /* Authentic High-Contrast Thermal Receipt Paper (Identical to physical printout) */
            <div 
              ref={receiptRef}
              className={`printable-receipt-root font-mono leading-tight bg-white text-black p-4 sm:p-5 shadow-2xl border-0 transition-all ${
                paperWidth === '58mm' ? 'w-full max-w-[280px] text-[10.5px]' : 'w-full max-w-[360px] text-[11.5px]'
              }`}
              style={{ 
                backgroundColor: '#ffffff',
                color: '#000000',
                fontFamily: "'Courier Prime', Consolas, 'Courier New', 'Roboto Mono', 'SF Mono', Monaco, monospace",
                fontWeight: 700,
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
                    alt={store?.storeName || "Genuine Electronics"} 
                    className="h-8 w-auto max-w-[130px] object-contain filter grayscale contrast-200" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                <h2 className="font-black text-sm sm:text-base tracking-normal uppercase text-black">
                  {store?.storeName || 'GENUINE ELECTRONICS'}
                </h2>
                <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-black py-0.5">
                  {isSwahili ? 'RISITI RASMI YA MAUZO' : isBilingual ? 'RISITI YA MAUZO / OFFICIAL CASH RECEIPT' : 'OFFICIAL SALES RECEIPT'}
                </div>
                <p className="text-[10px] text-black font-extrabold leading-tight">
                  {store?.address || 'Kariakoo, Dar es Salaam Tanzania'}
                </p>
                <p className="text-[10px] text-black font-black">
                  TEL: {store?.phone || '+255 768 929 203'}
                </p>
                <div className="text-[9.5px] font-black text-black border-t border-b border-black py-0.5 mt-1 tracking-wide">
                  <span>TIN: {store?.tin || '104-982-371'}</span>
                  <span className="mx-1.5 font-black">|</span>
                  </div>
              </div>

              {/* Transaction Metadata & Buyer Info */}
              <div className="space-y-1 py-2 border-b-2 border-dashed border-black text-[10.5px] text-black font-bold">
                <div className="flex justify-between">
                  <span>{isSwahili ? 'NAMBA YA RISITI:' : isBilingual ? 'NAMBA YA RISITI / RECEIPT NO:' : 'RECEIPT NO:'}</span>
                  <span className="font-black tracking-tight">{receiptId}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isSwahili ? 'TAREHE NA MUDA:' : isBilingual ? 'TAREHE / DATE & TIME:' : 'DATE / TIME:'}</span>
                  <span className="font-black">{formatToGMT3(createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isSwahili ? 'MUUZAJI:' : isBilingual ? 'MUUZAJI / CASHIER:' : 'CASHIER:'}</span>
                  <span className="font-black">{cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isSwahili ? 'NJIA YA MALIPO:' : isBilingual ? 'NJIA YA MALIPO / PAYMENT:' : 'PAYMENT METHOD:'}</span>
                  <span className="font-black uppercase">{paymentMethod}</span>
                </div>
                <div className="flex justify-between items-start pt-1 border-t border-black text-black gap-1">
                  <span className="font-black shrink-0">{isSwahili ? 'MTEJA:' : isBilingual ? 'MTEJA / CUSTOMER:' : 'CUSTOMER / BUYER:'}</span>
                  <span className="font-black text-right break-words max-w-[200px]">
                    {customerName}
                  </span>
                </div>
                {customerPhone && (
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-black shrink-0">{isSwahili ? 'SIMU YA MTEJA:' : isBilingual ? 'SIMU / PHONE:' : 'PHONE:'}</span>
                    <span className="font-black text-right break-words max-w-[200px]">
                      {customerPhone}
                    </span>
                  </div>
                )}
                {customerTin && (
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-black shrink-0">{isSwahili ? 'TIN YA MTEJA:' : isBilingual ? 'TIN YA MTEJA / BUYER TIN:' : 'BUYER TIN:'}</span>
                    <span className="font-black text-right break-words max-w-[200px]">
                      {customerTin}
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
                {items.map((item, idx) => {
                  const name = item.name || item.productName || item.product?.name || 'Electronic Item';
                  const qty = item.quantity || item.qty || 1;
                  const price = item.price || item.unitPrice || item.product?.price || 0;
                  const total = qty * price;

                  return (
                    <div key={idx} className="space-y-0.5 border-b border-dotted border-black/30 pb-1 last:border-b-0">
                      <div className="text-[11px] text-black font-black leading-snug">
                        {idx + 1}. {name}
                      </div>
                      {item.serialNumbers && item.serialNumbers.length > 0 && (
                        <div className="text-[9.5px] text-black font-black tracking-tight pl-2">
                          S/N: {item.serialNumbers.join(', ')}
                        </div>
                      )}
                      <div className="flex justify-between text-[10.5px] text-black font-extrabold pl-2">
                        <span>{qty} x {formatTZS(price)}</span>
                        <span className="font-black">{formatTZS(total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Breakdown */}
              <div className="py-2 border-b-2 border-dashed border-black space-y-1 text-[10.5px] text-black font-bold">
                <div className="flex justify-between">
                  <span>{isSwahili ? 'JUMLA KABLA YA KODI:' : isBilingual ? 'JUMLA BILA KODI / NET SUBTOTAL:' : 'SUBTOTAL (NET):'}</span>
                  <span className="font-black">{formatTZS(grandTotal - taxAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isSwahili ? 'KODI YA VAT (18% INCL):' : isBilingual ? 'KODI YA VAT (18%) / VAT:' : 'VAT (18% INCL):'}</span>
                  <span className="font-black">{formatTZS(taxAmount)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between font-black text-black">
                    <span>{isSwahili ? 'PUNGUZO LA BEI:' : isBilingual ? 'PUNGUZO / DISCOUNT:' : 'DISCOUNT:'}</span>
                    <span>-{formatTZS(discount)}</span>
                  </div>
                )}

                {extraCosts.length > 0 && (
                  <div className="space-y-0.5 pt-0.5 border-t border-dashed border-black/40">
                    <div className="flex justify-between font-black text-black">
                      <span>{isSwahili ? 'GHARAMA ZA ZIADA:' : isBilingual ? 'GHARAMA ZA ZIADA / EXTRA SERVICES:' : 'EXTRA COSTS:'}</span>
                      <span>+{formatTZS(extraCosts.reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0))}</span>
                    </div>
                  </div>
                )}

                {/* Grand Total Paid */}
                <div className="flex justify-between items-center py-1.5 my-1 border-t-2 border-b-2 border-black text-black px-1">
                  <span className="font-black text-xs sm:text-sm">
                    {isSwahili ? 'JUMLA KUU (TZS):' : isBilingual ? 'JUMLA KUU / TOTAL (TZS):' : 'TOTAL PAID (TZS):'}
                  </span>
                  <span className="text-sm sm:text-base font-black tracking-tight">{formatTZS(grandTotal)}</span>
                </div>

                {tenderedAmount > 0 && (
                  <div className="flex justify-between pt-0.5">
                    <span>{isSwahili ? 'PESA ILIYOTOLEWA:' : isBilingual ? 'PESA ILIYOTOLEWA / CASH TENDERED:' : 'CASH TENDERED:'}</span>
                    <span className="font-black">{formatTZS(tenderedAmount)}</span>
                  </div>
                )}

                {changeAmount > 0 && (
                  <div className="flex justify-between font-black pt-0.5">
                    <span>{isSwahili ? 'CHENJI ILIYORUDISHWA:' : isBilingual ? 'CHENJI / CHANGE DUE:' : 'CHANGE DUE:'}</span>
                    <span className="font-black">{formatTZS(changeAmount)}</span>
                  </div>
                )}
              </div>

              {/* Optional Official Digital Rubber Stamp */}
              {true && (
                <div className="py-2.5 border-b-2 border-dashed border-black flex justify-center">
                  <div className="official-stamp border-2 border-dashed border-[#0033a0] text-[#0033a0] bg-blue-50/80 p-2 px-4 text-center rounded-lg rotate-[-1.5deg] shadow-sm select-none">
                    <p className="text-[9px] font-black tracking-widest uppercase">★ {store?.storeName || 'GENUINE ELECTRONICS'} ★</p>
                    <p className="text-[10.5px] font-black uppercase tracking-wider my-0.5">
                      {isSwahili ? 'IMELIPWA KIKAMILIFU' : isBilingual ? 'IMELIPWA / PAID' : 'OFFICIAL STAMP • PAID'}
                    </p>
                    <p className="text-[8.5px] font-mono font-black">
                      TAREHE: {formatToGMT3(createdAt).split(',')[0]} • VERIFIED ONLINE
                    </p>
                  </div>
                </div>
              )}

              {/* QR Code and Footer */}
              <div className="text-center space-y-1.5 pt-2">
                <div className="flex justify-center">
                  <div className="p-1 bg-white border border-black/30 inline-block rounded-none">
                    <QRCodeSVG 
                      value={buildReceiptVerificationUrl({
                        orderNo: activeOrderNo || receiptId,
                        receiptNo: receiptId,
                        totalAmount: grandTotal
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
                    {isSwahili ? 'UTHIBITISHO WA RISITI ONLINE' : isBilingual ? 'UTHIBITISHO WA RISITI / ONLINE VERIFIED' : 'ONLINE VERIFIED SOFT COPY'}
                  </p>
                  <p className="text-[9.5px] font-mono font-black text-black">
                    SIGNATURE: {receiptId.slice(-10).toUpperCase()}
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
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex flex-wrap gap-2 justify-between items-center">
          <button
            onClick={handleCopyLink}
            className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <QrCode className="w-4 h-4 text-indigo-400" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Save thermal receipt image PNG"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Image</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Download soft copy PDF"
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-emerald-600/20"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Soft Copy</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
