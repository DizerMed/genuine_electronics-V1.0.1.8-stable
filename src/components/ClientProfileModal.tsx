import React, { useState, useMemo } from 'react';
import { 
  User, Mail, Phone, MapPin, Package, Clock, CheckCircle2, 
  Truck, ShieldCheck, Printer, Download, Search, X, ChevronRight, 
  ExternalLink, MessageCircle, CreditCard, RotateCcw, AlertCircle,
  Copy, Check, FileText, Sparkles, Building2, ShoppingBag, Eye, Lock
} from 'lucide-react';
import { Order, POSTransaction, StoreSettings, formatTZS, formatToGMT3, BRAND_LOGO_URL } from '../types';
import { InvoicePrintModal } from './InvoicePrintModal';
import { POSReceiptModal } from './POSReceiptModal';
import { OrderWarrantySection } from './OrderWarrantySection';
import { calculateWarrantyStatus } from '../utils/warranty';
import { triggerHaptic } from '../utils/haptics';
import { safeLocalStorage } from '../utils/storage';

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: any;
  orders: Order[];
  onUpdateProfile?: (updated: { displayName?: string; fullName?: string; phone?: string; address?: string; city?: string }) => void;
  onLogout?: () => void;
  storeSettings?: StoreSettings;
  isDark?: boolean;
  initialTab?: 'profile' | 'orders' | 'tracking' | 'payment';
}

export const ClientProfileModal: React.FC<ClientProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  profile,
  orders = [],
  onUpdateProfile,
  onLogout,
  storeSettings,
  isDark = false,
  initialTab = 'orders'
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'tracking' | 'payment'>(initialTab);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Processing' | 'Shipped' | 'Delivered'>('all');
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<Order | null>(null);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [activeReceiptTx, setActiveReceiptTx] = useState<POSTransaction | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile editable form state
  const [fullName, setFullName] = useState(profile?.displayName || profile?.fullName || profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || profile?.phoneNumber || '');
  const [deliveryAddress, setDeliveryAddress] = useState(profile?.address || profile?.shippingAddress || '');
  const [city, setCity] = useState(profile?.city || 'Dar es Salaam');

  React.useEffect(() => {
    if (profile) {
      if (profile.displayName || profile.fullName || profile.full_name) {
        setFullName(profile.displayName || profile.fullName || profile.full_name);
      }
      if (profile.phone || profile.phoneNumber) {
        setPhoneNumber(profile.phone || profile.phoneNumber);
      }
      if (profile.address || profile.shippingAddress) {
        setDeliveryAddress(profile.address || profile.shippingAddress);
      }
      if (profile.city) {
        setCity(profile.city);
      }
    }
  }, [profile]);

  // Filter user orders (by customerEmail / customerPhone / or all if logged in)
  const userOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const userEmail = String(user?.email || '').toLowerCase();
    return orders.filter(order => {
      if (!userEmail) return true;
      const orderEmail = String(order.customerEmail || '').toLowerCase();
      // Match email, or if user is admin, show all, or show matching orders
      if (profile?.role === 'admin' || userEmail === 'admin@genuine-electronics.com') return true;
      return orderEmail === userEmail || !orderEmail;
    });
  }, [orders, user, profile]);

  const filteredOrders = useMemo(() => {
    return userOrders.filter(order => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const q = String(orderSearchQuery || "").toLowerCase().trim();
      if (!q) return matchesStatus;
      const matchesId = String(order.id || '').toLowerCase().includes(q);
      const matchesTracking = String(order.trackingNumber || '').toLowerCase().includes(q);
      const matchesItems = order.items?.some(i => String(i?.product?.name || '').toLowerCase().includes(q));
      return matchesStatus && (matchesId || matchesTracking || matchesItems);
    });
  }, [userOrders, statusFilter, orderSearchQuery]);

  // Overall statistics
  const totalSpent = useMemo(() => {
    return userOrders.reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);
  }, [userOrders]);

  const deliveredCount = useMemo(() => {
    return userOrders.filter(o => o.status === 'Delivered').length;
  }, [userOrders]);

  if (!isOpen) return null;

  const handleCopyTracking = (tracking: string) => {
    navigator.clipboard.writeText(tracking);
    setCopiedTracking(tracking);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateProfile) {
      onUpdateProfile({
        displayName: fullName,
        fullName,
        phone: phoneNumber,
        address: deliveryAddress,
        city
      });
    }
    // Also save in local storage for instant persistence
    const saved = safeLocalStorage.getItem('ge_user_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.user_metadata = {
          ...parsed.user_metadata,
          full_name: fullName,
          displayName: fullName,
          phone: phoneNumber,
          address: deliveryAddress,
          city
        };
        safeLocalStorage.setItem('ge_user_session', JSON.stringify(parsed));
      } catch (err) {
        console.error(err);
      }
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Convert an Order to POSReceipt format for thermal printing
  const openThermalReceipt = (order: Order) => {
    const isVatApplied = order.includeVat !== undefined 
      ? Boolean(order.includeVat) 
      : (order.vatPercentage !== undefined ? Number(order.vatPercentage) > 0 : (order.tax !== undefined ? Number(order.tax) > 0 : (storeSettings?.vatPercentage !== undefined ? Number(storeSettings.vatPercentage) > 0 : true)));
    const vatPct = isVatApplied ? (order.vatPercentage ?? storeSettings?.vatPercentage ?? 18) : 0;
    const taxVal = isVatApplied && vatPct > 0 ? (order.tax ?? Math.round(order.totalAmount - (order.totalAmount / (1 + vatPct / 100)))) : 0;
    const subtotalVal = order.subtotal ?? (order.totalAmount - taxVal);
    const receipt: POSTransaction = {
      id: order.id.replace('ORD-', 'REC-'),
      createdAt: order.createdAt || new Date().toISOString(),
      cashierName: 'Genuine Online',
      items: order.items || [],
      subtotal: subtotalVal,
      tax: taxVal,
      total: order.totalAmount,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      changeAmount: 0,
      customerName: order.customerName || fullName || 'Valued Customer',
      receiptNumber: `REC-TZ-${order.id}`,
      includeVat: isVatApplied && vatPct > 0 && taxVal > 0,
      vatPercentage: vatPct
    };
    setActiveReceiptTx(receipt);
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Shipped':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'Processing':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'Cancelled':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  };

  const getTrackingStepIndex = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 0;
      case 'Processing': return 1;
      case 'Shipped': return 2;
      case 'Delivered': return 3;
      default: return 0;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl md:rounded-3xl shadow-2xl border overflow-hidden transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Top Header Banner */}
        <div className="relative px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10">
              {(fullName || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black tracking-tight">
                  {fullName || user?.email?.split('@')[0] || 'My Account'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-600 text-white shadow-sm">
                  {profile?.role === 'admin' ? 'Administrator' : 'Verified Buyer'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {user?.email || 'buyer@genuine-electronics.com'} • Member since 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Account Quick Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Orders</p>
              <p className="text-sm font-black">{userOrders.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Delivered</p>
              <p className="text-sm font-black">{deliveredCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Spent</p>
              <p className="text-sm font-black text-blue-600 dark:text-blue-400">{formatTZS(totalSpent)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Official Warranty</p>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">100% Active</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => { setActiveTab('orders'); setSelectedOrderForTracking(null); }}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>My Orders & Invoices ({userOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Addresses</span>
          </button>

          <button
            onClick={() => setActiveTab('payment')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'payment'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment Gateways (TZ)</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          
          {/* TAB 1: ORDERS & TRACKING */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              
              {/* If user clicked specific order to track */}
              {selectedOrderForTracking ? (
                <div className="space-y-6 animate-in fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setSelectedOrderForTracking(null)}
                      className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      ← Back to All Orders
                    </button>
                    <span className="text-xs font-bold text-slate-500">
                      Tracking Details for <span className="text-slate-900 dark:text-white font-extrabold">{selectedOrderForTracking.id}</span>
                    </span>
                  </div>

                  {/* Order Progress Tracker Card */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/5 via-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold">Order #{selectedOrderForTracking.id}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(selectedOrderForTracking.status)}`}>
                            {selectedOrderForTracking.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Placed on {formatToGMT3(selectedOrderForTracking.createdAt)} • Carrier: Genuine Express Logistics Dar
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveInvoiceOrder(selectedOrderForTracking)}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-1.5 transition-all"
                          title="Print or Download Official Tax Invoice"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Official Tax Invoice</span>
                        </button>
                        {selectedOrderForTracking.paymentStatus === 'Paid' ? (
                          <button
                            onClick={() => openThermalReceipt(selectedOrderForTracking)}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5 transition-all"
                            title="Print Confirmed Payment Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Payment Receipt</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              alert('Payment confirmation is pending. Official Payment Receipt will be unlocked once payment is marked as Paid. You can view and download your Tax Invoice now.');
                              setActiveInvoiceOrder(selectedOrderForTracking);
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-medium border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 flex items-center gap-1.5 transition-all"
                            title="Payment Receipt is locked until payment is marked as Paid"
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Receipt (Pending)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Step-by-Step Interactive Timeline */}
                    <div className="pt-4">
                      <div className="relative flex justify-between items-center w-full">
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0" />
                        <div 
                          className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500" 
                          style={{ width: `${(getTrackingStepIndex(selectedOrderForTracking.status) / 3) * 100}%` }}
                        />

                        {[
                          { title: 'Confirmed', desc: 'Order placed & paid', icon: CheckCircle2 },
                          { title: 'Quality Check', desc: 'Warranty sealed', icon: ShieldCheck },
                          { title: 'Dispatched', desc: 'In transit to address', icon: Truck },
                          { title: 'Delivered', desc: 'Handed to customer', icon: Package }
                        ].map((step, idx) => {
                          const isDone = idx <= getTrackingStepIndex(selectedOrderForTracking.status);
                          const isCurrent = idx === getTrackingStepIndex(selectedOrderForTracking.status);
                          const IconComp = step.icon;
                          return (
                            <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                isDone 
                                  ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-md' 
                                  : 'bg-white dark:bg-slate-800 text-slate-400 border-2 border-slate-300 dark:border-slate-700'
                              }`}>
                                <IconComp className="w-4 h-4" />
                              </div>
                              <span className={`text-[11px] font-bold mt-2 ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                {step.title}
                              </span>
                              <span className="hidden sm:block text-[9px] text-slate-400">
                                {step.desc}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tracking Number pill */}
                    <div className="flex flex-wrap items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-3">
                      <div className="flex items-center gap-2.5">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Official Tracking Number</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white">
                            {selectedOrderForTracking.trackingNumber || `GE-TRK-${selectedOrderForTracking.id.replace('ORD-', '')}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            triggerHaptic('success');
                            const trackingId = selectedOrderForTracking.trackingNumber || selectedOrderForTracking.id;
                            const storeName = storeSettings?.storeName || 'Genuine Electronics';
                            const msg = `📦 *ORDER TRACKING UPDATE*\n*${storeName.toUpperCase()}*\n----------------------------------------\n` +
                              `🆔 *Order ID:* ${selectedOrderForTracking.id}\n` +
                              `🚚 *Tracking No:* ${trackingId}\n` +
                              `📊 *Status:* ${selectedOrderForTracking.status}\n` +
                              `💰 *Total Amount:* ${formatTZS(selectedOrderForTracking.totalAmount)}\n` +
                              `📍 *Shipping To:* ${selectedOrderForTracking.shippingAddress || 'Dar es Salaam'}\n` +
                              `----------------------------------------\n` +
                              `Asante kwa ununuzi wako na ${storeName}!`;
                            
                            let phone = (selectedOrderForTracking.customerPhone || '').replace(/[^0-9+]/g, '');
                            if (phone.startsWith('0')) phone = '255' + phone.slice(1);
                            if (phone.startsWith('+')) phone = phone.slice(1);

                            const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                            window.open(url, '_blank');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-sm"
                          title="Share tracking updates to WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            handleCopyTracking(selectedOrderForTracking.trackingNumber || selectedOrderForTracking.id);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                        >
                          {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedTracking ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Items in this order & Warranty */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Ordered Products & Warranty ({selectedOrderForTracking.items?.length || 0})
                      </h4>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Genuine Guarantee Active</span>
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                      {selectedOrderForTracking.items?.map((item, idx) => {
                        const wStatus = calculateWarrantyStatus(selectedOrderForTracking.createdAt, item.product?.warranty);
                        return (
                          <div key={idx} className="p-4 space-y-2.5">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                                  <img 
                                    src={item.product?.image || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=200'} 
                                    alt={item.product?.name || 'Product'}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold truncate text-slate-900 dark:text-white">
                                    {item.product?.name}
                                  </h5>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    Qty: <span className="font-bold text-slate-700 dark:text-slate-300">{item.quantity}</span> • Term: <span className="text-blue-500 font-bold">{wStatus.term}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="text-xs font-black text-blue-600 dark:text-blue-400">
                                  {formatTZS((item.product?.price || 0) * (item.quantity || 1))}
                                </p>
                              </div>
                            </div>

                            {/* Warranty Expiration & Countdown Bar */}
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${
                                  wStatus.isExpired
                                    ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                                    : wStatus.isExpiringSoon
                                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}>
                                  {wStatus.statusLabel}
                                </span>
                                <span className="text-slate-600 dark:text-slate-300 font-medium">
                                  Expires: <strong className="text-slate-900 dark:text-white">{wStatus.expiryDateFormatted}</strong>
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 font-bold">
                                <Clock className="w-3 h-3 text-indigo-500" />
                                <span className={
                                  wStatus.isExpired 
                                    ? 'text-slate-400' 
                                    : wStatus.isExpiringSoon 
                                      ? 'text-amber-600 dark:text-amber-400' 
                                      : 'text-emerald-600 dark:text-emerald-400'
                                }>
                                  {wStatus.remainingText}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed Warranty & Claim Section */}
                    <OrderWarrantySection
                      items={selectedOrderForTracking.items || []}
                      purchaseDate={selectedOrderForTracking.createdAt}
                      orderId={selectedOrderForTracking.id}
                      customerName={selectedOrderForTracking.customerName || profile?.fullName || user?.displayName}
                      storeSettings={storeSettings}
                      defaultExpanded={true}
                    />
                  </div>
                </div>
              ) : (
                /* Order list & search */
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search by Order ID, Tracking or item..."
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                      {(['all', 'Pending', 'Processing', 'Shipped', 'Delivered'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-all whitespace-nowrap ${
                            statusFilter === st 
                              ? 'bg-blue-600 text-white shadow-sm' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {st === 'all' ? 'All Orders' : st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Order Cards Grid */}
                  {filteredOrders.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 mx-auto flex items-center justify-center">
                        <Package className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold">No orders found</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        You have not placed any orders yet, or no orders match your search criteria.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {filteredOrders.map((order) => (
                        <div 
                          key={order.id} 
                          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm hover:shadow-md transition-all space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-extrabold text-sm text-slate-900 dark:text-white">{order.id}</span>
                                <span className="text-xs text-slate-400 ml-2">({formatToGMT3(order.createdAt)})</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {order.paymentStatus === 'Paid' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                                  ✓ Paid & Confirmed
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                  ⏳ Payment Pending
                                </span>
                              )}
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                              <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                                {formatTZS(order.totalAmount)}
                              </span>
                            </div>
                          </div>

                          {/* Line Items Preview */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">Products in Order</p>
                              <div className="mt-1 space-y-1">
                                {order.items?.slice(0, 2).map((it, i) => (
                                  <p key={i} className="truncate font-semibold text-slate-700 dark:text-slate-300">
                                    • {it.quantity}x {it.product?.name}
                                  </p>
                                ))}
                                {(order.items?.length || 0) > 2 && (
                                  <p className="text-[11px] text-blue-500 font-bold">
                                    + {order.items.length - 2} more item(s)
                                  </p>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">Tracking & Destination</p>
                              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200 truncate">
                                📍 {order.shippingAddress || 'Dar es Salaam, Tanzania'}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Tracking: <span className="font-mono font-bold text-slate-900 dark:text-white">{order.trackingNumber || 'GE-TRK-PENDING'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Warranty Expiration & Countdown Section */}
                          <OrderWarrantySection
                            items={order.items || []}
                            purchaseDate={order.createdAt}
                            orderId={order.id}
                            customerName={order.customerName || profile?.fullName || user?.displayName}
                            storeSettings={storeSettings}
                            defaultExpanded={false}
                          />

                          {/* Order Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
                            <button
                              onClick={() => setSelectedOrderForTracking(order)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-500" />
                              <span>Live Tracking Progress</span>
                            </button>

                            <div className="flex items-center gap-2">
                              {/* Official Proforma / Tax Invoice - Available for all orders */}
                              <button
                                onClick={() => setActiveInvoiceOrder(order)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 text-white"
                                title="Print or Download Official Proforma Invoice (A4)"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>{order.paymentStatus === 'Paid' ? 'Tax Invoice' : 'Proforma Invoice'}</span>
                              </button>

                              {/* Payment Receipt Button - Available when Paid */}
                              {order.paymentStatus === 'Paid' ? (
                                <button
                                  onClick={() => openThermalReceipt(order)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all active:scale-95 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                                  title="Print Confirmed Payment Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Payment Receipt</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    alert('Payment confirmation is pending. Official Payment Receipt will be unlocked once payment is marked as Paid. You can print your Tax Invoice now.');
                                    setActiveInvoiceOrder(order);
                                  }}
                                  className="px-3 py-1.5 rounded-xl text-xs font-medium border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 flex items-center gap-1.5 transition-all"
                                  title="Receipt unlocked upon payment confirmation"
                                >
                                  <Lock className="w-3 h-3 text-amber-500" />
                                  <span>Receipt (Pending)</span>
                                </button>
                              )}

                              {/* WhatsApp Direct Verification */}
                              <a
                                href={`https://wa.me/255624057166?text=${encodeURIComponent(
                                  `Hi Genuine Electronics! I'm checking on my Order ${order.id} (${formatTZS(order.totalAmount)}). Tracking: ${order.trackingNumber || order.id}`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                title="Chat on WhatsApp about this order"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROFILE & ADDRESSES */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl space-y-6">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Personal & Contact Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
                      <input 
                        type="text"
                        autoComplete="name"
                        name="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Email Address</label>
                      <input 
                        type="email"
                        autoComplete="email"
                        name="email"
                        value={user?.email || 'sales@genuine-electronics.com'}
                        disabled
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/20 text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Primary Phone / WhatsApp</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="tel"
                        autoComplete="tel"
                        name="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+255 754 123 456"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Address Card */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Default Shipping / Delivery Address
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">City / Region (Tanzania)</label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        autoComplete="address-level2"
                        name="address-level2"
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Dar es Salaam">Dar es Salaam (Same-day Delivery)</option>
                        <option value="Arusha">Arusha</option>
                        <option value="Mwanza">Mwanza</option>
                        <option value="Dodoma">Dodoma</option>
                        <option value="Zanzibar">Zanzibar</option>
                        <option value="Mbeya">Mbeya</option>
                        <option value="Morogoro">Morogoro</option>
                        <option value="Tanga">Tanga</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Street / House / Building Details</label>
                      <input 
                        type="text"
                        autoComplete="street-address"
                        name="street-address"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="e.g. Ndanda na Masasi Street"
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {saveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Your profile information and delivery preferences have been updated successfully!</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      Sign Out
                    </button>
                  )}

                  <button
                    type="submit"
                    className="ml-auto px-6 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: PAYMENT GATEWAYS */}
          {activeTab === 'payment' && (
            <div className="max-w-2xl space-y-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Official Tanzania Payment Options
                </h3>
                <p className="text-xs text-slate-500">
                  Payments made to Genuine Electronics are securely processed and verified with instant receipt and VAT invoice generation.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs">
                      M-Pesa
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">Vodacom M-Pesa & Lipa Kwa Simu</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Till Number: <span className="font-mono font-bold text-slate-900 dark:text-white">{storeSettings?.mobileMoneyNumber || '0768 929 203'}</span></p>
                      <p className="text-[11px] text-slate-400">Account Name: {storeSettings?.mobileMoneyName || 'Genuine Electronics Ltd'}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                      CRDB
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">Bank Transfer (CRDB Bank Tanzania PLC)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Account No: <span className="font-mono font-bold text-slate-900 dark:text-white">{storeSettings?.bankAccount || '0150 8829 4100'}</span></p>
                      <p className="text-[11px] text-slate-400">SWIFT: {storeSettings?.bankSwift || 'CORUTZTZ'}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 font-bold text-xs">
                      Orbi
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">Orbi Pay Instant QR</h4>
                        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                          Coming Soon
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Merchant ID: <span className="font-mono font-bold text-slate-900 dark:text-white">ORBI-9901</span></p>
                      <p className="text-[11px] text-slate-400">Upcoming escrow validation & zero transaction fees gateway for technology purchases.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal Preview overlay */}
      {activeInvoiceOrder && (
        <InvoicePrintModal
          order={activeInvoiceOrder}
          onClose={() => setActiveInvoiceOrder(null)}
          storeSettings={storeSettings}
          defaultDocType={activeInvoiceOrder.paymentStatus === 'Paid' ? 'tax' : 'proforma'}
          isClientView={true}
        />
      )}

      {/* POS Receipt Modal Preview overlay */}
      {activeReceiptTx && (
        <POSReceiptModal
          receipt={activeReceiptTx}
          onClose={() => setActiveReceiptTx(null)}
        />
      )}
    </div>
  );
};
