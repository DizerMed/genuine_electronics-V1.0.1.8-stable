import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Product, Category, CartItem, Order, formatTZS, formatToGMT3, StoreSettings, CategoryItem, POSTransaction, BRAND_LOGO_URL, PaymentMethodSetting } from '../types';

import { motion, AnimatePresence } from 'motion/react';







import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Star, Heart, ShoppingBag, ShoppingCart, Eye, CheckCircle2, Truck, Lock, ArrowRight, Sparkles, X, Plus, Minus, Trash2, Cpu, ExternalLink, RefreshCw, Sun, RefreshCcw, Shield, Headphones, Shirt, Armchair, Droplet, Activity, Gamepad2, Book, CarFront, LayoutGrid, User, UserCheck, Smartphone, Building2, QrCode, Wallet, Printer, MessageCircle, Scale, Zap, ArrowLeft, Check, ChevronRight, ChevronDown, AlertCircle, Share2, Download, Copy, FileText, CreditCard, Info, Phone, MapPin, SlidersHorizontal } from 'lucide-react';
import { shareProduct } from '../utils/share';
import { updateMetaTags } from '../utils/seo';
import { useLanguage } from '../i18n/LanguageContext';
import { applyDynamicSEOMetadata, createSEOSlug } from '../lib/seoManager';
import { triggerHaptic } from '../utils/haptics';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { ImageWithSkeleton } from './ImageWithSkeleton';
import { SpecificationSidebar, ActiveFilterBar, FilterState, INITIAL_FILTER_STATE } from './SpecificationSidebar';
import { 
  trackPageView, 
  trackProductView, 
  trackSearch, 
  trackAddToCart, 
  trackRemoveFromCart, 
  trackCategoryFilter, 
  trackExpressBuyOpen, 
  trackCheckoutInitiated, 
  trackWhatsAppClick, 
  identifyVisitorUser 
} from '../lib/visitorTrackingService';

interface ClientShopProps {
  products: Product[];
  categoriesList?: CategoryItem[];
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  orders: Order[];
  createOrder: (order: Omit<Order, 'id' | 'createdAt' | 'trackingNumber'>) => Order;
  onOpenAiAssistant: () => void;
  searchTerm: string;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  theme?: 'dark' | 'light';
  storeSettings?: StoreSettings;


  user?: any;
  profile?: any;
  onLogout?: () => void;
  onLoginClick?: () => void;
}


const ProductDetailPage = lazy(() => import('./ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const InvoicePrintModal = lazy(() => import('./InvoicePrintModal').then(m => ({ default: m.InvoicePrintModal })));
const POSReceiptModal = lazy(() => import('./POSReceiptModal').then(m => ({ default: m.POSReceiptModal })));
const ProductCompareModal = lazy(() => import('./ProductCompareModal').then(m => ({ default: m.ProductCompareModal })));
const CompareFloatingBar = lazy(() => import('./ProductCompareModal').then(m => ({ default: m.CompareFloatingBar })));
const ExpressBuyDrawer = lazy(() => import('./ExpressBuyDrawer').then(m => ({ default: m.ExpressBuyDrawer })));
const ReceiptVerificationModal = lazy(() => import('./ReceiptVerificationModal').then(m => ({ default: m.ReceiptVerificationModal })));
const ReviewForm = lazy(() => import('./ReviewForm').then(m => ({ default: m.ReviewForm })));

export const ClientShop: React.FC<ClientShopProps> = ({ storeSettings,
  products,
  categoriesList = [],
  cart,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  wishlist,
  toggleWishlist,
  orders,
  createOrder,
  onOpenAiAssistant,
  searchTerm,
  isCartOpen,
  setIsCartOpen,

  theme = 'light',
  user,
  profile,
  onLoginClick,
}) => {
  const { t, language } = useLanguage();
  const isDark = theme === 'dark';
  const [visibleProductsCount, setVisibleProductsCount] = useState(12);
  
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');

  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [catalogFilters, setCatalogFilters] = useState<FilterState>(INITIAL_FILTER_STATE);
  const [isMobileFilterDrawerOpen, setIsMobileFilterDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating'>('featured');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [expressBuyProduct, setExpressBuyProduct] = useState<Product | null>(null);
  const [isExpressBuyOpen, setIsExpressBuyOpen] = useState(false);
  const [deepLinkFailed, setDeepLinkFailed] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<Order | null>(null);
  const [printingInvoiceOrder, setPrintingInvoiceOrder] = useState<Order | null>(null);
  const [printingReceiptOrder, setPrintingReceiptOrder] = useState<POSTransaction | null>(null);
  const [copiedAccountNo, setCopiedAccountNo] = useState(false);

  // Checkout Form State
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'account'>('guest');
  const [shippingName, setShippingName] = useState('');
  const [shippingEmail, setShippingEmail] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingCity, setShippingCity] = useState('Dar es Salaam');
  const [shippingAddress, setShippingAddress] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ref to track checkout open state across auth transitions
  const isCheckoutOpenRef = React.useRef(isCheckoutOpen);
  useEffect(() => {
    isCheckoutOpenRef.current = isCheckoutOpen;
  }, [isCheckoutOpen]);

  // Skip step 1 if active user account is present when checkout opens
  useEffect(() => {
    if (isCheckoutOpen && user) {
      setCheckoutMode('account');
      setCheckoutStep(2);
    }
  }, [isCheckoutOpen, user]);

  useEffect(() => {
    applyDynamicSEOMetadata(
      storeSettings || { storeName: 'Genuine Electronics' },
      'client',
      {
        products,
        currentProduct: selectedProduct || null,
        currentCategory: selectedCategory !== 'All' ? selectedCategory : undefined,
        searchQuery: searchTerm,
        categoriesList
      }
    );
  }, [selectedProduct, selectedCategory, searchTerm, storeSettings, products, categoriesList]);

  const prevUserRef = React.useRef(user);

  // Auto-populate user data if logged in
  useEffect(() => {
    const justLoggedIn = !prevUserRef.current && Boolean(user);
    prevUserRef.current = user;

    if (user || profile) {
      if (user?.displayName || profile?.fullName || profile?.full_name) {
        setShippingName(prev => prev || user?.displayName || profile?.fullName || profile?.full_name || '');
      }
      if (user?.email || profile?.email) {
        setShippingEmail(prev => prev || user?.email || profile?.email || '');
      }
      if (profile?.address) {
        setShippingAddress(prev => prev || profile.address || '');
      }
      if (profile?.city) {
        setShippingCity(prev => prev || profile.city || '');
      }
      if (profile?.phone || user?.phoneNumber) {
        setShippingPhone(prev => prev || profile?.phone || user?.phoneNumber || '');
      }
      if (justLoggedIn) {
        setCheckoutMode('account');
        if (isCheckoutOpenRef.current) {
          setCheckoutStep(2);
        }
      }
    }
  }, [user, profile]);

  // Pre-populate user data if logged in
  const [countdown, setCountdown] = useState({ days: 1, hours: 23, mins: 59, secs: 59 });

  // Generate a new random shuffle seed on every component reload
  const [shuffleSeed] = useState(() => Math.random().toString());

  // Deterministically shuffle the product list based on the shuffleSeed
  const shuffledProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    const getHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    };

    return [...products].sort((a, b) => {
      const hashA = getHash(a.id + shuffleSeed);
      const hashB = getHash(b.id + shuffleSeed);
      return hashA - hashB;
    });
  }, [products, shuffleSeed]);

  useEffect(() => {
    const timer = setInterval(() => {
      const target = storeSettings?.offerEndsAt ? new Date(storeSettings.offerEndsAt).getTime() : Date.now() + 86400000;
      const diff = target - Date.now();
      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          mins: Math.floor((diff / 1000 / 60) % 60),
          secs: Math.floor((diff / 1000) % 60),
        });
      } else {
        setCountdown({ days: 0, hours: 0, mins: 0, secs: 0 });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [storeSettings?.offerEndsAt]);

  useEffect(() => {
    if (user) {
      setShippingEmail(user.email || '');
      identifyVisitorUser(user.id || (user as any).uid, user.email, profile?.displayName || profile?.fullName);
    }
    if (profile) {
      setShippingName(profile.displayName || profile.fullName || profile.full_name || '');
      setShippingAddress(profile.address || '');
      if (profile.city) setShippingCity(profile.city);
      if (user) {
        identifyVisitorUser(user.id || (user as any).uid, user.email, profile.displayName || profile.fullName);
      }
    }
  }, [user, profile]);
  const [paymentMethod, setPaymentMethod] = useState('Mobile Money');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState(profile?.phone || '');
  const [orbiPayId, setOrbiPayId] = useState('');

  const [isDealsView, setIsDealsView] = useState(false);
  const [dealFilter, setDealFilter] = useState<string | null>(null);

  // Comparison State
  const [compareProducts, setCompareProducts] = useState<Product[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Receipt Online Verification State
  const [isReceiptVerificationOpen, setIsReceiptVerificationOpen] = useState(false);
  const [receiptVerificationParams, setReceiptVerificationParams] = useState<{ orderNo?: string; receiptNo?: string } | null>(null);

  // Toast Notification State
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (Number(product.stock || 0) <= 0) {
      triggerHaptic('error');
      addToast(`Out of Stock: "${product.name}" is currently empty (0 available).`, 'error');
      return;
    }
    triggerHaptic('success');
    addToCart(product);
    trackAddToCart(product, 1);
    addToast(`${product.name} ${t('shop.addedToCart') || 'added to cart'}`);
  };

  const handleToggleWishlist = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    triggerHaptic('medium');
    toggleWishlist(product.id);
    const isAdding = !wishlist.includes(product.id);
    addToast(
      isAdding ? `${product.name} added to wishlist` : `${product.name} removed from wishlist`,
      isAdding ? 'success' : 'info'
    );
  };

  const toggleCompare = (product: Product) => {
    triggerHaptic('light');
    setCompareProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        addToast(`${product.name} removed from comparison`, 'info');
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 3) {
        triggerHaptic('warning');
        alert('You can compare up to 3 products at a time. Please remove one first.');
        return prev;
      }
      addToast(`${product.name} added to comparison matrix`, 'success');
      return [...prev, product];
    });
  };

  const removeFromCompare = (productId: string) => {
    triggerHaptic('light');
    setCompareProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const clearCompare = () => {
    triggerHaptic('medium');
    setCompareProducts([]);
  };

  const addToCompare = (product: Product) => {
    triggerHaptic('light');
    setCompareProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      if (prev.length >= 3) {
        triggerHaptic('warning');
        alert('You can compare up to 3 products at a time.');
        return prev;
      }
      addToast(`${product.name} added to comparison`, 'success');
      return [...prev, product];
    });
  };

  // URL Deep Link Routing Effect for Google Indexing & Direct Product Links
  useEffect(() => {
    const handleUrlRouting = () => {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const productIdFromQuery = searchParams.get('product') || searchParams.get('id');

      // 0. Dedicated Receipt Verification route matching (.../receipt/?orderNo=abce3467&receipt=xewfghuii)
      const isReceiptPath = pathname.startsWith('/receipt') || pathname.includes('/verify-receipt');
      const orderNoFromQuery = searchParams.get('orderNo') || searchParams.get('order');
      const receiptNoFromQuery = searchParams.get('receipt') || searchParams.get('receiptNo') || orderNoFromQuery;

      if (isReceiptPath || (orderNoFromQuery && receiptNoFromQuery)) {
        setIsReceiptVerificationOpen(true);
        if (orderNoFromQuery || receiptNoFromQuery) {
          setReceiptVerificationParams({
            orderNo: orderNoFromQuery || undefined,
            receiptNo: receiptNoFromQuery || undefined
          });
        }
      }

      // 1. Dedicated Product route matching
      const productMatch = pathname.match(/\/product\/([^\/]+)/);
      const targetId = productIdFromQuery || (productMatch ? decodeURIComponent(productMatch[1]) : null);

      if (targetId) {
        const targetLower = String(targetId || '').toLowerCase();
        const found = products.find(
          (p) =>
            String(p?.id || '').toLowerCase() === targetLower ||
            (p.sku && String(p?.sku || '').toLowerCase() === targetLower) ||
            String(p?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === targetLower
        );
        if (found) {
          setSelectedProduct(found);
          return;
        }
      }

      // 2. Dedicated Category route matching
      const categoryMatch = pathname.match(/\/category\/([^\/]+)/);
      if (categoryMatch && categoryMatch[1]) {
        const catSlug = decodeURIComponent(categoryMatch[1]).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const allKnownCatNames = categoriesList.map((c) => c.name);
        let foundCategoryKey = allKnownCatNames.find(
          (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === catSlug.replace(/(^-|-$)+/g, '')
        ) as Category | undefined;

        if (!foundCategoryKey) {
          foundCategoryKey = allKnownCatNames.find((k) => {
            const cleanK = String(k || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
            const cleanSlug = catSlug.replace(/[^a-z0-9]+/g, '');
            return cleanK.includes(cleanSlug) || cleanSlug.includes(cleanK);
          }) as Category | undefined;
        }

        if (foundCategoryKey) {
          setSelectedCategory(foundCategoryKey);
          setSelectedProduct(null);
          return;
        }
      }

      // 3. Reset product state if navigating to root/home
      if (!targetId && !categoryMatch && (pathname === '/' || pathname === '')) {
        setSelectedProduct(null);
      }
      
      // Handle timeout for deep links
      if (targetId && !selectedProduct) {
        setTimeout(() => setDeepLinkFailed(true), 4000);
      }
    };

    handleUrlRouting();
    window.addEventListener('hashchange', handleUrlRouting);
    window.addEventListener('popstate', handleUrlRouting);
    return () => {
      window.removeEventListener('hashchange', handleUrlRouting);
      window.removeEventListener('popstate', handleUrlRouting);
    };
  }, [products]);

  // Keep Dynamic SEO synchronized with selected product, category, or search
  useEffect(() => {
    if (storeSettings) {
      applyDynamicSEOMetadata(storeSettings, 'client', {
        products,
        categoriesList,
        currentProduct: selectedProduct,
        currentCategory: selectedCategory !== 'All' ? selectedCategory : undefined,
        searchQuery: searchTerm,
      });
    }
  }, [storeSettings, products, categoriesList, selectedProduct, selectedCategory, searchTerm]);

  React.useEffect(() => {
    const handleNavAction = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setSelectedProduct(null);
      switch (customEvent.detail) {
        case 'home':
          setIsDealsView(false);
          if (window.location.pathname !== '/') {
            window.history.pushState(null, '', '/');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'shop':
          setIsDealsView(false);
          setSelectedCategory('All');
          if (window.location.pathname !== '/') {
            window.history.pushState(null, '', '/');
          }
          document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
          break;
        case 'deals':
          setIsDealsView(true);
          setDealFilter(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'new-arrivals':
          setIsDealsView(false);
          setDealFilter(null);
          setSortBy('featured');
          document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
          break;
        case 'brands':
          document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
          document.getElementById('brand-filter')?.focus();
          break;
        case 'categories':
          setIsCategoryModalOpen(true);
          break;
        case 'contact':
          document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
          break;
        default:
          if (customEvent.detail.startsWith('category_')) {
            const cat = customEvent.detail.replace('category_', '') as Category;
            setSelectedCategory(cat);
            const catSlug = String(cat || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const catPath = cat === 'All' ? '/' : `/category/${catSlug}`;
            if (window.location.pathname !== catPath) {
              window.history.pushState({ category: cat }, cat, catPath);
            }
            document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
          } else if (customEvent.detail.startsWith('deals_')) {
            const filter = customEvent.detail.replace('deals_', '');
            setIsDealsView(true);
            setDealFilter(filter);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (customEvent.detail.startsWith('product_')) {
            const prodId = customEvent.detail.replace('product_', '');
            const found = products.find((p) => 
              p.id === prodId || 
              (p.sku && String(p?.sku || '').toLowerCase() === String(prodId || '').toLowerCase()) ||
              (p.name && String(p?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === prodId.toLowerCase()) ||
              (p.barcode && String(p?.barcode || '').toLowerCase() === String(prodId || '').toLowerCase())
            );
            if (found) {
              setSelectedProduct(found);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              const partial = products.find(p => p.id.includes(prodId) || prodId.includes(p.id));
              if (partial) {
                setSelectedProduct(partial);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }
          }
          break;
      }
    };
    window.addEventListener('nav-action', handleNavAction);
    return () => window.removeEventListener('nav-action', handleNavAction);
  }, [products]);


  const sortedCategoriesList = React.useMemo(() => {
    if (!categoriesList || categoriesList.length === 0) return [];
    return [...categoriesList].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }, [categoriesList]);

  const categories: string[] = ['All', ...sortedCategoriesList.map(c => c.name)];


  const getCategoryMeta = (catName: string) => {
    if (catName === 'All') {
      return {
        swahiliName: 'Yote',
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400',
      };
    }
    const found = categoriesList.find((c) => String(c?.name || '').toLowerCase() === String(catName || '').toLowerCase());
    if (found) {
      return {
        swahiliName: found.swahiliName || found.name,
        image: found.image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400',
      };
    }
    return {
      swahiliName: catName,
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400',
    };
  };
  const brands = ['All', ...Array.from(new Set(products.map((p) => p.brand)))];

  // Track Page Views, Selected Products, and Filter Interactions
  useEffect(() => {
    trackPageView(window.location.pathname);
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      trackProductView(selectedProduct);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'All') {
      trackCategoryFilter(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (isExpressBuyOpen && expressBuyProduct) {
      trackExpressBuyOpen(expressBuyProduct);
    }
  }, [isExpressBuyOpen, expressBuyProduct]);

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (catalogFilters.minPrice !== null || catalogFilters.maxPrice !== null) count++;
    if (catalogFilters.selectedBrands.length > 0) count += catalogFilters.selectedBrands.length;
    if (catalogFilters.inStockOnly) count++;
    if (catalogFilters.onSaleOnly) count++;
    if (catalogFilters.genuineOnly) count++;
    if (catalogFilters.minRating !== null) count++;
    if (catalogFilters.selectedWarranties.length > 0) count += catalogFilters.selectedWarranties.length;
    Object.values(catalogFilters.selectedSpecs).forEach(arr => {
      count += arr.length;
    });
    return count;
  }, [catalogFilters]);

  // Helper to match a product against dynamic technical specs
  const checkProductMatchesSpec = (p: Product, specKey: string, selectedVals: string[]): boolean => {
    if (!selectedVals || selectedVals.length === 0) return true;
    const fullText = `${p.name || ''} ${p.description || ''} ${p.brand || ''}`.toLowerCase();

    // 1. RAM / Memory
    if (specKey === 'RAM / Memory') {
      const directVal = p.specs?.RAM || p.specs?.['RAM / Memory'] || p.specs?.Memory;
      if (directVal && selectedVals.some(v => directVal.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(directVal.toLowerCase()))) {
        return true;
      }
      for (const v of selectedVals) {
        const digits = v.match(/\d+/)?.[0];
        if (digits) {
          const regex = new RegExp(`\\b${digits}\\s*(?:gb|gig|g)?\\s*(?:ram|unified memory|memory)?\\b`, 'i');
          if (regex.test(fullText)) return true;
        }
      }
      return false;
    }

    // 2. Storage / ROM
    if (specKey === 'Storage / ROM') {
      const directVal = p.specs?.Storage || p.specs?.ROM || p.specs?.SSD || p.specs?.['Storage / ROM'] || p.specs?.Capacity;
      if (directVal && selectedVals.some(v => directVal.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(directVal.toLowerCase()))) {
        return true;
      }
      for (const v of selectedVals) {
        const match = v.match(/(\d+)\s*(GB|TB)/i);
        if (match) {
          const regex = new RegExp(`\\b${match[1]}\\s*${match[2]}\\b`, 'i');
          if (regex.test(fullText)) return true;
        }
      }
      return false;
    }

    // 3. Screen Size
    if (specKey === 'Screen Size') {
      const directVal = p.specs?.['Screen Size'] || p.specs?.Screen || p.specs?.Display;
      if (directVal && selectedVals.some(v => directVal.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(directVal.toLowerCase()))) {
        return true;
      }
      for (const v of selectedVals) {
        const sizeNum = v.replace(/[^0-9.]/g, '');
        if (sizeNum) {
          const regex = new RegExp(`\\b${sizeNum}\\s*(?:["”]|inch|Inch|-inch|in\\b)`, 'i');
          if (regex.test(fullText)) return true;
        }
      }
      return false;
    }

    // 4. Display & Resolution
    if (specKey === 'Display & Resolution') {
      const directVal = p.specs?.Resolution || p.specs?.Display || p.specs?.Panel;
      if (directVal && selectedVals.some(v => directVal.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(directVal.toLowerCase()))) {
        return true;
      }
      for (const v of selectedVals) {
        if (fullText.includes(v.toLowerCase())) return true;
      }
      return false;
    }

    // 5. Processor / Chip
    if (specKey === 'Processor / Chip') {
      const directVal = p.specs?.Processor || p.specs?.CPU || p.specs?.Chip || p.specs?.Chipset;
      if (directVal && selectedVals.some(v => directVal.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(directVal.toLowerCase()))) {
        return true;
      }
      for (const v of selectedVals) {
        if (fullText.includes(v.toLowerCase())) return true;
      }
      return false;
    }

    // 6. Energy / Power
    if (specKey === 'Energy / Power') {
      const directVal = p.energyRating?.trim() || p.tonnage?.trim() || p.specs?.['Energy Rating'];
      if (directVal && selectedVals.includes(directVal)) return true;
      for (const v of selectedVals) {
        if (fullText.includes(v.toLowerCase())) return true;
      }
      return false;
    }

    // 7. Capacity / Size
    if (specKey === 'Capacity / Size') {
      const directVal = p.capacity?.trim() || p.specs?.Capacity;
      if (directVal && selectedVals.includes(directVal)) return true;
      for (const v of selectedVals) {
        if (fullText.includes(v.toLowerCase())) return true;
      }
      return false;
    }

    // 8. Direct matching on p.specs object
    if (p.specs && p.specs[specKey]) {
      const val = String(p.specs[specKey]).trim();
      if (val && selectedVals.includes(val)) return true;
    }

    for (const v of selectedVals) {
      if (fullText.includes(v.toLowerCase())) return true;
    }

    return false;
  };

  // Scope products for the active category for dynamic filter extraction
  const categoryScopedProducts = useMemo(() => {
    if (selectedCategory === 'All') return shuffledProducts;
    return shuffledProducts.filter(p => p.category === selectedCategory);
  }, [shuffledProducts, selectedCategory]);

  // Filter and sort products
  const q = (searchTerm || '').toLowerCase().trim();
  useEffect(() => {
    setVisibleProductsCount(12);
  }, [searchTerm, selectedCategory, selectedBrand, dealFilter, catalogFilters]);

  const filteredProducts = shuffledProducts.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    
    // Brand filtering (supports both dropdown and multi-select in filter drawer)
    const matchesBrand = 
      (selectedBrand === 'All' || p.brand === selectedBrand) &&
      (catalogFilters.selectedBrands.length === 0 || catalogFilters.selectedBrands.includes(p.brand));

    // Search query
    const matchesSearch =
      !q ||
      (p.name && String(p.name || "").toLowerCase().includes(q)) ||
      (p.brand && String(p.brand || "").toLowerCase().includes(q)) ||
      (p.description && String(p.description || "").toLowerCase().includes(q));

    // Automated Price Filtering
    const price = Number(p.price) || 0;
    const matchesMinPrice = catalogFilters.minPrice === null || price >= catalogFilters.minPrice;
    const matchesMaxPrice = catalogFilters.maxPrice === null || price <= catalogFilters.maxPrice;

    // Feature Flags Filtering
    const matchesInStock = !catalogFilters.inStockOnly || Number(p.stock || 0) > 0;
    const matchesOnSale = !catalogFilters.onSaleOnly || (p.isOnOffer || (p.originalPrice && p.originalPrice > p.price));
    const matchesGenuine = !catalogFilters.genuineOnly || p.isGenuineVerified !== false;
    const matchesRating = catalogFilters.minRating === null || Number(p.rating || 0) >= catalogFilters.minRating;

    // Warranty Duration Filtering
    const matchesWarranty = catalogFilters.selectedWarranties.length === 0 || 
      (p.warranty && catalogFilters.selectedWarranties.includes(p.warranty.trim()));

    // Dynamic Specifications & Attributes Filtering (RAM, Storage, Screen Size, etc.)
    let matchesSpecs = true;
    if (Object.keys(catalogFilters.selectedSpecs).length > 0) {
      for (const [specKey, selectedVals] of Object.entries(catalogFilters.selectedSpecs)) {
        if (!selectedVals || selectedVals.length === 0) continue;
        if (!checkProductMatchesSpec(p, specKey, selectedVals)) {
          matchesSpecs = false;
          break;
        }
      }
    }
    
    let matchesDeals = !isDealsView;
    if (isDealsView) {
        const isProductOnDeal = p.isOnOffer || (p.originalPrice && p.originalPrice > p.price);
        if (isProductOnDeal) {
            if (!dealFilter) {
                matchesDeals = true;
            } else {
                // Apply deal filters
                if (dealFilter === 'flash_discount_deals') matchesDeals = (p.discountPercentage || 0) >= 20;
                else if (dealFilter === 'best_price_genuine') matchesDeals = (p.rating || 0) >= 4.5;
                else if (dealFilter === 'under_tzs_1_000_000') matchesDeals = p.price < 1000000;
                else if (dealFilter === 'clearance_electronics') matchesDeals = (p.stock || 0) < 5;
            }
        }
    }
    
    return (
      matchesCategory && 
      matchesBrand && 
      matchesSearch && 
      matchesMinPrice && 
      matchesMaxPrice && 
      matchesInStock && 
      matchesOnSale && 
      matchesGenuine && 
      matchesRating && 
      matchesWarranty && 
      matchesSpecs && 
      matchesDeals
    );
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });

  // Debounced search query analytics
  useEffect(() => {
    const query = (searchTerm || '').trim();
    if (!query || query.length < 2) return;
    const timer = setTimeout(() => {
      trackSearch(query, filteredProducts.length);
    }, 1200);
    return () => clearTimeout(timer);
  }, [searchTerm, filteredProducts.length]);

  // Infinite scroll auto-loader
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    if (loadMoreRef.current && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setVisibleProductsCount((prev) => {
              if (prev < filteredProducts.length) {
                return prev + 12;
              }
              return prev;
            });
          }
        },
        { rootMargin: '350px', threshold: 0.1 }
      );
      observer.observe(loadMoreRef.current);
    }

    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        setVisibleProductsCount((prev) => {
          if (prev < filteredProducts.length) {
            return prev + 12;
          }
          return prev;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [filteredProducts.length, visibleProductsCount]);

  const vatPct = Number(storeSettings?.vatPercentage ?? 18);
  const isVatApplied = vatPct > 0;
  
  const onlineCartTotalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Dynamic Breadcrumb for Catalog / Category / Search / Deals
  const catalogBreadcrumbItems = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      {
        label: 'Home',
        href: '/',
        onClick: () => {
          setIsDealsView(false);
          setSelectedCategory('All');
          setSelectedBrand('All');
          if (window.location.pathname !== '/') {
            window.history.pushState(null, '', '/');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    ];

    if (isDealsView) {
      items.push({
        label: 'Special Deals & Offers',
        href: '/deals',
        isCurrent: !dealFilter,
        badge: 'Flash Sales',
        onClick: dealFilter ? () => setDealFilter(null) : undefined,
      });

      if (dealFilter) {
        let dealLabel = 'All Filtered Deals';
        if (dealFilter === 'flash_discount_deals') dealLabel = 'Flash Discount (>20% Off)';
        else if (dealFilter === 'best_price_genuine') dealLabel = 'Best Price & Top Rated (4.5★+)';
        else if (dealFilter === 'under_tzs_1_000_000') dealLabel = 'Under TZS 1,000,000';
        else if (dealFilter === 'clearance_electronics') dealLabel = 'Clearance & Limited Stock';

        items.push({
          label: dealLabel,
          isCurrent: true,
          badge: `${filteredProducts.length} items`,
        });
      }
      return items;
    }

    if (selectedCategory !== 'All') {
      const catMeta = getCategoryMeta(selectedCategory);
      const catDisplayName = language === 'sw' ? catMeta.swahiliName : selectedCategory;
      const catSlug = createSEOSlug(selectedCategory);

      items.push({
        label: 'Categories',
        href: '/#catalog',
        onClick: () => {
          setSelectedCategory('All');
          setSelectedBrand('All');
          if (window.location.pathname !== '/') {
            window.history.pushState(null, '', '/');
          }
        }
      });

      const isCategoryCurrent = selectedBrand === 'All' && !searchTerm;
      items.push({
        label: catDisplayName,
        href: `/category/${catSlug}`,
        isCurrent: isCategoryCurrent,
        badge: `${filteredProducts.length} items`,
        onClick: !isCategoryCurrent ? () => {
          setSelectedBrand('All');
        } : undefined,
      });

      if (selectedBrand !== 'All') {
        items.push({
          label: selectedBrand,
          isCurrent: !searchTerm,
          badge: `${filteredProducts.length} items`,
        });
      }

      if (searchTerm) {
        items.push({
          label: `Search: "${searchTerm}"`,
          isCurrent: true,
          badge: `${filteredProducts.length} results`,
        });
      }

      return items;
    }

    // When viewing all products with a search term
    if (searchTerm) {
      items.push({
        label: 'All Products',
        href: '/#catalog',
        onClick: () => {
          setSelectedBrand('All');
        }
      });

      items.push({
        label: `Search: "${searchTerm}"`,
        isCurrent: selectedBrand === 'All',
        badge: `${filteredProducts.length} results`,
      });

      if (selectedBrand !== 'All') {
        items.push({
          label: selectedBrand,
          isCurrent: true,
          badge: `${filteredProducts.length} items`,
        });
      }
      return items;
    }

    // Default All Catalog view
    items.push({
      label: 'All Genuine Electronics',
      href: '/#catalog',
      isCurrent: selectedBrand === 'All',
      badge: `${filteredProducts.length} items`,
    });

    if (selectedBrand !== 'All') {
      items.push({
        label: selectedBrand,
        isCurrent: true,
        badge: `${filteredProducts.length} items`,
      });
    }

    return items;
  }, [isDealsView, dealFilter, selectedCategory, selectedBrand, searchTerm, filteredProducts.length, language]);

  const calculateDiscountedPrice = (item: any) => {
    const sellingPrice = Number(item.product.price || 0);
    const costPrice = Number(item.product.cost_price || item.product.costPrice || 0);

    // 1. Single item: regular selling price
    if (onlineCartTotalQty < 2 && item.quantity < 2) {
      return sellingPrice;
    }

    // 2. 3+ Items: Full Wholesale Price
    if (onlineCartTotalQty >= 3 || item.quantity >= 3) {
      if (item.product.wholesalePrice && item.product.wholesalePrice > 0) {
        return item.product.wholesalePrice;
      }
      if (costPrice > 0 && sellingPrice > costPrice) {
        return Math.round(costPrice + (sellingPrice - costPrice) / 2);
      }
      let wholesaleVal = Math.round(sellingPrice * 0.88);
      if (costPrice > 0 && wholesaleVal < costPrice) wholesaleVal = costPrice;
      return wholesaleVal;
    }

    // 3. Exactly 2 Items: Dynamic auto % based on product value (capped under 6%)
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
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + calculateDiscountedPrice(item) * item.quantity, 0);
  const isDarEsSalaam = (shippingCity || '').trim().toLowerCase() === 'dar es salaam';
  const shippingFee = isDarEsSalaam ? 0 : Math.round(cartSubtotal * 0.05);
  
  const vatInclusiveGross = cart.reduce((sum, item) => {
    const isItemVat = item.product?.isVatInclusive !== false;
    return isItemVat ? sum + calculateDiscountedPrice(item) * item.quantity : sum;
  }, 0);
  
  const tax = (isVatApplied && vatInclusiveGross > 0) ? Math.round(vatInclusiveGross * (vatPct / (100 + vatPct))) : 0;
  const cartTotal = cartSubtotal + shippingFee;

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!navigator.onLine) {
      setErrorMessage("Internet Connection Required: Please connect to the internet to submit your order.");
      return;
    }

    const fullAddress = `${shippingAddress.trim()}, ${shippingCity}${shippingPhone ? ` (Phone: ${shippingPhone.trim()})` : ''}`;

    const customerUserId = user?.id || (user as any)?.uid || (checkoutMode === 'account' ? (user?.id || (user as any)?.uid) : undefined);

    const hasVat = isVatApplied && vatInclusiveGross > 0 && tax > 0;

    const newOrder = createOrder({
      customerName: shippingName,
      customerEmail: shippingEmail,
      customerPhone: shippingPhone,
      phone: shippingPhone,
      shippingAddress: fullAddress,
      city: shippingCity,
      items: cart.map(item => ({ product: item.product, quantity: item.quantity, price: calculateDiscountedPrice(item) })),
      totalAmount: cartTotal,
      status: 'Pending',
      paymentMethod: paymentMethod,
      userId: customerUserId,
      customerId: customerUserId,
      customer_id: customerUserId,
      includeVat: hasVat,
      vatPercentage: hasVat ? vatPct : 0,
      tax: hasVat ? tax : 0,
      subtotal: hasVat ? (cartSubtotal - tax) : cartSubtotal,
    });

    setOrderSuccess(newOrder);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
  };

  return (
    <div id="home" className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24" style={{ fontFamily: storeSettings?.fontFamily || 'inherit' }}>
      {window.location.pathname.startsWith('/product/') && !selectedProduct && !deepLinkFailed ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] pt-20">
          <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium">Loading product details...</p>
        </div>
      ) : selectedProduct ? ( <Suspense fallback={<div className="flex-1 flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}>
        <ProductDetailPage
          product={selectedProduct}
          allProducts={products}
          user={user}
          onLoginClick={onLoginClick}
          onBack={() => {
            setSelectedProduct(null);
            if (window.location.pathname.includes('/product/')) {
              window.history.pushState(null, '', '/');
            }
          }}
          addToCart={addToCart}
          toggleWishlist={toggleWishlist}
          isWishlisted={wishlist.includes(selectedProduct.id)}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onBuyNow={(p, qty) => {
            setExpressBuyProduct(p);
            setIsExpressBuyOpen(true);
          }}
          onCategorySelect={(cat) => {
            setSelectedCategory(cat as Category);
            setSelectedProduct(null);
            const catSlug = String(cat || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const catPath = cat === 'All' ? '/' : `/category/${catSlug}`;
            if (window.location.pathname !== catPath) {
              window.history.pushState({ category: cat }, cat, catPath);
            }
            setTimeout(() => {
              document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
          onToggleCompare={toggleCompare}
          isInCompare={compareProducts.some((p) => p.id === selectedProduct.id)}
          categoriesList={categoriesList}
        /></Suspense>
      ) : (
        <>

      {/* Hero Banner Layouts */}
      {(!storeSettings?.heroLayout || storeSettings.heroLayout === 'split') && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-[#F4F7FB] dark:bg-slate-900 pt-12 pb-16 px-6 lg:px-16 xl:px-24 relative overflow-hidden flex flex-col md:flex-row items-center justify-between rounded-3xl mt-6 max-w-[1920px] mx-auto w-full"
        >
          <div className="max-w-xl relative z-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 dark:text-slate-100 dark:text-white mb-6 shadow-sm border border-slate-100 dark:border-slate-700"
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>{storeSettings?.heroBadge || 'SUMMER SALE'}</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.1]"
            >
              {storeSettings?.heroTitle || t('shop.heroTitle')}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-slate-600 dark:text-slate-300 text-base sm:text-lg mb-8 leading-relaxed max-w-md"
            >
              {storeSettings?.heroSubtitle || t('shop.heroSubtitle')}
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap items-center gap-4 mb-12"
            >
              <button
                onClick={() => {
                  const el = document.getElementById('catalog');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-white font-bold px-8 py-3.5 rounded-full shadow-lg transition-all flex items-center gap-2 hover:-translate-y-0.5 active:scale-95" style={{ backgroundColor: storeSettings?.primaryColor || '#2563eb' }}
              >
                <span>{t('shop.shopNow')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsDealsView(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold px-8 py-3.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:scale-95"
              >
                <span>{t('shop.viewDeals')}</span>
              </button>
            </motion.div>
          </div>
          <div className="w-full md:w-[45%] flex justify-center mt-12 md:mt-0 relative z-10">
            <ImageWithSkeleton
              src={storeSettings?.heroImage || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800"}
              alt="Hero Products"
              className="w-full h-auto max-h-[480px] object-contain drop-shadow-xl mx-auto"
              wrapperClassName="w-full h-auto max-h-[480px] mx-auto bg-transparent"
            />
          </div>
        </motion.div>
      )}

      {storeSettings?.heroLayout === 'minimal' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-[#F4F7FB] dark:bg-slate-900 pt-20 pb-16 px-6 relative overflow-hidden flex flex-col items-center text-center justify-center rounded-3xl mt-6 max-w-[1920px] mx-auto w-full"
        >
          <div className="max-w-3xl relative z-10 flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full text-[11px] font-bold text-slate-800 dark:text-slate-100 dark:text-white mb-8 shadow-sm border border-slate-100 dark:border-slate-700"
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>{storeSettings?.heroBadge || 'SUMMER SALE'}</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8 leading-[1.1]"
            >
              {storeSettings?.heroTitle || t('shop.heroTitle')}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-slate-600 dark:text-slate-300 text-lg sm:text-xl mb-10 leading-relaxed max-w-2xl"
            >
              {storeSettings?.heroSubtitle || t('shop.heroSubtitle')}
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex justify-center mb-16"
            >
              <button
                onClick={() => {
                  const el = document.getElementById('catalog');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-white font-bold px-10 py-4 text-lg rounded-full shadow-xl transition-all flex items-center gap-3 hover:-translate-y-0.5 active:scale-95" style={{ backgroundColor: storeSettings?.primaryColor || '#2563eb' }}
              >
                <span>{t('shop.shopNow')}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
          
          {storeSettings?.heroImage && (
             <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="w-full max-w-5xl relative z-10 px-4 flex justify-center"
             >
               <img
                  src={storeSettings.heroImage}
                  alt="Hero Products"
                  className="w-full h-auto max-h-[420px] object-contain drop-shadow-xl mx-auto"
                />
             </motion.div>
          )}
        </motion.div>
      )}

      {storeSettings?.heroLayout === 'bold' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative pt-24 pb-24 px-6 overflow-hidden flex flex-col items-center text-center justify-center rounded-3xl mt-6 max-w-[1920px] mx-auto w-full min-h-[500px]"
        >
          {/* Background Image & Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              src={storeSettings?.heroImage || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800"} 
              alt="Hero Background" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
          </div>

          <div className="max-w-3xl relative z-10 flex flex-col items-center mt-8">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-[11px] font-bold text-white mb-8 shadow-sm"
            >
              <Sun className="w-4 h-4 text-amber-300" />
              <span>{storeSettings?.heroBadge || 'SUMMER SALE'}</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white mb-8 leading-[1.1] drop-shadow-xl"
            >
              {storeSettings?.heroTitle || t('shop.heroTitle')}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-slate-200 text-lg sm:text-xl mb-10 leading-relaxed max-w-2xl drop-shadow"
            >
              {storeSettings?.heroSubtitle || t('shop.heroSubtitle')}
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap justify-center gap-4 mb-8"
            >
              <button
                onClick={() => {
                  const el = document.getElementById('catalog');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-900 dark:text-white font-bold px-10 py-4 text-lg rounded-full shadow-xl transition-all flex items-center gap-3 hover:-translate-y-0.5 active:scale-95"
              >
                <span>{t('shop.shopNow')}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Circular Categories */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 mt-12 mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('shop.categories')}</h2>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{sortedCategoriesList.length} {t('shop.categories')}</span>
        </div>
        
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-4 lg:gap-6 pb-6 px-2">
          {categories.slice(0, 9).map((cat, index) => {
            const isSelected = selectedCategory === cat;
            
            let displayClass = "flex";
            if (index === 3) displayClass = "hidden sm:flex";
            if (index === 4) displayClass = "hidden md:flex";
            if (index >= 5 && index <= 6) displayClass = "hidden lg:flex";
            if (index >= 7 && index <= 8) displayClass = "hidden xl:flex";

            return (
              <motion.div 
                key={cat} 
                whileHover={{ scale: 1.08, y: -4 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`${displayClass} flex-col items-center gap-2 sm:gap-3 cursor-pointer group`} 
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedCategory(cat);
                }}
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm overflow-hidden border-2 ${isSelected ? 'border-blue-600 ring-4 ring-blue-600/20 p-1 shadow-blue-500/20 shadow-lg' : 'border-transparent group-hover:border-blue-300 p-0'}`}>
                  <img 
                    src={categoriesList?.find(c => c.name === cat)?.image || (cat === 'All' ? 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400' : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400')} 
                    alt={cat} 
                    className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500" 
                  />
                </div>
                <div className="flex flex-col items-center w-full px-1">
                  <span className={`text-[10px] sm:text-xs md:text-sm font-bold text-center transition-colors truncate w-full ${isSelected ? 'text-blue-600' : 'text-slate-800 dark:text-slate-100 group-hover:text-blue-600'}`}>
                    {language === 'sw' ? getCategoryMeta(cat).swahiliName : (cat === 'All' ? t('categories.All') : cat)}
                  </span>
                </div>
              </motion.div>
            );
          })}
          
          <motion.div 
            whileHover={{ scale: 1.08, y: -4 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex flex-col items-center gap-2 sm:gap-3 cursor-pointer group" 
            onClick={() => {
              triggerHaptic('light');
              setIsCategoryModalOpen(true);
            }}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm overflow-hidden border-2 border-transparent group-hover:border-blue-300 p-0 bg-slate-50 dark:bg-slate-900 group-hover:bg-blue-50">
               <LayoutGrid className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="flex flex-col items-center w-full px-1">
              <span className="text-[10px] sm:text-xs md:text-sm font-bold text-center text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors truncate w-full">
                View All
              </span>
              <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium text-center truncate w-full mt-0.5">
                {categories.length - 9} More
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* All Categories Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-5xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-6 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">All {categories.length} Categories</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Select any category to instantly filter verified electronics and appliances</p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const meta = getCategoryMeta(cat);

                return (
                  <div
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsCategoryModalOpen(false);
                    }}
                    className="flex flex-col items-center gap-3 cursor-pointer group"
                  >
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm overflow-hidden border-2 ${isSelected ? 'border-blue-600 ring-4 ring-blue-600/20 p-1' : 'border-transparent group-hover:border-blue-300 p-0'}`}>
                      <img
                        src={meta.image}
                        alt={cat}
                        className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex flex-col items-center min-w-0 w-full px-2">
                      <span className={`text-xs sm:text-sm font-bold text-center truncate w-full transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-900 dark:text-white group-hover:text-blue-600'}`}>
                        {cat}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium text-center truncate w-full mt-0.5">
                        {meta.swahiliName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Catalog */}
      <main id="catalog" className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-4">
        {/* Dynamic Breadcrumbs Navigation for Internal Linking & Search Hierarchy */}
        <div className="mb-6">
          <Breadcrumb
            items={catalogBreadcrumbItems}
            className="shadow-2xs"
            rightContent={
              (selectedCategory !== 'All' || selectedBrand !== 'All' || searchTerm || catalogFilters.minPrice !== null || catalogFilters.maxPrice !== null || catalogFilters.inStockOnly || catalogFilters.onSaleOnly || catalogFilters.selectedBrands.length > 0 || Object.keys(catalogFilters.selectedSpecs).length > 0) ? (
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSelectedBrand('All');
                    setCatalogFilters(INITIAL_FILTER_STATE);
                    window.dispatchEvent(new CustomEvent('nav-action', { detail: 'home' }));
                    if (window.location.pathname !== '/') {
                      window.history.pushState(null, '', '/');
                    }
                  }}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset filters</span>
                </button>
              ) : null
            }
          />
        </div>

        {/* Dynamic Category Header Banner (Visible on category pages) */}
        {!isDealsView && selectedCategory !== 'All' && (
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white mb-8 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>100% Genuine Certified Category</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {language === 'sw' ? getCategoryMeta(selectedCategory).swahiliName : selectedCategory}
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {language === 'sw' 
                  ? `Vinjari vifaa vyote halisi vya ${getCategoryMeta(selectedCategory).swahiliName} vyenye waranti rasmi Tanzania. Delivery ya haraka Dar es Salaam na mikoa yote.`
                  : `Browse authentic ${selectedCategory} with manufacturer warranties, competitive pricing, and express delivery in Dar es Salaam and nationwide across Tanzania.`}
              </p>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t md:border-t-0 md:border-l border-slate-700/80 pt-4 md:pt-0 md:pl-6">
              <div className="text-right">
                <span className="block text-2xl sm:text-3xl font-black text-white">{filteredProducts.length}</span>
                <span className="text-xs text-slate-400 font-medium">Available Models</span>
              </div>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedBrand('All');
                  window.history.pushState(null, '', '/');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
              >
                All Categories
              </button>
            </div>
          </div>
        )}

        {isDealsView ? (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 text-xs font-black px-3 py-1 rounded-full mb-4 backdrop-blur-sm border border-indigo-500/30">
                  <Zap className="w-3.5 h-3.5 fill-indigo-300" />
                  {storeSettings?.offerBadgeText || 'LIMITED TIME OFFERS'}
                </span>
                <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 leading-tight text-white">
                  {storeSettings?.offerTitle || 'Exclusive Deals on Genuine Electronics'}
                </h2>
                <p className="text-slate-300 text-sm sm:text-lg mb-8 leading-relaxed">
                  {storeSettings?.offerSubtitle || 'Certified Official Manufacturer Warranties. Authentic Electronics Delivered Across Tanzania.'}
                </p>

                {/* Live Real-time Countdown Box */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-3.5 border border-indigo-500/30 text-center min-w-[80px] sm:min-w-[95px]">
                    <span className="block text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
                      {String(countdown.days).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Days</span>
                  </div>
                  <span className="text-xl font-bold text-indigo-500">:</span>
                  <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-3.5 border border-indigo-500/30 text-center min-w-[80px] sm:min-w-[95px]">
                    <span className="block text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
                      {String(countdown.hours).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hours</span>
                  </div>
                  <span className="text-xl font-bold text-indigo-500">:</span>
                  <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-3.5 border border-indigo-500/30 text-center min-w-[80px] sm:min-w-[95px]">
                    <span className="block text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
                      {String(countdown.mins).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mins</span>
                  </div>
                  <span className="text-xl font-bold text-indigo-500">:</span>
                  <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-3.5 border border-indigo-500/30 text-center min-w-[80px] sm:min-w-[95px]">
                    <span className="block text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
                      {String(countdown.secs).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Secs</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-6 h-6 text-indigo-500 fill-indigo-500" />
                  <span>Flash Sales & Discounted Hardware</span>
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 lg:gap-8">
                {shuffledProducts
                  .filter(p => p.isOnOffer || (p.originalPrice && p.originalPrice > p.price))
                  .slice(0, 10)
                  .map((product) => {
                    const isCompared = compareProducts.some(p => p.id === product.id);
                    const orig = product.originalPrice || 0;
                    const hasDisc = orig > product.price;
                    const pct = hasDisc ? Math.round(((orig - product.price) / orig) * 100) : 0;

                    return (
                      <motion.div 
                        key={product.id}
                        whileHover={{ y: -6, transition: { duration: 0.2 } }}
                        className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 border-none shadow-lg shadow-indigo-900/5 hover:shadow-2xl hover:shadow-indigo-900/15 transition-all flex flex-col group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-bl-xl z-10 shadow-md">
                          {hasDisc ? `-${pct}% OFF` : 'Flash Sale'}
                        </div>

                        {/* Product Image */}
                        <div className="relative bg-slate-50 dark:bg-slate-900 rounded-xl sm:rounded-2xl aspect-square mb-3 sm:mb-4 overflow-hidden border border-slate-100 cursor-pointer" onClick={() => setSelectedProduct(product)}>
                          <ImageWithSkeleton src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 transition-opacity" wrapperClassName="absolute inset-0" />
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.88 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompare(product);
                            }}
                            className={`absolute bottom-2 sm:bottom-3 right-2 sm:right-3 p-1.5 sm:p-2 rounded-lg sm:rounded-xl backdrop-blur-md transition-all ${
                              isCompared
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:bg-slate-800'
                            } shadow-md z-10`}
                            title={isCompared ? 'In Compare' : 'Add to Compare'}
                          >
                            <Scale className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                          </motion.button>
                        </div>
                        <div className="flex-1 flex flex-col">
                          <div className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1 line-clamp-1">{product.brand}</div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm mb-1 leading-snug line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSelectedProduct(product)}>{product.name}</h3>
                          <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-3">
                            <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-amber-500 text-amber-500" />
                            <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200">{product.rating}</span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400">({product.reviewsCount})</span>
                          </div>
                          <div className="mt-auto pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                            {/* Price Section */}
                            <div className="min-w-0">
                              {orig > 0 ? (
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                  <span className="text-xs sm:text-sm md:text-base font-extrabold text-blue-600 dark:text-blue-400 leading-none whitespace-nowrap">
                                    {formatTZS(product.price)}
                                  </span>
                                  <span className="text-[10px] sm:text-xs text-slate-400 line-through font-mono leading-none whitespace-nowrap">
                                    {formatTZS(orig)}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-none mb-0.5">Selling Price</span>
                                  <span className="text-xs sm:text-sm md:text-base font-extrabold text-blue-600 dark:text-blue-400 leading-none whitespace-nowrap">
                                    {formatTZS(product.price)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 w-full">
                            {product.stock <= 0 ? (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const msg = `Hello, I'm inquiring about the out-of-stock product: ${product.name} (SKU: ${product.sku || product.barcode || 'N/A'}). When will it be available?`;
                                  window.open(`https://wa.me/${storeSettings?.whatsappNumber?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="w-full h-8 sm:h-9 px-2 rounded-lg sm:rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all shadow-sm bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                              >
                                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{t('shop.contactSellerForEnquiry') || 'Contact Seller for Enquiry'}</span>
                              </motion.button>
                            ) : (
                              <>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpressBuyProduct(product);
                                    setIsExpressBuyOpen(true);
                                  }}
                                  title="Express 1-Click Buy"
                                  className="flex-1 h-8 sm:h-9 px-2 rounded-lg sm:rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all shadow-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/20"
                                >
                                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white shrink-0" />
                                  <span>Buy</span>
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.92 }}
                                  onClick={(e) => handleAddToCart(product, e)}
                                  title="Add to Cart"
                                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 shadow-sm bg-slate-900 hover:bg-blue-600 text-white"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </motion.button>
                              </>
                            )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Main Category Workspace with Automated Specification Sidebar */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Specification Sidebar Component (Desktop Sticky + Mobile Drawer) */}
              <SpecificationSidebar
                products={categoryScopedProducts}
                category={selectedCategory === 'All' ? (language === 'sw' ? 'Bidhaa Zote' : 'All Products') : selectedCategory}
                filters={catalogFilters}
                onFilterChange={setCatalogFilters}
                onResetFilters={() => {
                  setCatalogFilters(INITIAL_FILTER_STATE);
                  setSelectedBrand('All');
                }}
                isDark={isDark}
                isSwahili={language === 'sw'}
                totalMatchingCount={filteredProducts.length}
                isOpenMobile={isMobileFilterDrawerOpen}
                onCloseMobile={() => setIsMobileFilterDrawerOpen(false)}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />

              {/* Main Catalog Content */}
              <div className="flex-1 min-w-0 w-full">
                {/* Active Filter Chips Ribbon */}
                <ActiveFilterBar
                  filters={catalogFilters}
                  onFilterChange={setCatalogFilters}
                  onResetFilters={() => {
                    setCatalogFilters(INITIAL_FILTER_STATE);
                    setSelectedBrand('All');
                  }}
                  isSwahili={language === 'sw'}
                />

                {/* Quick Sort & Secondary Controls Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 shadow-xs">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Mobile/Tablet Filter Drawer Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsMobileFilterDrawerOpen(true)}
                      className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>{language === 'sw' ? 'Vichujio' : 'Filter Specs'}</span>
                      {activeFiltersCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-white text-blue-600 text-[10px] font-black flex items-center justify-center">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>

                    <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">{language === 'sw' ? 'Chapa kuu:' : 'Brand:'}</span>
                    <select
                      id="brand-filter"
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/30 cursor-pointer"
                    >
                      {brands.map((brand) => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                    <div className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {filteredProducts.length} {filteredProducts.length === 1 ? (language === 'sw' ? 'kifaa' : 'product') : (language === 'sw' ? 'vifaa' : 'products')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="sm:hidden text-xs font-medium text-slate-500 dark:text-slate-400">
                      {filteredProducts.length} {filteredProducts.length === 1 ? (language === 'sw' ? 'kifaa' : 'product') : (language === 'sw' ? 'vifaa' : 'products')}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">{language === 'sw' ? 'Panga kwa:' : 'Sort by:'}</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/30 cursor-pointer"
                      >
                        <option value="featured">{language === 'sw' ? 'Maarufu & Muhimu' : 'Featured & Popular'}</option>
                        <option value="price-low">{language === 'sw' ? 'Bei: Ndogo hadi Kubwa' : 'Price: Low to High'}</option>
                        <option value="price-high">{language === 'sw' ? 'Bei: Kubwa hadi Ndogo' : 'Price: High to Low'}</option>
                        <option value="rating">{language === 'sw' ? 'Kiwango cha Juu (Rating)' : 'Highest Rated'}</option>
                      </select>
                    </div>
                  </div>
                </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <Cpu className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {language === 'sw' ? 'Hakuna vifaa vinavyolingana' : 'No matching genuine electronics found'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {language === 'sw' ? 'Jaribu kubadilisha kiwango cha bei au kurekebisha vichujio vya sifa.' : 'Try adjusting your price range or clearing some feature filters.'}
                </p>
                <button
                  onClick={() => { 
                    setSelectedCategory('All'); 
                    setSelectedBrand('All'); 
                    setCatalogFilters(INITIAL_FILTER_STATE);
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  {language === 'sw' ? 'Weka Vichujio Upya' : 'Reset All Filters'}
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-6">
              <motion.div layout className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-6">
                <AnimatePresence>
                {filteredProducts.slice(0, visibleProductsCount).map((product) => {
                  const isWishlisted = wishlist.includes(product.id);
                  const isCompared = compareProducts.some((p) => p.id === product.id);
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -6, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.2 }}
                      key={product.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border-none overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col group"
                    >
                      {/* Image & Badges */}
                      <div className="relative aspect-square bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-pointer" onClick={() => setSelectedProduct(product)}>
                        <ImageWithSkeleton
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 transition-opacity"
                          wrapperClassName="absolute inset-0"
                        />
                        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          <span className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold px-4 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Quick View
                          </span>
                        </div>
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                          <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 border border-emerald-500">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Genuine</span>
                          </span>

                          {product.stock <= 0 ? (
                            <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-md uppercase">
                              Out of Stock
                            </span>
                          ) : product.originalPrice && product.originalPrice > product.price ? (
                            <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-md uppercase">
                              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                            </span>
                          ) : null}

                          {product.isOnOffer && product.stock > 0 && (
                            <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-md uppercase flex items-center gap-1">
                              <Zap className="w-3 h-3 fill-white" />
                              <span>{product.offerTitle || 'OFFER'}</span>
                            </span>
                          )}
                        </div>

                        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.88 }}
                            onClick={(e) => handleToggleWishlist(product, e)}
                            className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                              isWishlisted
                                ? 'bg-rose-500 text-white'
                                : 'bg-white/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:bg-slate-800'
                            } shadow-md`}
                            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                          >
                            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-white' : ''}`} />
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.88 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompare(product);
                            }}
                            className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                              isCompared
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:bg-slate-800'
                            } shadow-md`}
                            title={isCompared ? 'In Compare' : 'Add to Compare'}
                          >
                            <Scale className="w-4 h-4" />
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.88 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              shareProduct({...product, image: product.image});
                            }}
                            className="p-2 rounded-xl backdrop-blur-md transition-all bg-white/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:bg-slate-800 shadow-md"
                            title="Share product"
                          >
                            <Share2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-1 sm:mb-1.5 font-medium">
                            <span className="truncate max-w-[50%]">{product.brand}</span>
                            <div className="flex items-center gap-0.5 sm:gap-1 text-amber-500 font-bold shrink-0">
                              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-500" />
                              <span>{product.rating}</span>
                              <span className="text-slate-400 font-normal">({product.reviewsCount})</span>
                            </div>
                          </div>
                          <h3
                            onClick={() => setSelectedProduct(product)}
                            className="font-bold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors mb-1.5 sm:mb-2 leading-snug min-h-[2.4rem]"
                          >
                            {product.name}
                          </h3>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 sm:mb-4">
                            {(product.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                          </p>
                        </div>

                        <div className="pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-2">
                          {/* Price Section */}
                          <div className="min-w-0">
                            {product.originalPrice && product.originalPrice > product.price ? (
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-xs sm:text-sm md:text-base font-black text-rose-600 dark:text-rose-400 leading-none whitespace-nowrap">
                                  {formatTZS(product.price)}
                                </span>
                                <span className="text-[10px] sm:text-xs text-slate-400 line-through font-mono leading-none whitespace-nowrap">
                                  {formatTZS(product.originalPrice)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-none mb-0.5">Selling Price</span>
                                <span className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 dark:text-white leading-none whitespace-nowrap">
                                  {formatTZS(product.price)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 w-full">
                            {product.stock <= 0 ? (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const msg = `Hello, I'm inquiring about the out-of-stock product: ${product.name} (SKU: ${product.sku || product.barcode || 'N/A'}). When will it be available?`;
                                  window.open(`https://wa.me/${storeSettings?.whatsappNumber?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="w-full h-8 sm:h-9 px-2 rounded-lg sm:rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all shadow-sm bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                              >
                                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{t('shop.contactSellerForEnquiry') || 'Contact Seller for Enquiry'}</span>
                              </motion.button>
                            ) : (
                              <>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpressBuyProduct(product);
                                    setIsExpressBuyOpen(true);
                                  }}
                                  title="Express 1-Click Buy"
                                  className="flex-1 h-8 sm:h-9 px-2 rounded-lg sm:rounded-xl font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20"
                                >
                                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-300 text-amber-300 shrink-0" />
                                  <span>Buy</span>
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.92 }}
                                  onClick={(e) => handleAddToCart(product, e)}
                                  title="Add to Cart"
                                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl font-semibold shadow-sm transition-all flex items-center justify-center shrink-0 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </motion.button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </motion.div>
              {filteredProducts.length > visibleProductsCount ? (
                <div ref={loadMoreRef} className="mt-8 py-6 flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm shadow-md border border-slate-200/80 dark:border-slate-700/80">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Inapakia bidhaa zaidi...</span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    Inaonyesha {Math.min(visibleProductsCount, filteredProducts.length)} kati ya {filteredProducts.length}
                  </span>
                </div>
              ) : filteredProducts.length > 12 ? (
                <div className="mt-8 py-4 text-center">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    ✓ Umeona bidhaa zote {filteredProducts.length}
                  </p>
                </div>
              ) : null}
              </div>
            )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )}

      {/* Cart Drawer */}
      <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setIsCartOpen(false)} 
          />
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-screen max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Shopping Cart ({cart.reduce((a, c) => a + c.quantity, 0)})</h2>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length > 0 && (
                  onlineCartTotalQty >= 3 ? (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-purple-500/10 to-indigo-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>🎉 3+ Items Wholesale Price Applied!</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold shrink-0 shadow-2xs">
                        WHOLESALE UNLOCKED
                      </span>
                    </div>
                  ) : onlineCartTotalQty === 2 ? (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>⚡ 2 Items Dynamic Value Discount Applied! Add 1 more item for Wholesale Pricing.</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-600 text-white font-extrabold shrink-0 shadow-2xs">
                        DYNAMIC %
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>Add <strong>2 items</strong> for Dynamic Discount or <strong>3+ items</strong> for Wholesale Pricing!</span>
                      </div>
                    </div>
                  )
                )}

                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-300 font-medium">Your cart is empty.</p>
                    <p className="text-xs text-slate-400 mt-1">Add genuine electronics to start shopping.</p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const unitPrice = calculateDiscountedPrice(item);
                    const lineTotal = unitPrice * item.quantity;
                    const regularLineTotal = item.product.price * item.quantity;
                    const isDiscounted = unitPrice < item.product.price;

                    return (
                      <div key={item.product.id} className="flex gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <ImageWithSkeleton src={item.product.image} alt={item.product.name} className="w-20 h-20 object-cover" wrapperClassName="w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0" />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{item.product.name}</h4>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> Genuine Verified
                              </span>
                              {item.product?.isVatInclusive !== false && vatPct > 0 ? (
                                <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                  VAT Incl.
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-500/10 px-1.5 py-0.2 rounded border border-slate-500/20">
                                  Non-VAT
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <div className="flex flex-col">
                              <span className={`font-extrabold text-xs sm:text-sm break-words ${isDiscounted ? 'text-purple-600 dark:text-purple-400' : 'text-slate-900 dark:text-white'}`}>
                                {formatTZS(lineTotal)}
                              </span>
                              {isDiscounted && (
                                <span className="line-through text-slate-400 text-[10px] font-medium">
                                  {formatTZS(regularLineTotal)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shrink-0">
                              <button
                                onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold px-1.5 text-slate-800 dark:text-slate-200">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            trackRemoveFromCart(item.product.id, item.product.name);
                            removeFromCart(item.product.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 space-y-3">
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between gap-2">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-900 dark:text-white break-words">{formatTZS(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>{isDarEsSalaam ? 'Delivery (Dar es Salaam)' : `Estimate Delivery Cost (${shippingCity})`}</span>
                      <span className="font-semibold text-slate-900 dark:text-white break-words">{shippingFee === 0 ? 'FREE' : formatTZS(shippingFee)}</span>
                    </div>
                    {isVatApplied && tax > 0 && (
                      <div className="flex justify-between gap-2">
                        <span>{vatInclusiveGross < cartSubtotal ? `TRA VAT (${vatPct}% on Taxable Items)` : `TRA VAT (${vatPct}% Incl.)`}</span>
                        <span className="font-semibold text-slate-900 dark:text-white break-words">{formatTZS(tax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 text-sm sm:text-base font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span>Total</span>
                      <span className="text-blue-600 break-words">{formatTZS(cartTotal)}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        trackCheckoutInitiated(cart.length, cartTotal);
                        if (user) {
                          setCheckoutMode('account');
                          setCheckoutStep(2);
                        } else {
                          setCheckoutStep(1);
                        }
                        setIsCheckoutOpen(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Secure Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        trackWhatsAppClick({
                          itemsCount: cart.length,
                          totalAmount: cartTotal,
                          products: cart.map(i => i.product.name)
                        });
                        window.open(`https://wa.me/255768929203?text=${encodeURIComponent(
                          `Hi Genuine Electronics! I want to order my cart items:\n${cart.map(i => `• ${i.product.name} (Qty: ${i.quantity}) - ${formatTZS(calculateDiscountedPrice(i) * i.quantity)}`).join('\n')}\nTotal: ${formatTZS(cartTotal)}`
                        )}`, '_blank', 'noreferrer');
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Order & Contact via WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
      </AnimatePresence>      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            
            {/* Modal Top Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Secure Checkout</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Step {checkoutStep} of 3</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Collapsible Order Summary Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-2 shadow-2xs"
                >
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Order Summary</span>
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold">{formatTZS(cartTotal)}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isSummaryExpanded ? 'rotate-180' : ''}`} />
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setCheckoutStep(1);
                  }} 
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
              <div className="flex items-center justify-between relative max-w-md mx-auto">
                {/* Progress bar line */}
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />
                <div 
                  className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-300 z-0" 
                  style={{ width: checkoutStep === 1 ? '0%' : checkoutStep === 2 ? '50%' : '100%' }}
                />

                {/* Step 1 Badge */}
                <button
                  type="button"
                  onClick={() => setCheckoutStep(1)}
                  className="relative z-10 flex items-center gap-2 focus:outline-none"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                    checkoutStep === 1
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950 shadow-md shadow-blue-600/30'
                      : checkoutStep > 1
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {checkoutStep > 1 ? <Check className="w-4 h-4" /> : '1'}
                  </div>
                  <span className={`text-xs font-bold hidden sm:inline ${checkoutStep === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                    1. Preference
                  </span>
                </button>

                {/* Step 2 Badge */}
                <button
                  type="button"
                  onClick={() => {
                    if (checkoutStep > 2 || (checkoutStep === 1 && checkoutMode)) {
                      setCheckoutStep(2);
                    }
                  }}
                  className="relative z-10 flex items-center gap-2 focus:outline-none"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                    checkoutStep === 2
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950 shadow-md shadow-blue-600/30'
                      : checkoutStep > 2
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {checkoutStep > 2 ? <Check className="w-4 h-4" /> : '2'}
                  </div>
                  <span className={`text-xs font-bold hidden sm:inline ${checkoutStep === 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                    2. Delivery
                  </span>
                </button>

                {/* Step 3 Badge */}
                <button
                  type="button"
                  onClick={() => {
                    if (shippingName && shippingEmail && shippingPhone && shippingAddress) {
                      setCheckoutStep(3);
                    }
                  }}
                  className="relative z-10 flex items-center gap-2 focus:outline-none"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                    checkoutStep === 3
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950 shadow-md shadow-blue-600/30'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    3
                  </div>
                  <span className={`text-xs font-bold hidden sm:inline ${checkoutStep === 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                    3. Payment
                  </span>
                </button>
              </div>
            </div>

            {/* Collapsible Order Summary Drawer */}
            {isSummaryExpanded && (
              <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 max-h-52 overflow-y-auto shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-w-2xl mx-auto space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <span>Items in Cart ({cart.length})</span>
                    <span>Total</span>
                  </div>
                  {cart.map((item) => {
                    const unitPrice = calculateDiscountedPrice(item);
                    const isDiscounted = unitPrice < item.product.price;
                    return (
                      <div key={item.product.id} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ImageWithSkeleton src={item.product.image} alt={item.product.name} className="w-10 h-10 object-cover" wrapperClassName="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{item.product.name}</p>
                            <p className="text-slate-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`font-bold ${isDiscounted ? 'text-purple-600 dark:text-purple-400' : 'text-slate-900 dark:text-white'}`}>
                            {formatTZS(unitPrice * item.quantity)}
                          </span>
                          {isDiscounted && (
                            <span className="block text-[10px] line-through text-slate-400 font-normal">
                              {formatTZS(item.product.price * item.quantity)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal</span>
                      <span>{formatTZS(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>{isDarEsSalaam ? 'Delivery (Dar es Salaam)' : `Estimate Delivery Cost (${shippingCity})`}</span>
                      <span>{shippingFee === 0 ? 'FREE' : formatTZS(shippingFee)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-sm text-slate-900 dark:text-white pt-1">
                      <span>Total Due</span>
                      <span className="text-blue-600 dark:text-blue-400">{formatTZS(cartTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Body: Active Step View */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
              <div className="max-w-xl mx-auto">

                {/* STEP 1: PREFERENCE SELECTION */}
                {checkoutStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center sm:text-left">
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Select Checkout Mode</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Choose how you wish to process your order.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Option 1: Quick Buy */}
                      <div
                        onClick={() => setCheckoutMode('guest')}
                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                          checkoutMode === 'guest'
                            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5">
                            <div className={`p-3 rounded-2xl shrink-0 ${checkoutMode === 'guest' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                              <Zap className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Quick Buy (Guest Checkout)</h4>
                                <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                                  Fastest
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Order directly in under 30 seconds without creating an account.</p>
                              
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> No password needed</div>
                                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Instant SMS status</div>
                              </div>
                            </div>
                          </div>

                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                            checkoutMode === 'guest' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700'
                          }`}>
                            {checkoutMode === 'guest' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>

                      {/* Option 2: Account Checkout */}
                      <div
                        onClick={() => setCheckoutMode('account')}
                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                          checkoutMode === 'account'
                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-md ring-2 ring-blue-600/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5">
                            <div className={`p-3 rounded-2xl shrink-0 ${checkoutMode === 'account' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                              <UserCheck className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Account Order Tracking</h4>
                                <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                  Trackable
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Link order to profile dashboard for live GPS tracking & official tax invoice records.</p>
                              
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Live order tracking dashboard</div>
                                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Saved delivery addresses</div>
                              </div>

                              {/* Account Status Notice */}
                              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                                {user ? (
                                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>Signed in as {user.displayName || user.email}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    <Shield className="w-4 h-4 shrink-0 text-blue-500" />
                                    <span>Requires sign in or account creation for live order tracking</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                            checkoutMode === 'account' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-700'
                          }`}>
                            {checkoutMode === 'account' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-2.5">
                      {checkoutMode === 'account' && !user ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (onLoginClick) onLoginClick();
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-sm"
                          >
                            <User className="w-4 h-4" />
                            <span>Create Account / Sign In to Continue</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCheckoutMode('guest');
                              setCheckoutStep(2);
                            }}
                            className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-semibold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span>Or continue as Guest (No account needed)</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCheckoutStep(2)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <span>Proceed to Delivery Details</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 2: DELIVERY & CONTACT DETAILS */}
                {checkoutStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Delivery & Contact Details</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Provide your contact info and physical delivery address in Tanzania.</p>
                      </div>
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full shrink-0 ${
                        checkoutMode === 'guest'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {checkoutMode === 'guest' ? '⚡ Quick Buy' : '👤 Account Order'}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Full Name *</label>
                          <input
                            type="text"
                            required
                            autoComplete="name"
                            name="name"
                            placeholder="e.g. Hassan Mwinyi"
                            value={shippingName}
                            onChange={(e) => setShippingName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Email Address *</label>
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            name="email"
                            placeholder="name@example.com"
                            value={shippingEmail}
                            onChange={(e) => setShippingEmail(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Delivery City / Region *</label>
                          <select
                            value={shippingCity}
                            onChange={(e) => setShippingCity(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all font-semibold"
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
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Phone Number (SMS & Delivery Alerts) *</label>
                          <input
                            type="tel"
                            required
                            autoComplete="tel"
                            name="tel"
                            placeholder="+255 7XX XXX XXX"
                            value={shippingPhone}
                            onChange={(e) => setShippingPhone(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Delivery Physical Address & Landmark *</label>
                        <textarea
                          required
                          rows={3}
                          autoComplete="street-address"
                          name="street-address"
                          placeholder="e.g. Kariakoo Market St, House 45, Dar es Salaam (Near Swahili Street)"
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
                        />
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 font-bold flex items-center justify-between gap-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {t('checkout.requiredFieldsError')}
                        </div>
                        <button 
                          onClick={() => setErrorMessage(null)}
                          className="hover:bg-red-200 dark:hover:bg-red-900 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    )}

                    {/* Auto-dismiss error effect */}
                    {errorMessage && (
                      <div className="hidden">
                        {
                          (() => {
                            setTimeout(() => setErrorMessage(null), 5000);
                            return null;
                          })()
                        }
                      </div>
                    )}

                    <div className="pt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setCheckoutStep(1)}
                        className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!shippingName || !shippingEmail || !shippingPhone || !shippingAddress) {
                            setErrorMessage(t('checkout.requiredFieldsError'));
                            return;
                          }
                          setErrorMessage(null);
                          setCheckoutStep(3);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <span>Proceed to Payment</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: PAYMENT & FINAL SUBMISSION */}
                {checkoutStep === 3 && (
                  <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Select Payment Channel</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Choose how you would like to complete your payment.</p>
                    </div>

                    {/* Recipient Recap Pill */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>Deliver to: {shippingName}</span>
                        <span className="text-blue-600 dark:text-blue-400">{shippingPhone}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 truncate">{shippingAddress}</p>
                    </div>

                    <div className="space-y-3">
                      {(() => {
                        const configured = storeSettings?.paymentMethods && storeSettings.paymentMethods.length > 0
                          ? [...storeSettings.paymentMethods]
                          : [
                              { id: '1', type: 'Bank Transfer', provider: 'Bank / CRDB / NMB', accountName: 'Genuine Electronics Ltd', accountNumber: '0150 8829 4100', instructions: 'Use Order ID as reference.', isActive: true },
                              { id: '2', type: 'Mobile Money', provider: 'M-Pesa', accountName: 'Genuine Electronics', accountNumber: '0768 929 203', instructions: 'Send money to this till number.', isActive: true },
                              { id: '3', type: 'Mobile Money', provider: 'Mixx By Yas', accountName: 'Genuine Electronics', accountNumber: '0658 929 203', instructions: 'Send money to this till number.', isActive: true },
                              { id: '4', type: 'Mobile Money', provider: 'Airtel Money', accountName: 'Genuine Electronics', accountNumber: '0688 929 203', instructions: 'Send money to this till number.', isActive: true },
                              { id: '5', type: 'Mobile Money', provider: 'Halotel HaloPesa', accountName: 'Genuine Electronics', accountNumber: '0628 929 203', instructions: 'Send money to this till number.', isActive: true },
                              { id: '6', type: 'Cash', provider: 'Cash on Delivery', accountName: 'Cash', accountNumber: 'N/A', instructions: 'Pay cash to delivery personnel upon arrival.', isActive: true },
                              { id: '7', type: 'Orbi Pay', provider: 'Orbi Pay', accountName: 'Orbi Merchant', accountNumber: 'ORBI-9901', instructions: 'Instant Escrow Gateway by Orbi Fintech (Under Launch)', isActive: false }
                            ];

                        const hasOrbi = configured.some(pm => (pm.provider + ' ' + pm.type + ' ' + (pm.id || '')).toLowerCase().includes('orbi'));
                        if (!hasOrbi) {
                          configured.push({
                            id: 'orbi-pay-upcoming',
                            type: 'Orbi Pay',
                            provider: 'Orbi Pay',
                            accountName: 'Orbi Merchant',
                            accountNumber: 'ORBI-9901',
                            instructions: 'Instant Escrow Gateway by Orbi Fintech (Under Launch)',
                            isActive: false
                          });
                        }

                        return configured.map((pm) => {
                          const p = (pm.provider + ' ' + pm.type + ' ' + (pm.id || '')).toLowerCase();
                          const isOrbi = p.includes('orbi');
                          // Orbi Pay is currently under launch / not ready yet, so disabled with Coming Soon badge
                          const isDisabled = !pm.isActive || isOrbi;
                          const isSelected = !isDisabled && (paymentMethod === pm.provider || paymentMethod === pm.type);
                          
                          let IconComponent = Smartphone;
                          if (p.includes('bank') || p.includes('crdb') || p.includes('nmb')) IconComponent = Building2;
                          else if (isOrbi) IconComponent = QrCode;
                          else if (p.includes('cash')) IconComponent = Wallet;

                          const subtext = isOrbi
                            ? (pm.instructions || 'Next-Gen Instant Escrow Gateway by Orbi Fintech • Launching Soon')
                            : !pm.isActive
                            ? (pm.instructions || 'Channel temporarily undergoing scheduled maintenance')
                            : pm.instructions || (pm.accountNumber !== 'N/A' ? `${pm.accountName} • ${pm.accountNumber}` : pm.type);

                          return (
                            <button
                              type="button"
                              key={pm.id}
                              disabled={isDisabled}
                              onClick={() => {
                                if (!isDisabled) setPaymentMethod(pm.provider);
                              }}
                              className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                                isDisabled
                                  ? isOrbi
                                    ? 'border-purple-200/90 dark:border-purple-800/50 bg-purple-50/40 dark:bg-purple-950/20 text-slate-500 dark:text-slate-400 opacity-80 cursor-not-allowed'
                                    : 'border-amber-200/80 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20 text-slate-500 dark:text-slate-400 opacity-80 cursor-not-allowed'
                                  : isSelected
                                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-white ring-2 ring-blue-600/20'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-2.5 rounded-xl border shrink-0 ${
                                  isDisabled
                                    ? isOrbi
                                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                    : isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                }`}>
                                  <IconComponent className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs sm:text-sm font-bold truncate">{pm.provider}</span>
                                    {isOrbi ? (
                                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        Coming Soon
                                      </span>
                                    ) : !pm.isActive ? (
                                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider bg-red-600 text-white shadow-sm">
                                        Maintenance
                                      </span>
                                    ) : pm.type === 'Mobile Money' ? (
                                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider bg-slate-900 text-white dark:bg-slate-700">
                                        Mobile Money
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                                    {subtext}
                                  </p>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isDisabled
                                  ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-300'
                                  : isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-700'
                              }`}>
                                {isSelected && !isDisabled && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                            </button>
                          );
                        });
                      })()}

                      {/* Mobile Money Input */}
                      {paymentMethod === 'Mobile Money' && (
                        <div className="mt-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 p-3.5 rounded-2xl text-xs space-y-2">
                          <label className="block font-bold text-emerald-900 dark:text-emerald-200">Mobile Money Phone Number</label>
                          <input
                            type="tel"
                            value={mobileMoneyNumber}
                            onChange={(e) => setMobileMoneyNumber(e.target.value)}
                            placeholder="e.g. 0768 929 203"
                            className="w-full bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                          />
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                            ✓ An instant USSD payment prompt will be pushed to this phone number upon placing your order.
                          </p>
                        </div>
                      )}

                      {/* Bank Transfer Info */}
                      {paymentMethod === 'Bank Transfer' && (
                        <div className="mt-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 p-3.5 rounded-2xl text-xs space-y-1 text-slate-700 dark:text-slate-200">
                          <p className="font-bold text-blue-900 dark:text-blue-200">Bank Wire Account Details:</p>
                          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                            <div>Bank: <span className="font-bold text-slate-900 dark:text-white">{storeSettings?.bankName || 'CRDB Bank Tanzania'}</span></div>
                            <div>Account: <span className="font-bold text-slate-900 dark:text-white">{storeSettings?.bankAccount || '0150 8829 4100'}</span></div>
                            <div className="col-span-2">Name: <span className="font-bold text-slate-900 dark:text-white">{storeSettings?.storeName || 'Genuine Electronics Ltd'}</span></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setCheckoutStep(2)}
                        className="px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>

                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <ShieldCheck className="w-5 h-5 shrink-0" />
                        <span className="truncate">Pay {formatTZS(cartTotal)} & Complete Order</span>
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Order Success / Proforma Invoice Modal */}
      {orderSuccess && (() => {
        const defaultMethods: PaymentMethodSetting[] = [
          { id: '1', type: 'Bank Transfer', provider: 'CRDB Bank Tanzania PLC', accountName: 'Genuine Electronics Ltd', accountNumber: '0150 8829 4100', instructions: 'Transfer directly to CRDB account. Quote order number as payment reference.', isActive: true },
          { id: '2', type: 'Mobile Money', provider: 'M-Pesa / Mixx By Yas / Airtel Money', accountName: 'Genuine Electronics Ltd', accountNumber: '0768 929 203', instructions: 'Pay via Till / Lipa Namba 0768 929 203.', isActive: true },
          { id: '3', type: 'Orbi Pay', provider: 'Orbi Pay Wallet', accountName: 'Genuine Electronics Ltd', accountNumber: 'ORBI-9901', instructions: 'Pay via Orbi Pay barcode or wallet ID.', isActive: true },
          { id: '4', type: 'Cash on Delivery', provider: 'Cash on Delivery / In-Store Pickup', accountName: 'Genuine Electronics Ltd', accountNumber: 'Pay Upon Delivery', instructions: 'Pay cash or mobile money upon receiving your order.', isActive: true }
        ];
        const methodsList = (storeSettings?.paymentMethods && storeSettings.paymentMethods.length > 0) ? storeSettings.paymentMethods : defaultMethods;
        const qMethod = (orderSuccess.paymentMethod || '').toLowerCase();
        const selectedMethod = methodsList.find(m => {
          const p = (m.provider || '').toLowerCase();
          const t = (m.type || '').toLowerCase();
          const id = (m.id || '').toLowerCase();
          return qMethod === id || qMethod === t || p.includes(qMethod) || qMethod.includes(p) || qMethod.includes(t);
        }) || {
          id: 'custom',
          type: orderSuccess.paymentMethod || 'Direct Payment',
          provider: orderSuccess.paymentMethod || 'Genuine Electronics Merchant',
          accountName: 'Genuine Electronics Tanzania Ltd',
          accountNumber: '0768 929 203',
          instructions: `Please complete payment for your order and quote order number ${orderSuccess.id} as payment reference.`,
          isActive: true
        };

        const totalAmt = orderSuccess.totalAmount;
        const hasOrderItems = orderSuccess.items && orderSuccess.items.length > 0;
        const allItemsExempt = hasOrderItems && orderSuccess.items.every(item => item.product?.isVatInclusive === false);
        const isVatApplicable = !allItemsExempt &&
          orderSuccess.includeVat !== false && 
          (orderSuccess.vatPercentage !== undefined ? Number(orderSuccess.vatPercentage) > 0 : vatPct > 0) &&
          (orderSuccess.tax !== undefined ? Number(orderSuccess.tax) > 0 : true);
        const effectiveVatPct = isVatApplicable ? Number(orderSuccess.vatPercentage ?? vatPct) : 0;
        const vatTax = isVatApplicable && effectiveVatPct > 0
          ? (orderSuccess.tax !== undefined ? Number(orderSuccess.tax) : (totalAmt * (effectiveVatPct / (100 + effectiveVatPct))))
          : 0;
        const netSubtotal = totalAmt - vatTax;
        const proformaNumber = `PRO-${orderSuccess.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col my-auto max-h-[95vh]">
              {/* Header Control Bar */}
              <div className="no-print bg-slate-950 text-white px-4 py-3 flex items-center justify-between gap-2 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center font-black text-xs text-white bg-blue-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-xs tracking-tight">
                        Proforma Invoice & Order Summary
                      </h3>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border bg-blue-900/60 text-blue-300 border-blue-700">
                        Proforma (Pending Payment)
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">Order #{orderSuccess.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPrintingInvoiceOrder(orderSuccess)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    title="View & Print Proforma Invoice (A4)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print A4</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderSuccess(null)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Proforma Invoice Area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-950/60 flex justify-center items-start">
                {/* Official Proforma Invoice Paper */}
                <div 
                  className="font-sans text-[11px] leading-tight bg-white text-slate-900 p-5 shadow-2xl border border-slate-300 rounded-xl w-full max-w-[420px] space-y-3.5"
                  style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                >
                  {/* Store Header */}
                  <div className="text-center space-y-1 pb-2.5 border-b-2 border-slate-900">
                    <div className="flex items-center justify-center mx-auto mb-1">
                      <img 
                        src={BRAND_LOGO_URL} 
                        alt={storeSettings?.storeName || "Genuine Electronics"} 
                        className="h-8 w-auto max-w-[130px] object-contain" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                    <h2 className="font-black text-sm tracking-normal uppercase text-slate-950">
                      {storeSettings?.storeName || 'GENUINE ELECTRONICS'}
                    </h2>
                    <div className="inline-block bg-blue-50 text-blue-800 border border-blue-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                      PROFORMA INVOICE • ORDER QUOTATION
                    </div>
                    <p className="text-[9.5px] text-slate-600 leading-tight">
                      {storeSettings?.address || 'Kariakoo, Dar es Salaam Tanzania'}
                    </p>
                    <p className="text-[9.5px] text-slate-700 font-semibold">
                      TEL: {storeSettings?.phone || '+255 768 929 203'}
                    </p>
                    <div className="text-[9px] font-bold text-slate-800 pt-0.5">
                      <span>TIN: {storeSettings?.tin || '104-982-371'}</span>
                      <span className="mx-1.5">|</span>
                      </div>
                  </div>

                  {/* Proforma Metadata */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-semibold">PROFORMA NO:</span>
                      <span className="font-mono font-bold text-slate-900">{proformaNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-semibold">ORDER ID:</span>
                      <span className="font-mono font-bold text-slate-900">{orderSuccess.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-semibold">DATE & TIME:</span>
                      <span className="font-medium text-slate-800">{formatToGMT3(orderSuccess.createdAt)}</span>
                    </div>
                    {orderSuccess.customerName && (
                      <div className="flex justify-between pt-0.5 border-t border-slate-200">
                        <span className="text-slate-600 font-semibold">CUSTOMER:</span>
                        <span className="font-bold text-slate-900">{orderSuccess.customerName}</span>
                      </div>
                    )}
                    {(orderSuccess.customerPhone || orderSuccess.phone) && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-semibold">PHONE:</span>
                        <span className="text-slate-800">{orderSuccess.customerPhone || orderSuccess.phone}</span>
                      </div>
                    )}
                    {orderSuccess.shippingAddress && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-semibold">DELIVERY TO:</span>
                        <span className="text-slate-800 text-right truncate max-w-[200px]">{orderSuccess.shippingAddress}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-0.5 border-t border-slate-200">
                      <span className="text-slate-600 font-semibold">ORDER STATUS:</span>
                      <span className="bg-amber-100 text-amber-900 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-amber-300">
                        Payment Pending Verification
                      </span>
                    </div>
                  </div>

                  {/* Itemized List */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-2.5 py-1.5 flex justify-between font-bold text-[10px] text-slate-800 border-b border-slate-200">
                      <span>ITEM DESCRIPTION</span>
                      <span>TOTAL (TZS)</span>
                    </div>
                    <div className="divide-y divide-slate-100 p-1">
                      {orderSuccess.items.map((item: any, idx: number) => {
                        const unitPrice = item.price || item.product?.price || 0;
                        const itemTotal = unitPrice * item.quantity;
                        const isItemVat = item.product?.isVatInclusive !== false;
                        return (
                          <div key={idx} className="p-1.5 space-y-0.5">
                            <div className="flex items-center justify-between text-[10.5px] text-slate-900 font-semibold leading-tight">
                              <span>{idx + 1}. {item.product?.name || item.name}</span>
                              {isVatApplicable && (
                                isItemVat ? (
                                  <span className="text-[8.5px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded">VAT Incl.</span>
                                ) : (
                                  <span className="text-[8.5px] font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">Non-VAT</span>
                                )
                              )}
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-600 pl-2">
                              <span>{item.quantity} x {formatTZS(unitPrice)}</span>
                              <span className="font-bold text-slate-900">{formatTZS(itemTotal)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Financial Calculations */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[10px]">
                    {isVatApplicable && vatTax > 0 ? (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>NET SUBTOTAL:</span>
                          <span className="font-semibold text-slate-800">{formatTZS(netSubtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>TRA VAT ({effectiveVatPct}% INCLUDED):</span>
                          <span className="font-semibold text-slate-800">{formatTZS(vatTax)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-600">
                        <span>SUBTOTAL:</span>
                        <span className="font-semibold text-slate-800">{formatTZS(totalAmt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-bold text-xs py-1.5 my-0.5 border-t-2 border-b-2 border-slate-900 text-slate-950">
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
                        {orderSuccess.paymentMethod}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-blue-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-bold text-slate-500 uppercase">Provider / Channel:</span>
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
                        <p className="text-[9.5px] text-slate-600 pt-1 border-t border-slate-100">
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
                        This is a <strong>Proforma Invoice</strong>. Your official TRA Fiscal Cash Receipt will be issued and unlocked as soon as our store staff verifies your payment.
                      </p>
                    </div>
                  </div>

                  {/* QR Code, Reference & Official Blue Stamp */}
                  <div className="pt-2 border-t border-dashed border-slate-300 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-white border border-slate-300 inline-block rounded">
                        <QRCodeSVG 
                          value={`https://genuine-electronics.com/proforma/${orderSuccess.id}?total=${orderSuccess.totalAmount}&pro=${proformaNumber}`} 
                          size={56} 
                          level="M"
                        />
                      </div>
                      <div>
                        <p className="text-[9px] font-mono font-bold text-slate-800">
                          REF: {proformaNumber}
                        </p>
                        <p className="text-[8.5px] text-slate-600">
                          Quote reference during payment remittance
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
              </div>

              {/* Bottom Action Footer */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => setPrintingInvoiceOrder(orderSuccess)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Proforma Invoice (A4)</span>
                  </button>

                  <a
                    href={`https://wa.me/255768929203?text=${encodeURIComponent(
                      `Hi Genuine Electronics! I have placed Order #${orderSuccess.id} (${formatTZS(orderSuccess.totalAmount)}) with payment method: ${orderSuccess.paymentMethod}. Proforma No: ${proformaNumber}. Please confirm my payment and delivery.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send Order to WhatsApp</span>
                  </a>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setOrderSuccess(null);
                      window.dispatchEvent(new CustomEvent('nav-action', { detail: 'orders' }));
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                  >
                    <span>Track Order Status</span>
                  </button>

                  <button
                    onClick={() => setOrderSuccess(null)}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-5 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* My Orders Modal */}
      {isOrdersOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Orders & Tracking</h2>
              <button onClick={() => setIsOrdersOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{order.id}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">({formatToGMT3(order.createdAt)})</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                      order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Tracking Number:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{order.trackingNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Shipping Address:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-100 text-right">{order.shippingAddress}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between font-extrabold text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-slate-700 gap-3 sm:items-center">
                      <div className="flex items-center gap-2">
                        <span>Total:</span>
                        <span className="text-blue-600 text-sm font-black break-words">{formatTZS(order.totalAmount)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          order.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.paymentStatus === 'Paid' ? 'Paid' : 'Payment Pending'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Tax / Proforma Invoice */}
                        <button
                          onClick={() => setPrintingInvoiceOrder(order)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all active:scale-95"
                          title={order.paymentStatus === 'Paid' ? 'Print or Download Official Tax Invoice' : 'Print or Download Proforma Invoice'}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{order.paymentStatus === 'Paid' ? 'Tax Invoice' : 'Proforma Invoice'}</span>
                        </button>

                        {/* Payment Receipt if Paid */}
                        {order.paymentStatus === 'Paid' ? (
                          <button
                            onClick={() => {
                              setPrintingReceiptOrder({
                                id: order.id,
                                createdAt: order.createdAt,
                                cashierName: 'Online Marketplace Admin',
                                items: order.items,
                                subtotal: order.totalAmount * 0.84,
                                tax: order.totalAmount * 0.16,
                                discount: 0,
                                total: order.totalAmount,
                                paymentMethod: order.paymentMethod || 'Online Payment',
                              });
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all active:scale-95"
                            title="Print Official Payment Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Payment Receipt</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              alert('Payment confirmation is pending. Official Payment Receipt will be unlocked once payment is marked as Paid. You can view or print your Proforma Invoice now.');
                              setPrintingInvoiceOrder(order);
                            }}
                            className="border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-medium px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="Official Receipt locked until payment is confirmed as Paid"
                          >
                            <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Receipt (Locked)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Print Modal overlay */}
      {printingInvoiceOrder && (
        <InvoicePrintModal
          order={printingInvoiceOrder}
          onClose={() => setPrintingInvoiceOrder(null)}
          storeSettings={storeSettings}
          defaultDocType={printingInvoiceOrder.paymentStatus === 'Paid' ? 'tax' : 'proforma'}
          isClientView={true}
        />
      )}

      {/* Thermal POS / Official Payment Receipt Modal */}
      {printingReceiptOrder && (
        <POSReceiptModal
          receipt={printingReceiptOrder}
          onClose={() => setPrintingReceiptOrder(null)}
          storeSettings={storeSettings}
        />
      )}

      {/* Product Comparison Floating Bar & Modal */}
      <CompareFloatingBar
        compareProducts={compareProducts}
        onOpenCompareModal={() => setIsCompareModalOpen(true)}
        onRemoveProduct={removeFromCompare}
        onClearAll={clearCompare}
        isDark={isDark}
      />

      <ProductCompareModal
        compareProducts={compareProducts}
        allProducts={products}
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        onRemoveProduct={removeFromCompare}
        onClearAll={clearCompare}
        onAddProduct={addToCompare}
        addToCart={addToCart}
        onSelectProduct={(product) => setSelectedProduct(product)}
        isDark={isDark}
      />

      {/* Express 1-Click Buy Drawer */}
      <ExpressBuyDrawer
        product={expressBuyProduct}
        isOpen={isExpressBuyOpen}
        onClose={() => {
          setIsExpressBuyOpen(false);
          setExpressBuyProduct(null);
        }}
        createOrder={createOrder}
        user={user}
        profile={profile}
        storeSettings={storeSettings}
        isDark={isDark}
      />

      {/* Online Receipt Verification Modal */}
      <ReceiptVerificationModal
        isOpen={isReceiptVerificationOpen}
        onClose={() => {
          setIsReceiptVerificationOpen(false);
          setReceiptVerificationParams(null);
        }}
        orderNo={receiptVerificationParams?.orderNo}
        receiptNo={receiptVerificationParams?.receiptNo}
        storeSettings={storeSettings}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md flex items-center gap-3 min-w-[280px] pointer-events-auto ${
                toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
                toast.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' :
                'bg-slate-800/90 border-slate-700 text-white'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <X className="w-5 h-5" />}
              {toast.type === 'info' && <CheckCircle2 className="w-5 h-5" />}
              <span className="font-semibold text-sm">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
};
