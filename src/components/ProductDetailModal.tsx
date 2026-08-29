import React, { useState } from 'react';
import { 
  X, ShieldCheck, Star, ShoppingBag, ShoppingCart, Heart, Share2, Check, 
  Truck, RefreshCw, ChevronRight, 
  Package, Zap, QrCode, Layers, ArrowRight, AlertCircle, MessageCircle
} from 'lucide-react';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { createSEOSlug } from '../lib/seoManager';
import { useLanguage } from "../i18n/LanguageContext";
import { Product, formatTZS, CategoryItem } from '../types';
import { ProductDescriptionView } from './ProductDescriptionView';

interface ProductDetailModalProps {
  product: Product;
  allProducts: Product[];
  onClose: () => void;
  addToCart: (product: Product, quantity?: number) => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: boolean;
  onSelectProduct: (product: Product) => void;
  onBuyNow: (product: Product, quantity?: number) => void;
  categoriesList?: CategoryItem[];
  vatPercentage?: number;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  allProducts,
  onClose,
  addToCart,
  toggleWishlist,
  isWishlisted,
  onSelectProduct,
  onBuyNow,
  categoriesList = [],
  vatPercentage = 18,
}) => {
  const catMeta = categoriesList?.find(c => (c.name || '').toLowerCase() === (product?.category || '').toLowerCase());
  const categorySwahiliName = catMeta?.swahiliName || product.category;

  const { t } = useLanguage();
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'warranty' | 'reviews'>('specs');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Gallery images using actual product data (primary image + all gallery images deduplicated)
  const rawGallery = Array.isArray(product.images)
    ? product.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0)
    : [];
  const galleryImages = product.image
    ? [product.image, ...rawGallery.filter(img => img !== product.image)]
    : (rawGallery.length > 0 ? rawGallery : ['https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=800']);

  // Smart Suggestions: Find 1 bundle item + 3 similar products
  const complementaryBundleItem = allProducts.find(
    (p) => p.id !== product.id && (p.category !== product.category || p.price < product.price)
  ) || allProducts[1];

  const similarProducts = allProducts
    .filter((p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand))
    .slice(0, 4);

  // Fallback similar if not enough category matches
  const fallbackSimilar = similarProducts.length < 3
    ? allProducts.filter((p) => p.id !== product.id).slice(0, 4)
    : similarProducts;

  const bundleSubtotal = product.price + (complementaryBundleItem?.price || 0);
  const bundleDiscountedTotal = Math.round(bundleSubtotal * 0.95); // 5% bundle savings

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const modalBreadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Home',
      href: '/',
      onClick: onClose,
    },
    {
      label: categorySwahiliName,
      href: `/category/${createSEOSlug(product.category)}`,
      onClick: () => {
        window.dispatchEvent(new CustomEvent('nav-action', { detail: `category_${product.category}` }));
        onClose();
      },
    },
    {
      label: product.brand,
      href: `/category/${createSEOSlug(product.category)}?brand=${encodeURIComponent(product.brand)}`,
    },
    {
      label: product.name,
      isCurrent: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border-none my-auto flex flex-col">
        
        {/* Sticky Header Bar */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-20 gap-3">
          <div className="min-w-0 flex-1">
            <Breadcrumb
              items={modalBreadcrumbItems}
              className="py-0 px-0 bg-transparent border-0 shadow-none text-xs"
              compactOnMobile={true}
              injectSchema={false}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Verified Genuine • Serial #{product.sku}</span>
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content Container */}
        <div className="p-4 sm:p-8 space-y-10">

          {/* SECTION 1: MAIN PRODUCT STAGE (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 5 Cols: Image Gallery & Authentication */}
            <div className="lg:col-span-5 space-y-4">
              <div className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-3xl overflow-hidden border-none/80 relative shadow-inner group">
                <img
                  src={galleryImages[activeImageIndex] || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 bg-emerald-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Genuine
                </span>
                {product.stock <= 0 && (
                  <span className="absolute top-4 right-4 bg-rose-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                  </span>
                )}
              </div>

              {/* Thumbnails Array */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 max-w-full">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                      activeImageIndex === idx
                        ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-md scale-105'
                        : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Hardware Serial Verification Card */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-none flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">Official Serial Verification</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Barcode: {product.barcode}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-lg">
                  Traceable
                </span>
              </div>
            </div>

            {/* Right 7 Cols: Product Details & Purchase Actions */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-900">
                    {product.brand} • {product.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleWishlist(product.id)}
                      className={`p-2 rounded-xl border transition-colors ${
                        isWishlisted
                          ? 'border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                      title={isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}
                    >
                      <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                    </button>
                    <button
                      onClick={handleCopyShare}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                      title="Share Link"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3 leading-tight">
                  {product.name}
                </h1>

                {/* Rating & Stock */}
                <div className="flex flex-wrap items-center gap-4 text-xs mb-5 pb-5 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                    <Star className="w-4 h-4 fill-amber-500" />
                    <span className="text-slate-900 dark:text-white font-extrabold">{product.rating}</span>
                    <span className="text-slate-400 font-normal">({product.reviewsCount} verified Tanzanian buyers)</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  {product.stock <= 0 ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Out of Stock (0 available)
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Package className="w-4 h-4" /> In Stock
                    </span>
                  )}
                </div>

                {/* Price Display Block */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl mb-6 shadow-xl relative overflow-hidden">
                  <div className="relative z-10 space-y-2">
                    {(product.isOnOffer || (product.originalPrice && product.originalPrice > product.price)) && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Zap className="w-3 h-3 fill-slate-950" />
                          {product.offerTitle || 'LIMITED TIME OFFER'}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                            -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <span className="text-xs text-slate-400 block font-medium mb-1">Selling Price</span>
                        <div className="flex items-baseline gap-3">
                          <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-none break-words">
                            {formatTZS(product.price)}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-sm sm:text-base text-slate-400 line-through font-mono">
                              {formatTZS(product.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                      {product.isVatInclusive !== false && vatPercentage > 0 ? (
                        <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-3 py-1 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>VAT Included ({vatPercentage}%) • Tax Invoice Provided</span>
                        </span>
                      ) : (
                        <span className="text-xs bg-slate-500/20 text-slate-300 border border-slate-500/30 font-medium px-3 py-1 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>Official Commercial Invoice Provided</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <ProductDescriptionView description={product.description} />
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Quantity:</span>
                  <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
                      disabled={product.stock <= 0}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white px-2">{product.stock <= 0 ? 0 : selectedQuantity}</span>
                    <button
                      onClick={() => setSelectedQuantity((q) => Math.min(Math.max(0, product.stock), q + 1))}
                      disabled={product.stock <= 0 || selectedQuantity >= product.stock}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total: {formatTZS(product.price * (product.stock <= 0 ? 0 : selectedQuantity))}</span>
                </div>

                {/* Quick Trust Badges Grid */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-6">
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                    <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 block text-[11px]">Express Shipping</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">2-4 Hrs Dar es Salaam</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 block text-[11px]">Official Warranty</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{product.warranty}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                    <RefreshCw className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 block text-[11px]">7-Day Returns</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">100% Refund Policy</span>
                  </div>
                </div>

                {/* Primary CTA Buttons */}
                <div className="space-y-2.5">
                  {product.stock <= 0 ? (
                    <button
                      onClick={() => {
                        const msg = `Hello, I'm inquiring about the out-of-stock product: ${product.name} (SKU: ${product.sku || product.barcode || 'N/A'}). When will it be available?`;
                        window.open(`https://wa.me/255768929203?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="w-full font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{t('shop.contactSellerForEnquiry') || 'Contact Seller for Enquiry'}</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          addToCart(product, selectedQuantity);
                        }}
                        className="font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm bg-slate-900 hover:bg-slate-800 text-white active:scale-95"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>{`Add ${selectedQuantity} to Cart`}</span>
                      </button>
                      <button
                        onClick={() => {
                          onBuyNow(product, selectedQuantity);
                        }}
                        className="font-extrabold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 active:scale-95"
                      >
                        <span>Instant Buy Now</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <a
                    href={`https://wa.me/255768929203?text=${encodeURIComponent(
                      `Hi Genuine Electronics! I want to order ${product.name} (Qty: ${selectedQuantity}, SKU: ${product.sku}) priced at ${formatTZS(product.price * selectedQuantity)}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Order Directly via WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: SPECIFICATIONS & WARRANTY TABS */}
          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800">
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('specs')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'specs' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Technical Specifications
              </button>
              <button
                onClick={() => setActiveTab('warranty')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'warranty' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Genuine Warranty & Guarantee
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'reviews' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Customer Reviews ({product.reviewsCount})
              </button>
            </div>

            {activeTab === 'specs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(product.specs).map(([key, val]) => (
                  <div key={key} className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/50 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{key}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-right ml-4">{val}</span>
                  </div>
                ))}
                {product.capacity && (
                  <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/50 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Capacity / Volume</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-right">{product.capacity}</span>
                  </div>
                )}
                {product.energyRating && (
                  <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/50 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Energy Efficiency Rating</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-right">{product.energyRating}</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'warranty' && (
              <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Official Manufacturer Backed Guarantee</h4>
                    <p className="text-slate-700 dark:text-slate-300">Every single unit sold by Genuine Electronics is sourced directly from authorized manufacturers or licensed country distributors. Your receipt includes official serial number registration valid for direct authorized service across Tanzania.</p>
                  </div>
                </div>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-700 dark:text-slate-200 font-medium">
                  <li>Coverage: {product.warranty}</li>
                  <li>Serial Traceability: Verified upon dispatch via invoice # tracking</li>
                  <li>Free replacement within 7 days for any factory hardware defect</li>
                </ul>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{product.rating}</div>
                  <div>
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-500" />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Based on {product.reviewsCount} verified purchase reviews in Tanzania</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 dark:text-white">Juma M. (Dar es Salaam)</span>
                      <span className="text-slate-400 text-[10px]">2 days ago</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">"Ordered in the morning and received it before afternoon in Masaki. Verified the serial code online immediately and it came sealed in original packaging."</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 dark:text-white">Amina K. (Arusha)</span>
                      <span className="text-slate-400 text-[10px]">1 week ago</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">"Excellent build quality and 100% genuine hardware. The VoltBot AI assistant helped me check power compatibility beforehand!"</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: SMART BUNDLE & FREQUENTLY BOUGHT TOGETHER */}
          {complementaryBundleItem && (
            <div className="bg-blue-50/70 dark:bg-slate-900/90 border border-blue-200/80 dark:border-slate-800 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                  Smart Suggestions: Frequently Bought Together
                </h3>
                <span className="text-xs bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold px-3 py-1 rounded-full">
                  Save 5% on Bundle
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Main Product Mini Card */}
                <div className="md:col-span-5 bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-xl border border-slate-100 dark:border-slate-700" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Selected Hardware</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{product.name}</h5>
                    <p className="text-xs font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{formatTZS(product.price)}</p>
                  </div>
                </div>

                <div className="md:col-span-1 text-center font-extrabold text-slate-400 text-xl">+</div>

                {/* Bundle Item Card */}
                <div className="md:col-span-5 bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <img src={complementaryBundleItem.image} alt={complementaryBundleItem.name} className="w-16 h-16 object-cover rounded-xl border border-slate-100 dark:border-slate-700" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Recommended Add-on</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{complementaryBundleItem.name}</h5>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">{formatTZS(complementaryBundleItem.price)}</p>
                  </div>
                </div>

                {/* Bundle Checkout Button */}
                <div className="md:col-span-12 flex flex-wrap items-center justify-between pt-3 border-t border-blue-200/60 dark:border-slate-800 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Bundle Price (2 items): </span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white ml-1">{formatTZS(bundleDiscountedTotal)}</span>
                    <span className="text-xs text-slate-400 line-through ml-2">{formatTZS(bundleSubtotal)}</span>
                  </div>

                  <button
                    onClick={() => {
                      addToCart(product, 1);
                      addToCart(complementaryBundleItem, 1);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-md shadow-emerald-600/20 text-xs flex items-center gap-2 transition-all active:scale-95"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add 2-Item Bundle to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: RECOMMENDED SIMILAR HARDWARE */}
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Similar & Recommended Genuine Products
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {fallbackSimilar.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectProduct(item)}
                  className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:border-blue-400 rounded-2xl p-4 transition-all hover:shadow-lg cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden mb-3 relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{item.brand}</span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 mt-0.5 mb-2 group-hover:text-blue-600 transition-colors">
                      {item.name}
                    </h4>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white break-words">{formatTZS(item.price)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item, 1);
                      }}
                      className="bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 p-2 rounded-xl transition-all"
                      title="Add to Cart"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
