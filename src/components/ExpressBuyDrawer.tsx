import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  Clock, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Lock, 
  CreditCard, 
  Smartphone, 
  Building2, 
  Wallet, 
  Printer, 
  MessageCircle, 
  ArrowRight,
  Sparkles,
  MapPin,
  Phone,
  User,
  AlertCircle,
  Zap,
  FileText,
  Copy,
  Check,
  Info
} from 'lucide-react';
import { Product, Order, StoreSettings, PaymentMethodSetting, formatTZS, formatToGMT3, BRAND_LOGO_URL } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { calculateWarrantyStatus } from '../utils/warranty';
import { formatTzPhone } from '../utils/phoneFormat';
import { QRCodeSVG } from 'qrcode.react';
import { InvoicePrintModal } from './InvoicePrintModal';

interface ExpressBuyDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  createOrder: (order: Omit<Order, 'id' | 'createdAt' | 'trackingNumber'>) => Promise<Order> | Order;
  user?: any;
  profile?: any;
  storeSettings?: StoreSettings;
  isDark?: boolean;
}

export const ExpressBuyDrawer: React.FC<ExpressBuyDrawerProps> = ({
  product,
  isOpen,
  onClose,
  createOrder,
  user,
  profile,
  storeSettings,
  isDark = false
}) => {
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('Dar es Salaam');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('M-Pesa');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [copiedAccountNo, setCopiedAccountNo] = useState(false);
  const [showFullInvoiceModal, setShowFullInvoiceModal] = useState(false);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user || profile) {
      setCustomerName(profile?.fullName || profile?.full_name || user?.displayName || '');
      setCustomerEmail(user?.email || profile?.email || '');
      setCustomerPhone(profile?.phone || user?.phoneNumber || '');
      setShippingAddress(profile?.address || '');
      if (profile?.city) setDeliveryCity(profile.city);
    }
  }, [user, profile, isOpen]);

  // Reset state when opening a new product
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setCompletedOrder(null);
      setErrorMessage(null);
      setCopiedAccountNo(false);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const stockAvailable = product.stock ?? product.stockCount ?? 10;
  const isOutOfStock = stockAvailable <= 0;
  
  const unitPrice = (() => {
    const sellingPrice = Number(product.price || 0);
    const costPrice = Number((product as any).cost_price || product.costPrice || 0);

    // 1. Single unit: regular selling price
    if (quantity < 2) return sellingPrice;

    // 2. 3+ Units: Full Wholesale Price
    if (quantity >= 3) {
      if (product.wholesalePrice && product.wholesalePrice > 0) {
        return product.wholesalePrice;
      }
      if (costPrice > 0 && sellingPrice > costPrice) {
        return Math.round(costPrice + (sellingPrice - costPrice) / 2);
      }
      let wholesaleVal = Math.round(sellingPrice * 0.88);
      if (costPrice > 0 && wholesaleVal < costPrice) wholesaleVal = costPrice;
      return wholesaleVal;
    }

    // 3. Exactly 2 Units: Dynamic auto % based on product value (capped under 6%)
    let dynamicPct = 5;
    if (sellingPrice >= 2000000) {
      dynamicPct = 2; // 2% off high-value items
    } else if (sellingPrice >= 800000) {
      dynamicPct = 3; // 3% off mid-high items
    } else if (sellingPrice >= 250000) {
      dynamicPct = 4; // 4% off mid items
    } else {
      dynamicPct = 5.5; // 5.5% off standard items
    }

    let calculatedPrice = Math.round(sellingPrice * (1 - dynamicPct / 100));

    // Profit margin protection
    if (costPrice > 0 && calculatedPrice < costPrice) {
      calculatedPrice = costPrice;
    }

    return calculatedPrice;
  })();

  const isDiscounted = unitPrice < (product.price || 0);
  const subtotal = unitPrice * quantity;
  const isDarEsSalaam = (deliveryCity || '').trim().toLowerCase() === 'dar es salaam';
  const shippingFee = isDarEsSalaam ? 0 : Math.round(subtotal * 0.05);
  const totalAmount = subtotal + shippingFee;

  const warrantyStatus = calculateWarrantyStatus(new Date().toISOString(), product.warranty);

  const handleQuantityChange = (delta: number) => {
    triggerHaptic('light');
    setQuantity(prev => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > stockAvailable) return stockAvailable;
      return next;
    });
  };

  const handlePlaceExpressOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOutOfStock) {
      setErrorMessage('This product is currently out of stock.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMessage('Please enter your active WhatsApp or calling phone number.');
      return;
    }

    if (!shippingAddress.trim()) {
      setErrorMessage('Please enter your delivery street / landmark address.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    triggerHaptic('medium');

    try {
      const customerUserId = user?.id || (user as any)?.uid || undefined;
      const isProductVat = product.isVatInclusive !== false;
      const storeVatPct = Number(storeSettings?.vatPercentage ?? 18);
      const isVatApplied = isProductVat && storeVatPct > 0;
      const vatTax = isVatApplied ? Math.round(totalAmount * (storeVatPct / (100 + storeVatPct))) : 0;
      const netSubtotal = isVatApplied && vatTax > 0 ? (totalAmount - vatTax) : totalAmount;

      const newOrderPayload: Omit<Order, 'id' | 'createdAt' | 'trackingNumber'> = {
        userId: customerUserId,
        customerId: customerUserId,
        customer_id: customerUserId,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || `${customerPhone.replace(/[^0-9]/g, '')}@expresscustomer.tz`,
        customerPhone: customerPhone.trim(),
        shippingAddress: `${shippingAddress.trim()}, ${deliveryCity}`,
        city: deliveryCity,
        items: [
          {
            product,
            quantity,
            price: unitPrice
          }
        ],
        totalAmount,
        status: 'Pending',
        paymentMethod,
        paymentStatus: paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Pending',
        notes: orderNotes.trim() ? `[Express Buy] ${orderNotes.trim()}` : '[Express Buy]',
        deliveryNotes: `Deliver to ${deliveryCity}`,
        includeVat: isVatApplied && vatTax > 0,
        vatPercentage: isVatApplied ? storeVatPct : 0,
        tax: isVatApplied ? vatTax : 0,
        subtotal: netSubtotal,
      };

      const result = await createOrder(newOrderPayload);
      triggerHaptic('success');
      setCompletedOrder(result);
    } catch (err: any) {
      console.error('Express buy error:', err);
      setErrorMessage(err?.message || 'Failed to submit express order. Please try again.');
      triggerHaptic('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendWhatsAppConfirmation = () => {
    if (!completedOrder) return;
    triggerHaptic('light');
    const storePhone = (storeSettings?.whatsappNumber || storeSettings?.phone || '255624057166').replace(/[^0-9+]/g, '');
    let cleanPhone = storePhone;
    if (cleanPhone.startsWith('0')) cleanPhone = '255' + cleanPhone.slice(1);
    if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.slice(1);

    const storeName = storeSettings?.storeName || 'Genuine Electronics';
    const proformaRef = `PRO-${completedOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
    const message = 
      `*📄 PROFORMA INVOICE & ORDER - ${storeName}*\n` +
      `----------------------------------------\n` +
      `🆔 *Proforma No:* ${proformaRef}\n` +
      `📑 *Order ID:* ${completedOrder.id}\n` +
      `📦 *Item:* ${quantity}x ${product.name}\n` +
      `💰 *Amount Payable:* ${formatTZS(completedOrder.totalAmount)}\n` +
      `👤 *Customer:* ${completedOrder.customerName}\n` +
      `📞 *Phone:* ${completedOrder.customerPhone || completedOrder.phone}\n` +
      `📍 *Delivery:* ${completedOrder.shippingAddress}\n` +
      `💳 *Selected Payment:* ${completedOrder.paymentMethod}\n` +
      `🛡️ *Warranty:* ${warrantyStatus.term}\n` +
      `----------------------------------------\n` +
      `Hello! I have generated a Proforma Invoice for my express order. Please verify my payment and confirm dispatch.`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Drawer Container */}
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`w-screen max-w-lg shadow-2xl flex flex-col ${
              isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
            }`}
          >
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Express 1-Click Checkout</h3>
                  <p className="text-xs text-blue-100 font-medium">Fast genuine delivery across Tanzania</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Close express checkout"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
              {completedOrder ? (() => {
                const defaultMethods: PaymentMethodSetting[] = [
                  { id: '1', type: 'Bank Transfer', provider: 'CRDB Bank Tanzania PLC', accountName: 'Genuine Electronics Ltd', accountNumber: '0150 8829 4100', instructions: 'Transfer directly to CRDB account. Quote order number as payment reference.', isActive: true },
                  { id: '2', type: 'Mobile Money', provider: 'M-Pesa / Mixx By Yas / Airtel Money', accountName: 'Genuine Electronics Ltd', accountNumber: '0768 929 203', instructions: 'Pay via Till / Lipa Namba 0768 929 203.', isActive: true },
                  { id: '3', type: 'Orbi Pay', provider: 'Orbi Pay Wallet', accountName: 'Genuine Electronics Ltd', accountNumber: 'ORBI-9901', instructions: 'Pay via Orbi Pay barcode or wallet ID.', isActive: true },
                  { id: '4', type: 'Cash on Delivery', provider: 'Cash on Delivery / In-Store Pickup', accountName: 'Genuine Electronics Ltd', accountNumber: 'Pay Upon Delivery', instructions: 'Pay cash or mobile money upon receiving your order.', isActive: true }
                ];
                const methodsList = (storeSettings?.paymentMethods && storeSettings.paymentMethods.length > 0) ? storeSettings.paymentMethods : defaultMethods;
                const qMethod = (completedOrder.paymentMethod || '').toLowerCase();
                const selectedMethod = methodsList.find(m => {
                  const p = (m.provider || '').toLowerCase();
                  const t = (m.type || '').toLowerCase();
                  const id = (m.id || '').toLowerCase();
                  return qMethod === id || qMethod === t || p.includes(qMethod) || qMethod.includes(p) || qMethod.includes(t);
                }) || {
                  id: 'custom',
                  type: completedOrder.paymentMethod || 'Direct Payment',
                  provider: completedOrder.paymentMethod || 'Genuine Electronics Merchant',
                  accountName: 'Genuine Electronics Tanzania Ltd',
                  accountNumber: '0768 929 203',
                  instructions: `Please complete payment for your order and quote order number ${completedOrder.id} as payment reference.`,
                  isActive: true
                };

                const totalAmt = completedOrder.totalAmount;
                const defaultStoreVat = Number(storeSettings?.vatPercentage ?? 18);
                const hasOrderItems = completedOrder.items && completedOrder.items.length > 0;
                const allItemsExempt = hasOrderItems 
                  ? completedOrder.items.every(item => item.product?.isVatInclusive === false)
                  : product.isVatInclusive === false;

                const isVatApplicable = !allItemsExempt &&
                  completedOrder.includeVat !== false && 
                  (completedOrder.vatPercentage !== undefined ? Number(completedOrder.vatPercentage) > 0 : defaultStoreVat > 0) &&
                  (completedOrder.tax !== undefined ? Number(completedOrder.tax) > 0 : true);
                const effectiveVatPct = isVatApplicable ? Number(completedOrder.vatPercentage ?? defaultStoreVat) : 0;
                const vatTax = isVatApplicable && effectiveVatPct > 0
                  ? (completedOrder.tax !== undefined ? Number(completedOrder.tax) : (totalAmt * (effectiveVatPct / (100 + effectiveVatPct))))
                  : 0;
                const netSubtotal = totalAmt - vatTax;
                const proformaNumber = `PRO-${completedOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;

                return (
                  /* Success Screen - Official Proforma Invoice */
                  <div className="space-y-4 animate-in fade-in zoom-in-95">
                    <div className="text-center space-y-1">
                      <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 rounded-none border border-blue-500/30">
                        Proforma Invoice • Awaiting Payment Confirmation
                      </span>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white pt-1">Proforma Invoice Generated</h2>
                    </div>

                    {/* Authentic Proforma Invoice Paper */}
                    <div 
                      className="font-sans text-[11px] leading-tight bg-white text-slate-900 p-5 shadow-xl border border-slate-300 rounded-xl w-full mx-auto space-y-3"
                      style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                    >
                      {/* Header */}
                      <div className="text-center space-y-1 pb-2.5 border-b-2 border-slate-900">
                        <div className="flex items-center justify-center mx-auto mb-1">
                          <img 
                            src={BRAND_LOGO_URL} 
                            alt={storeSettings?.storeName || "Genuine Electronics"} 
                            className="h-7 w-auto max-w-[120px] object-contain" 
                            referrerPolicy="no-referrer" 
                          />
                        </div>
                        <h3 className="font-black text-xs tracking-normal uppercase text-slate-950">
                          {storeSettings?.storeName || 'GENUINE ELECTRONICS'}
                        </h3>
                        <div className="inline-block bg-blue-50 text-blue-800 border border-blue-300 px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider">
                          PROFORMA INVOICE • ORDER QUOTATION
                        </div>
                        <p className="text-[9px] text-slate-600">
                          {storeSettings?.address || 'Kariakoo, Dar es Salaam Tanzania'}
                        </p>
                        <p className="text-[9px] text-slate-700 font-semibold">
                          TEL: {storeSettings?.phone || '+255 768 929 203'}
                        </p>
                        <div className="text-[8.5px] font-bold text-slate-800 pt-0.5">
                          <span>TIN: {storeSettings?.tin || '104-982-371'}</span>
                          <span className="mx-1">|</span>
                          </div>
                      </div>

                      {/* Metadata */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600 font-semibold">PROFORMA NO:</span>
                          <span className="font-mono font-bold text-slate-900">{proformaNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 font-semibold">ORDER ID:</span>
                          <span className="font-mono font-bold text-slate-900">{completedOrder.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 font-semibold">DATE/TIME:</span>
                          <span className="text-slate-800">{formatToGMT3(completedOrder.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 font-semibold">CUSTOMER:</span>
                          <span className="font-bold text-slate-900">{completedOrder.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 font-semibold">PHONE:</span>
                          <span className="text-slate-800">{completedOrder.customerPhone || completedOrder.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 font-semibold">DESTINATION:</span>
                          <span className="truncate max-w-[180px] text-slate-800 font-medium">{deliveryCity}</span>
                        </div>
                        <div className="flex justify-between items-center pt-0.5 border-t border-slate-200">
                          <span className="text-slate-600 font-semibold">STATUS:</span>
                          <span className="bg-amber-100 text-amber-900 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-amber-300">
                            Payment Pending Verification
                          </span>
                        </div>
                      </div>

                      {/* Items Table */}
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 px-2.5 py-1.5 flex justify-between font-bold text-[9.5px] text-slate-800 border-b border-slate-200">
                          <span>ITEM DESCRIPTION</span>
                          <span>AMOUNT (TZS)</span>
                        </div>
                        <div className="p-1.5 space-y-0.5">
                          <div className="text-[10px] text-slate-900 font-semibold">
                            1. {product.name}
                          </div>
                          <div className="flex justify-between text-[9.5px] text-slate-600 pl-2">
                            <span>{quantity} x {formatTZS(unitPrice)}</span>
                            <span className="font-bold text-slate-900">{formatTZS(unitPrice * quantity)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Totals */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[9.5px]">
                        {isVatApplicable && vatTax > 0 ? (
                          <>
                            <div className="flex justify-between text-slate-600">
                              <span>NET SUBTOTAL:</span>
                              <span className="font-semibold text-slate-800">{formatTZS(netSubtotal)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>TRA VAT ({effectiveVatPct}% INCL):</span>
                              <span className="font-semibold text-slate-800">{formatTZS(vatTax)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between text-slate-600">
                            <span>SUBTOTAL:</span>
                            <span className="font-semibold text-slate-800">{formatTZS(totalAmt)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center font-bold text-xs py-1 my-0.5 border-t-2 border-b-2 border-slate-900 text-slate-950">
                          <span>AMOUNT PAYABLE:</span>
                          <span className="text-sm font-black text-blue-700">{formatTZS(totalAmt)}</span>
                        </div>
                      </div>

                      {/* Payment Remittance Details Card */}
                      <div className="bg-blue-50/70 border-2 border-blue-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase text-blue-900 flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                            Selected Payment Channel
                          </span>
                          <span className="bg-blue-200/80 text-blue-950 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                            {completedOrder.paymentMethod}
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-blue-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Provider / Channel:</span>
                            <span className="text-xs font-bold text-slate-900">{selectedMethod.provider}</span>
                          </div>

                          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-md border border-slate-200">
                            <div>
                              <span className="text-[8.5px] font-bold text-slate-500 uppercase block">Account / Lipa Namba:</span>
                              <span className="font-mono font-black text-xs text-blue-700">{selectedMethod.accountNumber}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedMethod.accountNumber);
                                setCopiedAccountNo(true);
                                setTimeout(() => setCopiedAccountNo(false), 2000);
                              }}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[9.5px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              {copiedAccountNo ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedAccountNo ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-semibold">Account Name:</span>
                            <span className="font-bold text-slate-900">{selectedMethod.accountName}</span>
                          </div>

                          {selectedMethod.instructions && (
                            <p className="text-[9px] text-slate-600 pt-1 border-t border-slate-100">
                              <strong className="text-slate-800">Instructions:</strong> {selectedMethod.instructions}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Advisory Notice Box */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2 text-[9.5px] text-amber-900">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Official Receipt Note:</p>
                          <p className="text-amber-800">
                            This is a <strong>Proforma Invoice</strong>. Your official TRA Fiscal Cash Receipt will be issued once our store staff verifies your payment.
                          </p>
                        </div>
                      </div>

                      {/* Proforma QR & Official Stamp Authorization */}
                      <div className="pt-2 border-t border-dashed border-slate-300 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-white border border-slate-300 inline-block rounded">
                            <QRCodeSVG 
                              value={`https://genuine-electronics.com/proforma/${completedOrder.id}?total=${completedOrder.totalAmount}&pro=${proformaNumber}`} 
                              size={52} 
                              level="M"
                            />
                          </div>
                          <div>
                            <p className="text-[9px] font-mono font-bold text-slate-800">
                              REF: {proformaNumber}
                            </p>
                            <p className="text-[8.5px] text-slate-600">
                              Scan QR to verify quotation status
                            </p>
                          </div>
                        </div>

                        {/* Official Blue Stamp Badge */}
                        <div className="border-2 border-blue-900/80 rounded-full w-16 h-16 flex flex-col items-center justify-center p-0.5 text-center text-blue-900 font-mono rotate-[-6deg] bg-blue-50/40 select-none shrink-0">
                          <span className="text-[6px] font-black uppercase tracking-tighter leading-none">GENUINE ELEC.</span>
                          <span className="text-[5px] font-bold border-y border-blue-900/60 py-0.5 my-0.5 uppercase tracking-widest text-blue-950">QUOTATION</span>
                          <span className="text-[5px] font-semibold leading-none">VERIFIED</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowFullInvoiceModal(true)}
                        className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all active:scale-98 cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View & Print Official Proforma (A4)</span>
                      </button>

                      <button
                        type="button"
                        onClick={sendWhatsAppConfirmation}
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-98 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Send Proforma to WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={onClose}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        Continue Shopping
                      </button>
                    </div>
                  </div>
                );
              })() : (
                /* Express Form */
                <form onSubmit={handlePlaceExpressOrder} className="space-y-5">
                  {/* Selected Product Card */}
                  <div className={`p-3.5 rounded-2xl border flex items-center gap-3.5 ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-600 text-white">
                          {product.brand || 'Genuine'}
                        </span>
                        {product.sku && (
                          <span className="text-[10px] font-mono text-slate-400">SKU: {product.sku}</span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs mt-1 truncate">{product.name}</h4>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                          {formatTZS(unitPrice)}
                        </span>
                        {product.originalPrice && product.originalPrice > unitPrice && (
                          <span className="text-[11px] line-through text-slate-400">
                            {formatTZS(product.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantity and Real-time Stock Bar */}
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                          Select Quantity
                        </label>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isOutOfStock ? (
                            <span className="text-rose-500 font-bold">Out of stock</span>
                          ) : (
                            <span className="text-emerald-500 font-bold">{stockAvailable} units in stock</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={quantity <= 1 || isOutOfStock}
                          onClick={() => handleQuantityChange(-1)}
                          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center transition-all active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-black text-sm">{quantity}</span>
                        <button
                          type="button"
                          disabled={quantity >= stockAvailable || isOutOfStock}
                          onClick={() => handleQuantityChange(1)}
                          className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dynamic Discount Indicator Banner */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      {quantity >= 3 ? (
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                            <span>🎉 3+ Units Wholesale Price Unlocked!</span>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black">WHOLESALE</span>
                        </div>
                      ) : quantity === 2 ? (
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[11px] font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-500" />
                            <span>⚡ 2 Units Dynamic Value Discount Applied! (Set Qty to 3+ for Wholesale Rate)</span>
                          </span>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-medium flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                          <span>Buy 2 units for Dynamic Discount, or 3+ units for Wholesale Pricing!</span>
                        </div>
                      )}
                    </div>

                    {/* Warranty pill */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Included Warranty</span>
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {warrantyStatus.term}
                      </span>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      <span>1. Customer & Contact</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="express-buy-customer-name" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Full Name *
                        </label>
                        <input
                          id="express-buy-customer-name"
                          type="text"
                          required
                          autoComplete="name"
                          name="name"
                          inputMode="text"
                          autoCapitalize="words"
                          spellCheck={false}
                          placeholder="e.g. Danny Dizer"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      <div>
                        <label htmlFor="express-buy-customer-phone" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Phone Number (WhatsApp) *
                        </label>
                        <input
                          id="express-buy-customer-phone"
                          type="tel"
                          required
                          autoComplete="tel"
                          name="tel"
                          inputMode="tel"
                          placeholder="e.g. 0712 345 678"
                          value={customerPhone}
                          onBlur={() => setCustomerPhone(formatTzPhone(customerPhone))}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Details */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-indigo-500" />
                      <span>2. Delivery Destination</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          City / Region *
                        </label>
                        <select
                          value={deliveryCity}
                          onChange={(e) => setDeliveryCity(e.target.value)}
                          autoComplete="address-level2"
                          name="address-level2"
                          className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        >
                          <option value="Dar es Salaam">Dar es Salaam (Free Delivery)</option>
                          <option value="Arusha">Arusha (Est. 5% Delivery Cost)</option>
                          <option value="Mwanza">Mwanza (Est. 5% Delivery Cost)</option>
                          <option value="Dodoma">Dodoma (Est. 5% Delivery Cost)</option>
                          <option value="Zanzibar">Zanzibar (Est. 5% Delivery Cost)</option>
                          <option value="Mbeya">Mbeya (Est. 5% Delivery Cost)</option>
                          <option value="Morogoro">Morogoro (Est. 5% Delivery Cost)</option>
                          <option value="Tanga">Tanga (Est. 5% Delivery Cost)</option>
                          <option value="Kilimanjaro">Kilimanjaro (Est. 5% Delivery Cost)</option>
                          <option value="Other Region">Other Region (Est. 5% Delivery Cost)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Street / Landmark *
                        </label>
                        <input
                          type="text"
                          required
                          autoComplete="street-address"
                          name="street-address"
                          placeholder="e.g. Kariakoo / Mikocheni B"
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Channel Selector */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                      <span>3. Payment Channel</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(() => {
                        const configured = storeSettings?.paymentMethods && storeSettings.paymentMethods.length > 0
                          ? [...storeSettings.paymentMethods]
                          : [
                              { id: '1', type: 'Bank Transfer', provider: 'CRDB Bank Tanzania PLC', accountName: 'Genuine Electronics Ltd', accountNumber: '0150 8829 4100', instructions: 'Transfer directly to CRDB account. Quote order number as reference.', isActive: true },
                              { id: '2', type: 'Mobile Money', provider: 'M-Pesa / Mixx By Yas / Airtel Money', accountName: 'Genuine Electronics Ltd', accountNumber: '0768 929 203', instructions: 'Pay via Till / Lipa Namba 0768 929 203.', isActive: true },
                              { id: '3', type: 'Cash on Delivery', provider: 'Cash on Delivery / In-Store Pickup', accountName: 'Genuine Electronics Ltd', accountNumber: 'Pay Upon Delivery', instructions: 'Pay cash or mobile money upon receiving your order.', isActive: true },
                              { id: '4', type: 'Orbi Pay', provider: 'Orbi Pay Wallet', accountName: 'Genuine Electronics Ltd', accountNumber: 'ORBI-9901', instructions: 'Pay via Orbi Pay barcode or wallet ID.', isActive: false }
                            ];

                        const hasOrbi = configured.some(pm => (pm.provider + ' ' + pm.type + ' ' + (pm.id || '')).toLowerCase().includes('orbi'));
                        if (!hasOrbi) {
                          configured.push({
                            id: 'orbi-pay-upcoming',
                            type: 'Orbi Pay',
                            provider: 'Orbi Pay Wallet',
                            accountName: 'Genuine Electronics Ltd',
                            accountNumber: 'ORBI-9901',
                            instructions: 'Instant Escrow Gateway by Orbi Fintech (Under Launch)',
                            isActive: false
                          });
                        }

                        return configured.map((pm) => {
                          const getPaymentColor = (provider: string) => {
                            const p = String(provider || "").toLowerCase();
                            if (p.includes('m-pesa')) return 'text-red-500';
                            if (p.includes('mixx') || p.includes('tigo')) return 'text-blue-500';
                            if (p.includes('airtel')) return 'text-rose-500';
                            if (p.includes('halo')) return 'text-amber-500';
                            if (p.includes('bank') || p.includes('crdb') || p.includes('nmb')) return 'text-indigo-500';
                            if (p.includes('orbi')) return 'text-purple-500';
                            return 'text-emerald-500';
                          };

                          const p = (pm.provider + ' ' + pm.type + ' ' + (pm.id || '')).toLowerCase();
                          const isOrbi = p.includes('orbi');
                          const isDisabled = !pm.isActive || isOrbi;
                          const isSelected = !isDisabled && paymentMethod === pm.provider;
                          
                          return (
                            <motion.button
                              key={pm.id}
                              type="button"
                              disabled={isDisabled}
                              whileHover={!isDisabled ? { scale: 1.03, y: -2 } : {}}
                              whileTap={!isDisabled ? { scale: 0.96 } : {}}
                              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                              onClick={() => {
                                if (!isDisabled) {
                                  triggerHaptic('light');
                                  setPaymentMethod(pm.provider);
                                }
                              }}
                              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                                isDisabled 
                                  ? isOrbi
                                    ? isDark ? 'border-purple-900/50 bg-purple-950/20 opacity-80 cursor-not-allowed' : 'border-purple-200 bg-purple-50/40 opacity-80 cursor-not-allowed'
                                    : isDark ? 'border-amber-900/40 bg-amber-950/20 opacity-75 cursor-not-allowed' : 'border-amber-200 bg-amber-50/40 opacity-75 cursor-not-allowed'
                                  : isSelected
                                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-md'
                                  : isDark ? 'border-slate-800 bg-slate-800/40 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full gap-1">
                                <span className={`text-[10px] font-extrabold truncate ${getPaymentColor(pm.provider)}`}>
                                  ● {pm.type}
                                </span>
                                {isOrbi ? (
                                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 shrink-0">
                                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                    Coming Soon
                                  </span>
                                ) : !pm.isActive ? (
                                  <span className="bg-red-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm shrink-0">
                                    Maintenance
                                  </span>
                                ) : null}
                              </div>
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-1 line-clamp-1">{pm.provider}</span>
                              {isOrbi ? (
                                <span className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold leading-tight mt-0.5">
                                  Under Launch • Coming Soon
                                </span>
                              ) : !pm.isActive ? (
                                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium leading-tight mt-0.5">
                                  Featured channel (Maintenance)
                                </span>
                              ) : null}
                            </motion.button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Order Summary & Pricing */}
                  <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
                    isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Item Subtotal ({quantity}x)</span>
                      <span className="font-bold">{formatTZS(subtotal)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        {isDarEsSalaam ? 'Delivery (Dar es Salaam)' : `Estimate Delivery Cost (${deliveryCity})`}
                      </span>
                      <span className="font-bold text-emerald-500">
                        {shippingFee === 0 ? 'FREE' : formatTZS(shippingFee)}
                      </span>
                    </div>

                    {product.isVatInclusive !== false && Number(storeSettings?.vatPercentage ?? 18) > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>TRA VAT ({Number(storeSettings?.vatPercentage ?? 18)}% Included)</span>
                        <span className="font-bold">
                          {formatTZS(Math.round(subtotal * (Number(storeSettings?.vatPercentage ?? 18) / (100 + Number(storeSettings?.vatPercentage ?? 18)))))}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-black">
                      <span>Total Amount</span>
                      <span className="text-blue-600 dark:text-blue-400">{formatTZS(totalAmount)}</span>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting || isOutOfStock}
                    className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center gap-2 shadow-xl shadow-blue-600/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Placing Order in Real-Time...</span>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span>Place Express Order · {formatTZS(totalAmount)}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Official A4 Proforma Invoice Modal */}
      {showFullInvoiceModal && completedOrder && (
        <InvoicePrintModal
          order={completedOrder}
          onClose={() => setShowFullInvoiceModal(false)}
          storeSettings={storeSettings}
          defaultDocType="proforma"
          isClientView={true}
        />
      )}
    </AnimatePresence>
  );
};
