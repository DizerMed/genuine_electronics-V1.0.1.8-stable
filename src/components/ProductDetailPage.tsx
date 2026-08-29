import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ShieldCheck, Star, ShoppingBag, ShoppingCart, Heart, Share2, Check, 
  Truck, RefreshCw, ChevronRight, Package, Zap, QrCode, Layers, 
  ArrowRight, AlertCircle, LayoutGrid, MessageCircle, Scale, ZoomIn, ChevronLeft, X, Home
} from 'lucide-react';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { useLanguage } from "../i18n/LanguageContext";
import { Product, formatTZS, Category, CategoryItem } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { ProductDescriptionView } from './ProductDescriptionView';

interface ProductDetailPageProps {
  product: Product;
  allProducts: Product[];
  onBack: () => void;
  addToCart: (product: Product, quantity?: number) => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: boolean;
  onSelectProduct: (product: Product) => void;
  onBuyNow: (product: Product, quantity?: number) => void;
  onCategorySelect?: (category: string) => void;
  onToggleCompare?: (product: Product) => void;
  isInCompare?: boolean;
  categoriesList?: CategoryItem[];
  vatPercentage?: number;
  user?: any;
  onLoginClick?: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts,
  onBack,
  addToCart,
  toggleWishlist,
  isWishlisted,
  onSelectProduct,
  onBuyNow,
  onCategorySelect,
  onToggleCompare,
  isInCompare = false,
  categoriesList = [],
  vatPercentage = 18,
  user,
  onLoginClick,
}) => {
  if (!product) return null;

  const catMeta = categoriesList?.find(c => {
    const cName = c?.name || '';
    const pCat = product?.category || '';
    return String(cName || "").toLowerCase() === String(pCat || "").toLowerCase();
  });
  const categorySwahiliName = catMeta?.swahiliName || product?.category || '';

  const { t } = useLanguage();
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'warranty' | 'reviews'>('specs');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Generate clean SEO URL Slug
  const productSlug = encodeURIComponent(
    (product?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  );
  const categorySlug = encodeURIComponent(
    (product?.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  );

  // Dedicated Clean Route
  const productPath = `/product/${product.id}/${productSlug}`;
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://www.genuine-electronics.com';
  const canonicalUrl = `${currentOrigin}${productPath}`;

  // Gallery images using actual product data (primary image + all gallery images deduplicated)
  const rawGallery = Array.isArray(product.images)
    ? product.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0)
    : [];
  const galleryImages = product.image
    ? [product.image, ...rawGallery.filter(img => img !== product.image)]
    : (rawGallery.length > 0 ? rawGallery : ['https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=800']);

  // Smart Bundle Item & Similar Recommendations
  const complementaryBundleItem = allProducts.find(
    (p) => p.id !== product.id && (p.category !== product.category || p.price < product.price)
  ) || allProducts[1];

  const similarProducts = allProducts
    .filter((p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand))
    .slice(0, 4);

  const fallbackSimilar = similarProducts.length < 3
    ? allProducts.filter((p) => p.id !== product.id).slice(0, 4)
    : similarProducts;

  const bundleSubtotal = product.price + (complementaryBundleItem?.price || 0);
  const bundleDiscountedTotal = Math.round(bundleSubtotal * 0.95);

  // Background Google SEO Head Tag Injection & URL Address Bar Sync
  useEffect(() => {
    // 1. Update Browser Title
    const originalTitle = document.title;
    document.title = `${product.name} | ${product.brand} - Buy in Tanzania | Genuine Electronics Trust`;

    // 2. Update address bar with clean dedicated route
    if (window.location.pathname !== productPath) {
      window.history.pushState({ productId: product.id }, product.name, productPath);
    }

    // 3. Inject Google Schema.org JSON-LD structured data script
    const schemaData = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      'name': product.name,
      'image': [product.image, ...galleryImages],
      'description': product.description,
      'sku': product.sku,
      'mpn': product.barcode,
      'brand': {
        '@type': 'Brand',
        'name': product.brand,
      },
      'offers': {
        '@type': 'Offer',
        'url': canonicalUrl,
        'priceCurrency': 'TZS',
        'price': product.price,
        'priceValidUntil': '2028-12-31',
        'itemCondition': 'https://schema.org/NewCondition',
        'availability': product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'seller': {
          '@type': 'Organization',
          'name': 'Genuine Electronics Trust Tanzania - Authorized Shopping Center',
        },
      },
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': product.rating.toString(),
        'reviewCount': product.reviewsCount.toString(),
      },
    };

    let scriptTag = document.getElementById('product-schema-jsonld') as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'product-schema-jsonld';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.text = JSON.stringify(schemaData);

    // 4. Scroll to top when loading new product
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 5. Scroll listener for floating sticky buy bar
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      document.title = originalTitle;
      window.removeEventListener('scroll', handleScroll);
      if (scriptTag && scriptTag.parentNode) {
        scriptTag.parentNode.removeChild(scriptTag);
      }
    };
  }, [product.id, product.name]);

  const handleCopyShare = async () => {
    const shareableUrl = `${window.location.origin}${productPath}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on Genuine Electronics Trust`,
          url: shareableUrl,
        });
        return;
      } catch (err) {
        // user cancelled or failed, fallback to clipboard
      }
    }
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Home',
      href: '/',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('nav-action', { detail: 'home' }));
        onBack();
      },
    },
    {
      label: categorySwahiliName,
      href: `/category/${categorySlug}`,
      onClick: () => {
        if (onCategorySelect) onCategorySelect(product.category);
        window.dispatchEvent(new CustomEvent('nav-action', { detail: `category_${product.category}` }));
        onBack();
      },
    },
    {
      label: product.brand,
      href: `/category/${categorySlug}?brand=${encodeURIComponent(product.brand)}`,
      onClick: () => {
        if (onCategorySelect) onCategorySelect(product.category);
        window.dispatchEvent(new CustomEvent('nav-action', { detail: `category_${product.category}` }));
        onBack();
      },
    },
    {
      label: product.name,
      href: productPath,
      isCurrent: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white pb-20">
      
      {/* DYNAMIC BREADCRUMB & BACK NAVIGATION ROW */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs sticky top-0 z-30">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-2.5 flex items-center justify-between gap-3">
          
          {/* Back Button & Dynamic Schema-Compliant Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold px-3 py-1.5 rounded-xl text-xs transition-all shrink-0 active:scale-95 border border-slate-200 dark:border-slate-700 shadow-xs"
              title="Return to products catalog"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
              <span className="hidden sm:inline">Back to Store</span>
              <span className="sm:hidden">Back</span>
            </button>

            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

            {/* Structured Breadcrumbs */}
            <div className="min-w-0 flex-1">
              <Breadcrumb
                items={breadcrumbItems}
                className="py-1 px-2.5 bg-transparent border-0 shadow-none"
                compactOnMobile={true}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            {product.stock <= 0 ? (
              <span className="text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800 px-2.5 py-1 rounded-lg text-[11px] font-bold hidden sm:inline-block">
                ✕ Out of Stock (0 Available)
              </span>
            ) : (
              <span className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 px-2.5 py-1 rounded-lg text-[11px] font-bold hidden sm:inline-block">
                ✓ In Stock & Ready to Ship
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT PAGE CONTAINER */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 pt-6 space-y-10">

        {/* PRODUCT HERO SECTION (2 Columns) */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 border-none shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* LEFT 5 COLS: GALLERY & AUTHENTICITY */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Main Stage Image */}
            <div className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-3xl overflow-hidden border-none relative shadow-sm group">
              <img
                src={galleryImages[activeImageIndex] || product.image}
                alt={product.name}
                onClick={() => {
                  triggerHaptic('light');
                  setIsLightboxOpen(true);
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
              />
              <span className="absolute top-4 left-4 bg-emerald-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Original Product
              </span>
              {product.stock <= 0 && (
                <span className="absolute top-4 right-4 bg-rose-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                </span>
              )}

              {/* Gallery Navigation Arrows (if multiple images) */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1));
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                    title="Previous Image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setActiveImageIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                    title="Next Image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Zoom Trigger Button */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsLightboxOpen(true);
                }}
                className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-xl backdrop-blur-md shadow-md flex items-center gap-1 text-[11px] font-bold transition-all active:scale-95"
                title="Open high-resolution zoom"
              >
                <ZoomIn className="w-4 h-4" />
                <span className="hidden sm:inline">Zoom</span>
              </button>
            </div>

            {/* Thumbnail Array */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 max-w-full">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveImageIndex(idx);
                  }}
                  className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl overflow-hidden transition-all ${
                    activeImageIndex === idx
                      ? 'border-2 border-blue-600 ring-2 ring-blue-600/20 shadow-md scale-105'
                      : 'border-2 border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Serial Traceability Card */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-none flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">Hardware Serial Verification</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">SKU: {product.sku} | Barcode: {product.barcode}</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg shrink-0">
                Guaranteed
              </span>
            </div>
          </div>

          {/* RIGHT 7 COLS: DETAILS & BUY ACTIONS */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div>
              
              {/* Category & Action bar */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-extrabold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                  {product.brand} • {categorySwahiliName}
                </span>

                <div className="flex items-center gap-2">
                  {onToggleCompare && (
                    <button
                      onClick={() => onToggleCompare(product)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isInCompare
                          ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                      }`}
                      title={isInCompare ? 'Remove from Comparison' : 'Add to Compare'}
                    >
                      <Scale className="w-4 h-4" />
                      <span>{isInCompare ? 'In Compare' : 'Compare'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isWishlisted
                        ? 'border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-300'
                    }`}
                    title={isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                  </button>
                  <button
                    onClick={handleCopyShare}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 transition-colors"
                    title="Copy Indexable Share Link"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3 leading-tight tracking-tight">
                {product.name}
              </h1>

              {/* Rating & In Stock Bar */}
              <div className="flex flex-wrap items-center gap-4 text-xs mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <span className="text-slate-900 dark:text-white font-extrabold text-sm">{product.rating}</span>
                  <span className="text-slate-400 font-normal">({product.reviewsCount} verified Tanzanian buyers)</span>
                </div>
                <span className="text-slate-300">•</span>
                {product.stock <= 0 ? (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Out of Stock (0 units available)
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <Package className="w-4 h-4" /> In Stock
                  </span>
                )}
              </div>

              {/* High Impact Price Block */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl mb-6 shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium mb-1 uppercase tracking-wider">Official Retail Price</span>
                    <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-none break-words">
                      {formatTZS(product.price)}
                    </span>
                  </div>
                  <div className="text-right">
                    {product.isVatInclusive !== false && vatPercentage > 0 ? (
                      <span className="text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-none font-bold px-3 py-1 rounded-full block mb-1">
                        VAT Included ({vatPercentage}%) • Tax Invoice Provided
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-500/20 text-slate-600 dark:text-slate-300 border-none font-medium px-3 py-1 rounded-full block mb-1">
                        Official Commercial Invoice Provided
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">Fixed Transparent Rate</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <ProductDescriptionView description={product.description} />
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4 mb-8">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Quantity:</span>
                <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
                    disabled={product.stock <= 0}
                    className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-base text-slate-900 dark:text-white px-3">{product.stock <= 0 ? 0 : selectedQuantity}</span>
                  <button
                    onClick={() => setSelectedQuantity((q) => Math.min(Math.max(0, product.stock), q + 1))}
                    disabled={product.stock <= 0 || selectedQuantity >= product.stock}
                    className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Subtotal: {formatTZS(product.price * (product.stock <= 0 ? 0 : selectedQuantity))}</span>
              </div>

              {/* Guarantees Badges Grid */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs mb-8">
                <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <Truck className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <span className="font-bold text-slate-800 dark:text-slate-100 block text-[11px]">Express Shipping</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">2-4 Hrs Dar / Regions</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <span className="font-bold text-slate-800 dark:text-slate-100 block text-[11px]">Official Warranty</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{product.warranty}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <RefreshCw className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <span className="font-bold text-slate-800 dark:text-slate-100 block text-[11px]">7-Day Returns</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">100% Replacement Guarantee</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {product.stock <= 0 ? (
                  <button
                    onClick={() => {
                      const msg = `Hello, I'm inquiring about the out-of-stock product: ${product.name} (SKU: ${product.sku || product.barcode || 'N/A'}). When will it be available?\n\nProduct Link: ${window.location.origin}${productPath}`;
                      window.open(`https://wa.me/255624057166?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="w-full font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2.5 text-sm bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{t('shop.contactSellerForEnquiry') || 'Contact Seller for Enquiry'}</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => addToCart(product, selectedQuantity)}
                      className="font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2.5 text-sm bg-slate-900 hover:bg-slate-800 text-white active:scale-95"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span>{`Add ${selectedQuantity} to Cart`}</span>
                    </button>
                    <button
                      onClick={() => onBuyNow(product, selectedQuantity)}
                      className="font-extrabold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 active:scale-95"
                    >
                      <span>Instant Buy Now</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    const msg = `Hi Genuine Electronics Trust! I want to order ${product.name} (Qty: ${selectedQuantity}, SKU: ${product.sku}) priced at ${formatTZS(product.price * selectedQuantity)}.\n\nProduct Link: ${window.location.origin}${productPath}`;
                    window.open(`https://wa.me/255624057166?text=${encodeURIComponent(msg)}`, '_blank', 'noreferrer');
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2.5 text-sm active:scale-95"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Order Directly via WhatsApp</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* TECHNICAL SPECIFICATIONS & WARRANTY TABS */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border-none shadow-sm">
          <div className="flex border-b border-slate-200 dark:border-slate-700 mb-8 gap-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('specs')}
              className={`pb-4 text-sm font-extrabold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'specs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100'
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('warranty')}
              className={`pb-4 text-sm font-extrabold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'warranty' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100'
              }`}
            >
              Genuine Warranty & Authenticity
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 text-sm font-extrabold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'reviews' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100'
              }`}
            >
              Verified Reviews ({product.reviewsCount})
            </button>
          </div>

          {activeTab === 'specs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(product.specs).map(([key, val]) => (
                <div key={key} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-none flex justify-between items-center text-xs sm:text-sm">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">{key}</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-right ml-4">{val}</span>
                </div>
              ))}
              {product.capacity && (
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-none flex justify-between items-center text-xs sm:text-sm">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Capacity / Volume</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-right">{product.capacity}</span>
                </div>
              )}
              {product.energyRating && (
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-none flex justify-between items-center text-xs sm:text-sm">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Energy Rating</span>
                  <span className="font-extrabold text-emerald-700 text-right">{product.energyRating}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'warranty' && (
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border-none p-5 rounded-2xl flex items-start gap-4">
                <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-base mb-1">Official Country Warranty Coverage</h4>
                  <p className="text-emerald-800 dark:text-emerald-200/80">Every single unit sold by Genuine Electronics is sourced directly from authorized brand distributors. Your receipt includes official serial number registration valid for direct service across Tanzania.</p>
                </div>
              </div>
              <ul className="list-disc list-inside space-y-2 pl-2 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm">
                <li>Coverage: {product.warranty}</li>
                <li>Serial Traceability: Verified upon dispatch via invoice # tracking</li>
                <li>Free replacement within 7 days for any factory hardware defect</li>
              </ul>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="text-4xl font-extrabold text-slate-900 dark:text-white">{product.rating}</div>
                <div>
                  <div className="flex text-amber-500 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-500" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Based on {product.reviewsCount} verified purchase reviews in Tanzania</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 dark:text-white">Juma M. (Dar es Salaam)</span>
                    <span className="text-slate-400 text-[11px]">2 days ago</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">"Ordered in the morning and received it before afternoon in Masaki. Verified the serial code online immediately and it came sealed in original packaging."</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 dark:text-white">Amina K. (Arusha)</span>
                    <span className="text-slate-400 text-[11px]">1 week ago</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">"Excellent build quality and 100% genuine hardware. Delivery to Arusha was smooth and well packed."</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SMART BUNDLE & FREQUENTLY BOUGHT TOGETHER */}
        {complementaryBundleItem && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/30 border-none p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                Frequently Bought Together
              </h3>
              <span className="text-xs bg-amber-400/20 text-amber-800 dark:text-amber-300 border-none font-extrabold px-3 py-1 rounded-full">
                Save 5% on 2-Item Bundle
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Main Product */}
              <div className="md:col-span-5 bg-white dark:bg-slate-800 p-4 rounded-2xl border-none flex items-center gap-4">
                <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-xl border-none" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">This Item</span>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{product.name}</h5>
                  <p className="text-xs font-extrabold text-blue-600 mt-0.5">{formatTZS(product.price)}</p>
                </div>
              </div>

              <div className="md:col-span-1 text-center font-extrabold text-slate-400 text-2xl">+</div>

              {/* Complementary Product */}
              <div className="md:col-span-5 bg-white dark:bg-slate-800 p-4 rounded-2xl border-none flex items-center gap-4">
                <img src={complementaryBundleItem.image} alt={complementaryBundleItem.name} className="w-16 h-16 object-cover rounded-xl border-none" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Recommended Add-on</span>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{complementaryBundleItem.name}</h5>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">{formatTZS(complementaryBundleItem.price)}</p>
                </div>
              </div>

              {/* Checkout Bundle Button */}
              <div className="md:col-span-12 flex flex-wrap items-center justify-between pt-4 border-t border-blue-200 gap-4">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Bundle Price (2 items): </span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white ml-1">{formatTZS(bundleDiscountedTotal)}</span>
                  <span className="text-xs text-slate-400 line-through ml-2">{formatTZS(bundleSubtotal)}</span>
                </div>

                <button
                  onClick={() => {
                    addToCart(product, 1);
                    addToCart(complementaryBundleItem, 1);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 text-xs flex items-center gap-2 transition-all active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add Bundle to Cart</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RECOMMENDED SIMILAR PRODUCTS CATALOG GRID */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Similar Products & Recommendations
            </h3>
            <button
              onClick={onBack}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Explore All Products</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {fallbackSimilar.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectProduct(item)}
                className="bg-white dark:bg-slate-800 border-none rounded-2xl p-4 transition-all hover:shadow-xl cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden mb-3 relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">{item.brand}</span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 mt-0.5 mb-2 group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </h4>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">{formatTZS(item.price)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(item, 1);
                    }}
                    className="bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 p-2 rounded-xl transition-all"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EXPLORE ALL CATEGORIES BOTTOM SECTION */}
        <div className="bg-white dark:bg-slate-800 border-none rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xs mt-10">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-blue-600" />
              Explore Store Categories
            </h3>
            <span className="text-xs font-semibold text-slate-400">Quick Navigation</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  if (onCategorySelect) {
                    onCategorySelect(cat.name);
                  }
                  onBack();
                }}
                className="flex items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-blue-600 hover:text-white border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all text-center group active:scale-95 shadow-2xs"
              >
                <span className="truncate text-[11px] sm:text-xs">{cat.swahiliName || cat.name}</span>
              </button>
            ))}
          </div>
        </div>

      </main>

      {/* STICKY BOTTOM QUICK PURCHASE BAR ON SCROLL */}
      {showStickyBar && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 z-40 shadow-2xl animate-slideUp">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 hidden sm:block" />
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">{product.name}</h4>
                <p className="text-xs font-bold text-blue-600">{formatTZS(product.price)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {product.stock <= 0 ? (
                <button
                  onClick={() => {
                    const msg = `Hello, I'm inquiring about the out-of-stock product: ${product.name} (SKU: ${product.sku || product.barcode || 'N/A'}). When will it be available?\n\nProduct Link: ${window.location.origin}${productPath}`;
                    window.open(`https://wa.me/255624057166?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('shop.contactSellerForEnquiry') || 'Contact Seller'}</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => addToCart(product, selectedQuantity)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span className="hidden sm:inline">Add to Cart</span>
                  </button>
                  <button
                    onClick={() => onBuyNow(product, selectedQuantity)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
                  >
                    <span>Buy Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN HIGH-RESOLUTION IMAGE LIGHTBOX */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar */}
          <div className="w-full max-w-5xl flex items-center justify-between text-white shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight">{product.name}</span>
              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {activeImageIndex + 1} / {galleryImages.length}
              </span>
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Zoomed Image Container */}
          <div 
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-auto overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryImages[activeImageIndex] || product.image}
              alt={product.name}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl transition-transform duration-300 hover:scale-110 cursor-zoom-in"
            />

            {/* Navigation Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1));
                  }}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md shadow-xl transition-all active:scale-90"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveImageIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0));
                  }}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md shadow-xl transition-all active:scale-90"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-2 max-w-full overflow-x-auto p-2 bg-slate-900/80 rounded-2xl backdrop-blur-sm shrink-0" onClick={(e) => e.stopPropagation()}>
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveImageIndex(idx);
                  }}
                  className={`w-14 h-14 rounded-xl overflow-hidden transition-all ${
                    activeImageIndex === idx
                      ? 'ring-2 ring-blue-500 scale-105 opacity-100'
                      : 'opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
