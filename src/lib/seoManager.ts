import { StoreSettings, BRAND_LOGO_URL, Product, CategoryItem } from '../types';

export interface SEOContext {
  products?: Product[];
  currentProduct?: Product | null;
  currentCategory?: string;
  searchQuery?: string;
  categoriesList?: CategoryItem[];
}

/**
 * Common search intents in Tanzania & East Africa (Swahili + English).
 * Automatically matched to products and categories for optimal Google Search rankings.
 */
const CATEGORY_SEARCH_INTENTS: Record<string, { swahili: string; keywords: string; desc: string }> = {
  'Televisions': {
    swahili: 'Bei ya TV & Smart Televisions',
    keywords: 'bei ya tv tanzania, smart tv bei nafuu dar es salaam, bei ya tv kariakoo, 4k smart tv tanzania, samsung tv tanzania, lg oled tv dar, tcl smart tv bei, hisense tv tanzania',
    desc: 'Tazama bei ya TV Tanzania. Nunua Smart TV, 4K UHD, OLED & QLED TV halisi kutoka Samsung, LG, Sony & TCL. Waranti rasmi miaka 2, risiti halali za kodi na delivery ya bure Dar es Salaam.',
  },
  'Smartphones': {
    swahili: 'Bei ya Simu & Smartphones',
    keywords: 'bei ya simu tanzania, bei ya simu za samsung dar es salaam, bei ya iphone dar es salaam, nunua simu kariakoo, original smartphones tanzania, simu zenye warranty dar, redmi bei tanzania',
    desc: 'Pata bei ya simu za kisasa Tanzania. Simu halisi za Samsung Galaxy, Apple iPhone, Xiaomi & Google Pixel zenye waranti ya mtengenezaji na delivery ya siku moja Dar es Salaam.',
  },
  'Laptops & Computers': {
    swahili: 'Bei ya Laptop & Kompyuta',
    keywords: 'bei ya laptop tanzania, nunua laptop dar es salaam, hp laptop tanzania, dell laptops kariakoo, macbook dar es salaam, laptop za ofisi na gaming tanzania, computer accessories dar',
    desc: 'Angalia bei ya Laptop na kompyuta mpakato Tanzania. Nunua HP, Dell, Lenovo, Apple MacBook kwa bei nafuu na waranti kamili ya kiwandani Kariakoo na Dar es Salaam.',
  },
  'Audio & Sound': {
    swahili: 'Bei ya Sound Systems & Headphones',
    keywords: 'soundbar bei tanzania, jbl bluetooth speaker dar es salaam, sony home theatre tanzania, wireless earbuds dar, bei ya spika kariakoo, subwoofers tanzania',
    desc: 'Nunua Soundbars, Home Theatre, JBL Speakers na Headphones halisi Tanzania. Sauti safi ya kioo, bass nzito na waranti ya mwaka mmoja.',
  },
  'Home Appliances': {
    swahili: 'Bei ya Vifaa vya Nyumbani & Majiko',
    keywords: 'bei ya friji tanzania, bei ya washing machine dar es salaam, majiko ya gesi na umeme tanzania, microwave oven kariakoo, blender bei dar es salaam, water dispenser tanzania',
    desc: 'Vifaa vya nyumbani na jikoni bei nzuri Tanzania. Majokofu, washing machines, majiko ya gesi/umeme na microwave zenye ufanisi wa umeme na waranti rasmi.',
  },
  'Smart Watches': {
    swahili: 'Bei ya Smartwatch & Saa za Kisasa',
    keywords: 'smartwatch tanzania, apple watch dar es salaam, samsung galaxy watch bei, fitness tracker dar es salaam, saa za kisasa kariakoo',
    desc: 'Saa za kisasa za Apple, Samsung, Garmin na Huawei Tanzania zenye kupima mapigo ya moyo na mazoezi kwa bei nafuu.',
  },
};

/**
 * Creates clean URL slug for SEO routes.
 */
export function createSEOSlug(text: string): string {
  return encodeURIComponent(
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

/**
 * Generates automated high-ranking SEO metadata for an individual product.
 */
export function generateAutoProductSEO(product: Product, settings?: Partial<StoreSettings>, origin = 'https://genuine-electronics.com') {
  const storeName = settings?.storeName || 'Genuine Electronics';
  const slug = createSEOSlug(product.name);
  const canonicalUrl = `${origin}/product/${product.id}/${slug}`;
  const priceFormatted = `TZS ${product.price.toLocaleString()}`;

  // Tanzanian Search Query Title (e.g. "Bei ya Samsung 55 Inch TV Tanzania | Genuine Electronics Dar es Salaam")
  const title = `Bei ya ${product.name} Tanzania (${product.brand}) - ${priceFormatted} | ${storeName} Dar es Salaam`;

  // Rich Meta Description optimized for Google SERP CTR
  const warrantyText = product.warranty || '2 Years Official Warranty';
  const description = `Nunua ${product.name} kwa ${priceFormatted} Tanzania. 100% Genuine, ${warrantyText}, na Free Same-Day Delivery Dar es Salaam & Mikoani kote.`;

  // Localized Tanzanian & Global Search Keywords
  const baseName = String(product.name || "").toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const keywords = [
    `bei ya ${baseName} tanzania`,
    `bei ya ${baseName} dar es salaam`,
    `nunua ${baseName} kariakoo`,
    `${brand} tanzania`,
    `bei ya ${category} tanzania`,
    `genuine ${category} dar es salaam`,
    `${product.sku ? String(product.sku || "").toLowerCase() : ''}`,
    'official warranty electronics tanzania',
    'm-pesa online shopping tanzania',
    'genuine electronics tanzania'
  ].filter(Boolean).join(', ');

  return {
    title,
    description,
    keywords,
    canonicalUrl,
    image: product.image,
    priceFormatted,
    slug,
  };
}

/**
 * Metadata Generator helper function that automatically builds Open Graph and Twitter meta tags
 * based on the current product object's data, ensuring social media sharing shows the specific
 * product image, title, and description dynamically when a product is viewed or shared.
 */
export function generateProductSocialMetadata(
  product: Product,
  settings?: Partial<StoreSettings>,
  origin = 'https://genuine-electronics.com'
) {
  const storeName = settings?.storeName || 'Genuine Electronics Trust';
  const slug = createSEOSlug(product.name);
  const canonicalUrl = `${origin}/product/${product.id}/${slug}`;
  const priceFormatted = `TZS ${product.price.toLocaleString()}`;
  const warrantyText = product.warranty || '2 Years Official Warranty';

  const title = `${product.name} | ${product.brand} - ${priceFormatted} | ${storeName}`;
  const description = `Nunua ${product.name} kwa ${priceFormatted} Tanzania. 100% Genuine, ${warrantyText}, Free Same-Day Delivery Dar es Salaam & Mikoani.`;
  const image = product.image || settings?.ogImage || BRAND_LOGO_URL;

  return {
    title,
    description,
    canonicalUrl,
    image,
    openGraph: {
      'og:type': 'product',
      'og:site_name': storeName,
      'og:title': title,
      'og:description': description,
      'og:url': canonicalUrl,
      'og:image': image,
      'og:image:width': '800',
      'og:image:height': '800',
      'og:image:alt': product.name,
      'og:locale': 'en_TZ',
    },
    twitter: {
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': image,
    }
  };
}

/**
 * Generates automated high-ranking SEO metadata for a Category.
 */
export function generateAutoCategorySEO(categoryName: string, products: Product[] = [], settings?: Partial<StoreSettings>, origin = 'https://genuine-electronics.com') {
  const storeName = settings?.storeName || 'Genuine Electronics';
  const slug = createSEOSlug(categoryName);
  const canonicalUrl = `${origin}/category/${slug}`;

  const intent = CATEGORY_SEARCH_INTENTS[categoryName] || {
    swahili: `Bei ya ${categoryName}`,
    keywords: `bei ya ${String(categoryName || "").toLowerCase()} tanzania, nunua ${String(categoryName || "").toLowerCase()} dar es salaam, ${String(categoryName || "").toLowerCase()} kariakoo`,
    desc: `Nunua bidhaa bora za ${categoryName} Tanzania zenye ubora halisi 100%, waranti rasmi na delivery ya haraka Dar es Salaam na mikoani.`,
  };

  const matchingProducts = products.filter(p => (p.category || '').toLowerCase() === (categoryName || '').toLowerCase());
  const minPrice = matchingProducts.length > 0 ? Math.min(...matchingProducts.map(p => p.price)) : 0;
  const priceSnippet = minPrice > 0 ? ` kuanzia TZS ${minPrice.toLocaleString()}` : '';

  const title = `${intent.swahili} Tanzania${priceSnippet} | ${storeName} Dar es Salaam`;
  const description = `${intent.desc} Bidhaa ${matchingProducts.length > 0 ? `${matchingProducts.length}+` : ''} zilizopo dukani Kariakoo & online.`;

  return {
    title,
    description,
    keywords: `${intent.keywords}, genuine electronics tanzania, duka la vifaa kariakoo`,
    canonicalUrl,
    slug,
  };
}

/**
 * Updates dynamic site-wide SEO metadata, Open Graph tags, canonical links, 
 * search engine indexing directives, and Schema.org JSON-LD structured data.
 */
export function applyDynamicSEOMetadata(
  settings: Partial<StoreSettings>,
  currentView: 'client' | 'admin' = 'client',
  context?: SEOContext
): void {
  if (typeof document === 'undefined') return;

  const storeName = settings.storeName || 'Genuine Electronics';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://genuine-electronics.com';
  const autoSeo = settings.autoSeoEnabled !== false; // Default: true for full automation

  let computedTitle = '';
  let computedDescription = '';
  let computedKeywords = '';
  let canonicalHref = '';
  let ogImage = settings.ogImage || settings.logoUrl || BRAND_LOGO_URL;

  // 1. Determine Context: Admin vs Single Product vs Category vs Search vs Home
  if (currentView === 'admin') {
    computedTitle = `Admin Management Portal | ${storeName}`;
    computedDescription = `Management console for ${storeName} inventory, POS registers, staff and orders.`;
    computedKeywords = 'admin portal, pos management, store settings';
    canonicalHref = `${currentOrigin}/admin`;
  } else if (context?.currentProduct && autoSeo) {
    // SINGLE PRODUCT VIEW - Metadata Generator for Social Sharing & SEO
    const socialMeta = generateProductSocialMetadata(context.currentProduct, settings, currentOrigin);
    computedTitle = socialMeta.title;
    computedDescription = socialMeta.description;
    computedKeywords = generateAutoProductSEO(context.currentProduct, settings, currentOrigin).keywords;
    canonicalHref = socialMeta.canonicalUrl;
    ogImage = socialMeta.image;
  } else if (context?.searchQuery && context.searchQuery.trim().length > 1 && autoSeo) {
    // SEARCH RESULTS VIEW - Auto SEO Dynamic Optimization (e.g. "bei ya TV tanzania")
    const q = context.searchQuery.trim();
    computedTitle = `Bei ya "${q}" Tanzania | Matokeo ya Vifaa Halisi Dar es Salaam - ${storeName}`;
    computedDescription = `Matokeo ya utafutaji wa "${q}" katika duka la ${storeName} Tanzania. Vifaa vyote ni 100% Genuine vyenye official warranty na express delivery.`;
    computedKeywords = `bei ya ${String(q || "").toLowerCase()} tanzania, nunua ${String(q || "").toLowerCase()} dar es salaam, ${String(q || "").toLowerCase()} kariakoo, genuine electronics`;
    canonicalHref = `${currentOrigin}/?search=${encodeURIComponent(q)}`;
  } else if (context?.currentCategory && context.currentCategory !== 'All' && autoSeo) {
    // CATEGORY VIEW - Auto SEO Dynamic Optimization
    const catSEO = generateAutoCategorySEO(context.currentCategory, context.products || [], settings, currentOrigin);
    computedTitle = catSEO.title;
    computedDescription = catSEO.description;
    computedKeywords = catSEO.keywords;
    canonicalHref = catSEO.canonicalUrl;
  } else {
    // HOMEPAGE / DEFAULT STORE VIEW
    computedTitle = settings.seoTitle && !autoSeo
      ? settings.seoTitle
      : `${storeName} Tanzania | Bei Nafuu za Vifaa Halisi vya Umeme, Smart TV, Simu & Laptops Dar es Salaam`;

    computedDescription = settings.seoDescription && !autoSeo
      ? settings.seoDescription
      : `Duka kuu la vifaa halisi vya umeme Tanzania. Nunua Smart TV, Simu, Laptops, Majiko na Audio kwa bei nafuu. 100% Original, Waranti rasmi, na Express Delivery Dar es Salaam & Mikoani.`;

    computedKeywords = settings.seoKeywords && !autoSeo
      ? settings.seoKeywords
      : 'genuine electronics tanzania, bei ya tv tanzania, bei ya simu dar es salaam, smart tv bei nafuu kariakoo, nunua laptop tanzania, vifaa vya nyumbani dar es salaam, duka la vifaa kariakoo, official warranty electronics, M-Pesa online shopping';

    canonicalHref = settings.canonicalUrl && settings.canonicalUrl.trim() !== ''
      ? settings.canonicalUrl.trim()
      : `${currentOrigin}/`;
  }

  // 2. Set Document Title
  document.title = computedTitle;

  // 3. Set Meta Description
  updateMetaTag('name', 'description', computedDescription);

  // 4. Set Canonical Link
  updateLinkTag('canonical', canonicalHref);

  // 5. Set Meta Keywords
  updateMetaTag('name', 'keywords', computedKeywords);

  // 6. Robots Directives
  const robotsIndex = settings.robotsIndex !== false;
  const robotsFollow = settings.robotsFollow !== false;
  const robotsValue = currentView === 'admin' 
    ? 'noindex, nofollow' 
    : `${robotsIndex ? 'index' : 'noindex'}, ${robotsFollow ? 'follow' : 'nofollow'}, max-snippet:-1, max-image-preview:large, max-video-preview:-1`;
  
  updateMetaTag('name', 'robots', robotsValue);
  updateMetaTag('name', 'googlebot', robotsValue);

  // 7. Open Graph (OG) Tags for WhatsApp, Telegram, Facebook sharing
  updateMetaTag('property', 'og:site_name', storeName);
  updateMetaTag('property', 'og:title', computedTitle);
  updateMetaTag('property', 'og:description', computedDescription);
  updateMetaTag('property', 'og:url', canonicalHref);
  updateMetaTag('property', 'og:type', context?.currentProduct ? 'product' : (settings.ogType || 'website'));
  updateMetaTag('property', 'og:image', ogImage);
  updateMetaTag('property', 'og:image:alt', `${computedTitle}`);
  updateMetaTag('property', 'og:locale', 'en_TZ');

  // 8. Twitter / X Cards
  const twitterCard = settings.twitterCardType || 'summary_large_image';
  updateMetaTag('name', 'twitter:card', twitterCard);
  updateMetaTag('name', 'twitter:title', computedTitle);
  updateMetaTag('name', 'twitter:description', computedDescription);
  updateMetaTag('name', 'twitter:image', ogImage);
  if (settings.twitterHandle) {
    updateMetaTag('name', 'twitter:site', settings.twitterHandle);
    updateMetaTag('name', 'twitter:creator', settings.twitterHandle);
  }

  // 9. Google & Bing Search Console Verification
  if (settings.googleSiteVerification) {
    updateMetaTag('name', 'google-site-verification', settings.googleSiteVerification);
  }
  if (settings.bingSiteVerification) {
    updateMetaTag('name', 'msvalidate.01', settings.bingSiteVerification);
  }

  // 10. Multi-Entity Schema.org JSON-LD Structured Data for Google Rich Snippets
  if (settings.structuredDataEnabled !== false && currentView !== 'admin') {
    injectFullSchemaOrgJSONLD(settings, canonicalHref, computedDescription, ogImage, currentOrigin, context);
  } else {
    removeSchemaOrgJSONLD();
  }
}

function updateMetaTag(keyType: 'name' | 'property', keyValue: string, content: string): void {
  let meta = document.querySelector(`meta[${keyType}="${keyValue}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(keyType, keyValue);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function updateLinkTag(rel: string, href: string): void {
  let link: HTMLLinkElement | null = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

/**
 * Builds rich, multi-tier Schema.org JSON-LD graph with:
 * - ElectronicsStore & LocalBusiness
 * - WebSite & Google Sitelinks SearchBox
 * - ItemList (full active product catalog with live prices in TZS)
 * - Single Product Schema (when on product page)
 * - FAQPage (Swahili & English consumer answers for SERP FAQ expansion)
 * - BreadcrumbList
 */
function injectFullSchemaOrgJSONLD(
  settings: Partial<StoreSettings>, 
  canonicalHref: string, 
  description: string, 
  logoUrl: string,
  origin: string,
  context?: SEOContext
): void {
  let script = document.getElementById('seo-structured-data') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'seo-structured-data';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  const storeName = settings.storeName || 'Genuine Electronics';
  const products = context?.products || [];

  const graph: any[] = [
    // 1. Organization & Local Business Schema
    {
      "@type": "ElectronicsStore",
      "@id": `${origin}/#organization`,
      "name": storeName,
      "url": `${origin}/`,
      "logo": logoUrl,
      "image": logoUrl,
      "description": description,
      "telephone": settings.phone || "+255 768 929 203",
      "email": settings.email || "sales@genuine-electronics.com",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": settings.address || "Kariakoo / Ndanda na Masasi Street",
        "addressLocality": "Dar es Salaam",
        "addressRegion": "Dar es Salaam",
        "postalCode": "11105",
        "addressCountry": "TZ"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "-6.8197",
        "longitude": "39.2783"
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          "opens": "08:00",
          "closes": "20:00"
        }
      ],
      "priceRange": "TZS",
      "currenciesAccepted": "TZS",
      "paymentAccepted": "Cash, Credit Card, Bank Transfer, M-Pesa, Airtel Money, Mixx By Yas, Orbi Pay"
    },

    // 2. WebSite & Google Search Sitelinks SearchBox Action
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      "url": `${origin}/`,
      "name": storeName,
      "description": description,
      "publisher": {
        "@id": `${origin}/#organization`
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${origin}/?search={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    },

    // 3. FAQPage for rich SERP answer cards
    {
      "@type": "FAQPage",
      "@id": `${origin}/#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Vifaa vya Genuine Electronics Trust vina waranti rasmi?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ndio, bidhaa zote za Genuine Electronics Trust Tanzania ni 100% Genuine na zinaambatana na official manufacturer warranty ya hadi miaka 2 pamoja na udhamini rasmi wa ubora."
          }
        },
        {
          "@type": "Question",
          "name": "Muda gani unachukua kufikishiwa bidhaa Dar es Salaam na Mikoani?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Wateja wa Dar es Salaam wanafikishiwa ndani ya saa 2 hadi 4 (Same-Day Delivery). Mikoani kote Tanzania tunasafirisha kwa uaminifu mkubwa kupitia mabasi au courier ya kuaminika ndani ya saa 24."
          }
        },
        {
          "@type": "Question",
          "name": "Njia zipi za malipo zinazokubalika?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Tunapokea malipo kupitia M-Pesa, Mixx By Yas, Airtel Money, Benki (CRDB/NMB), Orbi Pay, na Cash on Delivery kwa wateja waliopo Dar es Salaam."
          }
        }
      ]
    }
  ];

  // 4. If products are available, inject full catalog ItemList for instant Google product indexing
  if (products.length > 0) {
    const itemListElements = products.slice(0, 50).map((prod, index) => {
      const slug = createSEOSlug(prod.name);
      const prodUrl = `${origin}/product/${prod.id}/${slug}`;
      return {
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Product",
          "name": prod.name,
          "image": prod.image,
          "description": prod.description,
          "sku": prod.sku || prod.id,
          "brand": {
            "@type": "Brand",
            "name": prod.brand
          },
          "offers": {
            "@type": "Offer",
            "url": prodUrl,
            "priceCurrency": "TZS",
            "price": prod.price,
            "priceValidUntil": "2028-12-31",
            "itemCondition": "https://schema.org/NewCondition",
            "availability": prod.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": {
              "@type": "Organization",
              "name": storeName
            }
          }
        }
      };
    });

    graph.push({
      "@type": "ItemList",
      "@id": `${origin}/#catalog-itemlist`,
      "name": `${storeName} Active Electronics Catalog Tanzania`,
      "itemListElement": itemListElements
    });
  }

  // 5. If viewing a specific product, inject deep Product schema
  if (context?.currentProduct) {
    const p = context.currentProduct;
    const slug = createSEOSlug(p.name);
    const prodUrl = `${origin}/product/${p.id}/${slug}`;
    const galleryImages = p.images && p.images.length > 0 ? p.images : [p.image];

    graph.push({
      "@type": "Product",
      "@id": `${prodUrl}#product`,
      "name": p.name,
      "image": [p.image, ...galleryImages],
      "description": p.description,
      "sku": p.sku || p.id,
      "mpn": p.barcode || p.sku,
      "brand": {
        "@type": "Brand",
        "name": p.brand
      },
      "category": p.category,
      "offers": {
        "@type": "Offer",
        "url": prodUrl,
        "priceCurrency": "TZS",
        "price": p.price,
        "priceValidUntil": "2028-12-31",
        "itemCondition": "https://schema.org/NewCondition",
        "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": storeName
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": (p.rating || 4.9).toString(),
        "reviewCount": (p.reviewsCount || 15).toString()
      }
    });

    // Add Breadcrumb
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${prodUrl}#breadcrumb`,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": `${origin}/`
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": p.category,
          "item": `${origin}/category/${createSEOSlug(p.category)}`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": p.name,
          "item": prodUrl
        }
      ]
    });
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": graph
  };

  script.textContent = JSON.stringify(structuredData, null, 2);
}

function removeSchemaOrgJSONLD(): void {
  const script = document.getElementById('seo-structured-data');
  if (script) {
    script.remove();
  }
}

/**
 * Generates an automated, fully-compliant XML Sitemap with Google Image extensions.
 */
export function generateXMLSitemap(
  products: Product[] = [], 
  categories: (string | CategoryItem)[] = [], 
  origin = 'https://genuine-electronics.com'
): string {
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  // 1. Homepage
  xml += `  <url>\n`;
  xml += `    <loc>${origin}/</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += `  </url>\n`;

  // 2. Categories
  categories.forEach(cat => {
    const catName = typeof cat === 'string' ? cat : cat.name;
    if (!catName || catName === 'All') return;
    const catSlug = createSEOSlug(catName);
    xml += `  <url>\n`;
    xml += `    <loc>${origin}/category/${catSlug}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  });

  // 3. Products with Google Image extensions
  products.forEach(p => {
    const slug = createSEOSlug(p.name);
    const prodUrl = `${origin}/product/${p.id}/${slug}`;
    const images = p.images && p.images.length > 0 ? p.images : [p.image];

    xml += `  <url>\n`;
    xml += `    <loc>${prodUrl}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;

    images.filter(Boolean).forEach(img => {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${img.replace(/&/g, '&amp;')}</image:loc>\n`;
      xml += `      <image:title>${p.name.replace(/&/g, '&amp;')} Tanzania</image:title>\n`;
      xml += `      <image:caption>Bei ya ${p.name.replace(/&/g, '&amp;')} Dar es Salaam - Genuine Electronics</image:caption>\n`;
      xml += `    </image:image>\n`;
    });

    xml += `  </url>\n`;
  });

  xml += `</urlset>`;
  return xml;
}

/**
 * Generates an automated Google Merchant Center / Shopping RSS 2.0 Feed.
 */
export function generateGoogleMerchantFeed(
  products: Product[] = [], 
  settings?: Partial<StoreSettings>, 
  origin = 'https://genuine-electronics.com'
): string {
  const storeName = settings?.storeName || 'Genuine Electronics';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n`;
  xml += `  <channel>\n`;
  xml += `    <title>${storeName} Product Feed - Tanzania</title>\n`;
  xml += `    <link>${origin}</link>\n`;
  xml += `    <description>Authorized Consumer & Enterprise Electronics in Tanzania</description>\n`;

  products.forEach(p => {
    const slug = createSEOSlug(p.name);
    const prodUrl = `${origin}/product/${p.id}/${slug}`;

    xml += `    <item>\n`;
    xml += `      <g:id>${p.id}</g:id>\n`;
    xml += `      <g:title><![CDATA[${p.name} - Official ${p.brand} Tanzania]]></g:title>\n`;
    xml += `      <g:description><![CDATA[${p.description} - Bei ya TZS ${p.price.toLocaleString()} Dar es Salaam.]]></g:description>\n`;
    xml += `      <g:link>${prodUrl}</g:link>\n`;
    xml += `      <g:image_link>${p.image}</g:image_link>\n`;
    xml += `      <g:condition>new</g:condition>\n`;
    xml += `      <g:availability>${p.stock > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>\n`;
    xml += `      <g:price>${p.price} TZS</g:price>\n`;
    xml += `      <g:brand><![CDATA[${p.brand}]]></g:brand>\n`;
    xml += `      <g:mpn>${p.barcode || p.sku || p.id}</g:mpn>\n`;
    xml += `      <g:shipping>\n`;
    xml += `        <g:country>TZ</g:country>\n`;
    xml += `        <g:service>Standard Express</g:service>\n`;
    xml += `        <g:price>0 TZS</g:price>\n`;
    xml += `      </g:shipping>\n`;
    xml += `    </item>\n`;
  });

  xml += `  </channel>\n`;
  xml += `</rss>`;
  return xml;
}
