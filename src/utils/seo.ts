import { 
  applyDynamicSEOMetadata, 
  generateProductSocialMetadata, 
  generateAutoProductSEO, 
  generateAutoCategorySEO, 
  generateXMLSitemap, 
  generateGoogleMerchantFeed, 
  createSEOSlug,
  SEOContext 
} from '../lib/seoManager';
import { Product, StoreSettings } from '../types';

/**
 * Legacy & Shortcut helper to update meta tags for a given product or page item.
 * Delegates to the centralized SEO manager (applyDynamicSEOMetadata).
 */
export const updateMetaTags = (
  product: { name: string; description: string; image: string; brand?: string; category?: string; price?: number },
  settings?: StoreSettings
) => {
  const fullProduct: Product = {
    id: 'product-seo-view',
    name: product.name,
    description: product.description,
    image: product.image,
    price: product.price || 0,
    category: product.category || 'Electronics',
    brand: product.brand || 'Genuine',
    stock: 1,
    rating: 4.9
  };

  applyDynamicSEOMetadata(
    settings || { storeName: 'Genuine Electronics' },
    'client',
    { currentProduct: fullProduct }
  );
};

export {
  applyDynamicSEOMetadata,
  generateProductSocialMetadata,
  generateAutoProductSEO,
  generateAutoCategorySEO,
  generateXMLSitemap,
  generateGoogleMerchantFeed,
  createSEOSlug,
  type SEOContext
};

