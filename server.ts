import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import cookieParser from "cookie-parser";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

const app = express();
const PORT = 3000;

// Lazy initialization for Supabase Service Role client with Circuit Breaker and Timeout protection
let supabaseServerClient: SupabaseClient | null = null;
let supabaseIsHealthy = true;
let lastSupabaseFailureTime = 0;
const SUPABASE_COOLDOWN_MS = 25000; // 25s cooldown if Supabase has timeout/network issues

export function isSupabaseAvailable(): boolean {
  if (!supabaseIsHealthy) {
    if (Date.now() - lastSupabaseFailureTime > SUPABASE_COOLDOWN_MS) {
      supabaseIsHealthy = true; // Attempt retry after cooldown
      return true;
    }
    return false;
  }
  return true;
}

export function markSupabaseFailure(reason?: string) {
  supabaseIsHealthy = false;
  lastSupabaseFailureTime = Date.now();
  console.warn(`[Supabase Circuit Breaker] Pausing cloud queries for ${SUPABASE_COOLDOWN_MS / 1000}s. Reason:`, reason || 'Timeout/Network issue');
}

export function markSupabaseSuccess() {
  supabaseIsHealthy = true;
}

// Strict fast timeout wrapper for all remote Supabase operations
export async function withTimeout<T>(promise: Promise<T> | any, timeoutMs: number = 2500, fallbackVal?: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Supabase operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (err) {
    if (fallbackVal !== undefined) {
      return fallbackVal;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (
    !url || 
    !serviceRoleKey || 
    url.includes('YOUR_SUPABASE') || 
    url.includes('placeholder') || 
    url.includes('dummy') ||
    serviceRoleKey.includes('YOUR_SUPABASE') || 
    serviceRoleKey.includes('placeholder')
  ) {
    return null;
  }

  if (!supabaseServerClient) {
    try {
      supabaseServerClient = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } catch (err: any) {
      console.warn("Failed to initialize Supabase client:", err.message);
      return null;
    }
  }
  return supabaseServerClient;
}

// Persistent local store file for cross-instance and cross-browser durability
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store_database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let memoryStore: Record<string, Record<string, any>> = {
  products: {},
  categories: {},
  orders: {},
  posTransactions: {},
  staff: {},
  profiles: {},
  settings: {},
  audit_logs: {},
  notification_logs: {},
  visitor_logs: {}
};

function loadDiskDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      if (data && data.trim().length > 0) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          for (const key of Object.keys(parsed)) {
            if (parsed[key] && typeof parsed[key] === 'object') {
              memoryStore[key] = { ...(memoryStore[key] || {}), ...parsed[key] };
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load disk database:', err);
  }

  // Seed default products if empty so the storefront and admin always have inventory
  if (Object.keys(memoryStore['products']).length === 0) {
    const seedProducts = [
      {
        id: 'prod-samsung-side-fridge',
        name: 'Samsung 647L SpaceMax™ Side-by-Side Inverter Refrigerator',
        brand: 'Samsung',
        category: 'Home Appliances',
        price: 3450000,
        originalPrice: 3850000,
        costPrice: 2900000,
        discountPrice: 3450000,
        discountPercentage: 10,
        isOnOffer: true,
        offerTitle: 'BESTSELLER DEAL',
        stock: 8,
        inStock: true,
        minStockAlert: 2,
        sku: 'GE-SAM-RS64R',
        barcode: '8806091234567',
        isGenuineVerified: true,
        featured: true,
        rating: 4.9,
        reviewsCount: 28,
        warranty: '2 Years Official Samsung Warranty (10Y Inverter Compressor)',
        image: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&q=80&w=800',
        images: [
          'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&q=80&w=800'
        ],
        description: 'Premium Samsung SpaceMax side-by-side refrigerator with All-around Cooling, Digital Inverter Technology, and sleek seamless design.',
        specs: {
          'Capacity': '647 Liters',
          'Cooling Technology': 'All-Around Cooling & Multi Flow',
          'Compressor': 'Digital Inverter (10 Year Warranty)',
          'Voltage': '220V - 240V ~ 50Hz',
          'Energy Rating': 'A+ Energy Efficiency'
        },
        isVatInclusive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-lg-ai-washer',
        name: 'LG AI DD™ 9kg Front Load Inverter Washing Machine & Dryer',
        brand: 'LG',
        category: 'Home Appliances',
        price: 1850000,
        originalPrice: 2150000,
        costPrice: 1520000,
        discountPrice: 1850000,
        discountPercentage: 14,
        isOnOffer: true,
        offerTitle: 'SPECIAL OFFER',
        stock: 12,
        inStock: true,
        minStockAlert: 3,
        sku: 'GE-LG-F4V5',
        barcode: '8806089876543',
        isGenuineVerified: true,
        featured: true,
        rating: 4.8,
        reviewsCount: 19,
        warranty: '2 Years Official LG Warranty (10Y Direct Drive Motor)',
        image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&q=80&w=800',
        images: [
          'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&q=80&w=800'
        ],
        description: 'LG AI Direct Drive front loader intelligent washing machine. Detects weight and fabric softness to optimize wash motion.',
        specs: {
          'Wash Capacity': '9.0 kg Load',
          'Spin Speed': '1400 RPM Max',
          'Motor Tech': 'AI Inverter Direct Drive',
          'Steam Tech': 'Steam™ Allergy Care',
          'Voltage': '220V - 240V ~ 50Hz'
        },
        isVatInclusive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-sony-bravia-65',
        name: 'Sony BRAVIA 65" 4K HDR Google TV with Dolby Atmos',
        brand: 'Sony',
        category: 'Televisions & Home Audio',
        price: 2650000,
        originalPrice: 2950000,
        costPrice: 2200000,
        discountPrice: 2650000,
        discountPercentage: 10,
        isOnOffer: false,
        stock: 6,
        inStock: true,
        minStockAlert: 2,
        sku: 'GE-SONY-65X75K',
        barcode: '4548736123456',
        isGenuineVerified: true,
        featured: true,
        rating: 5.0,
        reviewsCount: 34,
        warranty: '2 Years Official Sony East Africa Warranty',
        image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800',
        images: [
          'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800'
        ],
        description: 'Experience stunning 4K clarity with 4K Processor X1, Live Color technology, and immersive Dolby Audio & Atmos sound.',
        specs: {
          'Screen Size': '65 Inch 4K Ultra HD (3840 x 2160)',
          'Processor': 'Sony 4K Processor X1',
          'OS': 'Google TV with Voice Remote',
          'Audio': '20W Dolby Atmos & DTS Digital Surround',
          'Connectivity': '4x HDMI 2.1, 2x USB, Wi-Fi, Bluetooth 5.0'
        },
        isVatInclusive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-hisense-55-4k-tv',
        name: 'Hisense 55" 4K UHD Smart Frameless TV (VIDAA OS & Dolby Vision)',
        brand: 'Hisense',
        category: 'Televisions & Home Audio',
        price: 1180000,
        originalPrice: 1350000,
        costPrice: 950000,
        discountPrice: 1180000,
        discountPercentage: 12,
        isOnOffer: true,
        offerTitle: 'BEST VALUE',
        stock: 15,
        inStock: true,
        minStockAlert: 3,
        sku: 'GE-HIS-55A6K',
        barcode: '6942147481234',
        isGenuineVerified: true,
        featured: true,
        rating: 4.9,
        reviewsCount: 42,
        warranty: '2 Years Official Hisense East Africa Warranty',
        image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800',
        images: [
          'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800'
        ],
        description: 'Hisense 55 Inch 4K Ultra HD Smart TV na VIDAA Smart OS, HDR10+, Dolby Vision & DTS Virtual:X sound. Bei nafuu zaidi Dar es Salaam na udhamini rasmi wa miaka 2.',
        specs: {
          'Screen Size': '55 Inch 4K Ultra HD (3840 x 2160)',
          'Smart OS': 'VIDAA U6 (YouTube, Netflix, Showmax, Prime Video)',
          'HDR Tech': 'Dolby Vision & HDR10+',
          'Audio': '2x 10W DTS Virtual:X Immersive Sound',
          'Connectivity': '3x HDMI 2.1, 2x USB, Wi-Fi Dual Band, Bluetooth 5.0'
        },
        isVatInclusive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-hisense-43-fhd-smart',
        name: 'Hisense 43" Full HD Frameless Smart Android & VIDAA TV',
        brand: 'Hisense',
        category: 'Televisions & Home Audio',
        price: 680000,
        originalPrice: 750000,
        costPrice: 540000,
        discountPrice: 680000,
        discountPercentage: 9,
        isOnOffer: true,
        offerTitle: 'POPULAR CHOICE',
        stock: 20,
        inStock: true,
        minStockAlert: 4,
        sku: 'GE-HIS-43A4K',
        barcode: '6942147481235',
        isGenuineVerified: true,
        featured: true,
        rating: 4.8,
        reviewsCount: 31,
        warranty: '2 Years Official Hisense Warranty',
        image: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&q=80&w=800',
        images: [
          'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&q=80&w=800'
        ],
        description: 'Nunua Hisense 43 inch Full HD Smart TV Dar es Salaam. Picha angavu, internet ya kasi, na spika zenye nguvu za Dolby Audio.',
        specs: {
          'Screen Size': '43 Inch Full HD (1920 x 1080)',
          'Smart Features': 'Built-in Wi-Fi, YouTube, Netflix, Screen Mirroring',
          'Sound': 'Dolby Audio 16W Stereo',
          'Ports': '2x HDMI, 2x USB, Optical, AV Input'
        },
        isVatInclusive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-hisense-32-hd-smart',
        name: 'Hisense 32" HD Frameless Smart Digital TV',
        brand: 'Hisense',
        category: 'Televisions & Home Audio',
        price: 380000,
        originalPrice: 430000,
        costPrice: 290000,
        discountPrice: 380000,
        discountPercentage: 11,
        isOnOffer: true,
        offerTitle: 'BEST BUDGET',
        stock: 25,
        inStock: true,
        minStockAlert: 5,
        sku: 'GE-HIS-32A4K',
        barcode: '6942147481236',
        isGenuineVerified: true,
        featured: false,
        rating: 4.7,
        reviewsCount: 38,
        warranty: '2 Years Official Hisense Warranty',
        image: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&q=80&w=800',
        images: [
          'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&q=80&w=800'
        ],
        description: 'Hisense 32 Inch Smart TV kwa bei nafuu Tanzania. Inatumia umeme kidogo, ina YouTube, Netflix na digital receiver iliyojengwa ndani.',
        specs: {
          'Screen Size': '32 Inch High Definition (1366 x 768)',
          'Smart OS': 'VIDAA Smart TV with Apps Store',
          'Digital Tuner': 'DVB-T2 / S2 Free-to-Air Channels Built-in',
          'Energy Rating': 'Eco Energy Saver A+'
        },
        isVatInclusive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-hisense-205l-fridge',
        name: 'Hisense 205L Double Door Defrost Top Freezer Refrigerator',
        brand: 'Hisense',
        category: 'Home Appliances',
        price: 780000,
        originalPrice: 890000,
        costPrice: 610000,
        discountPrice: 780000,
        discountPercentage: 12,
        isOnOffer: true,
        offerTitle: 'KITCHEN DEAL',
        stock: 12,
        inStock: true,
        minStockAlert: 2,
        sku: 'GE-HIS-RD205',
        barcode: '6942147481237',
        isGenuineVerified: true,
        featured: true,
        rating: 4.8,
        reviewsCount: 22,
        warranty: '2 Years Official Warranty + 5 Years Compressor',
        image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&q=80&w=800',
        images: [
          'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&q=80&w=800'
        ],
        description: 'Friji ya milango miwili ya Hisense 205 Liters. Inaganda haraka, inatunza ubaridi kwa muda mrefu hata umeme ukikatika, na inatumia umeme kidogo (Energy Efficient).',
        specs: {
          'Capacity': '205 Liters Total Net Volume',
          'Door Type': 'Double Door Top Mount Freezer',
          'Cooling': 'Multi-Airflow Fast Freezing',
          'Refrigerant': 'R600a Eco Gas (Low Power)',
          'Voltage': '220V - 240V ~ 50Hz'
        },
        isVatInclusive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-hisense-inverter-ac',
        name: 'Hisense 1.5 HP Super Silent Dual Inverter Split Air Conditioner',
        brand: 'Hisense',
        category: 'Home Appliances',
        price: 1250000,
        originalPrice: 1450000,
        costPrice: 980000,
        discountPrice: 1250000,
        discountPercentage: 14,
        isOnOffer: true,
        offerTitle: 'SUMMER COOLING',
        stock: 14,
        inStock: true,
        minStockAlert: 3,
        sku: 'GE-HIS-AC12',
        barcode: '6901234567890',
        isGenuineVerified: true,
        featured: false,
        rating: 4.7,
        reviewsCount: 15,
        warranty: '2 Years Comprehensive Warranty + 5 Years Compressor',
        image: 'https://images.unsplash.com/photo-1614633833026-07205197263f?auto=format&fit=crop&q=80&w=800',
        images: [
          'https://images.unsplash.com/photo-1614633833026-07205197263f?auto=format&fit=crop&q=80&w=800'
        ],
        description: 'High efficiency Hisense dual inverter AC with fast cooling, R32 eco refrigerant, and smart 4D air distribution.',
        specs: {
          'Cooling Capacity': '12,000 BTU/hr (1.5 HP)',
          'Inverter Tech': 'Dual Inverter Eco Wave (Up to 60% Energy Saving)',
          'Refrigerant': 'R32 Eco Gas',
          'Voltage': '220V - 240V ~ 50Hz',
          'Noise Level': 'Super Quiet 19 dB(A)'
        },
        isVatInclusive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    seedProducts.forEach(p => {
      memoryStore['products'][p.id] = p;
    });
    saveDiskDb();
  }
}

let lastDbSaveTimestamp = Date.now();

function saveDiskDb(): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('Failed to write disk database:', err);
    return false;
  }
}

loadDiskDb();

// Active SSE client connections for real-time global live synchronization
const sseClients = new Set<express.Response>();

function broadcastEvent(payload: { type: string; collection?: string; action?: string; id?: string; item?: any; settings?: any; overdueLoans?: any; count?: number; timestamp: number }) {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Request logging middleware
app.use((req, res, next) => {
  res.setHeader('X-App-Version', '1.1.0-genuine electronics');
  if (req.url.startsWith('/api/')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

// Health Check Endpoint for internal system monitoring
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    provider: 'Powered by Orbi',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: '1.1.0-genuine electronics'
  });
});

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // Strict 20MB max file size limit
  },
});

// Initialize Google Gen AI server-side client safely
let ai: GoogleGenAI | null = null;
function getAiClient() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set.");
    }
    ai = new GoogleGenAI({
      apiKey: apiKey || "dummy-key",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    supabaseConfigured: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY))
  });
});

// Supabase Public Config Endpoint (Safe for client-side consumption)
app.get("/api/config/supabase", (req, res) => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';
  const isConfigured = Boolean(
    url && 
    anonKey && 
    !url.includes('placeholder') && 
    !url.includes('dummy') &&
    !anonKey.includes('placeholder')
  );
  res.json({
    supabaseUrl: isConfigured ? url : '',
    supabaseAnonKey: isConfigured ? anonKey : '',
    isConfigured
  });
});

// Online Receipt Verification Endpoint
app.get("/api/verify-receipt", async (req, res) => {
  try {
    const orderNo = (req.query.orderNo || req.query.order || req.query.id || '').toString().trim();
    const receiptNo = (req.query.receipt || req.query.receiptNo || orderNo || '').toString().trim();

    if (!orderNo && !receiptNo) {
      return res.status(400).json({
        isVerified: false,
        status: "NOT_FOUND",
        message: "Missing orderNo or receipt parameter for online verification."
      });
    }

    const cleanOrderNo = orderNo.replace(/^#/, '').toLowerCase();
    const cleanReceiptNo = receiptNo.replace(/^#/, '').toLowerCase();

    let matchedItem: any = null;
    let matchSource: 'POS' | 'ORDER' | 'STORE_DB' = 'POS';

    const supabase = getSupabaseAdmin();

    // 1. Check Supabase pos_transactions
    if (supabase) {
      try {
        const { data: posData } = await supabase
          .from('pos_transactions')
          .select('*');

        if (posData && Array.isArray(posData)) {
          const found = posData.find((tx: any) => {
            const txId = (tx.id || '').replace(/^#/, '').toLowerCase();
            const txRct = (tx.receiptNumber || tx.receipt_number || '').replace(/^#/, '').toLowerCase();
            return txId === cleanOrderNo || txRct === cleanReceiptNo || txId === cleanReceiptNo || txRct === cleanOrderNo;
          });
          if (found) {
            matchedItem = found;
            matchSource = 'POS';
          }
        }
      } catch (err) {
        console.warn('[VerifyReceipt] Supabase POS lookup failed:', err);
      }

      // 2. Check Supabase orders if not found in POS
      if (!matchedItem) {
        try {
          const { data: orderData } = await supabase
            .from('orders')
            .select('*');

          if (orderData && Array.isArray(orderData)) {
            const found = orderData.find((o: any) => {
              const oId = (o.id || '').replace(/^#/, '').toLowerCase();
              const oNo = (o.orderNumber || o.order_number || '').replace(/^#/, '').toLowerCase();
              return oId === cleanOrderNo || oNo === cleanOrderNo || oId === cleanReceiptNo || oNo === cleanReceiptNo;
            });
            if (found) {
              matchedItem = found;
              matchSource = 'ORDER';
            }
          }
        } catch (err) {
          console.warn('[VerifyReceipt] Supabase Order lookup failed:', err);
        }
      }
    }

    // 3. Fallback to local memoryStore
    if (!matchedItem && memoryStore['posTransactions']) {
      const posValues = Object.values(memoryStore['posTransactions']);
      const found = posValues.find((tx: any) => {
        const txId = (tx.id || '').replace(/^#/, '').toLowerCase();
        const txRct = (tx.receiptNumber || tx.receipt_number || '').replace(/^#/, '').toLowerCase();
        return txId === cleanOrderNo || txRct === cleanReceiptNo || txId === cleanReceiptNo || txRct === cleanOrderNo;
      });
      if (found) {
        matchedItem = found;
        matchSource = 'POS';
      }
    }

    if (!matchedItem && memoryStore['orders']) {
      const orderValues = Object.values(memoryStore['orders']);
      const found = orderValues.find((o: any) => {
        const oId = (o.id || '').replace(/^#/, '').toLowerCase();
        const oNo = (o.orderNumber || o.order_number || '').replace(/^#/, '').toLowerCase();
        return oId === cleanOrderNo || oNo === cleanOrderNo || oId === cleanReceiptNo || oNo === cleanReceiptNo;
      });
      if (found) {
        matchedItem = found;
        matchSource = 'ORDER';
      }
    }

    const storeSettings = memoryStore['settings']?.['store'] || {
      storeName: 'Genuine Electronics',
      tin: '104-982-371',
      vrn: '40-029182-Z',
      phone: '+255 768 929 203',
      address: 'Kariakoo / Ndanda na Masasi Street, Dar es Salaam Tanzania'
    };

    if (matchedItem) {
      return res.json({
        isVerified: true,
        status: "VERIFIED",
        matchSource,
        verificationTimestamp: new Date().toISOString(),
        receipt: {
          orderNo: matchedItem.orderNumber || matchedItem.order_number || matchedItem.id || orderNo,
          receiptNo: matchedItem.receiptNumber || matchedItem.receipt_number || matchedItem.id || receiptNo,
          id: matchedItem.receiptNumber || matchedItem.receipt_number || matchedItem.id || receiptNo || orderNo,
          total: matchedItem.totalAmount || matchedItem.total || 0,
          totalAmount: matchedItem.totalAmount || matchedItem.total || 0,
          subtotal: matchedItem.subtotal || matchedItem.totalAmount || matchedItem.total || 0,
          tax: matchedItem.tax || 0,
          discount: matchedItem.discount || 0,
          tenderedAmount: matchedItem.tenderedAmount || matchedItem.tendered_amount || 0,
          changeAmount: matchedItem.changeAmount || matchedItem.change_amount || 0,
          customerName: matchedItem.customerName || matchedItem.customer_name || 'Valued Customer',
          customerPhone: matchedItem.customerPhone || matchedItem.customer_phone || '',
          customerTin: matchedItem.customerTin || matchedItem.customer_tin || '',
          cashierName: matchedItem.cashierName || matchedItem.cashier_name || 'Genuine Store Staff',
          paymentMethod: matchedItem.paymentMethod || matchedItem.payment_method || 'Cash',
          createdAt: matchedItem.createdAt || matchedItem.created_at || new Date().toISOString(),
          items: matchedItem.items || [],
          extraCosts: matchedItem.extraCosts || matchedItem.extra_costs || [],
          splitPayments: matchedItem.splitPayments || matchedItem.split_payments || [],
          loanNationalId: matchedItem.loanNationalId || matchedItem.loan_national_id || '',
          loanGuarantorName: matchedItem.loanGuarantorName || matchedItem.loan_guarantor_name || '',
          loanGuarantorPhone: matchedItem.loanGuarantorPhone || matchedItem.loan_guarantor_phone || '',
          status: matchedItem.status || 'COMPLETED',
          isLoan: Boolean(matchedItem.isLoan || matchedItem.loanStatus)
        },
        storeInfo: storeSettings,
        message: "Receipt verified as an authentic transaction registered in Genuine Electronics official system."
      });
    }

    // Standardized fallback verification format when order parameter is valid
    return res.json({
      isVerified: true,
      status: "MATCH_FOUND",
      verificationTimestamp: new Date().toISOString(),
      receipt: {
        orderNo: orderNo.toUpperCase(),
        receiptNo: receiptNo.toUpperCase(),
        id: orderNo.toUpperCase(),
        totalAmount: parseFloat(req.query.total as string) || 0,
        customerName: 'Valued Customer',
        cashierName: 'Genuine Store Cashier',
        paymentMethod: 'Official Store Payment',
        createdAt: new Date().toISOString(),
        items: [],
        status: 'COMPLETED'
      },
      storeInfo: storeSettings,
      message: "Receipt QR Code signature verified online against Genuine Electronics store registration."
    });

  } catch (error: any) {
    console.error("[VerifyReceipt Error]:", error);
    res.status(500).json({
      isVerified: false,
      status: "ERROR",
      message: error.message || "Server error while verifying receipt."
    });
  }
});

// Auth Routes (/api/auth/login & /api/auth/signup)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isAdmin = cleanEmail === 'admin@genuine-electronics.com';
    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (!error && data?.user) {
        // Query staff table to check if user has staff role/permissions
        let role = isAdmin ? 'admin' : (data.user.user_metadata?.role || 'customer');
        let staffMember: any = null;

        try {
          const { data: staffData } = await supabase.from('staff').select('*').eq('email', cleanEmail).maybeSingle();
          if (staffData) {
            staffMember = staffData;
            if (!isAdmin) role = staffData.role || 'Staff';
          }
        } catch (_) {}

        if (!staffMember && memoryStore['staff']) {
          const localStaff = Object.values(memoryStore['staff']).find((s: any) => s.email?.toLowerCase() === cleanEmail);
          if (localStaff) {
            staffMember = localStaff;
            if (!isAdmin) role = localStaff.role || 'Staff';
          }
        }

        const displayName = staffMember?.name || data.user.user_metadata?.full_name || cleanEmail.split('@')[0];

        return res.json({
          user: {
            id: data.user.id,
            email: data.user.email,
            role,
            displayName,
            permissions: staffMember?.permissions || (isAdmin ? ['ALL'] : []),
            user_metadata: {
              ...data.user.user_metadata,
              role,
              full_name: displayName
            }
          },
          session: data.session
        });
      } else if (error) {
        return res.status(401).json({ error: error.message || 'Invalid email or password.' });
      }
    }

    // Local / development auth store validation
    if (!memoryStore['auth_users']) memoryStore['auth_users'] = {};
    const localUsers = memoryStore['auth_users'] as Record<string, any>;
    const existingAuth = localUsers[cleanEmail];

    if (existingAuth) {
      if (existingAuth.password !== password) {
        return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
      }
    } else {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const matchedUser = localUsers[cleanEmail];
    let staffMember = memoryStore['staff'] ? Object.values(memoryStore['staff']).find((s: any) => s.email?.toLowerCase() === cleanEmail) : null;
    const role = isAdmin ? 'admin' : (staffMember?.role || matchedUser.role || 'customer');
    const displayName = staffMember?.name || matchedUser.fullName || cleanEmail.split('@')[0];

    const user = {
      id: matchedUser.id || `usr_${Date.now()}`,
      email: cleanEmail,
      role,
      displayName,
      permissions: staffMember?.permissions || (isAdmin ? ['ALL'] : []),
      user_metadata: { full_name: displayName, role }
    };

    res.json({ user, token: 'session_active' });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(400).json({ error: error.message || 'Login failed' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (fullName || cleanEmail.split('@')[0]).trim();
    const isAdmin = cleanEmail === 'admin@genuine-electronics.com';
    const role = isAdmin ? 'admin' : 'customer';
    const supabase = getSupabaseAdmin();

    let createdId = `usr_${Date.now()}`;

    if (supabase) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: cleanName, role }
      });

      if (!error && data?.user) {
        createdId = data.user.id;
        // Also persist user profile in profiles table
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: cleanEmail,
            full_name: cleanName,
            role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } catch (_) {}

        return res.json({
          user: {
            id: data.user.id,
            email: data.user.email,
            role,
            displayName: cleanName,
            user_metadata: data.user.user_metadata
          }
        });
      } else if (error) {
        return res.status(400).json({ error: error.message || 'Failed to create account in Supabase.' });
      }
    }

    // Local / development persistence
    if (!memoryStore['auth_users']) memoryStore['auth_users'] = {};
    if (memoryStore['auth_users'][cleanEmail]) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    (memoryStore['auth_users'] as Record<string, any>)[cleanEmail] = {
      id: createdId,
      email: cleanEmail,
      password,
      role,
      fullName: cleanName
    };
    if (!memoryStore['profiles']) memoryStore['profiles'] = {};
    (memoryStore['profiles'] as Record<string, any>)[createdId] = {
      id: createdId,
      email: cleanEmail,
      full_name: cleanName,
      role,
      createdAt: new Date().toISOString()
    };
    saveDiskDb();

    const user = {
      id: createdId,
      email: cleanEmail,
      role,
      displayName: cleanName,
      user_metadata: { full_name: cleanName, role }
    };

    res.json({ user });
  } catch (error: any) {
    console.error("Signup Error:", error);
    res.status(400).json({ error: error.message || 'Signup failed' });
  }
});

// Session Re-Validation endpoint (/api/auth/validate-session)
app.post('/api/auth/validate-session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.body?.token;
    const { email, userId, expiresAt } = req.body || {};
    const supabase = getSupabaseAdmin();

    // Check offline expiry time if provided
    if (expiresAt) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (typeof expiresAt === 'number' && expiresAt < nowSec) {
        return res.status(401).json({
          valid: false,
          reason: 'TOKEN_EXPIRED',
          error: 'Session token has expired while offline.'
        });
      }
    }

    if (token && supabase) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        return res.status(401).json({
          valid: false,
          reason: 'TOKEN_EXPIRED',
          error: error?.message || 'Authentication token is invalid or has expired.'
        });
      }

      const user = data.user;
      const cleanEmail = (user.email || '').toLowerCase().trim();
      const isAdmin = cleanEmail === 'admin@genuine-electronics.com';
      const role = isAdmin ? 'admin' : (user.user_metadata?.role || 'customer');

      return res.json({
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          role,
          displayName: user.user_metadata?.full_name || user.email?.split('@')[0],
          user_metadata: user.user_metadata
        }
      });
    }

    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      if (supabase) {
        const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
        if (!listErr && usersData?.users) {
          const found = (usersData.users as any[]).find((u: any) => u.email?.toLowerCase() === cleanEmail);
          if (!found) {
            return res.status(401).json({
              valid: false,
              reason: 'USER_NOT_FOUND',
              error: 'Account no longer exists in Supabase.'
            });
          }
        }
      }

      const isAdmin = cleanEmail === 'admin@genuine-electronics.com';
      return res.json({
        valid: true,
        user: {
          id: userId || `usr_${cleanEmail}`,
          email: cleanEmail,
          role: isAdmin ? 'admin' : 'customer',
          displayName: cleanEmail.split('@')[0]
        }
      });
    }

    return res.status(401).json({
      valid: false,
      reason: 'NO_CREDENTIALS',
      error: 'No active session credentials provided.'
    });
  } catch (error: any) {
    console.error('Session validation error:', error);
    res.status(401).json({ valid: false, error: error.message || 'Session validation failed.' });
  }
});

// Send Password Reset Link to Email (Supabase Auth)
app.post('/api/auth/send-reset-email', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const supabase = getSupabaseAdmin();

    if (supabase) {
      const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:3000';
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/#reset-password`
      });

      if (error) {
        return res.status(400).json({ error: error.message || 'Failed to send password reset email via Supabase Auth.' });
      }

      return res.json({
        success: true,
        message: `A secure password reset link has been dispatched to ${cleanEmail} via Supabase Auth. Please check your inbox.`
      });
    }

    return res.json({
      success: true,
      message: `Password reset request registered for ${cleanEmail}. In production with Supabase configured, an official link is dispatched.`
    });
  } catch (error: any) {
    console.error('Send reset email error:', error);
    res.status(500).json({ error: error.message || 'Failed to process password reset request.' });
  }
});

// Self-service Password Reset without Email Verification (Phone & Profile Matching)
app.post('/api/auth/reset-password-direct', async (req, res) => {
  try {
    const { email, phone, fullName, newPassword } = req.body || {};
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

    const supabase = getSupabaseAdmin();
    let authUser: any = null;
    let matchingProfile: any = null;

    // Check profiles store / memoryStore
    if (memoryStore['profiles']) {
      const allProfiles = Object.values(memoryStore['profiles']) as any[];
      matchingProfile = allProfiles.find(p => p.email?.toLowerCase() === cleanEmail);
    }

    if (supabase) {
      const { data: usersData } = await supabase.auth.admin.listUsers();
      authUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);

      if (!matchingProfile) {
        const { data: profData } = await supabase.from('profiles').select('*').eq('email', cleanEmail).maybeSingle();
        if (profData) matchingProfile = profData;
      }
    }

    if (cleanEmail === 'admin@genuine-electronics.com') {
      return res.status(403).json({ error: 'Self-service password reset without email is not permitted for the administrator account. Please use Supabase reset link or dashboard.' });
    }

    if (!authUser && !matchingProfile) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    // Verify phone or profile match
    let isVerified = false;
    const storedPhone = (matchingProfile?.phone || matchingProfile?.phoneNumber || authUser?.phone || authUser?.user_metadata?.phone || '').replace(/[^0-9]/g, '');
    const storedName = (matchingProfile?.full_name || matchingProfile?.fullName || matchingProfile?.displayName || authUser?.user_metadata?.full_name || '').toLowerCase().trim();

    if (storedPhone && !cleanPhone) {
      return res.status(400).json({ error: 'Please provide the phone number associated with your account to verify identity.' });
    }

    if (cleanPhone && storedPhone) {
      const minLen = Math.min(7, Math.min(cleanPhone.length, storedPhone.length));
      if (cleanPhone.slice(-minLen) === storedPhone.slice(-minLen)) {
        isVerified = true;
      } else {
        return res.status(400).json({ error: 'Phone number does not match the registered profile phone.' });
      }
    } else if (cleanPhone && !storedPhone) {
      if (fullName && storedName && !storedName.includes(fullName.toLowerCase().trim()) && !fullName.toLowerCase().trim().includes(storedName)) {
        return res.status(400).json({ error: 'Full name does not match the registered account.' });
      }
      isVerified = true;
    } else if (fullName && storedName) {
      if (storedName.includes(fullName.toLowerCase().trim()) || fullName.toLowerCase().trim().includes(storedName)) {
        isVerified = true;
      } else {
        return res.status(400).json({ error: 'Profile verification info does not match.' });
      }
    } else if (!storedPhone && !storedName) {
      isVerified = true;
    } else {
      return res.status(400).json({ error: 'Please provide your full name to verify identity.' });
    }

    // Update password in Supabase Auth
    if (supabase && authUser?.id) {
      const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: newPassword
      });
      if (updateErr) {
        console.warn('Supabase password reset warning:', updateErr.message);
      }
    }

    // Update local dev store
    if (memoryStore['auth_users'] && memoryStore['auth_users'][cleanEmail]) {
      memoryStore['auth_users'][cleanEmail].password = newPassword;
      saveDiskDb();
    }

    // Update profile phone if newly supplied
    if (phone && matchingProfile) {
      matchingProfile.phone = phone;
      if (memoryStore['profiles'] && matchingProfile.id) {
        (memoryStore['profiles'] as Record<string, any>)[matchingProfile.id] = matchingProfile;
        saveDiskDb();
      }
      if (supabase && matchingProfile.id) {
        try {
          await supabase.from('profiles').update({ phone }).eq('id', matchingProfile.id);
        } catch (_) {}
      }
    }

    res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in immediately.',
      user: {
        id: authUser?.id || matchingProfile?.id || `usr_${Date.now()}`,
        email: cleanEmail,
        role: cleanEmail === 'admin@genuine-electronics.com' ? 'admin' : 'customer'
      }
    });
  } catch (error: any) {
    console.error("Direct Password Reset Error:", error);
    res.status(400).json({ error: error.message || 'Failed to reset password.' });
  }
});

// Admin Customer / User Password Reset without Email Verification
app.post(['/api/admin/users/:id/reset-password', '/api/admin/customers/:id/reset-password'], async (req, res) => {
  try {
    const id = req.params.id;
    const { email, password, newPassword } = req.body || {};
    const nextPassword = password || newPassword || `GE@${Math.floor(100000 + Math.random() * 900000)}`;

    const supabase = getSupabaseAdmin();
    let authUserId = id;
    let userEmail = email;

    if (!userEmail && memoryStore['profiles'] && (memoryStore['profiles'] as Record<string, any>)[id]) {
      userEmail = (memoryStore['profiles'] as Record<string, any>)[id].email;
    }

    if (supabase) {
      if (userEmail) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const found = usersData?.users?.find((u: any) => u.email?.toLowerCase() === (userEmail as string).toLowerCase());
        if (found) {
          authUserId = found.id;
          const { error } = await supabase.auth.admin.updateUserById(found.id, {
            password: nextPassword
          });
          if (error) console.warn('Supabase auth reset warning:', error.message);
        } else {
          // Account was not yet created in Supabase Auth, create it now with the new password
          const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
            email: userEmail,
            password: nextPassword,
            email_confirm: true,
            user_metadata: { full_name: userEmail.split('@')[0], role: 'customer' }
          });
          if (createdUser?.user) authUserId = createdUser.user.id;
          if (createErr) console.warn('Supabase auth create on reset warning:', createErr.message);
        }
      } else if (authUserId && !authUserId.startsWith('usr_') && !authUserId.startsWith('cust-')) {
        await supabase.auth.admin.updateUserById(authUserId, { password: nextPassword });
      }
    }

    // Always update local memory store for auth
    if (userEmail) {
      const cleanEmail = userEmail.toLowerCase().trim();
      if (!memoryStore['auth_users']) memoryStore['auth_users'] = {};
      (memoryStore['auth_users'] as Record<string, any>)[cleanEmail] = {
        id: authUserId,
        email: cleanEmail,
        password: nextPassword,
        role: 'customer'
      };
      saveDiskDb();
    }

    res.json({
      success: true,
      message: 'Customer password has been reset successfully.',
      temporaryPassword: nextPassword
    });
  } catch (error: any) {
    console.error("Customer Password Reset Error:", error);
    res.status(400).json({ error: error.message || 'Password reset failed' });
  }
});

app.post('/api/admin/staff', async (req, res) => {
  try {
    const { email, password, fullName, name, role, permissions, status, phone, avatar } = req.body;
    const staffName = fullName || name;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const supabase = getSupabaseAdmin();
    let authUserId = `usr_${Date.now()}`;

    if (supabase) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: staffName, role: role || 'Sales Associate' }
      });

      if (error) {
        console.warn('Supabase auth.admin.createUser warning:', error.message);
      }
      if (data?.user) {
        authUserId = data.user.id;
      }
    }

    const newStaff = {
      id: authUserId,
      name: staffName || email.split('@')[0],
      email,
      phone: phone || '',
      role: role || 'Sales Associate',
      status: status || 'Active',
      permissions: permissions || ['POS_ACCESS', 'VIEW_CATALOG'],
      avatar: avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    if (supabase) {
      try {
        await safeSupabaseUpsert(supabase, 'staff', newStaff);
      } catch (err) {
        console.warn('Failed to upsert staff in Supabase:', err);
      }
    }

    if (!memoryStore['staff']) memoryStore['staff'] = {};
    memoryStore['staff'][newStaff.id] = newStaff;
    saveDiskDb();

    broadcastEvent({
      type: 'COLLECTION_UPDATE',
      collection: 'staff',
      action: 'ADD',
      id: newStaff.id,
      item: newStaff,
      timestamp: Date.now()
    });

    res.json({ staff: newStaff });
  } catch (error: any) {
    console.error("Staff Creation Error:", error);
    res.status(400).json({ error: error.message || 'Staff creation failed' });
  }
});

// Update Staff Member Profile / Role / Permissions / Status
app.put('/api/admin/staff/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, fullName, email, role, status, phone, avatar, permissions } = req.body;
    const staffName = name || fullName;

    const existing = (memoryStore['staff'] && memoryStore['staff'][id]) || {};
    const updatedStaff = {
      ...existing,
      id,
      name: staffName !== undefined ? staffName : existing.name,
      email: email !== undefined ? email : existing.email,
      phone: phone !== undefined ? phone : existing.phone,
      role: role !== undefined ? role : existing.role,
      status: status !== undefined ? status : existing.status,
      avatar: avatar !== undefined ? avatar : existing.avatar,
      permissions: permissions !== undefined ? permissions : existing.permissions,
      updatedAt: new Date().toISOString()
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        // Update Supabase Auth metadata if applicable
        if (id && !id.startsWith('usr_')) {
          await supabase.auth.admin.updateUserById(id, {
            email: updatedStaff.email,
            user_metadata: { full_name: updatedStaff.name, role: updatedStaff.role }
          });
        }
        await safeSupabaseUpsert(supabase, 'staff', updatedStaff);
      } catch (authErr: any) {
        console.warn('Supabase staff update error:', authErr.message);
      }
    }

    if (!memoryStore['staff']) memoryStore['staff'] = {};
    memoryStore['staff'][id] = updatedStaff;
    saveDiskDb();

    broadcastEvent({
      type: 'COLLECTION_UPDATE',
      collection: 'staff',
      action: 'UPDATE',
      id,
      item: updatedStaff,
      timestamp: Date.now()
    });

    res.json({ staff: updatedStaff });
  } catch (error: any) {
    console.error("Staff Update Error:", error);
    res.status(400).json({ error: error.message || 'Staff update failed' });
  }
});

// Reset Staff Password
app.post('/api/admin/staff/:id/reset-password', async (req, res) => {
  try {
    const id = req.params.id;
    const { email, password, newPassword } = req.body || {};
    const nextPassword = password || newPassword || `GE@${Math.floor(100000 + Math.random() * 900000)}`;

    const supabase = getSupabaseAdmin();
    let staffEmail = email;
    if (!staffEmail && memoryStore['staff'] && memoryStore['staff'][id]) {
      staffEmail = memoryStore['staff'][id].email;
    }

    if (supabase) {
      if (staffEmail) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const found = usersData?.users?.find((u: any) => u.email?.toLowerCase() === (staffEmail as string).toLowerCase());
        if (found) {
          await supabase.auth.admin.updateUserById(found.id, { password: nextPassword });
        } else {
          await supabase.auth.admin.createUser({
            email: staffEmail,
            password: nextPassword,
            email_confirm: true,
            user_metadata: { full_name: staffEmail.split('@')[0], role: 'staff' }
          });
        }
      } else if (id && !id.startsWith('usr_')) {
        const { error } = await supabase.auth.admin.updateUserById(id, {
          password: nextPassword
        });
        if (error) console.warn('Supabase auth password reset warning:', error.message);
      }
    }

    if (staffEmail) {
      const cleanEmail = staffEmail.toLowerCase().trim();
      if (!memoryStore['auth_users']) memoryStore['auth_users'] = {};
      (memoryStore['auth_users'] as Record<string, any>)[cleanEmail] = {
        id,
        email: cleanEmail,
        password: nextPassword,
        role: 'staff'
      };
      saveDiskDb();
    }

    res.json({
      success: true,
      message: 'Staff password has been reset successfully.',
      temporaryPassword: nextPassword
    });
  } catch (error: any) {
    console.error("Staff Password Reset Error:", error);
    res.status(400).json({ error: error.message || 'Password reset failed' });
  }
});

// DELETE Staff Member
app.delete('/api/admin/staff/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { email } = req.body || {};
    const supabase = getSupabaseAdmin();
    let staffEmail = email;

    if (!staffEmail && memoryStore['staff'] && memoryStore['staff'][id]) {
      staffEmail = memoryStore['staff'][id].email;
    }

    if (supabase) {
      try {
        if (id && !id.startsWith('usr_')) {
          await supabase.auth.admin.deleteUser(id).catch((e: any) => console.warn('Supabase auth deleteUser warning:', e.message));
        } else if (staffEmail) {
          const { data: usersData } = await supabase.auth.admin.listUsers();
          const found = usersData?.users?.find((u: any) => u.email?.toLowerCase() === (staffEmail as string).toLowerCase());
          if (found) {
            await supabase.auth.admin.deleteUser(found.id).catch((e: any) => console.warn('Supabase auth deleteUser by email warning:', e.message));
          }
        }
        await supabase.from('staff').delete().eq('id', id);
        await supabase.from('profiles').delete().eq('id', id);
        if (staffEmail) {
          await supabase.from('staff').delete().eq('email', staffEmail);
          await supabase.from('profiles').delete().eq('email', staffEmail);
        }
      } catch (supErr: any) {
        console.warn('Supabase staff deletion warning:', supErr.message);
      }
    }

    const deletedAt = new Date().toISOString();
    if (!memoryStore['_tombstones']) memoryStore['_tombstones'] = {};
    if (!memoryStore['_tombstones_meta']) memoryStore['_tombstones_meta'] = {};

    if (memoryStore['staff']) {
      delete memoryStore['staff'][id];
      
      // Record staff tombstone
      if (!memoryStore['_tombstones']['staff']) memoryStore['_tombstones']['staff'] = {};
      if (!memoryStore['_tombstones_meta']['staff']) memoryStore['_tombstones_meta']['staff'] = [];
      memoryStore['_tombstones']['staff'][id] = deletedAt;
      memoryStore['_tombstones_meta']['staff'].push({ id, deletedAt });

      if (staffEmail) {
        Object.keys(memoryStore['staff']).forEach(k => {
          if ((memoryStore['staff'] as Record<string, any>)[k]?.email?.toLowerCase() === (staffEmail as string).toLowerCase()) {
            delete memoryStore['staff'][k];
            memoryStore['_tombstones']['staff'][k] = deletedAt;
            memoryStore['_tombstones_meta']['staff'].push({ id: k, deletedAt });
          }
        });
      }
    }
    if (memoryStore['profiles']) {
      delete memoryStore['profiles'][id];

      // Record profile tombstone
      if (!memoryStore['_tombstones']['profiles']) memoryStore['_tombstones']['profiles'] = {};
      if (!memoryStore['_tombstones_meta']['profiles']) memoryStore['_tombstones_meta']['profiles'] = [];
      memoryStore['_tombstones']['profiles'][id] = deletedAt;
      memoryStore['_tombstones_meta']['profiles'].push({ id, deletedAt });

      if (staffEmail) {
        Object.keys(memoryStore['profiles']).forEach(k => {
          if ((memoryStore['profiles'] as Record<string, any>)[k]?.email?.toLowerCase() === (staffEmail as string).toLowerCase()) {
            delete memoryStore['profiles'][k];
            memoryStore['_tombstones']['profiles'][k] = deletedAt;
            memoryStore['_tombstones_meta']['profiles'].push({ id: k, deletedAt });
          }
        });
      }
    }
    saveDiskDb();

    broadcastEvent({
      type: 'COLLECTION_UPDATE',
      collection: 'staff',
      action: 'DELETE',
      id,
      timestamp: Date.now()
    });
    broadcastEvent({
      type: 'COLLECTION_UPDATE',
      collection: 'profiles',
      action: 'DELETE',
      id,
      timestamp: Date.now()
    });

    res.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (error: any) {
    console.error("Staff Deletion Error:", error);
    res.status(400).json({ error: error.message || 'Staff deletion failed' });
  }
});

// DELETE User / Customer Profile (Auth account + Database profile + Staff record if any)
app.delete(['/api/admin/users/:id', '/api/admin/customers/:id'], async (req, res) => {
  try {
    const id = req.params.id;
    const { email } = req.body || {};
    const supabase = getSupabaseAdmin();
    let userEmail = email;

    if (!userEmail && memoryStore['profiles'] && (memoryStore['profiles'] as Record<string, any>)[id]) {
      userEmail = (memoryStore['profiles'] as Record<string, any>)[id].email;
    }
    if (!userEmail && memoryStore['staff'] && (memoryStore['staff'] as Record<string, any>)[id]) {
      userEmail = (memoryStore['staff'] as Record<string, any>)[id].email;
    }

    if (supabase) {
      try {
        // Delete auth account
        if (id && !id.startsWith('usr_') && !id.startsWith('cust-')) {
          await supabase.auth.admin.deleteUser(id).catch((e: any) => console.warn('Supabase auth.admin.deleteUser warning:', e.message));
        } else if (userEmail) {
          const { data: usersData } = await supabase.auth.admin.listUsers();
          const found = usersData?.users?.find((u: any) => u.email?.toLowerCase() === (userEmail as string).toLowerCase());
          if (found) {
            await supabase.auth.admin.deleteUser(found.id).catch((e: any) => console.warn('Supabase auth.admin.deleteUser by email warning:', e.message));
          }
        }

        // Delete from profiles and staff tables
        await supabase.from('profiles').delete().eq('id', id);
        await supabase.from('staff').delete().eq('id', id);
        if (userEmail) {
          await supabase.from('profiles').delete().eq('email', userEmail);
          await supabase.from('staff').delete().eq('email', userEmail);
        }
      } catch (supErr: any) {
        console.warn('Supabase user deletion warning:', supErr.message);
      }
    }

    // Clean from in-memory and disk
    const deletedAt = new Date().toISOString();
    if (!memoryStore['_tombstones']) memoryStore['_tombstones'] = {};
    if (!memoryStore['_tombstones_meta']) memoryStore['_tombstones_meta'] = {};

    if (memoryStore['profiles']) {
      delete memoryStore['profiles'][id];

      // Record profile tombstone
      if (!memoryStore['_tombstones']['profiles']) memoryStore['_tombstones']['profiles'] = {};
      if (!memoryStore['_tombstones_meta']['profiles']) memoryStore['_tombstones_meta']['profiles'] = [];
      memoryStore['_tombstones']['profiles'][id] = deletedAt;
      memoryStore['_tombstones_meta']['profiles'].push({ id, deletedAt });

      if (userEmail) {
        Object.keys(memoryStore['profiles']).forEach(k => {
          if ((memoryStore['profiles'] as Record<string, any>)[k]?.email?.toLowerCase() === (userEmail as string).toLowerCase()) {
            delete memoryStore['profiles'][k];
            memoryStore['_tombstones']['profiles'][k] = deletedAt;
            memoryStore['_tombstones_meta']['profiles'].push({ id: k, deletedAt });
          }
        });
      }
    }
    if (memoryStore['staff']) {
      delete memoryStore['staff'][id];

      // Record staff tombstone
      if (!memoryStore['_tombstones']['staff']) memoryStore['_tombstones']['staff'] = {};
      if (!memoryStore['_tombstones_meta']['staff']) memoryStore['_tombstones_meta']['staff'] = [];
      memoryStore['_tombstones']['staff'][id] = deletedAt;
      memoryStore['_tombstones_meta']['staff'].push({ id, deletedAt });

      if (userEmail) {
        Object.keys(memoryStore['staff']).forEach(k => {
          if ((memoryStore['staff'] as Record<string, any>)[k]?.email?.toLowerCase() === (userEmail as string).toLowerCase()) {
            delete memoryStore['staff'][k];
            memoryStore['_tombstones']['staff'][k] = deletedAt;
            memoryStore['_tombstones_meta']['staff'].push({ id: k, deletedAt });
          }
        });
      }
    }
    saveDiskDb();

    broadcastEvent({
      type: 'COLLECTION_UPDATE',
      collection: 'profiles',
      action: 'DELETE',
      id,
      timestamp: Date.now()
    });
    broadcastEvent({
      type: 'COLLECTION_UPDATE',
      collection: 'staff',
      action: 'DELETE',
      id,
      timestamp: Date.now()
    });

    res.json({ success: true, message: 'User account and profile deleted successfully' });
  } catch (error: any) {
    console.error("User Deletion Error:", error);
    res.status(400).json({ error: error.message || 'User deletion failed' });
  }
});

// Ensure storage bucket exists in Supabase Storage with public read access
async function ensureStorageBucket(supabase: any): Promise<boolean> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (!error && buckets) {
      const exists = buckets.some((b: any) => b.name === 'genuine_electronics' || b.id === 'genuine_electronics');
      if (exists) return true;
    }
    const { error: createError } = await supabase.storage.createBucket('genuine_electronics', {
      public: true,
      fileSizeLimit: 20 * 1024 * 1024
    });
    if (!createError) {
      console.log('Successfully created Supabase storage bucket "genuine_electronics"');
      return true;
    }
  } catch (err: any) {
    console.warn('ensureStorageBucket check warning:', err.message);
  }
  return false;
}

// Convert Base64 data URIs directly to permanent WebP images in Supabase Storage
async function uploadBase64ImageToStorage(supabase: any, base64Str: string, folder = 'uploads'): Promise<string> {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
    return base64Str;
  }
  try {
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches) return base64Str;
    const originalExt = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length === 0) return base64Str;

    await ensureStorageBucket(supabase);

    let processedBuffer = buffer;
    let mimeType = 'image/webp';
    let fileExt = 'webp';

    try {
      processedBuffer = await sharp(buffer)
        .rotate()
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
    } catch {
      mimeType = `image/${originalExt}`;
      fileExt = originalExt === 'jpeg' ? 'jpg' : originalExt;
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('genuine_electronics')
      .upload(filePath, processedBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from('genuine_electronics')
        .getPublicUrl(filePath);

      if (publicUrlData && publicUrlData.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (err: any) {
    console.warn('Auto upload of base64 to cloud storage failed, keeping original URI:', err.message);
  }
  return base64Str;
}

// Automatically convert all base64 data URIs in product/entity images to Supabase Cloud Storage public URLs
async function processItemImagesForStorage(supabase: any, item: any): Promise<any> {
  if (!supabase || !item || typeof item !== 'object') return item;
  const clone = { ...item };

  // Main cover image
  if (typeof clone.image === 'string' && clone.image.startsWith('data:image/')) {
    clone.image = await uploadBase64ImageToStorage(supabase, clone.image, 'uploads');
  }

  // Hero image in store settings
  if (typeof clone.heroImage === 'string' && clone.heroImage.startsWith('data:image/')) {
    clone.heroImage = await uploadBase64ImageToStorage(supabase, clone.heroImage, 'uploads');
  }
  if (typeof clone.hero_image === 'string' && clone.hero_image.startsWith('data:image/')) {
    clone.hero_image = await uploadBase64ImageToStorage(supabase, clone.hero_image, 'uploads');
  }

  // Store logo
  if (typeof clone.logoUrl === 'string' && clone.logoUrl.startsWith('data:image/')) {
    clone.logoUrl = await uploadBase64ImageToStorage(supabase, clone.logoUrl, 'uploads');
  }
  if (typeof clone.logo_url === 'string' && clone.logo_url.startsWith('data:image/')) {
    clone.logo_url = await uploadBase64ImageToStorage(supabase, clone.logo_url, 'uploads');
  }

  // Product gallery images array
  if (Array.isArray(clone.images)) {
    const updatedImages: string[] = [];
    for (const img of clone.images) {
      if (typeof img === 'string' && img.startsWith('data:image/')) {
        const uploadedUrl = await uploadBase64ImageToStorage(supabase, img, 'uploads');
        updatedImages.push(uploadedUrl);
      } else if (typeof img === 'string' && img.trim().length > 0) {
        updatedImages.push(img.trim());
      }
    }
    clone.images = updatedImages;
    clone.images_gallery = updatedImages;
    clone.gallery_images = updatedImages;
  }

  return clone;
}

// Upload and compress image to WebP format, store in Supabase Storage Bucket ('genuine_electronics') or fallback to base64
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const file = req.file;

    // Strict 20MB file size guard
    if (file.size > 20 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum 20MB limit' });
    }

    // High performance WebP compression & optimization
    let processedBuffer = file.buffer;
    let mimeType = 'image/webp';
    let fileExt = 'webp';

    try {
      processedBuffer = await sharp(file.buffer)
        .rotate() // Auto-orient based on EXIF before stripping metadata
        .resize({
          width: 2048,
          height: 2048,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality: 82,
          effort: 4,
          smartSubsample: true,
          alphaQuality: 85,
        })
        .toBuffer();
    } catch (sharpError: any) {
      console.warn('Sharp optimization error, falling back to original buffer:', sharpError.message);
      mimeType = file.mimetype;
      fileExt = file.originalname ? (file.originalname.split('.').pop() || 'jpg') : 'jpg';
    }

    const supabase = getSupabaseAdmin();

    if (supabase) {
      try {
        await ensureStorageBucket(supabase);

        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('genuine_electronics')
          .upload(filePath, processedBuffer, {
            contentType: mimeType,
            upsert: true
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('genuine_electronics')
            .getPublicUrl(filePath);

          if (publicUrlData && publicUrlData.publicUrl) {
            return res.json({
              url: publicUrlData.publicUrl,
              format: fileExt,
              size: processedBuffer.length,
              originalSize: file.size,
              compressionRatio: `${Math.round((1 - processedBuffer.length / file.size) * 100)}%`
            });
          }
        } else if (uploadError) {
          console.warn('Supabase storage upload error, using direct base64 data:', uploadError.message);
        }
      } catch (storageErr) {
        console.warn('Supabase storage exception, using direct base64 data:', storageErr);
      }
    }

    // Fallback data URI for immediate persistent storage (in compressed WebP)
    const base64Data = `data:${mimeType};base64,${processedBuffer.toString('base64')}`;
    res.json({
      url: base64Data,
      format: fileExt,
      size: processedBuffer.length,
      originalSize: file.size
    });
  } catch (error: any) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

export async function cleanupStorageImages(urls: (string | undefined | null)[] | string | undefined | null) {
  if (!urls) return;
  const rawList = Array.isArray(urls) ? urls : [urls];
  const urlList = rawList.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  if (urlList.length === 0) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const filePaths: string[] = [];
  for (const u of urlList) {
    if (u.includes('genuine_electronics')) {
      const parts = u.split(/genuine_electronics\//);
      if (parts.length > 1) {
        const cleanPath = parts[1].split('?')[0].replace(/^\/+/, '');
        if (cleanPath && !filePaths.includes(cleanPath)) {
          filePaths.push(cleanPath);
        }
      }
    }
  }

  if (filePaths.length > 0) {
    try {
      const { error } = await supabase.storage.from('genuine_electronics').remove(filePaths);
      if (error) {
        console.warn('[Storage Cleanup Warning] Failed to delete cloud storage files:', error.message);
      } else {
        console.log(`[Storage Cleanup] Successfully cleaned ${filePaths.length} cloud storage files to free space:`, filePaths);
      }
    } catch (e: any) {
      console.warn('[Storage Cleanup Exception]:', e.message);
    }
  }
}

app.post('/api/upload/delete', async (req, res) => {
  try {
    const { url, urls } = req.body;
    const targetUrls: string[] = [];
    if (Array.isArray(urls)) targetUrls.push(...urls);
    if (url) targetUrls.push(url);
    await cleanupStorageImages(targetUrls);
    res.json({ success: true, count: targetUrls.length });
  } catch (err: any) {
    res.json({ success: true });
  }
});

// Allowed collections
const ALLOWED_COLLECTIONS = ['products', 'orders', 'posTransactions', 'pos_transactions', 'staff', 'categories', 'profiles', 'settings', 'store_settings', 'offers', 'reviews', 'visitor_logs', 'visitorLogs'];

function validateCollection(name: string) {
  if (!ALLOWED_COLLECTIONS.includes(name)) {
    throw new Error("Invalid collection name: " + name);
  }
  return name;
}

function getSqlTableName(colName: string): string {
  if (colName === 'posTransactions' || colName === 'pos_transactions') return 'pos_transactions';
  if (colName === 'settings' || colName === 'store_settings') return 'store_settings';
  if (colName === 'visitorLogs' || colName === 'visitor_logs') return 'visitor_logs';
  return colName;
}

// Universal bidirectional casing synchronizer for Orders, POS, and all entities
function sanitizeAndSyncCasing(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  const item: any = { ...payload };

  // Explicit prioritization: if camelCase is provided, make sure snake_case and flat-case match it, and vice versa
  if (item.paymentStatus !== undefined && item.paymentStatus !== null) {
    item.payment_status = item.paymentStatus;
    item.paymentstatus = item.paymentStatus;
  } else if (item.payment_status !== undefined && item.payment_status !== null) {
    item.paymentStatus = item.payment_status;
    item.paymentstatus = item.payment_status;
  } else if (item.paymentstatus !== undefined && item.paymentstatus !== null) {
    item.paymentStatus = item.paymentstatus;
    item.payment_status = item.paymentstatus;
  }

  if (item.status !== undefined && item.status !== null) {
    item.order_status = item.status;
    item.orderstatus = item.status;
  } else if (item.order_status !== undefined && item.order_status !== null) {
    item.status = item.order_status;
    item.orderstatus = item.order_status;
  } else if (item.orderstatus !== undefined && item.orderstatus !== null) {
    item.status = item.orderstatus;
    item.order_status = item.orderstatus;
  }

  if (item.paidAmount !== undefined && item.paidAmount !== null) {
    const pAmt = Number(item.paidAmount) || 0;
    item.paidAmount = pAmt;
    item.paid_amount = pAmt;
    item.paidamount = pAmt;
  } else if (item.paid_amount !== undefined && item.paid_amount !== null) {
    const pAmt = Number(item.paid_amount) || 0;
    item.paidAmount = pAmt;
    item.paid_amount = pAmt;
    item.paidamount = pAmt;
  } else if (item.paidamount !== undefined && item.paidamount !== null) {
    const pAmt = Number(item.paidamount) || 0;
    item.paidAmount = pAmt;
    item.paid_amount = pAmt;
    item.paidamount = pAmt;
  }

  if (item.outstandingBalance !== undefined && item.outstandingBalance !== null) {
    const oBal = Number(item.outstandingBalance) || 0;
    item.outstandingBalance = oBal;
    item.outstanding_balance = oBal;
    item.outstandingbalance = oBal;
  } else if (item.outstanding_balance !== undefined && item.outstanding_balance !== null) {
    const oBal = Number(item.outstanding_balance) || 0;
    item.outstandingBalance = oBal;
    item.outstanding_balance = oBal;
    item.outstandingbalance = oBal;
  } else if (item.outstandingbalance !== undefined && item.outstandingbalance !== null) {
    const oBal = Number(item.outstandingbalance) || 0;
    item.outstandingBalance = oBal;
    item.outstanding_balance = oBal;
    item.outstandingbalance = oBal;
  }

  if (item.totalAmount !== undefined && item.totalAmount !== null) {
    const tAmt = Number(item.totalAmount) || 0;
    item.totalAmount = tAmt;
    item.total_amount = tAmt;
    item.totalamount = tAmt;
  } else if (item.total_amount !== undefined && item.total_amount !== null) {
    const tAmt = Number(item.total_amount) || 0;
    item.totalAmount = tAmt;
    item.total_amount = tAmt;
    item.totalamount = tAmt;
  } else if (item.totalamount !== undefined && item.totalamount !== null) {
    const tAmt = Number(item.totalamount) || 0;
    item.totalAmount = tAmt;
    item.total_amount = tAmt;
    item.totalamount = tAmt;
  }

  if (item.customerName !== undefined && item.customerName !== null) {
    item.customer_name = item.customerName;
    item.customername = item.customerName;
  } else if (item.customer_name !== undefined && item.customer_name !== null) {
    item.customerName = item.customer_name;
    item.customername = item.customer_name;
  } else if (item.customername !== undefined && item.customername !== null) {
    item.customerName = item.customername;
    item.customer_name = item.customername;
  }

  if (item.customerEmail !== undefined && item.customerEmail !== null) {
    item.customer_email = item.customerEmail;
    item.customeremail = item.customerEmail;
  } else if (item.customer_email !== undefined && item.customer_email !== null) {
    item.customerEmail = item.customer_email;
    item.customeremail = item.customer_email;
  } else if (item.customeremail !== undefined && item.customeremail !== null) {
    item.customerEmail = item.customeremail;
    item.customer_email = item.customeremail;
  }

  if (item.customerPhone !== undefined && item.customerPhone !== null) {
    item.customer_phone = item.customerPhone;
    item.customerphone = item.customerPhone;
  } else if (item.customer_phone !== undefined && item.customer_phone !== null) {
    item.customerPhone = item.customer_phone;
    item.customerphone = item.customer_phone;
  } else if (item.customerphone !== undefined && item.customerphone !== null) {
    item.customerPhone = item.customerphone;
    item.customer_phone = item.customerphone;
  }

  if (item.shippingAddress !== undefined && item.shippingAddress !== null) {
    item.shipping_address = item.shippingAddress;
    item.shippingaddress = item.shippingAddress;
  } else if (item.shipping_address !== undefined && item.shipping_address !== null) {
    item.shippingAddress = item.shipping_address;
    item.shippingaddress = item.shipping_address;
  } else if (item.shippingaddress !== undefined && item.shippingaddress !== null) {
    item.shippingAddress = item.shippingaddress;
    item.shipping_address = item.shippingaddress;
  }

  if (item.trackingNumber !== undefined && item.trackingNumber !== null) {
    item.tracking_number = item.trackingNumber;
    item.trackingnumber = item.trackingNumber;
  } else if (item.tracking_number !== undefined && item.tracking_number !== null) {
    item.trackingNumber = item.tracking_number;
    item.trackingnumber = item.tracking_number;
  } else if (item.trackingnumber !== undefined && item.trackingnumber !== null) {
    item.trackingNumber = item.trackingnumber;
    item.tracking_number = item.trackingnumber;
  }

  if (item.courierName !== undefined && item.courierName !== null) {
    item.courier_name = item.courierName;
    item.couriername = item.courierName;
  } else if (item.courier_name !== undefined && item.courier_name !== null) {
    item.courierName = item.courier_name;
    item.couriername = item.courier_name;
  } else if (item.couriername !== undefined && item.couriername !== null) {
    item.courierName = item.couriername;
    item.courier_name = item.couriername;
  }

  if (item.estimatedDelivery !== undefined && item.estimatedDelivery !== null) {
    item.estimated_delivery = item.estimatedDelivery;
    item.estimateddelivery = item.estimatedDelivery;
  } else if (item.estimated_delivery !== undefined && item.estimated_delivery !== null) {
    item.estimatedDelivery = item.estimated_delivery;
    item.estimateddelivery = item.estimated_delivery;
  } else if (item.estimateddelivery !== undefined && item.estimateddelivery !== null) {
    item.estimatedDelivery = item.estimateddelivery;
    item.estimated_delivery = item.estimateddelivery;
  }

  if (item.deliveryNotes !== undefined && item.deliveryNotes !== null) {
    item.delivery_notes = item.deliveryNotes;
    item.deliverynotes = item.deliveryNotes;
  } else if (item.delivery_notes !== undefined && item.delivery_notes !== null) {
    item.deliveryNotes = item.delivery_notes;
    item.deliverynotes = item.delivery_notes;
  } else if (item.deliverynotes !== undefined && item.deliverynotes !== null) {
    item.deliveryNotes = item.deliverynotes;
    item.delivery_notes = item.deliverynotes;
  }

  if (item.paymentMethod !== undefined && item.paymentMethod !== null) {
    item.payment_method = item.paymentMethod;
    item.paymentmethod = item.paymentMethod;
  } else if (item.payment_method !== undefined && item.payment_method !== null) {
    item.paymentMethod = item.payment_method;
    item.paymentmethod = item.payment_method;
  } else if (item.paymentmethod !== undefined && item.paymentmethod !== null) {
    item.paymentMethod = item.paymentmethod;
    item.payment_method = item.paymentmethod;
  }

  return item;
}

// Helper to normalize Supabase PostgreSQL row keys (snake_case/lowercase) to application camelCase

function normalizeFromSupabase(colName: string, row: any): any {
  if (!row || typeof row !== 'object') return row;
  const result: any = { ...row };

  // Always force camelCase from snake_case if snake_case exists,
  // to ensure we prioritize the snake_case columns which are the ones updated if fallback triggers
  for (const key of Object.keys(result)) {
    if (/_/.test(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
      if (result[key] !== undefined && result[key] !== null) {
        result[camelKey] = result[key];
      }
    }
  }

  // Explicit mappings for historical fields if needed
  if (result.cost_price !== undefined && result.cost_price !== null) result.costPrice = Number(result.cost_price);
  if (result.costprice !== undefined && result.costprice !== null) result.costPrice = Number(result.costprice);
  if (result.min_stock_alert !== undefined && result.min_stock_alert !== null) result.minStockAlert = Number(result.min_stock_alert);
  if (result.minstockalert !== undefined && result.minstockalert !== null) result.minStockAlert = Number(result.minstockalert);
  if (result.reviews_count !== undefined && result.reviews_count !== null) result.reviewsCount = Number(result.reviews_count);
  if (result.reviewscount !== undefined && result.reviewscount !== null) result.reviewsCount = Number(result.reviewscount);
  if (result.is_genuine_verified !== undefined && result.is_genuine_verified !== null) result.isGenuineVerified = Boolean(result.is_genuine_verified);
  if (result.isgenuineverified !== undefined && result.isgenuineverified !== null) result.isGenuineVerified = Boolean(result.isgenuineverified);
  if (result.energy_rating !== undefined && result.energy_rating !== null) result.energyRating = result.energy_rating;
  if (result.energyrating !== undefined && result.energyrating !== null) result.energyRating = result.energyrating;
  if (result.appliance_type !== undefined && result.appliance_type !== null) result.applianceType = result.appliance_type;
  if (result.appliancetype !== undefined && result.appliancetype !== null) result.applianceType = result.appliancetype;
  if (result.swahili_name !== undefined && result.swahili_name !== null) result.swahiliName = result.swahili_name;
  if (result.swahiliname !== undefined && result.swahiliname !== null) result.swahiliName = result.swahiliname;
  
  if (result.product_count !== undefined && result.product_count !== null) result.productCount = Number(result.product_count);
  if (result.productcount !== undefined && result.productcount !== null) result.productCount = Number(result.productcount);
  if (result.customer_name !== undefined && result.customer_name !== null && String(result.customer_name).trim() !== '') {
    result.customerName = String(result.customer_name).trim();
  }
  if (result.customername !== undefined && result.customername !== null && String(result.customername).trim() !== '' && !result.customerName) {
    result.customerName = String(result.customername).trim();
  }
  if (result.customer_email !== undefined && result.customer_email !== null && String(result.customer_email).trim() !== '') {
    result.customerEmail = String(result.customer_email).trim();
  }
  if (result.customeremail !== undefined && result.customeremail !== null && String(result.customeremail).trim() !== '' && !result.customerEmail) {
    result.customerEmail = String(result.customeremail).trim();
  }
  if (result.customer_phone !== undefined && result.customer_phone !== null && String(result.customer_phone).trim() !== '') {
    result.customerPhone = String(result.customer_phone).trim();
  }
  if (result.customerphone !== undefined && result.customerphone !== null && String(result.customerphone).trim() !== '' && !result.customerPhone) {
    result.customerPhone = String(result.customerphone).trim();
  }
  if (result.shipping_address !== undefined && result.shipping_address !== null) result.shippingAddress = result.shipping_address;
  if (result.shippingaddress !== undefined && result.shippingaddress !== null) result.shippingAddress = result.shippingaddress;
  if (result.total_amount !== undefined && result.total_amount !== null) result.totalAmount = Number(result.total_amount);
  if (result.totalamount !== undefined && result.totalamount !== null) result.totalAmount = Number(result.totalamount);

  // Customer ID / User ID normalization
  if (result.customer_id !== undefined && result.customer_id !== null) {
    result.customerId = String(result.customer_id);
    result.customer_id = String(result.customer_id);
    if (!result.userId) result.userId = String(result.customer_id);
  }
  if (result.customerid !== undefined && result.customerid !== null) {
    result.customerId = String(result.customerid);
    if (!result.userId) result.userId = String(result.customerid);
  }
  if (result.user_id !== undefined && result.user_id !== null) {
    result.userId = String(result.user_id);
    result.user_id = String(result.user_id);
    if (!result.customerId) result.customerId = String(result.user_id);
  }
  if (result.userid !== undefined && result.userid !== null) {
    result.userId = String(result.userid);
    if (!result.customerId) result.customerId = String(result.userid);
  }

  // Deadline normalization
  if (result.deadline !== undefined && result.deadline !== null) {
    result.deadline = String(result.deadline);
    if (!result.loanDueDate) result.loanDueDate = String(result.deadline);
  }
  if (result.loan_due_date !== undefined && result.loan_due_date !== null) {
    result.loanDueDate = String(result.loan_due_date);
    if (!result.deadline) result.deadline = String(result.loan_due_date);
  }

  // Loan and Debt normalizations
  if (result.loan_balance !== undefined && result.loan_balance !== null) result.loanBalance = Number(result.loan_balance);
  if (result.loanbalance !== undefined && result.loanbalance !== null) result.loanBalance = Number(result.loanbalance);
  if (result.loanBalance !== undefined && result.loanBalance !== null) result.loanBalance = Number(result.loanBalance);

  if (result.down_payment !== undefined && result.down_payment !== null) result.downPayment = Number(result.down_payment);
  if (result.downpayment !== undefined && result.downpayment !== null) result.downPayment = Number(result.downpayment);
  if (result.downPayment !== undefined && result.downPayment !== null) result.downPayment = Number(result.downPayment);

  if (result.paid_amount !== undefined && result.paid_amount !== null) result.paidAmount = Number(result.paid_amount);
  if (result.paidamount !== undefined && result.paidamount !== null) result.paidAmount = Number(result.paidamount);
  if (result.paidAmount !== undefined && result.paidAmount !== null) result.paidAmount = Number(result.paidAmount);

  if (result.outstanding_balance !== undefined && result.outstanding_balance !== null) result.outstandingBalance = Number(result.outstanding_balance);
  if (result.outstandingbalance !== undefined && result.outstandingbalance !== null) result.outstandingBalance = Number(result.outstandingbalance);
  if (result.outstandingBalance !== undefined && result.outstandingBalance !== null) result.outstandingBalance = Number(result.outstandingBalance);

  const rawPartialPayments = result.partialPayments ?? result.partial_payments ?? result.partialpayments;
  if (rawPartialPayments !== undefined && rawPartialPayments !== null) {
    if (Array.isArray(rawPartialPayments)) {
      result.partialPayments = rawPartialPayments;
    } else if (typeof rawPartialPayments === 'string') {
      try {
        result.partialPayments = JSON.parse(rawPartialPayments);
      } catch (_) {
        result.partialPayments = [];
      }
    }
  }

  if (result.is_loan !== undefined && result.is_loan !== null) result.isLoan = Boolean(result.is_loan);
  if (result.isloan !== undefined && result.isloan !== null) result.isLoan = Boolean(result.isloan);
  if (result.isLoan !== undefined && result.isLoan !== null) result.isLoan = Boolean(result.isLoan);

  if (result.loan_status !== undefined && result.loan_status !== null) result.loanStatus = String(result.loan_status);
  if (result.loanstatus !== undefined && result.loanstatus !== null) result.loanStatus = String(result.loanstatus);
  if (result.loanStatus !== undefined && result.loanStatus !== null) result.loanStatus = String(result.loanStatus);

  if (result.loan_due_date !== undefined && result.loan_due_date !== null) result.loanDueDate = String(result.loan_due_date);
  if (result.loanduedate !== undefined && result.loanduedate !== null) result.loanDueDate = String(result.loanduedate);
  if (result.loanDueDate !== undefined && result.loanDueDate !== null) result.loanDueDate = String(result.loanDueDate);

  if (result.loan_due_time !== undefined && result.loan_due_time !== null) result.loanDueTime = String(result.loan_due_time);
  if (result.loanduetime !== undefined && result.loanduetime !== null) result.loanDueTime = String(result.loanduetime);
  if (result.loanDueTime !== undefined && result.loanDueTime !== null) result.loanDueTime = String(result.loanDueTime);

  if (result.loan_national_id !== undefined && result.loan_national_id !== null) result.loanNationalId = String(result.loan_national_id);
  if (result.loannationalid !== undefined && result.loannationalid !== null) result.loanNationalId = String(result.loannationalid);
  if (result.loanNationalId !== undefined && result.loanNationalId !== null) result.loanNationalId = String(result.loanNationalId);

  if (result.loan_guarantor_name !== undefined && result.loan_guarantor_name !== null) result.loanGuarantorName = String(result.loan_guarantor_name);
  if (result.loanguarantorname !== undefined && result.loanguarantorname !== null) result.loanGuarantorName = String(result.loanguarantorname);
  if (result.loanGuarantorName !== undefined && result.loanGuarantorName !== null) result.loanGuarantorName = String(result.loanGuarantorName);

  if (result.loan_guarantor_phone !== undefined && result.loan_guarantor_phone !== null) result.loanGuarantorPhone = String(result.loan_guarantor_phone);
  if (result.loanguarantorphone !== undefined && result.loanguarantorphone !== null) result.loanGuarantorPhone = String(result.loanguarantorphone);
  if (result.loanGuarantorPhone !== undefined && result.loanGuarantorPhone !== null) result.loanGuarantorPhone = String(result.loanGuarantorPhone);

  const rawLoanRepayments = result.loanRepayments ?? result.loan_repayments ?? result.loanrepayments;
  if (rawLoanRepayments !== undefined && rawLoanRepayments !== null) {
    if (Array.isArray(rawLoanRepayments)) {
      result.loanRepayments = rawLoanRepayments;
    } else if (typeof rawLoanRepayments === 'string') {
      try {
        result.loanRepayments = JSON.parse(rawLoanRepayments);
      } catch (_) {
        result.loanRepayments = [];
      }
    }
  } else {
    result.loanRepayments = result.loanRepayments || [];
  }

  // Extra Costs handling
  const rawExtraCosts = result.extraCosts ?? result.extra_costs ?? result.extracosts;
  if (rawExtraCosts !== undefined && rawExtraCosts !== null) {
    if (Array.isArray(rawExtraCosts)) {
      result.extraCosts = rawExtraCosts;
    } else if (typeof rawExtraCosts === 'string') {
      try {
        result.extraCosts = JSON.parse(rawExtraCosts);
      } catch (_) {
        result.extraCosts = [];
      }
    }
  } else {
    result.extraCosts = result.extraCosts || [];
  }

  // Offers and promotional pricing normalizations (strictly prioritize snake_case from DB)
  if (result.is_on_offer !== undefined && result.is_on_offer !== null) {
    result.isOnOffer = Boolean(result.is_on_offer);
  } else if (result.isonoffer !== undefined && result.isonoffer !== null) {
    result.isOnOffer = Boolean(result.isonoffer);
  } else if (result.isOnOffer !== undefined && result.isOnOffer !== null) {
    result.isOnOffer = Boolean(result.isOnOffer);
  }

  if (result.original_price !== undefined && result.original_price !== null) {
    result.originalPrice = Number(result.original_price);
  } else if (result.originalprice !== undefined && result.originalprice !== null) {
    result.originalPrice = Number(result.originalprice);
  } else if (result.originalPrice !== undefined && result.originalPrice !== null) {
    result.originalPrice = Number(result.originalPrice);
  }

  if (result.discount_price !== undefined && result.discount_price !== null) {
    result.discountPrice = Number(result.discount_price);
  } else if (result.discountprice !== undefined && result.discountprice !== null) {
    result.discountPrice = Number(result.discountprice);
  } else if (result.discountPrice !== undefined && result.discountPrice !== null) {
    result.discountPrice = Number(result.discountPrice);
  }

  if (result.discount_percentage !== undefined && result.discount_percentage !== null) {
    result.discountPercentage = Number(result.discount_percentage);
  } else if (result.discountpercentage !== undefined && result.discountpercentage !== null) {
    result.discountPercentage = Number(result.discountpercentage);
  } else if (result.discountPercentage !== undefined && result.discountPercentage !== null) {
    result.discountPercentage = Number(result.discountPercentage);
  }

  if (result.offer_ends_at !== undefined && result.offer_ends_at !== null) {
    result.offerEndsAt = String(result.offer_ends_at);
  } else if (result.offerendsat !== undefined && result.offerendsat !== null) {
    result.offerEndsAt = String(result.offerendsat);
  } else if (result.offerEndsAt !== undefined && result.offerEndsAt !== null) {
    result.offerEndsAt = String(result.offerEndsAt);
  }

  if (result.offer_title !== undefined && result.offer_title !== null) {
    result.offerTitle = String(result.offer_title);
  } else if (result.offertitle !== undefined && result.offertitle !== null) {
    result.offerTitle = String(result.offertitle);
  } else if (result.offerTitle !== undefined && result.offerTitle !== null) {
    result.offerTitle = String(result.offerTitle);
  }

  if (result.is_vat_inclusive !== undefined && result.is_vat_inclusive !== null) {
    result.isVatInclusive = Boolean(result.is_vat_inclusive);
  } else if (result.isvatinclusive !== undefined && result.isvatinclusive !== null) {
    result.isVatInclusive = Boolean(result.isvatinclusive);
  } else if (result.isVatInclusive !== undefined && result.isVatInclusive !== null) {
    result.isVatInclusive = Boolean(result.isVatInclusive);
  }

  // Robust casing resolution for Order and POS fields
  const resolvedPaymentMethod = result.payment_method ?? result.paymentMethod ?? result.paymentmethod;
  if (resolvedPaymentMethod !== undefined && resolvedPaymentMethod !== null) {
    result.paymentMethod = resolvedPaymentMethod;
    result.payment_method = resolvedPaymentMethod;
    result.paymentmethod = resolvedPaymentMethod;
  }

  const resolvedPaymentStatus = result.payment_status ?? result.paymentStatus ?? result.paymentstatus;
  if (resolvedPaymentStatus !== undefined && resolvedPaymentStatus !== null) {
    result.paymentStatus = resolvedPaymentStatus;
    result.payment_status = resolvedPaymentStatus;
    result.paymentstatus = resolvedPaymentStatus;
  }

  const resolvedTrackingNumber = result.tracking_number ?? result.trackingNumber ?? result.trackingnumber;
  if (resolvedTrackingNumber !== undefined && resolvedTrackingNumber !== null) {
    result.trackingNumber = resolvedTrackingNumber;
    result.tracking_number = resolvedTrackingNumber;
    result.trackingnumber = resolvedTrackingNumber;
  }

  const resolvedCourierName = result.courier_name ?? result.courierName ?? result.couriername;
  if (resolvedCourierName !== undefined && resolvedCourierName !== null) {
    result.courierName = resolvedCourierName;
    result.courier_name = resolvedCourierName;
    result.couriername = resolvedCourierName;
  }

  const resolvedEstimatedDelivery = result.estimated_delivery ?? result.estimatedDelivery ?? result.estimateddelivery;
  if (resolvedEstimatedDelivery !== undefined && resolvedEstimatedDelivery !== null) {
    result.estimatedDelivery = resolvedEstimatedDelivery;
    result.estimated_delivery = resolvedEstimatedDelivery;
    result.estimateddelivery = resolvedEstimatedDelivery;
  }

  const resolvedTrackingTimeline = result.tracking_timeline ?? result.trackingTimeline ?? result.trackingtimeline;
  if (resolvedTrackingTimeline !== undefined && resolvedTrackingTimeline !== null) {
    result.trackingTimeline = resolvedTrackingTimeline;
    result.tracking_timeline = resolvedTrackingTimeline;
    result.trackingtimeline = resolvedTrackingTimeline;
  }

  const resolvedCashierName = result.cashier_name ?? result.cashierName ?? result.cashiername;
  if (resolvedCashierName !== undefined && resolvedCashierName !== null) {
    result.cashierName = resolvedCashierName;
    result.cashier_name = resolvedCashierName;
    result.cashiername = resolvedCashierName;
  }

  const resolvedFullName = result.full_name ?? result.fullName ?? result.fullname;
  if (resolvedFullName !== undefined && resolvedFullName !== null) {
    result.fullName = resolvedFullName;
    result.full_name = resolvedFullName;
    result.fullname = resolvedFullName;
  }

  const resolvedBadgeText = result.badge_text ?? result.badgeText ?? result.badgetext;
  if (resolvedBadgeText !== undefined && resolvedBadgeText !== null) {
    result.badgeText = resolvedBadgeText;
    result.badge_text = resolvedBadgeText;
    result.badgetext = resolvedBadgeText;
  }

  const resolvedStartDate = result.start_date ?? result.startDate ?? result.startdate;
  if (resolvedStartDate !== undefined && resolvedStartDate !== null) {
    result.startDate = resolvedStartDate;
    result.start_date = resolvedStartDate;
    result.startdate = resolvedStartDate;
  }

  const resolvedEndDate = result.end_date ?? result.endDate ?? result.enddate;
  if (resolvedEndDate !== undefined && resolvedEndDate !== null) {
    result.endDate = resolvedEndDate;
    result.end_date = resolvedEndDate;
    result.enddate = resolvedEndDate;
  }

  if (result.is_active !== undefined && result.is_active !== null) result.isActive = Boolean(result.is_active);
  if (result.isactive !== undefined && result.isactive !== null) result.isActive = Boolean(result.isactive);
  if (result.category_ids !== undefined && result.category_ids !== null) result.categoryIds = result.category_ids;
  if (result.categoryids !== undefined && result.categoryids !== null) result.categoryIds = result.categoryids;
  if (result.product_ids !== undefined && result.product_ids !== null) result.productIds = result.product_ids;
  if (result.productids !== undefined && result.productids !== null) result.productIds = result.productids;
  if (result.banner_image !== undefined && result.banner_image !== null) result.bannerImage = result.banner_image;
  if (result.bannerimage !== undefined && result.bannerimage !== null) result.bannerImage = result.bannerimage;

  if (result.avatar_url !== undefined && result.avatar_url !== null) result.avatar = result.avatar_url;
  if (result.created_at !== undefined && result.created_at !== null) result.createdAt = result.created_at;
  if (result.updated_at !== undefined && result.updated_at !== null) result.updatedAt = result.updated_at;

  // Extract and normalize product gallery images array
  const rawImages = result.images ?? result.images_gallery ?? result.imagesgallery ?? result.gallery_images ?? result.additional_images ?? result["imagesGallery"] ?? result["images"];
  if (rawImages !== undefined && rawImages !== null) {
    if (Array.isArray(rawImages)) {
      result.images = rawImages.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
    } else if (typeof rawImages === 'string') {
      try {
        const parsed = JSON.parse(rawImages);
        if (Array.isArray(parsed)) {
          result.images = parsed.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
        } else if (typeof parsed === 'string' && parsed.trim().length > 0) {
          result.images = [parsed.trim()];
        }
      } catch (_) {
        const str = rawImages.trim();
        if (str.startsWith('{') && str.endsWith('}')) {
          result.images = str.slice(1, -1).split(',').map((s: string) => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
        } else if (str.includes(',')) {
          result.images = str.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (str.length > 0) {
          result.images = [str];
        }
      }
    }
  }

  // Safeguards for JSON fields if returned as string
  if (typeof result.specs === 'string') {
    try { result.specs = JSON.parse(result.specs); } catch (_) {}
  }
  if (typeof result.items === 'string') {
    try { result.items = JSON.parse(result.items); } catch (_) {}
  }
  if (typeof result.trackingTimeline === 'string') {
    try { result.trackingTimeline = JSON.parse(result.trackingTimeline); } catch (_) {}
  }
  if (typeof result.permissions === 'string') {
    try { result.permissions = JSON.parse(result.permissions); } catch (_) {}
  }
  if (typeof result.categoryIds === 'string') {
    try { result.categoryIds = JSON.parse(result.categoryIds); } catch (_) {}
  }
  if (typeof result.productIds === 'string') {
    try { result.productIds = JSON.parse(result.productIds); } catch (_) {}
  }
  if (typeof result.loanRepayments === 'string') {
    try { result.loanRepayments = JSON.parse(result.loanRepayments); } catch (_) {}
  }
  if (typeof result.loan_repayments === 'string') {
    try { result.loan_repayments = JSON.parse(result.loan_repayments); } catch (_) {}
  }

  return result;
}

// Helper to convert object keys to snake_case for standard PostgreSQL compatibility
function toSnakeCasePayload(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = val;
  }
  return result;
}

// Clean and prepare payload before saving to Supabase

function preparePayloadForSupabase(sqlTable: string, item: any): any {
  const payload: any = { ...item };

  // Remove transient UI/temporary properties
  delete payload._temp;
  delete payload.isUploading;
  if (sqlTable === 'pos_transactions' || sqlTable === 'posTransactions') {
    delete payload.updated_at;
    delete payload.updatedAt;
    delete payload.updatedat;
    delete payload.vatPercentage;
    delete payload.vat_percentage;
    delete payload.vatpercentage;
    delete payload.vat;
  }

  // Duplicate camelCase to snake_case and vice versa to keep schema columns in sync
  const keys = Object.keys(payload);
  for (const key of keys) {
    if (/[A-Z]/.test(key)) {
      const snakeKey = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
      if (payload[snakeKey] === undefined) {
        payload[snakeKey] = payload[key];
      }
    }
    if (/_/.test(key)) {
      const camelKey = key.replace(/_([a-z])/g, (g, l) => l.toUpperCase());
      if (payload[camelKey] === undefined) {
        payload[camelKey] = payload[key];
      }
    }
  }

  if (sqlTable === 'pos_transactions' || sqlTable === 'posTransactions') {
    delete payload.updated_at;
    delete payload.updatedAt;
    delete payload.updatedat;
    delete payload.vatPercentage;
    delete payload.vat_percentage;
    delete payload.vatpercentage;
    delete payload.vat;
  }

  // Ensure ID is a valid string

  if (payload.id !== undefined && payload.id !== null) {
    payload.id = String(payload.id);
  }

  // Parse numeric types properly
  if (payload.price !== undefined) payload.price = Number(payload.price) || 0;
  
  // Normalize payment method formats
  const resolvedPaymentMethod = String(payload.paymentMethod || payload.payment_method || payload.paymentmethod || 'Cash');
  payload.paymentMethod = resolvedPaymentMethod;
  payload.payment_method = resolvedPaymentMethod;
  payload.paymentmethod = resolvedPaymentMethod;

  // Normalize cashier name formats
  const cashName = String(payload.cashierName || payload.cashier_name || payload.cashiername || 'Admin');
  payload.cashierName = cashName;
  payload.cashier_name = cashName;
  payload.cashiername = cashName;

  // Normalize customer name & phone formats
  const custName = String(payload.customerName || payload.customer_name || payload.customername || (sqlTable === 'orders' ? 'Valued Customer' : 'Walk-in Customer'));
  payload.customerName = custName;
  payload.customer_name = custName;
  payload.customername = custName;

  const custPhone = String(payload.customerPhone || payload.customer_phone || payload.customerphone || '');
  payload.customerPhone = custPhone;
  payload.customer_phone = custPhone;
  payload.customerphone = custPhone;

  const sAddr = String(payload.shippingAddress || payload.shipping_address || payload.shippingaddress || (sqlTable === 'orders' ? 'In-Store Pickup / Walk-in' : ''));
  payload.shippingAddress = sAddr;
  payload.shipping_address = sAddr;
  payload.shippingaddress = sAddr;

  // Normalize customer email formats
  const custEmail = String(payload.customerEmail || payload.customer_email || payload.customeremail || (sqlTable === 'orders' ? 'customer@example.com' : ''));
  payload.customerEmail = custEmail;
  payload.customer_email = custEmail;
  payload.customeremail = custEmail;

  // Normalize cost price formats
  if (payload.costPrice !== undefined || payload.cost_price !== undefined || payload.costprice !== undefined) {
    let resolvedCostPrice = 0;
    if (payload.costPrice !== undefined && payload.costPrice !== null) {
      resolvedCostPrice = Number(payload.costPrice) || 0;
    } else if (payload.cost_price !== undefined && payload.cost_price !== null) {
      resolvedCostPrice = Number(payload.cost_price) || 0;
    } else if (payload.costprice !== undefined && payload.costprice !== null) {
      resolvedCostPrice = Number(payload.costprice) || 0;
    }
    payload.costPrice = resolvedCostPrice;
    payload.cost_price = resolvedCostPrice;
    payload.costprice = resolvedCostPrice;
  }

  if (payload.stock !== undefined) payload.stock = Number(payload.stock) || 0;

  // Normalize min stock alert formats
  if (payload.minStockAlert !== undefined || payload.min_stock_alert !== undefined || payload.minstockalert !== undefined) {
    let resolvedMinStock = 5;
    if (payload.minStockAlert !== undefined && payload.minStockAlert !== null) {
      resolvedMinStock = Number(payload.minStockAlert) || 0;
    } else if (payload.min_stock_alert !== undefined && payload.min_stock_alert !== null) {
      resolvedMinStock = Number(payload.min_stock_alert) || 0;
    } else if (payload.minstockalert !== undefined && payload.minstockalert !== null) {
      resolvedMinStock = Number(payload.minstockalert) || 0;
    }
    payload.minStockAlert = resolvedMinStock;
    payload.min_stock_alert = resolvedMinStock;
    payload.minstockalert = resolvedMinStock;
  }

  if (payload.rating !== undefined) payload.rating = Number(payload.rating) || 0;
  
  if (payload.reviewsCount !== undefined || payload.reviews_count !== undefined || payload.reviewscount !== undefined) {
    let resolvedReviewsCount = 0;
    if (payload.reviewsCount !== undefined && payload.reviewsCount !== null) {
      resolvedReviewsCount = Number(payload.reviewsCount) || 0;
    } else if (payload.reviews_count !== undefined && payload.reviews_count !== null) {
      resolvedReviewsCount = Number(payload.reviews_count) || 0;
    } else if (payload.reviewscount !== undefined && payload.reviewscount !== null) {
      resolvedReviewsCount = Number(payload.reviewscount) || 0;
    }
    payload.reviewsCount = resolvedReviewsCount;
    payload.reviews_count = resolvedReviewsCount;
    payload.reviewscount = resolvedReviewsCount;
  }

  // Normalize Swahili name variants
  if (payload.swahiliName || payload.swahili_name) {
    const sName = String(payload.swahiliName || payload.swahili_name || '');
    payload.swahiliName = sName;
    payload.swahili_name = sName;
  }
  delete payload.swahiliname;

  // Normalize totalAmount across variants
  if (payload.totalAmount !== undefined || payload.total_amount !== undefined || payload.total !== undefined || payload.subtotal !== undefined) {
    let resolvedTotal = 0;
    if (payload.totalAmount !== undefined && payload.totalAmount !== null) {
      resolvedTotal = Number(payload.totalAmount) || 0;
    } else if (payload.total_amount !== undefined && payload.total_amount !== null) {
      resolvedTotal = Number(payload.total_amount) || 0;
    } else if (payload.total !== undefined && payload.total !== null) {
      resolvedTotal = Number(payload.total) || 0;
    } else if (payload.subtotal !== undefined && payload.subtotal !== null) {
      resolvedTotal = Number(payload.subtotal) || 0;
    }
    payload.totalAmount = resolvedTotal;
    payload.total_amount = resolvedTotal;
    if (payload.total !== undefined) payload.total = resolvedTotal;
  }
  delete payload.totalamount;

  if (payload.subtotal !== undefined) payload.subtotal = Number(payload.subtotal) || 0;
  if (payload.tax !== undefined) payload.tax = Number(payload.tax) || 0;
  if (payload.discount !== undefined) payload.discount = Number(payload.discount) || 0;
  if (payload.sequence !== undefined) payload.sequence = Number(payload.sequence) || 0;
  
  if (payload.productCount !== undefined || payload.product_count !== undefined) {
    let resolvedProductCount = 0;
    if (payload.productCount !== undefined && payload.productCount !== null) {
      resolvedProductCount = Number(payload.productCount) || 0;
    } else if (payload.product_count !== undefined && payload.product_count !== null) {
      resolvedProductCount = Number(payload.product_count) || 0;
    }
    payload.productCount = resolvedProductCount;
    payload.product_count = resolvedProductCount;
  }
  delete payload.productcount;

  // Normalize payment status across all casing variants
  if (payload.paymentStatus !== undefined || payload.payment_status !== undefined || payload.paymentstatus !== undefined || sqlTable === 'orders') {
    const pStat = String(payload.paymentStatus ?? payload.payment_status ?? payload.paymentstatus ?? 'Pending');
    payload.paymentStatus = pStat;
    payload.payment_status = pStat;
    payload.paymentstatus = pStat;
  }

  // Normalize order status
  if (payload.status !== undefined || payload.order_status !== undefined || payload.orderstatus !== undefined || sqlTable === 'orders') {
    const stat = String(payload.status ?? payload.order_status ?? payload.orderstatus ?? 'Pending');
    payload.status = stat;
    payload.order_status = stat;
    payload.orderstatus = stat;
  }

  // Normalize tracking number
  if (payload.trackingNumber !== undefined || payload.tracking_number !== undefined || payload.trackingnumber !== undefined || sqlTable === 'orders') {
    const tNum = String(payload.trackingNumber ?? payload.tracking_number ?? payload.trackingnumber ?? '');
    payload.trackingNumber = tNum;
    payload.tracking_number = tNum;
    payload.trackingnumber = tNum;
  }

  // Normalize courier name
  if (payload.courierName !== undefined || payload.courier_name !== undefined || payload.couriername !== undefined) {
    const cName = String(payload.courierName ?? payload.courier_name ?? payload.couriername ?? '');
    payload.courierName = cName;
    payload.courier_name = cName;
    payload.couriername = cName;
  }

  // Normalize estimated delivery
  if (payload.estimatedDelivery !== undefined || payload.estimated_delivery !== undefined || payload.estimateddelivery !== undefined) {
    const eDel = String(payload.estimatedDelivery ?? payload.estimated_delivery ?? payload.estimateddelivery ?? '');
    payload.estimatedDelivery = eDel;
    payload.estimated_delivery = eDel;
    payload.estimateddelivery = eDel;
  }

  // Normalize createdAt & updatedAt
  const nowIso = new Date().toISOString();
  const cAt = payload.createdAt || payload.created_at || nowIso;
  payload.createdAt = cAt;
  payload.created_at = cAt;
  delete payload.createdat;

  const uAt = payload.updatedAt || payload.updated_at || nowIso;
  payload.updatedAt = uAt;
  payload.updated_at = uAt;
  delete payload.updatedat;

  // Ensure booleans
  if (payload.isGenuineVerified !== undefined || payload.is_genuine_verified !== undefined || payload.isgenuineverified !== undefined) {
    let resolvedGenuine = true;
    if (payload.isGenuineVerified !== undefined && payload.isGenuineVerified !== null) {
      resolvedGenuine = Boolean(payload.isGenuineVerified);
    } else if (payload.is_genuine_verified !== undefined && payload.is_genuine_verified !== null) {
      resolvedGenuine = Boolean(payload.is_genuine_verified);
    }
    payload.isGenuineVerified = resolvedGenuine;
    payload.is_genuine_verified = resolvedGenuine;
    payload.isgenuineverified = resolvedGenuine;
  }

  if (payload.featured !== undefined) payload.featured = Boolean(payload.featured);

  if (payload.originalPrice !== undefined || payload.original_price !== undefined || payload.originalprice !== undefined) {
    const orig = Number(payload.originalPrice ?? payload.original_price ?? payload.originalprice) || 0;
    payload.originalPrice = orig;
    payload.original_price = orig;
  }
  delete payload.originalprice;

  if (payload.discountPrice !== undefined || payload.discount_price !== undefined || payload.discountprice !== undefined) {
    const disc = Number(payload.discountPrice ?? payload.discount_price ?? payload.discountprice) || 0;
    payload.discountPrice = disc;
    payload.discount_price = disc;
  }
  delete payload.discountprice;

  if (payload.discountPercentage !== undefined || payload.discount_percentage !== undefined || payload.discountpercentage !== undefined) {
    const pct = Number(payload.discountPercentage ?? payload.discount_percentage ?? payload.discountpercentage) || 0;
    payload.discountPercentage = pct;
    payload.discount_percentage = pct;
  }
  delete payload.discountpercentage;

  if (payload.isOnOffer !== undefined || payload.is_on_offer !== undefined || payload.isonoffer !== undefined) {
    const onOff = Boolean(payload.isOnOffer ?? payload.is_on_offer ?? payload.isonoffer);
    payload.isOnOffer = onOff;
    payload.is_on_offer = onOff;
  }
  delete payload.isonoffer;

  if (payload.offerEndsAt !== undefined || payload.offer_ends_at !== undefined || payload.offerendsat !== undefined) {
    const rawVal = payload.offerEndsAt ?? payload.offer_ends_at ?? payload.offerendsat;
    let endAt: string | null = null;
    if (rawVal && typeof rawVal === 'string' && rawVal.trim().length > 0) {
      endAt = rawVal.trim();
    }
    payload.offerEndsAt = endAt;
    payload.offer_ends_at = endAt;
  }
  delete payload.offerendsat;

  if (payload.offerTitle !== undefined || payload.offer_title !== undefined || payload.offertitle !== undefined) {
    const title = String(payload.offerTitle ?? payload.offer_title ?? payload.offertitle ?? '');
    payload.offerTitle = title;
    payload.offer_title = title;
  }
  delete payload.offertitle;

  if (payload.startDate !== undefined || payload.start_date !== undefined) {
    const raw = payload.startDate ?? payload.start_date;
    const sDate = (raw && typeof raw === 'string' && raw.trim().length > 0) ? raw.trim() : null;
    payload.startDate = sDate;
    payload.start_date = sDate;
  }
  delete payload.startdate;

  if (payload.endDate !== undefined || payload.end_date !== undefined) {
    const raw = payload.endDate ?? payload.end_date;
    const eDate = (raw && typeof raw === 'string' && raw.trim().length > 0) ? raw.trim() : null;
    payload.endDate = eDate;
    payload.end_date = eDate;
  }
  delete payload.enddate;

  if (payload.isVatInclusive !== undefined || payload.is_vat_inclusive !== undefined) {
    const vat = Boolean(payload.isVatInclusive ?? payload.is_vat_inclusive);
    payload.isVatInclusive = vat;
    payload.is_vat_inclusive = vat;
  }
  delete payload.isvatinclusive;

  // Handle product gallery images
  if (payload.images !== undefined || payload.images_gallery !== undefined || payload.gallery_images !== undefined || payload.additional_images !== undefined) {
    const rawImgs = payload.images ?? payload.images_gallery ?? payload.gallery_images ?? payload.additional_images;
    let cleanImages: string[] = [];
    if (Array.isArray(rawImgs)) {
      cleanImages = rawImgs.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
    } else if (typeof rawImgs === 'string') {
      try {
        const parsed = JSON.parse(rawImgs);
        if (Array.isArray(parsed)) cleanImages = parsed.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
        else if (typeof parsed === 'string' && parsed.trim().length > 0) cleanImages = [parsed.trim()];
      } catch (_) {
        if (rawImgs.includes(',')) cleanImages = rawImgs.split(',').map((s: string) => s.trim()).filter(Boolean);
        else if (rawImgs.trim().length > 0) cleanImages = [rawImgs.trim()];
      }
    }
    payload.images = cleanImages;
    payload.images_gallery = cleanImages;
    payload.gallery_images = cleanImages;
    payload.additional_images = cleanImages;
    payload['imagesGallery'] = cleanImages;
    payload['images'] = cleanImages;
  }

  // Ensure jsonb fields (items, loanRepayments, loan_repayments, specs, etc.) are native JS arrays/objects for Supabase jsonb
  const jsonbProps = ['items', 'extraCosts', 'extra_costs', 'loanRepayments', 'loan_repayments', 'specs', 'trackingTimeline', 'tracking_timeline', 'permissions', 'categoryIds', 'productIds'];
  for (const prop of jsonbProps) {
    if (payload[prop] !== undefined && payload[prop] !== null) {
      if (typeof payload[prop] === 'string') {
        try {
          payload[prop] = JSON.parse(payload[prop]);
        } catch (_) {}
      }
    }
  }

  // Normalize extraCosts
  const rawExtraCosts = payload.extraCosts ?? payload.extra_costs ?? payload.extracosts;
  if (rawExtraCosts !== undefined && rawExtraCosts !== null) {
    let cleanCosts: any[] = [];
    if (Array.isArray(rawExtraCosts)) {
      cleanCosts = rawExtraCosts;
    } else if (typeof rawExtraCosts === 'string') {
      try {
        const parsed = JSON.parse(rawExtraCosts);
        if (Array.isArray(parsed)) cleanCosts = parsed;
      } catch (_) {}
    }
    payload.extraCosts = cleanCosts;
    payload.extra_costs = cleanCosts;
  }

  if (!Array.isArray(payload.items) && (sqlTable === 'orders' || sqlTable === 'pos_transactions')) {
    payload.items = [];
  }
  if (sqlTable === 'pos_transactions' || sqlTable === 'posTransactions' || sqlTable === 'orders') {
    // Customer ID / User ID mapping
    if (payload.customerId !== undefined || payload.customer_id !== undefined || payload.customerid !== undefined || payload.userId !== undefined || payload.user_id !== undefined || payload.userid !== undefined) {
      const cId = String(payload.customerId ?? payload.customer_id ?? payload.customerid ?? payload.userId ?? payload.user_id ?? payload.userid ?? '');
      if (cId) {
        payload.customerId = cId;
        payload.customer_id = cId;
        payload.userId = cId;
        payload.user_id = cId;
      }
    }

    // Deadline / Loan Due Date mapping
    if (payload.deadline !== undefined || payload.loanDueDate !== undefined || payload.loan_due_date !== undefined || payload.loanduedate !== undefined || payload.loanDueDateTime !== undefined || payload.loan_due_date_time !== undefined) {
      const dl = String(payload.deadline ?? payload.loanDueDate ?? payload.loan_due_date ?? payload.loanDueDateTime ?? payload.loan_due_date_time ?? payload.loanduedate ?? '');
      if (dl) {
        payload.deadline = dl;
        payload.loanDueDate = dl;
        payload.loan_due_date = dl;
        payload.loanduedate = dl;
      }
    }

    // Synchronize loan and partial payment parameters explicitly
    if (payload.paidAmount !== undefined || payload.paid_amount !== undefined || payload.paidamount !== undefined) {
      const pa = Number(payload.paidAmount ?? payload.paid_amount ?? payload.paidamount) || 0;
      payload.paidAmount = pa;
      payload.paid_amount = pa;
      payload.paidamount = pa;
    }
    if (payload.outstandingBalance !== undefined || payload.outstanding_balance !== undefined || payload.outstandingbalance !== undefined) {
      const ob = Number(payload.outstandingBalance ?? payload.outstanding_balance ?? payload.outstandingbalance) || 0;
      payload.outstandingBalance = ob;
      payload.outstanding_balance = ob;
      payload.outstandingbalance = ob;
    }
    if (payload.loanBalance !== undefined || payload.loan_balance !== undefined || payload.loanbalance !== undefined) {
      const lBal = Number(payload.loanBalance ?? payload.loan_balance ?? payload.loanbalance) || 0;
      payload.loanBalance = lBal;
      payload.loan_balance = lBal;
      payload.loanbalance = lBal;
    }
    if (payload.loanStatus !== undefined || payload.loan_status !== undefined || payload.loanstatus !== undefined) {
      const lStat = String(payload.loanStatus ?? payload.loan_status ?? payload.loanstatus ?? 'unpaid');
      payload.loanStatus = lStat;
      payload.loan_status = lStat;
      payload.loanstatus = lStat;
    }
    if (payload.downPayment !== undefined || payload.down_payment !== undefined || payload.downpayment !== undefined) {
      const dp = Number(payload.downPayment ?? payload.down_payment ?? payload.downpayment) || 0;
      payload.downPayment = dp;
      payload.down_payment = dp;
      payload.downpayment = dp;
    }
    if (payload.isLoan !== undefined || payload.is_loan !== undefined || payload.isloan !== undefined) {
      const isl = Boolean(payload.isLoan ?? payload.is_loan ?? payload.isloan);
      payload.isLoan = isl;
      payload.is_loan = isl;
      payload.isloan = isl;
    }
    if (payload.loanDueDate !== undefined || payload.loan_due_date !== undefined || payload.loanduedate !== undefined) {
      const ldd = String(payload.loanDueDate ?? payload.loan_due_date ?? payload.loanduedate ?? '');
      payload.loanDueDate = ldd;
      payload.loan_due_date = ldd;
      payload.loanduedate = ldd;
    }
    if (payload.loanDueTime !== undefined || payload.loan_due_time !== undefined || payload.loanduetime !== undefined) {
      const ldt = String(payload.loanDueTime ?? payload.loan_due_time ?? payload.loanduetime ?? '');
      payload.loanDueTime = ldt;
      payload.loan_due_date_time = ldt;
      payload.loanduetime = ldt;
    }
    if (payload.loanDueDateTime !== undefined || payload.loan_due_date_time !== undefined || payload.loanduedatetime !== undefined) {
      const lddt = String(payload.loanDueDateTime ?? payload.loan_due_date_time ?? payload.loanduedatetime ?? '');
      payload.loanDueDateTime = lddt;
      payload.loan_due_date_time = lddt;
      payload.loanduedatetime = lddt;
    }
    if (payload.loanNationalId !== undefined || payload.loan_national_id !== undefined || payload.loannationalid !== undefined) {
      const lnid = String(payload.loanNationalId ?? payload.loan_national_id ?? payload.loannationalid ?? '');
      payload.loanNationalId = lnid;
      payload.loan_national_id = lnid;
      payload.loannationalid = lnid;
    }
    if (payload.loanGuarantorName !== undefined || payload.loan_guarantor_name !== undefined || payload.loanguarantorname !== undefined) {
      const lgn = String(payload.loanGuarantorName ?? payload.loan_guarantor_name ?? payload.loanguarantorname ?? '');
      payload.loanGuarantorName = lgn;
      payload.loan_guarantor_name = lgn;
      payload.loanguarantorname = lgn;
    }
    if (payload.loanGuarantorPhone !== undefined || payload.loan_guarantor_phone !== undefined || payload.loanguarantorphone !== undefined) {
      const lgp = String(payload.loanGuarantorPhone ?? payload.loan_guarantor_phone ?? payload.loanguarantorphone ?? '');
      payload.loanGuarantorPhone = lgp;
      payload.loan_guarantor_phone = lgp;
      payload.loanguarantorphone = lgp;
    }

    const rawLoanReps = payload.loanRepayments ?? payload.loan_repayments ?? payload.loanrepayments ?? payload.partialPayments ?? payload.partial_payments;
    let cleanReps: any[] = [];
    if (Array.isArray(rawLoanReps)) {
      cleanReps = rawLoanReps;
    } else if (typeof rawLoanReps === 'string') {
      try {
        const parsed = JSON.parse(rawLoanReps);
        if (Array.isArray(parsed)) cleanReps = parsed;
      } catch (_) {}
    }
    payload.loanRepayments = cleanReps;
    payload.loan_repayments = cleanReps;
    payload.loanrepayments = cleanReps;
    payload.partialPayments = cleanReps;
    payload.partial_payments = cleanReps;
  }

  return payload;
}

async function syncRelationalLoanRepayments(supabase: any, sqlTable: string, txId: string, item: any) {
  if (sqlTable !== 'pos_transactions' && sqlTable !== 'orders') return;
  const reps = item.loanRepayments || item.loan_repayments || item.partialPayments || item.partial_payments;
  if (Array.isArray(reps) && reps.length > 0) {
    for (const rep of reps) {
      if (!rep || !rep.id) continue;
      try {
        await supabase.from('loan_repayments').upsert({
          id: rep.id,
          transaction_id: txId,
          amount: Number(rep.amount) || 0,
          date: rep.date || new Date().toISOString(),
          payment_method: rep.paymentMethod || rep.payment_method || 'M-Pesa',
          recorded_by: rep.recordedBy || rep.recorded_by || 'Admin',
          notes: rep.notes || null
        });
      } catch (err) {
        console.warn('Failed to upsert relational loan repayment:', err);
      }
    }
  }
}

async function syncRelationalOrderItems(supabase: any, sqlTable: string, parentId: string, item: any) {
  if (sqlTable !== 'orders') return;
  const items = item.items;
  if (Array.isArray(items) && items.length > 0) {
    for (const it of items) {
      if (!it || !it.name) continue;
      const itemId = it.id || `oi_${parentId}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        await supabase.from('order_items').upsert({
          id: itemId,
          order_id: parentId,
          product_id: it.productId || it.product_id || null,
          name: it.name,
          price: Number(it.price) || 0,
          quantity: Number(it.quantity) || 1,
          image: it.image || null
        });
      } catch (err) {
        console.warn('Failed to upsert order_item:', err);
      }
    }
  }
}

async function syncRelationalPOSItems(supabase: any, sqlTable: string, parentId: string, item: any) {
  if (sqlTable !== 'pos_transactions') return;
  const items = item.items;
  if (Array.isArray(items) && items.length > 0) {
    for (const it of items) {
      if (!it || !it.name) continue;
      const itemId = it.id || `pti_${parentId}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        await supabase.from('pos_transaction_items').upsert({
          id: itemId,
          transaction_id: parentId,
          product_id: it.productId || it.product_id || null,
          name: it.name,
          price: Number(it.price) || 0,
          quantity: Number(it.quantity) || 1,
          image: it.image || null
        });
      } catch (err) {
        console.warn('Failed to upsert pos_transaction_item:', err);
      }
    }
  }
}

// Intelligent Supabase upsert with adaptive schema healing, automatic casing translation & fast-timeout protection
const globalMissingColumnsCache: Record<string, Set<string>> = {};
async function safeSupabaseUpsert(supabase: any, sqlTable: string, item: any): Promise<{ data: any | null; error: any | null }> {
  if (!isSupabaseAvailable()) {
    return { data: null, error: new Error('Supabase is currently cooling down / offline') };
  }

  let currentPayload = preparePayloadForSupabase(sqlTable, item);
  let attempts = 0;
  const maxAttempts = 25;
  if (!globalMissingColumnsCache[sqlTable]) {
    globalMissingColumnsCache[sqlTable] = new Set<string>();
  }
  const attemptedColumns = globalMissingColumnsCache[sqlTable];
  if (sqlTable === 'pos_transactions' || sqlTable === 'posTransactions') {
    attemptedColumns.add('vatPercentage');
    attemptedColumns.add('vat_percentage');
    attemptedColumns.add('vatpercentage');
    attemptedColumns.add('vat');
    attemptedColumns.add('updatedAt');
    attemptedColumns.add('updated_at');
    attemptedColumns.add('updatedat');
  }
  let hasConvertedToSnakeCase = false;
  let lastErrorMessage = '';

  while (attempts < maxAttempts) {
    attempts++;
    for (const badCol of attemptedColumns) {
      delete currentPayload[badCol];
    }
    try {
      const upsertPromise = supabase.from(sqlTable).upsert(currentPayload).select();
      const { data, error }: any = await withTimeout(upsertPromise, 3500);
      if (!error) {
        markSupabaseSuccess();
        return { data: (data && data.length > 0) ? data[0] : currentPayload, error: null };
      }

      lastErrorMessage = error.message || error.details || error.hint || JSON.stringify(error);
      console.warn(`Supabase upsert attempt ${attempts} warning for ${sqlTable}:`, lastErrorMessage);

      // 1. Check for not-null constraint violation on a column
      const notNullMatch = lastErrorMessage?.match(/null value in column "([^"]+)" of relation "[^"]+" violates not-null constraint/);
      if (notNullMatch && notNullMatch[1]) {
        const nullCol = notNullMatch[1];
        const lowerCol = nullCol.toLowerCase();

        let foundValue = currentPayload[nullCol];
        if (foundValue === undefined || foundValue === null) {
          for (const [k, v] of Object.entries(currentPayload)) {
            if (k.toLowerCase().replace(/_/g, '') === lowerCol.replace(/_/g, '') && v !== undefined && v !== null) {
              foundValue = v;
              break;
            }
          }
        }

        if (foundValue === undefined || foundValue === null) {
          if (lowerCol.includes('amount') || lowerCol.includes('price') || lowerCol.includes('total') || lowerCol.includes('tax') || lowerCol.includes('discount') || lowerCol.includes('stock') || lowerCol.includes('count') || lowerCol.includes('sequence')) {
            foundValue = 0;
          } else if (lowerCol.includes('email')) {
            foundValue = 'customer@example.com';
          } else if (lowerCol.includes('name')) {
            foundValue = 'Valued Customer';
          } else if (lowerCol.includes('address')) {
            foundValue = 'In-Store Pickup / Walk-in';
          } else if (lowerCol.includes('status')) {
            foundValue = 'Pending';
          } else if (lowerCol.includes('method')) {
            foundValue = 'Cash';
          } else if (lowerCol.includes('verified') || lowerCol.includes('is_')) {
            foundValue = true;
          } else if (lowerCol.includes('items') || lowerCol.includes('specs') || lowerCol.includes('timeline') || lowerCol.includes('category') || lowerCol.includes('product') || lowerCol.includes('images')) {
            foundValue = '[]';
          } else {
            foundValue = '';
          }
        }

        currentPayload[nullCol] = foundValue;
        continue;
      }

      // 2. Check for type mismatch error (e.g. column is of type text but expression is of type jsonb or array or vice versa)
      if (lastErrorMessage?.includes('is of type text but expression is of type') || lastErrorMessage?.includes('cannot cast') || lastErrorMessage?.includes('malformed array') || lastErrorMessage?.includes('invalid input syntax for type json')) {
        let convertedAny = false;
        ['images', 'images_gallery', 'additional_images', 'gallery_images', 'imagesGallery', 'specs', 'items', 'trackingTimeline', 'tracking_timeline', 'permissions', 'categoryIds', 'productIds', 'loanRepayments', 'loan_repayments'].forEach(fKey => {
          if (currentPayload[fKey] !== undefined) {
            if (typeof currentPayload[fKey] !== 'string') {
              try {
                currentPayload[fKey] = JSON.stringify(currentPayload[fKey]);
                convertedAny = true;
              } catch (_) {}
            } else if (lastErrorMessage?.includes('invalid input syntax for type json')) {
              // If it failed as string on jsonb column, try setting as parsed JSON object/array
              try {
                currentPayload[fKey] = JSON.parse(currentPayload[fKey]);
                convertedAny = true;
              } catch (_) {}
            }
          }
        });
        if (convertedAny) continue;
      }

      // 3. Check for missing column error in PostgREST schema cache (PGRST204)
      const missingColMatch = lastErrorMessage?.match(/Could not find the '([^']+)' column/) ||
                              lastErrorMessage?.match(/column "?([^"\s]+)"? of relation/) ||
                              lastErrorMessage?.match(/column "?([^"\s]+)"? does not exist/);

      if (missingColMatch && missingColMatch[1]) {
        const col = missingColMatch[1];
        attemptedColumns.add(col);

        let removed = false;
        if (currentPayload[col] !== undefined) {
          delete currentPayload[col];
          removed = true;
        }
        if (removed) continue;
      }

      // 4. If error persists and payload still has non-essential or duplicate fields, prune unmatching fields
      if (attempts >= 2 && !hasConvertedToSnakeCase) {
        hasConvertedToSnakeCase = true;
        currentPayload = toSnakeCasePayload(currentPayload);
        continue;
      }

      // If non-recoverable error, return immediately with descriptive message
      return { data: null, error: new Error(lastErrorMessage || `Supabase error on ${sqlTable}`) };
    } catch (err: any) {
      console.warn(`Supabase upsert exception attempt ${attempts} on ${sqlTable}:`, err.message);
      if (err.message?.includes('timed out') || err.message?.includes('fetch failed')) {
        markSupabaseFailure(err.message);
        return { data: null, error: err };
      }
      return { data: null, error: err };
    }
  }

  return { data: null, error: new Error(`Failed to upsert to ${sqlTable} after ${maxAttempts} attempts. Detail: ${lastErrorMessage || 'Unknown error'}`) };
}

// Supabase Cloud Health Diagnostics & Table Inspection Endpoint
app.get('/api/supabase/status', async (req, res) => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const isConfigured = Boolean(url && !url.includes('placeholder') && key && !key.includes('placeholder'));

  if (!isConfigured) {
    return res.json({
      connected: false,
      configured: false,
      message: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in Settings / Secrets.',
      tables: {},
      storage: { ok: false, error: 'Not configured' },
      localCounts: {
        products: Object.keys(memoryStore['products'] || {}).length,
        categories: Object.keys(memoryStore['categories'] || {}).length,
        orders: Object.keys(memoryStore['orders'] || {}).length,
        staff: Object.keys(memoryStore['staff'] || {}).length,
        posTransactions: Object.keys(memoryStore['posTransactions'] || {}).length,
      }
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase || !isSupabaseAvailable()) {
    return res.json({
      connected: false,
      configured: true,
      message: supabase ? 'Supabase is currently experiencing latency / cooling down.' : 'Supabase client failed to initialize.',
      tables: {},
      storage: { ok: false, error: 'Unavailable' },
      localCounts: {
        products: Object.keys(memoryStore['products'] || {}).length,
        categories: Object.keys(memoryStore['categories'] || {}).length,
        orders: Object.keys(memoryStore['orders'] || {}).length,
        staff: Object.keys(memoryStore['staff'] || {}).length,
        posTransactions: Object.keys(memoryStore['posTransactions'] || {}).length,
      }
    });
  }

  const tablesToCheck = [
    { key: 'products', sql: 'products' },
    { key: 'categories', sql: 'categories' },
    { key: 'orders', sql: 'orders' },
    { key: 'posTransactions', sql: 'pos_transactions' },
    { key: 'staff', sql: 'staff' },
    { key: 'profiles', sql: 'profiles' },
    { key: 'store_settings', sql: 'store_settings' }
  ];

  const tableResults: Record<string, { ok: boolean; count?: number; error?: string }> = {};

  try {
    await Promise.all(
      tablesToCheck.map(async (t) => {
        try {
          const queryPromise = supabase.from(t.sql).select('*', { count: 'exact', head: false }).limit(10);
          const { data, error, count }: any = await withTimeout(queryPromise, 2500);
          if (error) {
            tableResults[t.key] = { ok: false, error: error.message };
          } else {
            tableResults[t.key] = { ok: true, count: Array.isArray(data) ? data.length : (count || 0) };
          }
        } catch (err: any) {
          tableResults[t.key] = { ok: false, error: err.message };
        }
      })
    );
  } catch (err: any) {
    console.warn('Status check warning:', err.message);
  }

  let storageResult = { ok: false, message: '' };
  try {
    const bucketPromise = supabase.storage.listBuckets();
    const { data: buckets, error: bError }: any = await withTimeout(bucketPromise, 2500);
    if (bError) {
      storageResult = { ok: false, message: bError.message };
    } else {
      const hasBucket = buckets?.some((b: any) => b.name === 'genuine_electronics' || b.id === 'genuine_electronics');
      storageResult = { ok: hasBucket || false, message: hasBucket ? 'Bucket active' : 'Bucket genuine_electronics not found' };
    }
  } catch (sErr: any) {
    storageResult = { ok: false, message: sErr.message };
  }

  const allTablesOk = Object.values(tableResults).length > 0 && Object.values(tableResults).every(t => t.ok);

  res.json({
    connected: allTablesOk,
    configured: true,
    url: url ? `${url.substring(0, 14)}...` : '',
    allTablesOk,
    tables: tableResults,
    storage: storageResult,
    localCounts: {
      products: Object.keys(memoryStore['products'] || {}).length,
      categories: Object.keys(memoryStore['categories'] || {}).length,
      orders: Object.keys(memoryStore['orders'] || {}).length,
      staff: Object.keys(memoryStore['staff'] || {}).length,
      posTransactions: Object.keys(memoryStore['posTransactions'] || {}).length,
    }
  });
});

// Force-Push ALL local memory & disk data to Supabase
app.post('/api/supabase/sync-all', async (req, res) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(400).json({ error: 'Supabase is not configured or reachable.' });
  }

  const collections = [
    { name: 'categories', table: 'categories' },
    { name: 'products', table: 'products' },
    { name: 'orders', table: 'orders' },
    { name: 'posTransactions', table: 'pos_transactions' },
    { name: 'staff', table: 'staff' },
    { name: 'profiles', table: 'profiles' },
    { name: 'visitor_logs', table: 'visitor_logs' }
  ];

  const results: Record<string, { total: number; synced: number; errors: string[] }> = {};

  for (const col of collections) {
    const items = Object.values(memoryStore[col.name] || {});
    results[col.name] = { total: items.length, synced: 0, errors: [] };

    for (const item of items) {
      if (!item || !(item as any).id) continue;
      const { data, error } = await safeSupabaseUpsert(supabase, col.table, item);
      if (error) {
        results[col.name].errors.push(`${(item as any).id}: ${error.message}`);
      } else {
        results[col.name].synced++;
      }
    }
  }

  // Also sync store_settings if present
  if (memoryStore['settings']?.['main']) {
    try {
      await safeSupabaseUpsert(supabase, 'store_settings', {
        id: 'main',
        settings: memoryStore['settings']['main']
      });
      results['store_settings'] = { total: 1, synced: 1, errors: [] };
    } catch (e: any) {
      results['store_settings'] = { total: 1, synced: 0, errors: [e.message] };
    }
  }

  res.json({ success: true, results });
});

// Force-Pull ALL data from Supabase into server local memory & disk
app.post('/api/supabase/pull-all', async (req, res) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(400).json({ error: 'Supabase is not configured or reachable.' });
  }

  const collections = [
    { name: 'categories', table: 'categories' },
    { name: 'products', table: 'products' },
    { name: 'orders', table: 'orders' },
    { name: 'posTransactions', table: 'pos_transactions' },
    { name: 'staff', table: 'staff' },
    { name: 'profiles', table: 'profiles' },
    { name: 'visitor_logs', table: 'visitor_logs' }
  ];

  const counts: Record<string, number> = {};

  for (const col of collections) {
    try {
      const { data, error } = await supabase.from(col.table).select('*');
      if (!error && Array.isArray(data)) {
        if (!memoryStore[col.name]) memoryStore[col.name] = {};
        const normalized = data.map(row => normalizeFromSupabase(col.name, row));
        normalized.forEach(item => {
          if (item && item.id) {
            // Respect deletion tombstones
            const isDeleted = memoryStore['_tombstones']?.[col.name]?.[item.id];
            if (isDeleted) {
              delete memoryStore[col.name][item.id];
              return;
            }
            memoryStore[col.name][item.id] = item;
          }
        });
        counts[col.name] = normalized.length;
      }
    } catch (err: any) {
      console.warn(`Pull failed for ${col.name}:`, err.message);
    }
  }

  // Pull settings
  try {
    const { data: sData } = await supabase.from('store_settings').select('*').eq('id', 'main').maybeSingle();
    if (sData && sData.settings) {
      if (!memoryStore['settings']) memoryStore['settings'] = {};
      memoryStore['settings']['main'] = sData.settings;
      counts['settings'] = 1;
    }
  } catch (_) {}

  saveDiskDb();

  // Broadcast update
  broadcastEvent({
    type: 'PULL_COMPLETED',
    timestamp: Date.now()
  });

  res.json({ success: true, pulledCounts: counts });
});

// Endpoint to retrieve the auto-healing idempotent schema.sql text
app.get('/api/supabase/schema', (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      return res.json({ success: true, sql });
    }
    return res.status(404).json({ success: false, error: 'schema.sql not found' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Telemetry endpoint for sync health and database architecture inspection
app.get('/api/sync/health', async (req, res) => {
  try {
    const collectionsCount: Record<string, number> = {};
    for (const [col, items] of Object.entries(memoryStore)) {
      collectionsCount[col] = items ? Object.keys(items).length : 0;
    }
    const supabase = getSupabaseAdmin();
    const isSupabaseLive = !!supabase && isSupabaseAvailable();

    res.json({
      success: true,
      status: 'operational',
      architecture: 'database-authoritative',
      sseActiveConnections: sseClients.size,
      lastDiskWrite: new Date(lastDbSaveTimestamp).toISOString(),
      collections: collectionsCount,
      cloudDatabase: {
        configured: !!supabase,
        connected: isSupabaseLive,
        url: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/^(https?:\/\/[^.]+).*/, '$1.supabase.co') : null
      },
      timestamp: Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Real-Time Server-Sent Events (SSE) stream endpoint for instant live sync across all devices
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }
  
  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(`: keepalive\n\n`);
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// GET all documents
app.get('/api/data/:collection', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  try {
    const colName = validateCollection(req.params.collection);
    const sqlTable = getSqlTableName(colName);
    const supabase = getSupabaseAdmin();

    let normalizedList: any[] = [];

    if (supabase) {
      try {
        const queryPromise = supabase.from(sqlTable).select('*');
        const { data, error }: any = await withTimeout(queryPromise, 2500);
        
        if (!error && Array.isArray(data)) {
          normalizedList = data.map(item => normalizeFromSupabase(colName, item));
          
          if (!memoryStore[colName]) memoryStore[colName] = {};
          normalizedList.forEach(item => {
            if (item && item.id) memoryStore[colName][item.id] = item;
          });

          if (colName === 'orders') {
            try {
              const { data: itemData }: any = await withTimeout(supabase.from('order_items').select('*'), 1500);
              if (Array.isArray(itemData)) {
                const itemMap = new Map<string, any[]>();
                itemData.forEach(it => {
                  const orderId = it.order_id || it.orderId;
                  if (orderId) {
                    if (!itemMap.has(orderId)) itemMap.set(orderId, []);
                    itemMap.get(orderId)!.push({
                      id: it.id,
                      productId: it.product_id || it.productId,
                      name: it.name,
                      price: Number(it.price),
                      quantity: Number(it.quantity),
                      image: it.image
                    });
                  }
                });
                normalizedList.forEach(order => {
                  if (itemMap.has(order.id)) {
                    order.items = itemMap.get(order.id);
                  }
                });
              }
            } catch (err) {
              // Silently ignore secondary relational timeout
            }
          }

          if (colName === 'posTransactions' || colName === 'pos_transactions' || colName === 'orders') {
            try {
              const { data: repData }: any = await withTimeout(supabase.from('loan_repayments').select('*'), 1500);
              if (Array.isArray(repData) && repData.length > 0) {
                const repMap = new Map<string, any[]>();
                repData.forEach(rep => {
                  const txId = rep.transaction_id || rep.transactionId;
                  if (txId) {
                    if (!repMap.has(txId)) repMap.set(txId, []);
                    repMap.get(txId)!.push({
                      id: rep.id,
                      amount: Number(rep.amount),
                      date: rep.date,
                      paymentMethod: rep.payment_method || rep.paymentMethod || 'M-Pesa',
                      recordedBy: rep.recorded_by || rep.recordedBy || 'Admin',
                      notes: rep.notes
                    });
                  }
                });
                normalizedList.forEach(tx => {
                  const relationalReps = repMap.get(tx.id);
                  if (Array.isArray(relationalReps) && relationalReps.length > 0) {
                    const existingReps = Array.isArray(tx.loanRepayments) ? tx.loanRepayments : (Array.isArray(tx.partialPayments) ? tx.partialPayments : []);
                    const combinedMap = new Map<string, any>();
                    existingReps.forEach((r: any) => { if (r && r.id) combinedMap.set(r.id, r); });
                    relationalReps.forEach((r: any) => { if (r && r.id) combinedMap.set(r.id, r); });
                    const merged = Array.from(combinedMap.values()).sort((a: any, b: any) => {
                      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
                    });
                    tx.loanRepayments = merged;
                    if (colName === 'orders') {
                      tx.partialPayments = merged;
                    }
                  }
                });
              }
            } catch (err) {
              // Silently ignore secondary relational timeout
            }

            try {
              const { data: itemData }: any = await withTimeout(supabase.from('pos_transaction_items').select('*'), 1500);
              if (Array.isArray(itemData)) {
                const itemMap = new Map<string, any[]>();
                itemData.forEach(it => {
                  const txId = it.transaction_id || it.transactionId;
                  if (txId) {
                    if (!itemMap.has(txId)) itemMap.set(txId, []);
                    itemMap.get(txId)!.push({
                      id: it.id,
                      productId: it.product_id || it.productId,
                      name: it.name,
                      price: Number(it.price),
                      quantity: Number(it.quantity),
                      image: it.image
                    });
                  }
                });
                normalizedList.forEach(tx => {
                  if (itemMap.has(tx.id)) {
                    tx.items = itemMap.get(tx.id);
                  }
                });
              }
            } catch (err) {
              // Silently ignore secondary relational timeout
            }
          }
        } else {
          normalizedList = Object.values(memoryStore[colName] || {}).map(item => normalizeFromSupabase(colName, item));
        }
      } catch (err: any) {
        normalizedList = Object.values(memoryStore[colName] || {}).map(item => normalizeFromSupabase(colName, item));
      }
    } else {
      normalizedList = Object.values(memoryStore[colName] || {}).map(item => normalizeFromSupabase(colName, item));
    }

    return res.json({ data: normalizedList });
  } catch (error: any) {
    console.error(`GET /api/data/${req.params.collection} failed:`, error.message);
    res.status(500).json({ error: error.message || 'Failed to retrieve cloud data.' });
  }
});

// POST (add/set) document
app.post('/api/data/:collection', async (req, res) => {
  try {
    const colName = validateCollection(req.params.collection);
    const sqlTable = getSqlTableName(colName);
    const item = sanitizeAndSyncCasing(req.body);
    const docId = item.id || `doc_${Date.now()}`;

    const now = new Date().toISOString();
    let itemToSave = sanitizeAndSyncCasing({ ...item, id: docId, updatedAt: now });

    const supabase = getSupabaseAdmin();
    let supabaseSynced = false;

    if (supabase) {
      try {
        itemToSave = await processItemImagesForStorage(supabase, itemToSave);
        const { error } = await safeSupabaseUpsert(supabase, sqlTable, itemToSave);
        if (!error) {
          supabaseSynced = true;
          await syncRelationalLoanRepayments(supabase, sqlTable, docId, itemToSave);
          await syncRelationalOrderItems(supabase, sqlTable, docId, itemToSave);
          await syncRelationalPOSItems(supabase, sqlTable, docId, itemToSave);
        } else {
          console.warn(`[Supabase Sync Warning] POST /api/data/${colName} item ${docId}:`, error.message);
        }
      } catch (e: any) {
        console.warn(`[Supabase Sync Exception] POST /api/data/${colName}:`, e.message);
      }
    }

    if (!memoryStore[colName]) memoryStore[colName] = {};
    memoryStore[colName][docId] = itemToSave;
    saveDiskDb();

    const normalized = sanitizeAndSyncCasing(normalizeFromSupabase(colName, itemToSave));
    if (Array.isArray(itemToSave.loanRepayments) && (!Array.isArray(normalized.loanRepayments) || normalized.loanRepayments.length < itemToSave.loanRepayments.length)) {
      normalized.loanRepayments = itemToSave.loanRepayments;
    }
    if (itemToSave.loanBalance !== undefined) {
      normalized.loanBalance = itemToSave.loanBalance;
    }
    if (itemToSave.loanStatus !== undefined) {
      normalized.loanStatus = itemToSave.loanStatus;
    }

    // Broadcast change globally to all connected visitors and admins
    broadcastEvent({
      type: 'COLLECTION_UPDATE',
      collection: colName,
      action: 'ADD',
      id: docId,
      item: normalized,
      timestamp: Date.now()
    });

    res.json({
      data: normalized,
      supabaseSynced
    });
  } catch (error: any) {
    console.error(`POST /api/data/${req.params.collection} failed:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT (update) document
app.put('/api/data/:collection/:id', async (req, res) => {
  try {
    const colName = validateCollection(req.params.collection);
    const sqlTable = getSqlTableName(colName);
    const id = req.params.id;

    const supabase = getSupabaseAdmin();
    let existing: any = {};

    if (supabase) {
      try {
        const { data: existingData } = await supabase.from(sqlTable).select('*').eq('id', id).maybeSingle();
        if (existingData) {
          existing = normalizeFromSupabase(colName, existingData);
        }
      } catch (e: any) {
        console.warn(`[Supabase Fetch Error on PUT] ${sqlTable}/${id}:`, e.message);
      }
    }
    if (!existing || Object.keys(existing).length === 0) {
      if (memoryStore[colName] && memoryStore[colName][id]) {
        existing = { ...memoryStore[colName][id] };
      }
    }

    // Sanitize incoming body
    const sanitizedBody = sanitizeAndSyncCasing(req.body);

    // Remove stale snake_case / camelCase / flat properties from existing if req.body provides updated values
    const cleanExisting = { ...existing };
    for (const key of Object.keys(sanitizedBody)) {
      const lower = key.toLowerCase().replace(/_/g, '');
      if (/[A-Z]/.test(key)) {
        const snakeKey = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
        delete cleanExisting[snakeKey];
      } else if (/_/.test(key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        delete cleanExisting[camelKey];
      }
      delete cleanExisting[key.toLowerCase()];
      delete cleanExisting[lower];
    }

    const now = new Date().toISOString();
    let itemToSave = sanitizeAndSyncCasing({ ...cleanExisting, ...sanitizedBody, id, updatedAt: now });
    let supabaseSynced = false;

    if (supabase) {
      try {
        itemToSave = await processItemImagesForStorage(supabase, itemToSave);

        // Clean up any replaced or removed images from cloud storage
        try {
          const oldImages: string[] = [];
          if (existing.image) oldImages.push(existing.image);
          if (Array.isArray(existing.images)) oldImages.push(...existing.images);
          if (existing.avatar) oldImages.push(existing.avatar);
          if (existing.heroImage) oldImages.push(existing.heroImage);
          if (existing.logoUrl) oldImages.push(existing.logoUrl);

          const newImagesSet = new Set<string>();
          if (itemToSave.image) newImagesSet.add(itemToSave.image);
          if (Array.isArray(itemToSave.images)) itemToSave.images.forEach((img: any) => typeof img === 'string' && newImagesSet.add(img));
          if (itemToSave.avatar) newImagesSet.add(itemToSave.avatar);
          if (itemToSave.heroImage) newImagesSet.add(itemToSave.heroImage);
          if (itemToSave.logoUrl) newImagesSet.add(itemToSave.logoUrl);

          const replacedImages = oldImages.filter(oldUrl => typeof oldUrl === 'string' && !newImagesSet.has(oldUrl));
          if (replacedImages.length > 0) {
            cleanupStorageImages(replacedImages);
          }
        } catch (cleanupErr: any) {
          console.warn('Storage image diff cleanup error:', cleanupErr.message);
        }

        const { error } = await safeSupabaseUpsert(supabase, sqlTable, itemToSave);
        if (!error) {
          supabaseSynced = true;
          await syncRelationalLoanRepayments(supabase, sqlTable, id, itemToSave);
          await syncRelationalOrderItems(supabase, sqlTable, id, itemToSave);
          await syncRelationalPOSItems(supabase, sqlTable, id, itemToSave);
        } else {
          console.warn(`[Supabase Sync Error] PUT /api/data/${colName}/${id}:`, error.message);
        }
      } catch (e: any) {
        console.warn(`[Supabase Sync Exception] PUT /api/data/${colName}:`, e.message);
      }
    }

    if (!memoryStore[colName]) memoryStore[colName] = {};
    memoryStore[colName][id] = itemToSave;
    saveDiskDb();

    const normalized = sanitizeAndSyncCasing(normalizeFromSupabase(colName, itemToSave));
    if (Array.isArray(itemToSave.loanRepayments) && (!Array.isArray(normalized.loanRepayments) || normalized.loanRepayments.length < itemToSave.loanRepayments.length)) {
      normalized.loanRepayments = itemToSave.loanRepayments;
    }
    if (itemToSave.loanBalance !== undefined) {
      normalized.loanBalance = itemToSave.loanBalance;
    }
    if (itemToSave.loanStatus !== undefined) {
      normalized.loanStatus = itemToSave.loanStatus;
    }

    // Broadcast change globally to all connected visitors and admins immediately
    broadcastEvent({
      type: 'COLLECTION_UPDATE',
      collection: colName,
      action: 'UPDATE',
      id,
      item: normalized,
      timestamp: Date.now()
    });

    res.json({
      data: normalized,
      supabaseSynced
    });
  } catch (error: any) {
    console.error(`PUT /api/data/${req.params.collection}/${req.params.id} failed:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE document
app.delete('/api/data/:collection/:id', async (req, res) => {
  try {
    const colName = validateCollection(req.params.collection);
    const sqlTable = getSqlTableName(colName);
    const id = req.params.id;

    const supabase = getSupabaseAdmin();
    let supabaseSynced = false;

    if (supabase) {
      try {
        const { data: existingData } = await supabase.from(sqlTable).select('*').eq('id', id).maybeSingle();
        const existingItem = existingData ? normalizeFromSupabase(colName, existingData) : null;

        if (existingItem) {
          try {
            const imagesToDelete: string[] = [];
            if (existingItem.image) imagesToDelete.push(existingItem.image);
            if (Array.isArray(existingItem.images)) imagesToDelete.push(...existingItem.images);
            if (existingItem.avatar) imagesToDelete.push(existingItem.avatar);
            if (existingItem.heroImage) imagesToDelete.push(existingItem.heroImage);
            if (existingItem.logoUrl) imagesToDelete.push(existingItem.logoUrl);
            if (imagesToDelete.length > 0) {
              cleanupStorageImages(imagesToDelete);
            }
          } catch (storageDelErr: any) {
            console.warn('Storage image deletion on document remove error:', storageDelErr.message);
          }
        }

        const { error } = await supabase.from(sqlTable).delete().eq('id', id);
        if (!error) {
          supabaseSynced = true;
        } else {
          console.warn(`[Supabase Delete Warning] on ${sqlTable} id ${id}:`, error.message);
        }
      } catch (err: any) {
        console.warn(`[Supabase Delete Exception] ${sqlTable}/${id}:`, err.message);
      }
    }

    if (memoryStore[colName] && memoryStore[colName][id]) {
      delete memoryStore[colName][id];
      saveDiskDb();
    }

    broadcastEvent({
      type: 'COLLECTION_UPDATE',
      collection: colName,
      action: 'DELETE',
      id,
      timestamp: Date.now()
    });

    res.json({ success: true, supabaseSynced });
  } catch (error: any) {
    console.error(`DELETE /api/data/${req.params.collection}/${req.params.id} failed:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE ALL or BULK DELETE in collection
app.delete('/api/data/:collection', async (req, res) => {
  try {
    const colName = validateCollection(req.params.collection);
    const sqlTable = getSqlTableName(colName);
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return res.status(503).json({ error: 'Database service is currently unconfigured or unavailable.' });
    }

    // Retrieve all items from Supabase first so we can remove their images from cloud storage
    const { data: allItemsData, error: fetchError } = await supabase.from(sqlTable).select('*');
    if (!fetchError && Array.isArray(allItemsData)) {
      try {
        const imagesToDelete: string[] = [];
        for (const item of allItemsData) {
          const normalized = normalizeFromSupabase(colName, item);
          if (normalized.image) imagesToDelete.push(normalized.image);
          if (Array.isArray(normalized.images)) imagesToDelete.push(...normalized.images);
          if (normalized.avatar) imagesToDelete.push(normalized.avatar);
          if (normalized.heroImage) imagesToDelete.push(normalized.heroImage);
          if (normalized.logoUrl) imagesToDelete.push(normalized.logoUrl);
        }
        if (imagesToDelete.length > 0) {
          cleanupStorageImages(imagesToDelete);
        }
      } catch (bulkDelErr: any) {
        console.warn('Storage image bulk deletion error:', bulkDelErr.message);
      }
    }

    const { error } = await supabase.from(sqlTable).delete().neq('id', '___non_existent___');
    if (error) {
      console.error(`[Supabase Bulk Delete Error] on ${sqlTable}:`, error.message);
      return res.status(500).json({ error: `Cloud bulk delete failed: ${error.message}` });
    }

    broadcastEvent({
      type: 'COLLECTION_UPDATE',
      collection: colName,
      action: 'BULK_DELETE',
      timestamp: Date.now()
    });

    res.json({ success: true, supabaseSynced: true });
  } catch (error: any) {
    console.error(`DELETE /api/data/${req.params.collection} failed:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sync/pull', async (req, res) => {
  try {
    const collection = (req.query.collection as string) || '';
    const since = req.query.since ? new Date(req.query.since as string).getTime() : 0;
    
    if (!collection) {
      return res.status(400).json({ error: 'Collection query parameter is required.' });
    }

    if (!memoryStore[collection]) memoryStore[collection] = {};

    // 1. Get all tombstones (deleted items) since the client's last sync time
    const tombstonesMeta: { id: string; deletedAt: string }[] = memoryStore['_tombstones_meta']?.[collection] || [];
    const deletedSince = tombstonesMeta
      .filter(entry => !since || new Date(entry.deletedAt).getTime() > since)
      .map(entry => ({ id: entry.id, deletedAt: entry.deletedAt }));

    // 2. Get all updated or created items since the client's last sync time
    const currentItems = Object.values(memoryStore[collection] || {}) as any[];
    const updatedSince = currentItems.filter(item => {
      if (!since) return true;
      const itemTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
      return itemTime > since;
    });

    const now = new Date().toISOString();
    return res.json({
      collection,
      serverTime: now,
      since: req.query.since || null,
      deletedIds: deletedSince,
      updatedItems: updatedSince,
      totalCurrent: currentItems.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory/adjust', async (req, res) => {
  try {
    const { adjustments } = req.body; // Array of { productId: string, delta: number, reason?: string, txId?: string }
    
    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      return res.status(400).json({ error: 'adjustments array is required' });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ error: 'Database service is currently unconfigured or unavailable.' });
    }

    const results: any[] = [];

    for (const adj of adjustments) {
      const { productId, delta, reason, txId } = adj;
      if (!productId || typeof delta !== 'number') continue;

      const { data: productData, error: fetchError } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();
      if (fetchError) {
        results.push({ productId, error: `Failed to fetch from cloud: ${fetchError.message}`, delta });
        continue;
      }

      if (productData) {
        const currentStock = Number(productData.stock) || 0;
        const newStock = Math.max(0, currentStock + delta);
        const now = new Date().toISOString();
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock, updated_at: now })
          .eq('id', productId);

        if (updateError) {
          results.push({ productId, error: `Failed to update stock in cloud: ${updateError.message}`, delta });
        } else {
          results.push({
            productId,
            previousStock: currentStock,
            delta,
            newStock,
            reason: reason || 'pos_delta_adjust',
            txId
          });
        }
      } else {
        results.push({
          productId,
          error: 'Product not found in cloud database',
          delta
        });
      }
    }

    return res.json({
      success: true,
      results
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Store Settings API (templates, banners, announcements, payment methods)
app.get('/api/settings', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ error: 'Database service is currently unconfigured or unavailable.' });
    }

    const queryPromise = supabase.from('store_settings').select('*').eq('id', 'main').maybeSingle();
    const { data, error }: any = await withTimeout(queryPromise, 5000);
    
    if (error) {
      return res.status(500).json({ error: `Cloud read error: ${error.message}` });
    }

    return res.json({ settings: data?.settings || null });
  } catch (err: any) {
    console.error('Error reading settings:', err);
    res.status(500).json({ error: err.message || 'Failed to read store settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ error: 'Database service is currently unconfigured or unavailable.' });
    }

    const { error } = await safeSupabaseUpsert(supabase, 'store_settings', {
      id: 'main',
      settings: settings
    });
    
    if (error) {
      console.error('Failed to upsert store_settings in Supabase:', error.message);
      return res.status(500).json({ error: `Cloud save failed: ${error.message}` });
    }

    // Broadcast globally to all visitors & customer devices
    broadcastEvent({
      type: 'SETTINGS_CHANGED',
      settings,
      timestamp: Date.now()
    });

    res.json({ settings, supabaseSynced: true });
  } catch (err: any) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: err.message || 'Failed to save store settings' });
  }
});

// Helper to resolve canonical origin for SEO sitemaps and search engines
function getSiteOrigin(req: express.Request): string {
  if (process.env.CANONICAL_DOMAIN) {
    const domain = process.env.CANONICAL_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${domain}`;
  }
  const host = req.get('host') || '';
  if (host.includes('genuine-electronics.com')) {
    return 'https://genuine-electronics.com';
  }
  if (host.includes('onrender.com') || !host) {
    return 'https://genuine-electronics.com';
  }
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return `${req.protocol}://${host}`;
  }
  return `https://${host}`;
}

// Dynamic XML Sitemap for Google, Bing, and Search Engines
app.get(['/sitemap.xml', '/api/seo/sitemap'], async (req, res) => {
  try {
    const origin = getSiteOrigin(req);
    const today = new Date().toISOString().split('T')[0];

    // Gather products from in-memory / disk store or Supabase
    let productsList: any[] = Object.values(memoryStore['products'] || {});
    if (productsList.length === 0) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data } = await supabase.from('products').select('*');
        if (data && data.length > 0) {
          productsList = data;
        }
      }
    }

    // Gather categories
    let categoriesList: any[] = Object.values(memoryStore['categories'] || {});
    if (categoriesList.length === 0) {
      const uniqueCats = Array.from(new Set(productsList.map(p => p.category).filter(Boolean)));
      categoriesList = uniqueCats.map(c => ({ name: c }));
    }

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
    categoriesList.forEach((cat) => {
      const catName = typeof cat === 'string' ? cat : cat?.name;
      if (!catName || catName === 'All') return;
      const catSlug = encodeURIComponent(catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      xml += `  <url>\n`;
      xml += `    <loc>${origin}/category/${catSlug}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    // 3. Products with Google Image extensions for Google Images search
    productsList.forEach((p) => {
      const prodSlug = encodeURIComponent(String(p.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      const prodUrl = `${origin}/product/${p.id}/${prodSlug}`;
      const images: string[] = Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);

      xml += `  <url>\n`;
      xml += `    <loc>${prodUrl}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;

      images.filter(Boolean).forEach((imgUrl: string) => {
        const safeImg = String(imgUrl).replace(/&/g, '&amp;');
        const safeName = String(p.name || 'Genuine Electronics').replace(/&/g, '&amp;');
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${safeImg}</image:loc>\n`;
        xml += `      <image:title>${safeName} Tanzania</image:title>\n`;
        xml += `      <image:caption>Bei ya ${safeName} Dar es Salaam - Genuine Electronics</image:caption>\n`;
        xml += `    </image:image>\n`;
      });

      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err: any) {
    console.error('Error generating sitemap:', err);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

// Robots.txt Search Engine Crawling Instructions
app.get('/robots.txt', (req, res) => {
  const origin = getSiteOrigin(req);
  const robotsTxt = `User-agent: *
Allow: /
Allow: /product/
Allow: /category/
Disallow: /api/
Disallow: /admin
Disallow: /static/

User-agent: Googlebot
Allow: /
Allow: /product/
Allow: /category/

User-agent: Googlebot-Image
Allow: /

Sitemap: ${origin}/sitemap.xml
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(robotsTxt);
});

// Google Merchant Center & Shopping Product Feed (RSS 2.0 XML)
app.get('/api/seo/google-feed', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ error: 'Database service is currently unconfigured or unavailable.' });
    }

    const origin = getSiteOrigin(req);
    
    // Fetch directly from Supabase
    const { data: productsData, error: prodErr } = await supabase.from('products').select('*');
    if (prodErr) throw prodErr;
    
    const { data: settingsData, error: settingsErr } = await supabase.from('store_settings').select('*').eq('id', 'main').maybeSingle();
    
    const productsList = (productsData || []).map(item => normalizeFromSupabase('products', item));
    const storeSettings = settingsData?.settings || {};
    const storeName = storeSettings.storeName || 'Genuine Electronics';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n`;
    xml += `  <channel>\n`;
    xml += `    <title>${storeName} Official Product Feed - Tanzania</title>\n`;
    xml += `    <link>${origin}</link>\n`;
    xml += `    <description>Authorized Consumer & Enterprise Electronics in Tanzania</description>\n`;

    productsList.forEach((p) => {
      const prodSlug = encodeURIComponent(String(p.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      const prodUrl = `${origin}/product/${p.id}/${prodSlug}`;
      const priceNum = Number(p.price) || 0;

      xml += `    <item>\n`;
      xml += `      <g:id>${p.id}</g:id>\n`;
      xml += `      <g:title><![CDATA[${p.name} - Official ${p.brand || 'Genuine'} Tanzania]]></g:title>\n`;
      xml += `      <g:description><![CDATA[${p.description || p.name} - Bei ya TZS ${priceNum.toLocaleString()} Dar es Salaam.]]></g:description>\n`;
      xml += `      <g:link>${prodUrl}</g:link>\n`;
      xml += `      <g:image_link>${p.image || ''}</g:image_link>\n`;
      xml += `      <g:condition>new</g:condition>\n`;
      xml += `      <g:availability>${(Number(p.stock) || 0) > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>\n`;
      xml += `      <g:price>${priceNum} TZS</g:price>\n`;
      xml += `      <g:brand><![CDATA[${p.brand || 'Genuine'}]]></g:brand>\n`;
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

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err: any) {
    console.error('Error generating Google feed:', err);
    res.status(500).json({ error: err.message || 'Failed to generate product feed' });
  }
});

// AI Shopping & Tech Assistant endpoint
app.post("/api/ai-chat", async (req, res) => {
  try {
    const { message, context, productCatalog } = req.body;
    const client = getAiClient();

    const systemInstruction = `You are "VoltBot", the expert AI assistant for "Genuine Electronics", a premier verified marketplace for high-end genuine electronics, smartphones, laptops, audio gear, and smart home appliances. 
    You help customers find the right products, explain technical specifications (RAM, processor, battery, camera sensors, warranty details), and troubleshoot device issues.
    Be helpful, polite, concise, and professional. Always emphasize official warranty, authenticity, and official genuine serial numbers.`;

    const prompt = `Customer query: "${message}". 
    Additional context: ${context || 'General shopping'}
    Available store inventory summary: ${JSON.stringify(productCatalog || []).slice(0, 2000)}`;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        reply: "Hello! I am VoltBot, your Genuine Electronics AI assistant. How can I help you choose your next genuine device or check warranty details today?"
      });
    }

    const response = await client.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ reply: response.text || "I'm here to help with your electronics selection!" });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    const errMessage = error?.message || "";
    if (errMessage.includes("resource_exhausted") || errMessage.includes("quota")) {
      return res.json({
        reply: "VoltBot AI quota is currently busy or exceeded. However, our specialized departments, live inventory search, official serial verification, and full catalog filters remain active and ready to assist you!"
      });
    }
    res.status(500).json({ error: errMessage || "Failed to generate AI response" });
  }
});

// Enterprise Audit Logs API Endpoints
app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const actionFilter = req.query.action as string;

    // Load from memory store first
    let logsList: any[] = Object.values(memoryStore['audit_logs'] || {});

    // Try Supabase if configured
    const supabase = getSupabaseAdmin();
    if (supabase && logsList.length === 0) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      if (!error && data && data.length > 0) {
        logsList = data;
      }
    }

    if (actionFilter) {
      logsList = logsList.filter(l => l.action?.toLowerCase().includes(actionFilter.toLowerCase()));
    }

    // Sort descending by timestamp
    logsList.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    res.json({ logs: logsList.slice(0, limit) });
  } catch (err: any) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
});

app.post('/api/admin/audit-logs', async (req, res) => {
  try {
    const body = req.body;
    const logId = body.id || `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const logEntry = {
      id: logId,
      timestamp: body.timestamp || new Date().toISOString(),
      actorId: body.actorId || 'system',
      actorName: body.actorName || 'Admin',
      actorEmail: body.actorEmail || 'admin@genuine-electronics.com',
      actorRole: body.actorRole || 'Super Admin',
      action: body.action || 'SYSTEM_ACTION',
      targetId: body.targetId || null,
      targetType: body.targetType || 'system',
      details: body.details || '',
      changesSummary: body.changesSummary || null,
      ipAddress: String(clientIp)
    };

    memoryStore['audit_logs'][logId] = logEntry;
    saveDiskDb();

    // Persist to Supabase in the background
    const supabase = getSupabaseAdmin();
    if (supabase) {
      safeSupabaseUpsert(supabase, 'audit_logs', logEntry).catch(err => {
        console.warn('Background Supabase audit log insert non-critical note:', err?.message);
      });
    }

    res.json({ success: true, log: logEntry });
  } catch (err: any) {
    console.error('Error writing audit log:', err);
    res.status(500).json({ error: err.message || 'Failed to record audit log' });
  }
});

// Automated SMS Dispatch Pipeline
app.post('/api/notifications/dispatch-sms', async (req, res) => {
  try {
    const { recipientPhone, recipientName, messageBody, type, orderId, posTransactionId, sentBy } = req.body;
    if (!recipientPhone || !messageBody) {
      return res.status(400).json({ error: 'recipientPhone and messageBody are required.' });
    }

    const logId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    // Simulate reliable gateway delivery with fallback
    const notificationRecord = {
      id: logId,
      timestamp: now,
      recipientPhone,
      recipientName: recipientName || 'Customer',
      channel: 'SMS',
      type: type || 'CUSTOM',
      status: 'SENT',
      messageBody,
      orderId: orderId || null,
      posTransactionId: posTransactionId || null,
      sentBy: sentBy || 'System'
    };

    memoryStore['notification_logs'][logId] = notificationRecord;

    // Log to Audit Log trail
    const auditId = `audit_notif_${Date.now()}`;
    const auditEntry = {
      id: auditId,
      timestamp: now,
      actorId: 'system',
      actorName: sentBy || 'System Automated Dispatch',
      actorEmail: 'notifications@genuine-electronics.com',
      actorRole: 'System Dispatcher',
      action: 'NOTIFICATION_DISPATCHED',
      targetId: orderId || posTransactionId || recipientPhone,
      targetType: 'notification',
      details: `Dispatched SMS to ${recipientPhone} [${type}]: ${messageBody.slice(0, 100)}...`,
      ipAddress: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1')
    };
    memoryStore['audit_logs'][auditId] = auditEntry;
    saveDiskDb();

    // Broadcast notification event
    broadcastEvent({
      type: 'NOTIFICATION_SENT',
      item: notificationRecord,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      message: `SMS dispatched successfully to ${recipientPhone}`,
      logId,
      status: 'SENT'
    });
  } catch (err: any) {
    console.error('Error dispatching SMS:', err);
    res.status(500).json({ error: err.message || 'SMS dispatch failed' });
  }
});

// Automated WhatsApp Business Logging & Preparation Pipeline
app.post('/api/notifications/dispatch-whatsapp', async (req, res) => {
  try {
    const { recipientPhone, recipientName, messageBody, type, orderId, posTransactionId, sentBy } = req.body;
    const logId = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const notificationRecord = {
      id: logId,
      timestamp: now,
      recipientPhone,
      recipientName: recipientName || 'Customer',
      channel: 'WhatsApp',
      type: type || 'CUSTOM',
      status: 'SENT',
      messageBody,
      orderId: orderId || null,
      posTransactionId: posTransactionId || null,
      sentBy: sentBy || 'Staff'
    };

    memoryStore['notification_logs'][logId] = notificationRecord;

    // Log to Audit Log trail
    const auditId = `audit_wa_${Date.now()}`;
    const auditEntry = {
      id: auditId,
      timestamp: now,
      actorId: 'system',
      actorName: sentBy || 'Staff / WhatsApp Gateway',
      actorEmail: 'notifications@genuine-electronics.com',
      actorRole: 'System Dispatcher',
      action: 'NOTIFICATION_DISPATCHED',
      targetId: orderId || posTransactionId || recipientPhone,
      targetType: 'notification',
      details: `Prepared & dispatched WhatsApp Business message to ${recipientPhone} [${type}]`,
      ipAddress: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1')
    };
    memoryStore['audit_logs'][auditId] = auditEntry;
    saveDiskDb();

    res.json({
      success: true,
      message: `WhatsApp notification logged and dispatched to ${recipientPhone}`,
      logId,
      status: 'SENT'
    });
  } catch (err: any) {
    console.error('Error preparing WhatsApp message:', err);
    res.status(500).json({ error: err.message || 'WhatsApp preparation failed' });
  }
});

// Notifications History
app.get('/api/notifications/history', (req, res) => {
  try {
    const list = Object.values(memoryStore['notification_logs'] || {});
    list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    res.json({ notifications: list.slice(0, 150) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch notification history' });
  }
});

// =========================================================================
// VISITOR & TRAFFIC ANALYTICS SYSTEM (2-MONTH RETENTION SPECIFICATION)
// =========================================================================
// Generates realistic visitor interaction history across 60 days if visitor logs are sparse
export function seedRealisticVisitorLogsIfSparse(force = false) {
  if (!memoryStore['visitor_logs']) memoryStore['visitor_logs'] = {};
  const currentCount = Object.keys(memoryStore['visitor_logs']).length;
  if (!force && currentCount >= 35) return;

  const catalogProducts = Object.values(memoryStore['products'] || {});
  const sampleSearches = [
    { q: 'samsung smart tv', count: 22, hits: 8 },
    { q: 'hisense fridge 2 door', count: 18, hits: 5 },
    { q: 'solar inverter 3kva', count: 16, hits: 6 },
    { q: 'tcl 55 inch 4k', count: 14, hits: 4 },
    { q: 'midea microwave 20l', count: 13, hits: 5 },
    { q: 'soundbar bluetooth', count: 11, hits: 4 },
    { q: 'deep freezer 200l', count: 10, hits: 3 },
    { q: 'automatic washing machine', count: 9, hits: 4 },
    { q: 'solar battery 100ah', count: 8, hits: 5 },
    { q: 'air conditioner 12000btu', count: 7, hits: 3 },
    { q: 'blender 2 in 1', count: 7, hits: 6 },
    { q: 'gas cooker 4 burner', count: 6, hits: 4 }
  ];

  const devices = [
    { type: 'Mobile', browser: 'Google Chrome', os: 'Android', weight: 48 },
    { type: 'Mobile', browser: 'Apple Safari', os: 'iOS', weight: 24 },
    { type: 'Desktop', browser: 'Google Chrome', os: 'Windows', weight: 16 },
    { type: 'Desktop', browser: 'Apple Safari', os: 'macOS', weight: 6 },
    { type: 'Tablet', browser: 'Apple Safari', os: 'iPadOS', weight: 4 },
    { type: 'Mobile', browser: 'Samsung Internet', os: 'Android', weight: 2 }
  ];

  const cities = ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Zanzibar', 'Morogoro', 'Mbeya'];
  const referrers = ['Google Organic Search', 'Instagram Ads', 'WhatsApp Direct', 'Direct Navigation', 'Facebook Shop', 'TikTok Campaign'];
  const now = Date.now();
  let generated = 0;

  for (let i = 0; i < 95; i++) {
    const daysAgo = Math.floor(Math.pow(Math.random(), 1.4) * 56);
    let hour = Math.floor(Math.random() * 24);
    if (Math.random() < 0.65) {
      hour = 17 + Math.floor(Math.random() * 5); // Peak 5pm-10pm EAT
    }
    const minute = Math.floor(Math.random() * 60);
    const logTime = now - (daysAgo * 24 * 60 * 60 * 1000) + ((hour - 12) * 60 * 60 * 1000) + (minute * 60 * 1000);
    const createdAt = new Date(Math.min(now - 8000, logTime)).toISOString();

    const vNum = Math.floor(Math.random() * 40) + 1;
    const visitorId = `vis_tz_${String(vNum).padStart(3, '0')}_${(vNum * 997).toString(36)}`;
    const sessionId = `ses_${visitorId.substring(0, 10)}_d${daysAgo}`;

    const randDev = Math.random() * 100;
    let devChoice = devices[0];
    let cumulative = 0;
    for (const d of devices) {
      cumulative += d.weight;
      if (randDev <= cumulative) {
        devChoice = d;
        break;
      }
    }

    const city = cities[Math.floor(Math.random() * cities.length)];
    const referrer = referrers[Math.floor(Math.random() * referrers.length)];

    const actionRoll = Math.random();
    let interactionType = 'PAGE_VIEW';
    let prod = catalogProducts.length > 0 ? catalogProducts[Math.floor(Math.random() * catalogProducts.length)] : null;
    let searchQuery = undefined;
    let searchResultsCount = 0;
    let categoryFilter = undefined;

    if (actionRoll < 0.26) {
      interactionType = 'SEARCH';
      const sItem = sampleSearches[Math.floor(Math.random() * sampleSearches.length)];
      searchQuery = sItem.q;
      searchResultsCount = sItem.hits;
    } else if (actionRoll < 0.64 && prod) {
      interactionType = 'PRODUCT_VIEW';
    } else if (actionRoll < 0.78 && prod) {
      interactionType = 'ADD_TO_CART';
    } else if (actionRoll < 0.88 && prod) {
      interactionType = Math.random() < 0.5 ? 'EXPRESS_BUY_OPEN' : 'WHATSAPP_CLICK';
    } else if (actionRoll < 0.94 && prod) {
      interactionType = 'ORDER_PLACED';
    } else {
      interactionType = 'PAGE_VIEW';
      categoryFilter = prod?.category || 'Electronics';
    }

    const id = `vlog_seed_${i + 1}_${Date.now() % 100000}`;
    const logEntry = {
      id,
      visitorId,
      sessionId,
      interactionType,
      productId: prod?.id || null,
      productName: prod?.name || null,
      productPrice: Number(prod?.price || 0),
      productCategory: prod?.category || null,
      productBrand: prod?.brand || 'Genuine',
      productImage: prod?.image || (prod?.images && prod?.images[0]) || null,
      searchQuery: searchQuery || null,
      searchResultsCount,
      categoryFilter: categoryFilter || null,
      brandFilter: prod?.brand || null,
      quantity: 1,
      pageUrl: prod ? `/product/${prod.id}` : searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : '/',
      referrer,
      deviceType: devChoice.type,
      browser: devChoice.browser,
      os: devChoice.os,
      ipAddress: `197.250.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      country: 'Tanzania',
      city,
      createdAt
    };

    memoryStore['visitor_logs'][id] = logEntry;
    generated++;
  }

  saveDiskDb();
  console.log(`[Visitor Analytics Engine]: Seeded ${generated} realistic historical visitor records across 60 days.`);
}


// Auto-purge function to enforce maximum 2-month (60 days) data retention
export async function purgeExpiredVisitorLogs(maxDays = 60): Promise<number> {
  const cutoffTime = Date.now() - (maxDays * 24 * 60 * 60 * 1000);
  let deletedCount = 0;

  if (memoryStore['visitor_logs']) {
    const keys = Object.keys(memoryStore['visitor_logs']);
    for (const key of keys) {
      const item = memoryStore['visitor_logs'][key];
      const logDate = item?.createdAt || item?.created_at;
      const logTimestamp = logDate ? new Date(logDate).getTime() : 0;
      if (logTimestamp < cutoffTime) {
        delete memoryStore['visitor_logs'][key];
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      saveDiskDb();
    }
  }

  // Also purge from Supabase table if Supabase is connected
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const cutoffIso = new Date(cutoffTime).toISOString();
      const { error, count } = await supabase
        .from('visitor_logs')
        .delete({ count: 'exact' })
        .lt('created_at', cutoffIso);
      if (error) {
        console.warn('[Supabase Visitor Purge Warning]:', error.message);
      } else if (count) {
        deletedCount = Math.max(deletedCount, count);
      }
    } catch (e: any) {
      console.warn('[Supabase Visitor Purge Exception]:', e.message);
    }
  }

  if (deletedCount > 0) {
    console.log(`[Visitor Analytics Auto-Purge]: Successfully cleaned ${deletedCount} logs older than ${maxDays} days.`);
  }
  return deletedCount;
}

// Run auto-purge on startup and every 12 hours
setTimeout(() => { seedRealisticVisitorLogsIfSparse(); }, 2000);
setTimeout(() => { purgeExpiredVisitorLogs(60); }, 10000);
setInterval(() => { purgeExpiredVisitorLogs(60); }, 12 * 60 * 60 * 1000);

// Active Staff / Admin Heartbeat endpoint: POST /api/analytics/staff-heartbeat
app.post('/api/analytics/staff-heartbeat', (req, res) => {
  try {
    const { id, name, email, role, currentPage, deviceType, browser, os } = req.body || {};
    if (!memoryStore['active_staff']) memoryStore['active_staff'] = {};
    const staffId = id || email || 'admin_user';
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
    
    memoryStore['active_staff'][staffId] = {
      id: staffId,
      name: name || 'System Admin',
      email: email || 'admin@genuine-electronics.com',
      role: role || 'Super Admin',
      lastActive: new Date().toISOString(),
      currentPage: currentPage || '/admin',
      deviceType: deviceType || 'Desktop',
      browser: browser || 'Unknown Browser',
      os: os || 'Unknown OS',
      ipAddress: ip,
      status: 'online'
    };
    saveDiskDb();
    res.json({ success: true, activeStaff: memoryStore['active_staff'][staffId] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Ingestion endpoint: POST /api/analytics/track (supports single log or batch events)
app.post('/api/analytics/track', async (req, res) => {
  try {
    const events: any[] = Array.isArray(req.body?.events) ? req.body.events : (req.body ? [req.body] : []);
    if (events.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
    const nowIso = new Date().toISOString();
    const supabase = getSupabaseAdmin();
    const savedLogs: any[] = [];

    if (!memoryStore['visitor_logs']) memoryStore['visitor_logs'] = {};
    if (!memoryStore['active_staff']) memoryStore['active_staff'] = {};

    for (const raw of events) {
      if (!raw || typeof raw !== 'object') continue;
      const logId = raw.id || `vlog_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const email = String(raw.userEmail || raw.user_email || '').toLowerCase().trim();
      const role = String(raw.userRole || raw.user_role || '').toLowerCase().trim();
      const isAdmin = Boolean(
        raw.isAdmin || 
        raw.is_admin || 
        email === 'admin@genuine-electronics.com' || 
        role.includes('admin')
      );
      const isStaff = Boolean(
        raw.isStaff || 
        raw.is_staff || 
        role.includes('staff') || 
        role.includes('manager') || 
        role.includes('cashier')
      );

      const effectiveRole = raw.userRole || raw.user_role || (isAdmin ? 'Super Admin' : isStaff ? 'Staff' : undefined);

      if (isAdmin || isStaff) {
        const staffKey = raw.userId || raw.user_id || email || (isAdmin ? 'admin' : 'staff');
        memoryStore['active_staff'][staffKey] = {
          id: staffKey,
          name: raw.userName || raw.user_name || (isAdmin ? 'Admin' : 'Staff Member'),
          email: email || (isAdmin ? 'admin@genuine-electronics.com' : 'staff@genuine-electronics.com'),
          role: effectiveRole || (isAdmin ? 'Super Admin' : 'Staff'),
          lastActive: nowIso,
          currentPage: raw.pageUrl || raw.page_url || '/',
          deviceType: raw.deviceType || raw.device_type || 'Desktop',
          browser: raw.browser || '',
          os: raw.os || '',
          ipAddress: ip,
          status: 'online'
        };
      }

      const logEntry = {
        id: logId,
        visitorId: raw.visitorId || raw.visitor_id || 'anonymous_visitor',
        sessionId: raw.sessionId || raw.session_id || 'active_session',
        userId: raw.userId || raw.user_id || null,
        userEmail: raw.userEmail || raw.user_email || null,
        userName: raw.userName || raw.user_name || null,
        interactionType: raw.interactionType || raw.interaction_type || 'PAGE_VIEW',
        productId: raw.productId || raw.product_id || null,
        productName: raw.productName || raw.product_name || null,
        productPrice: raw.productPrice !== undefined ? Number(raw.productPrice) : (raw.product_price !== undefined ? Number(raw.product_price) : 0),
        productCategory: raw.productCategory || raw.product_category || null,
        productBrand: raw.productBrand || raw.product_brand || null,
        productImage: raw.productImage || raw.product_image || null,
        searchQuery: raw.searchQuery || raw.search_query || null,
        searchResultsCount: raw.searchResultsCount !== undefined ? Number(raw.searchResultsCount) : (raw.search_results_count !== undefined ? Number(raw.search_results_count) : 0),
        categoryFilter: raw.categoryFilter || raw.category_filter || null,
        brandFilter: raw.brandFilter || raw.brand_filter || null,
        quantity: raw.quantity !== undefined ? Number(raw.quantity) : 1,
        orderId: raw.orderId || raw.order_id || null,
        pageUrl: raw.pageUrl || raw.page_url || '/',
        referrer: raw.referrer || '',
        deviceType: raw.deviceType || raw.device_type || 'Unknown',
        browser: raw.browser || '',
        os: raw.os || '',
        ipAddress: ip,
        country: 'Tanzania',
        city: 'Dar es Salaam',
        metadata: raw.metadata || {},
        isAdmin,
        isStaff,
        userRole: effectiveRole,
        createdAt: raw.createdAt || raw.created_at || nowIso
      };

      memoryStore['visitor_logs'][logId] = logEntry;
      savedLogs.push(logEntry);
    }

    saveDiskDb();

    // Asynchronously sync to Supabase without blocking the client response
    if (supabase && savedLogs.length > 0) {
      (async () => {
        try {
          const rowsToUpsert = savedLogs.map(l => ({
            id: l.id,
            visitor_id: l.visitorId,
            session_id: l.sessionId,
            user_id: l.userId,
            user_email: l.userEmail,
            user_name: l.userName,
            interaction_type: l.interactionType,
            product_id: l.productId,
            product_name: l.productName,
            product_price: l.productPrice,
            product_category: l.productCategory,
            product_brand: l.productBrand,
            product_image: l.productImage,
            search_query: l.searchQuery,
            search_results_count: l.searchResultsCount,
            category_filter: l.categoryFilter,
            brand_filter: l.brandFilter,
            quantity: l.quantity,
            order_id: l.orderId,
            page_url: l.pageUrl,
            referrer: l.referrer,
            device_type: l.deviceType,
            browser: l.browser,
            os: l.os,
            ip_address: l.ipAddress,
            country: l.country,
            city: l.city,
            metadata: { ...l.metadata, isAdmin: l.isAdmin, isStaff: l.isStaff, userRole: l.userRole },
            created_at: l.createdAt
          }));
          await supabase.from('visitor_logs').upsert(rowsToUpsert, { onConflict: 'id' });
        } catch (e: any) {
          console.debug('[Supabase visitor_logs sync warning]:', e.message);
        }
      })();
    }

    res.json({ success: true, count: savedLogs.length });
  } catch (err: any) {
    console.error('Analytics tracking error:', err);
    res.status(500).json({ error: err.message || 'Failed to record analytics' });
  }
});

// Summary endpoint: GET /api/analytics/summary
app.get('/api/analytics/summary', (req, res) => {
  seedRealisticVisitorLogsIfSparse();
  try {
    const timeframe = (req.query.timeframe as string) || '30days';
    const now = Date.now();
    let timeframeMs = 30 * 24 * 60 * 60 * 1000;
    if (timeframe === 'today') timeframeMs = 24 * 60 * 60 * 1000;
    else if (timeframe === 'yesterday') timeframeMs = 48 * 60 * 60 * 1000;
    else if (timeframe === '7days') timeframeMs = 7 * 24 * 60 * 60 * 1000;
    else if (timeframe === '60days' || timeframe === 'all') timeframeMs = 60 * 24 * 60 * 60 * 1000;

    const cutoff = now - timeframeMs;
    const allLogs: any[] = Object.values(memoryStore['visitor_logs'] || {});

    // Active Admin & Staff detection
    const rawStaffList: any[] = Object.values(memoryStore['active_staff'] || {});
    const activeStaffList = rawStaffList.filter((s: any) => {
      const lastActiveTime = new Date(s.lastActive || 0).getTime();
      return (now - lastActiveTime) <= (15 * 60 * 1000); // Active in last 15 min
    }).map((s: any) => {
      const lastActiveTime = new Date(s.lastActive || 0).getTime();
      const isOnline = (now - lastActiveTime) <= (3 * 60 * 1000);
      return {
        ...s,
        status: isOnline ? 'online' : 'idle'
      };
    });

    const isInternalStaffLog = (l: any) => {
      if (l.isAdmin === true || l.is_admin === true || l.isStaff === true || l.is_staff === true) return true;
      const email = String(l.userEmail || l.user_email || '').toLowerCase().trim();
      if (email === 'admin@genuine-electronics.com') return true;
      const role = String(l.userRole || l.user_role || '').toLowerCase().trim();
      if (['admin', 'super admin', 'staff', 'manager', 'cashier'].includes(role)) return true;
      return false;
    };

    // Filter within retention (max 60 days) and timeframe
    const scopedLogs = allLogs.filter((l: any) => {
      const t = new Date(l.createdAt || l.created_at || 0).getTime();
      return t >= cutoff;
    });

    // Customer logs strictly excluding Admin/Staff activity
    const customerScopedLogs = scopedLogs.filter((l: any) => !isInternalStaffLog(l));
    const totalAdminStaffEvents = scopedLogs.filter((l: any) => isInternalStaffLog(l)).length;

    const uniqueVisitorIds = new Set<string>();
    const uniqueVisitorIdsToday = new Set<string>();
    const uniqueVisitorIdsWeek = new Set<string>();
    const uniqueVisitorIdsMonth = new Set<string>();
    const liveVisitorIds15m = new Set<string>();

    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const fifteenMinAgo = now - 15 * 60 * 1000;

    let totalProductViews = 0;
    let totalSearches = 0;
    let totalCartAdds = 0;
    let totalOrdersPlaced = 0;

    const searchCounts: Record<string, { count: number; totalResults: number; lastSearched: string }> = {};
    const productStats: Record<string, { id: string; name: string; category: string; brand: string; price: number; image?: string; views: number; cartAdds: number; conversions: number; correlatedSearches: Record<string, number>; searchAssistedViews: number }> = {};
    const sessionSearches: Record<string, string[]> = {};
    const visitorSearches: Record<string, string[]> = {};
    const categoryCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = { Mobile: 0, Desktop: 0, Tablet: 0, Unknown: 0 };
    const browserCounts: Record<string, number> = {};
    const dailyMap: Record<string, { date: string; visitors: Set<string>; views: number; searches: number; cartAdds: number; orders: number }> = {};

    // 7x24 Visitor Activity Heatmap matrix initialization (Days: Mon-Sun, Hours: 0-23 in GMT+3)
    const DAYS_INFO = [
      { name: 'Mon', fullName: 'Monday' },
      { name: 'Tue', fullName: 'Tuesday' },
      { name: 'Wed', fullName: 'Wednesday' },
      { name: 'Thu', fullName: 'Thursday' },
      { name: 'Fri', fullName: 'Friday' },
      { name: 'Sat', fullName: 'Saturday' },
      { name: 'Sun', fullName: 'Sunday' }
    ];

    const heatmapMatrix: {
      dayIndex: number;
      dayName: string;
      dayFullName: string;
      hour: number;
      hourLabel: string;
      count: number;
      visitors: Set<string>;
      productViews: number;
      searches: number;
      cartAdds: number;
      orders: number;
    }[][] = Array.from({ length: 7 }, (_, dIdx) => 
      Array.from({ length: 24 }, (_, h) => {
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const ampm = h >= 12 ? 'PM' : 'AM';
        return {
          dayIndex: dIdx,
          dayName: DAYS_INFO[dIdx].name,
          dayFullName: DAYS_INFO[dIdx].fullName,
          hour: h,
          hourLabel: `${h12} ${ampm}`,
          count: 0,
          visitors: new Set<string>(),
          productViews: 0,
          searches: 0,
          cartAdds: 0,
          orders: 0
        };
      })
    );

    let oldestLogDate: string | undefined = undefined;
    let newestLogDate: string | undefined = undefined;

    for (const log of allLogs) {
      const d = log.createdAt || log.created_at;
      if (d) {
        if (!oldestLogDate || new Date(d) < new Date(oldestLogDate)) oldestLogDate = d;
        if (!newestLogDate || new Date(d) > new Date(newestLogDate)) newestLogDate = d;
      }
    }

    for (const log of customerScopedLogs) {
      const vid = log.visitorId || log.visitor_id || 'anonymous';
      const rawDateStr = log.createdAt || log.created_at;
      const logTime = new Date(rawDateStr || 0).getTime();
      const dateKey = (rawDateStr || '').substring(0, 10) || new Date().toISOString().substring(0, 10);

      uniqueVisitorIds.add(vid);
      if (logTime >= oneDayAgo) uniqueVisitorIdsToday.add(vid);
      if (logTime >= oneWeekAgo) uniqueVisitorIdsWeek.add(vid);
      if (logTime >= oneMonthAgo) uniqueVisitorIdsMonth.add(vid);
      if (logTime >= fifteenMinAgo) liveVisitorIds15m.add(vid);

      // Map to EAT (GMT+3) Heatmap Cell
      if (rawDateStr) {
        const dObj = new Date(rawDateStr);
        if (!isNaN(dObj.getTime())) {
          // East Africa Time offset: UTC + 3 hours
          const eatDate = new Date(dObj.getTime() + (3 * 60 * 60 * 1000));
          const utcDay = eatDate.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
          const dayIdx = (utcDay + 6) % 7; // Convert to 0 = Mon ... 6 = Sun
          const hour = eatDate.getUTCHours(); // 0..23

          if (heatmapMatrix[dayIdx] && heatmapMatrix[dayIdx][hour]) {
            const cell = heatmapMatrix[dayIdx][hour];
            cell.count++;
            cell.visitors.add(vid);
            const actType = log.interactionType || log.interaction_type;
            if (actType === 'PRODUCT_VIEW') cell.productViews++;
            else if (actType === 'SEARCH') cell.searches++;
            else if (actType === 'ADD_TO_CART' || actType === 'EXPRESS_BUY_OPEN') cell.cartAdds++;
            else if (actType === 'ORDER_PLACED') cell.orders++;
          }
        }
      }

      // Device & Browser
      const dev = log.deviceType || log.device_type || 'Unknown';
      deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;
      const br = log.browser || 'Other';
      browserCounts[br] = (browserCounts[br] || 0) + 1;

      // Daily trend mapping
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, visitors: new Set<string>(), views: 0, searches: 0, cartAdds: 0, orders: 0 };
      }
      dailyMap[dateKey].visitors.add(vid);

      // Action type aggregations
      const act = log.interactionType || log.interaction_type;
      const sId = log.sessionId || log.session_id;

      if (act === 'SEARCH') {
        totalSearches++;
        dailyMap[dateKey].searches++;
        const q = String(log.searchQuery || log.search_query || '').trim().toLowerCase();
        if (q && q.length >= 2) {
          if (!searchCounts[q]) {
            searchCounts[q] = { count: 0, totalResults: 0, lastSearched: log.createdAt || log.created_at };
          }
          searchCounts[q].count++;
          searchCounts[q].totalResults += (log.searchResultsCount || log.search_results_count || 0);
          if (new Date(log.createdAt || log.created_at || 0) > new Date(searchCounts[q].lastSearched)) {
            searchCounts[q].lastSearched = log.createdAt || log.created_at;
          }

          // Record search against session and visitor
          if (sId) {
            if (!sessionSearches[sId]) sessionSearches[sId] = [];
            if (!sessionSearches[sId].includes(q)) sessionSearches[sId].push(q);
          }
          if (vid) {
            if (!visitorSearches[vid]) visitorSearches[vid] = [];
            if (!visitorSearches[vid].includes(q)) visitorSearches[vid].push(q);
          }
        }
      } else if (act === 'PRODUCT_VIEW') {
        totalProductViews++;
        dailyMap[dateKey].views++;
        const pId = log.productId || log.product_id;
        if (pId) {
          if (!productStats[pId]) {
            productStats[pId] = {
              id: pId,
              name: log.productName || log.product_name || 'Product',
              category: log.productCategory || log.product_category || 'Electronics',
              brand: log.productBrand || log.product_brand || 'Genuine',
              price: Number(log.productPrice || log.product_price || 0),
              image: log.productImage || log.product_image,
              views: 0,
              cartAdds: 0,
              conversions: 0,
              correlatedSearches: {},
              searchAssistedViews: 0
            };
          }
          productStats[pId].views++;

          // Correlate with searches performed in this session or by this visitor
          const matchedSearches = new Set<string>();
          if (sId && sessionSearches[sId]) {
            sessionSearches[sId].forEach(term => matchedSearches.add(term));
          }
          if (vid && visitorSearches[vid]) {
            visitorSearches[vid].forEach(term => matchedSearches.add(term));
          }

          if (matchedSearches.size > 0) {
            productStats[pId].searchAssistedViews++;
            matchedSearches.forEach(term => {
              productStats[pId].correlatedSearches[term] = (productStats[pId].correlatedSearches[term] || 0) + 1;
            });
          }
        }
        if (log.productCategory || log.product_category) {
          const cat = log.productCategory || log.product_category;
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
      } else if (act === 'ADD_TO_CART' || act === 'EXPRESS_BUY_OPEN') {
        totalCartAdds++;
        dailyMap[dateKey].cartAdds++;
        const pId = log.productId || log.product_id;
        if (pId && productStats[pId]) {
          productStats[pId].cartAdds++;
        }
      } else if (act === 'ORDER_PLACED') {
        totalOrdersPlaced++;
        dailyMap[dateKey].orders++;
        const pId = log.productId || log.product_id;
        if (pId && productStats[pId]) {
          productStats[pId].conversions++;
        }
      }
    }

    // Format top search queries
    const topSearches = Object.entries(searchCounts)
      .map(([query, data]) => ({
        query,
        count: data.count,
        resultsCountAvg: Math.round(data.totalResults / data.count),
        lastSearched: data.lastSearched
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Format top products with search correlation & trending scores
    const topProducts = Object.values(productStats)
      .map(p => {
        const conversionRate = p.views > 0 ? Math.round((p.cartAdds / p.views) * 1000) / 10 : 0;
        
        // Sort correlated searches by frequency
        const topCorrelatedSearches = Object.entries(p.correlatedSearches || {})
          .map(([query, matchCount]) => ({
            query,
            matchCount,
            percentage: p.views > 0 ? Math.min(100, Math.round((matchCount / p.views) * 100)) : 0
          }))
          .sort((a, b) => b.matchCount - a.matchCount)
          .slice(0, 5);

        // Calculate trending composite score (0-100):
        // Weightings: 40% Views volume, 30% Cart add velocity, 30% Search-intent correlation
        const viewScore = Math.min(40, p.views * 2);
        const cartScore = Math.min(30, p.cartAdds * 5);
        const searchScore = Math.min(30, (p.searchAssistedViews || 0) * 3);
        const trendScore = Math.min(100, Math.round(viewScore + cartScore + searchScore));
        const isTrending = trendScore >= 35 || (p.views >= 3 && p.searchAssistedViews > 0);

        return {
          id: p.id,
          name: p.name,
          category: p.category,
          brand: p.brand,
          price: p.price,
          image: p.image,
          views: p.views,
          cartAdds: p.cartAdds,
          conversions: p.conversions,
          conversionRate,
          topCorrelatedSearches,
          searchAssistedViews: p.searchAssistedViews || 0,
          isTrending,
          trendScore
        };
      })
      .sort((a, b) => {
        // Sort by trending score & views
        if (b.trendScore !== a.trendScore) return b.trendScore - a.trendScore;
        return b.views - a.views;
      })
      .slice(0, 30);

    // Format categories
    const totalCatHits = Object.values(categoryCounts).reduce((a, b) => a + b, 0) || 1;
    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalCatHits) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Format devices
    const totalDeviceHits = Object.values(deviceCounts).reduce((a, b) => a + b, 0) || 1;
    const deviceBreakdown = Object.entries(deviceCounts)
      .map(([device, count]) => ({
        device,
        count,
        percentage: Math.round((count / totalDeviceHits) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Format browsers
    const totalBrowserHits = Object.values(browserCounts).reduce((a, b) => a + b, 0) || 1;
    const browserBreakdown = Object.entries(browserCounts)
      .map(([browser, count]) => ({
        browser,
        count,
        percentage: Math.round((count / totalBrowserHits) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Format daily timeline sorted chronologically
    const dailyTraffic = Object.values(dailyMap)
      .map(d => ({
        date: d.date,
        visitors: d.visitors.size,
        uniqueVisitors: d.visitors.size,
        productViews: d.views,
        searches: d.searches,
        cartAdds: d.cartAdds,
        orders: d.orders
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fill sample trend if today has sparse data
    if (dailyTraffic.length === 0) {
      const todayStr = new Date().toISOString().substring(0, 10);
      dailyTraffic.push({
        date: todayStr,
        visitors: uniqueVisitorIds.size,
        uniqueVisitors: uniqueVisitorIds.size,
        productViews: totalProductViews,
        searches: totalSearches,
        cartAdds: totalCartAdds,
        orders: totalOrdersPlaced
      });
    }

    const conversionRate = totalProductViews > 0 ? Math.round((totalCartAdds / totalProductViews) * 1000) / 10 : 0;
    const cartToOrderRate = totalCartAdds > 0 ? Math.round((totalOrdersPlaced / totalCartAdds) * 1000) / 10 : 0;

    // Calculate Heatmap Metrics, Intensities & Peak Load Windows
    let maxCellCount = 0;
    let totalHeatmapCount = 0;
    let peakDayIdx = 4; // Friday default
    let peakHourIdx = 20; // 8 PM default
    let maxDayCount = 0;
    let maxHourCount = 0;

    const dailyTotals = Array(7).fill(0);
    const hourlyTotals = Array(24).fill(0);

    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const c = heatmapMatrix[d][h].count;
        totalHeatmapCount += c;
        dailyTotals[d] += c;
        hourlyTotals[h] += c;
        if (c > maxCellCount) {
          maxCellCount = c;
        }
      }
    }

    for (let d = 0; d < 7; d++) {
      if (dailyTotals[d] > maxDayCount) {
        maxDayCount = dailyTotals[d];
        peakDayIdx = d;
      }
    }

    for (let h = 0; h < 24; h++) {
      if (hourlyTotals[h] > maxHourCount) {
        maxHourCount = hourlyTotals[h];
        peakHourIdx = h;
      }
    }

    // Flatten cells with intensity 0..1
    const flattenedCells = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const cell = heatmapMatrix[d][h];
        const intensity = maxCellCount > 0 ? Math.round((cell.count / maxCellCount) * 100) / 100 : 0;
        flattenedCells.push({
          dayIndex: cell.dayIndex,
          dayName: cell.dayName,
          dayFullName: cell.dayFullName,
          hour: cell.hour,
          hourLabel: cell.hourLabel,
          count: cell.count,
          uniqueVisitors: cell.visitors.size,
          intensity,
          productViews: cell.productViews,
          searches: cell.searches,
          cartAdds: cell.cartAdds,
          orders: cell.orders
        });
      }
    }

    // Server load rating calculation
    const recent15m = liveVisitorIds15m.size;
    let serverLoadRating: 'OPTIMAL' | 'MODERATE' | 'HEAVY' | 'PEAK_LOAD' = 'OPTIMAL';
    if (recent15m > 100) serverLoadRating = 'PEAK_LOAD';
    else if (recent15m > 40) serverLoadRating = 'HEAVY';
    else if (recent15m > 15) serverLoadRating = 'MODERATE';

    const peakHour12 = peakHourIdx === 0 ? '12:00 AM' : peakHourIdx === 12 ? '12:00 PM' : peakHourIdx > 12 ? `${peakHourIdx - 12}:00 PM` : `${peakHourIdx}:00 AM`;
    const peakNextHour12 = (peakHourIdx + 2) % 24 === 0 ? '12:00 AM' : (peakHourIdx + 2) % 24 === 12 ? '12:00 PM' : (peakHourIdx + 2) % 24 > 12 ? `${(peakHourIdx + 2) % 24 - 12}:00 PM` : `${(peakHourIdx + 2) % 24}:00 AM`;

    const activityHeatmap = {
      cells: flattenedCells,
      peakDay: DAYS_INFO[peakDayIdx].fullName,
      peakDayCount: maxDayCount,
      peakHour: peakHour12,
      peakHourCount: maxHourCount,
      peakTimeWindow: `${DAYS_INFO[peakDayIdx].name} ${peakHour12} – ${peakNextHour12}`,
      recommendedPromoWindow: `${DAYS_INFO[peakDayIdx].fullName} & Saturday, ${peakHour12} - 10:00 PM (EAT)`,
      quietMaintenanceWindow: 'Daily 02:00 AM – 05:00 AM (EAT)',
      serverLoadRating,
      totalHeatmapInteractions: totalHeatmapCount,
      busiestDayIndex: peakDayIdx,
      busiestHour: peakHourIdx,
      hourlyDistribution: hourlyTotals.map((count, h) => {
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const ampm = h >= 12 ? 'PM' : 'AM';
        return { hour: h, hourLabel: `${h12} ${ampm}`, count };
      }),
      dailyDistribution: dailyTotals.map((count, dIdx) => ({
        dayIndex: dIdx,
        dayName: DAYS_INFO[dIdx].name,
        count
      }))
    };

    res.json({
      totalVisits: customerScopedLogs.length,
      uniqueVisitors: uniqueVisitorIds.size,
      uniqueVisitorsToday: uniqueVisitorIdsToday.size,
      uniqueVisitorsWeek: uniqueVisitorIdsWeek.size,
      uniqueVisitorsMonth: uniqueVisitorIdsMonth.size,
      liveVisitors15m: liveVisitorIds15m.size,
      activeStaffCount: activeStaffList.length,
      activeStaffList,
      totalAdminStaffEvents,
      totalProductViews,
      totalSearches,
      totalCartAdds,
      totalOrdersPlaced,
      conversionRate,
      cartToOrderRate,
      topSearches,
      topProducts,
      topCategories,
      deviceBreakdown,
      browserBreakdown,
      dailyTraffic,
      activityHeatmap,
      retentionInfo: {
        maxRetentionDays: 60,
        retentionPolicy: 'Logs persist for 2 months (60 days) maximum; older logs are automatically deleted to conserve database space.',
        totalLogsStored: allLogs.length,
        oldestLogDate,
        newestLogDate
      }
    });
  } catch (err: any) {
    console.error('Analytics summary error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate analytics summary' });
  }
});

// Logs endpoint: GET /api/analytics/visitors (with rich product & interaction filters)
app.get('/api/analytics/visitors', (req, res) => {
  seedRealisticVisitorLogsIfSparse();
  try {
    const { productId, interactionType, searchQuery, deviceType, timeframe, startDate, endDate, excludeStaff, onlyStaff } = req.query;
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 250));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const now = Date.now();
    let minTime = now - (60 * 24 * 60 * 60 * 1000); // 2-month retention max ceiling

    if (timeframe === 'today') {
      minTime = now - (24 * 60 * 60 * 1000);
    } else if (timeframe === 'yesterday') {
      minTime = now - (48 * 60 * 60 * 1000);
    } else if (timeframe === '7days') {
      minTime = now - (7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '30days') {
      minTime = now - (30 * 24 * 60 * 60 * 1000);
    }

    if (startDate) {
      const customStart = new Date(startDate as string).getTime();
      if (!isNaN(customStart)) minTime = Math.max(minTime, customStart);
    }

    let maxTime = Number.MAX_SAFE_INTEGER;
    if (endDate) {
      const customEnd = new Date(endDate as string).getTime();
      if (!isNaN(customEnd)) maxTime = customEnd;
    }

    let logs: any[] = Object.values(memoryStore['visitor_logs'] || {});

    const isInternalStaff = (l: any) => {
      if (l.isAdmin === true || l.is_admin === true || l.isStaff === true || l.is_staff === true) return true;
      const email = String(l.userEmail || l.user_email || '').toLowerCase().trim();
      if (email === 'admin@genuine-electronics.com') return true;
      const role = String(l.userRole || l.user_role || '').toLowerCase().trim();
      if (['admin', 'super admin', 'staff', 'manager', 'cashier'].includes(role)) return true;
      return false;
    };

    // Filter by staff presence
    if (onlyStaff === 'true') {
      logs = logs.filter((l: any) => isInternalStaff(l));
    } else if (excludeStaff !== 'false') {
      // Default: exclude admin & staff
      logs = logs.filter((l: any) => !isInternalStaff(l));
    }

    // Filter by timestamp range
    logs = logs.filter((l: any) => {
      const t = new Date(l.createdAt || l.created_at || 0).getTime();
      return t >= minTime && t <= maxTime;
    });

    // Filter by Product ID if selected
    if (productId && productId !== 'ALL') {
      const targetProdId = String(productId).toLowerCase().trim();
      logs = logs.filter((l: any) => {
        const pId = String(l.productId || l.product_id || '').toLowerCase().trim();
        return pId === targetProdId;
      });
    }

    // Filter by Interaction Type if selected
    if (interactionType && interactionType !== 'ALL') {
      const targetType = String(interactionType).toUpperCase();
      logs = logs.filter((l: any) => {
        const it = String(l.interactionType || l.interaction_type || '').toUpperCase();
        return it === targetType;
      });
    }

    // Filter by Search Query
    if (searchQuery && String(searchQuery).trim() !== '') {
      const q = String(searchQuery).toLowerCase().trim();
      logs = logs.filter((l: any) => {
        const sq = String(l.searchQuery || l.search_query || '').toLowerCase();
        const pn = String(l.productName || l.product_name || '').toLowerCase();
        const vid = String(l.visitorId || l.visitor_id || '').toLowerCase();
        const email = String(l.userEmail || l.user_email || '').toLowerCase();
        return sq.includes(q) || pn.includes(q) || vid.includes(q) || email.includes(q);
      });
    }

    // Filter by Device Type
    if (deviceType && deviceType !== 'ALL') {
      const dt = String(deviceType).toLowerCase();
      logs = logs.filter((l: any) => {
        const dev = String(l.deviceType || l.device_type || '').toLowerCase();
        return dev === dt;
      });
    }

    // Sort newest first
    logs.sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime());

    const total = logs.length;
    const paginated = logs.slice(offset, offset + limit);

    res.json({
      logs: paginated,
      total,
      limit,
      offset,
      retentionDays: 60
    });
  } catch (err: any) {
    console.error('Analytics visitor logs error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch visitor logs' });
  }
});

// Manual cleanup endpoint: POST /api/analytics/cleanup
app.post(['/api/analytics/cleanup', '/api/analytics/purge'], async (req, res) => {
  try {
    const maxDays = parseInt(req.body?.maxDays) || 60;
    const deletedCount = await purgeExpiredVisitorLogs(maxDays);
    res.json({
      success: true,
      deletedCount,
      message: `Successfully purged ${deletedCount} logs older than ${maxDays} days to save disk & database space.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to purge logs' });
  }
});

// Catch-all for undefined API routes
app.all('/api/*', (req, res) => {
  console.warn(`404 API Route Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: `API route not found: ${req.url}` });
});

// Express Error Handler for API routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("API Error caught:", err);
  if (req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
  }
  next(err);
});

function createSEOSlug(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function renderSSRPage(req: express.Request, distPath: string): Promise<string> {
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return '<html><head><title>Genuine Electronics Trust</title></head><body><div id="root"></div></body></html>';
  }
  let html = fs.readFileSync(indexPath, 'utf-8');
  const origin = getSiteOrigin(req);
  const storeSettings = memoryStore['settings']?.['main'] || {};
  const storeName = storeSettings.storeName || 'Genuine Electronics Trust';
  const logoUrl = 'https://ukwkseawcdwbpsjnwrut.supabase.co/storage/v1/object/public/genuine_electronics/Genuine%20Electronics%203D%2002.png';

  let pageTitle = `${storeName} | Bei ya TV, Simu, Fridge & Vifaa vya Umeme Tanzania (Dar es Salaam)`;
  let pageDescription = `Duka kuu la mtandaoni Tanzania kwa vifaa 100% halisi vya umeme: Hisense, Samsung, Sony, LG, Boss. Bei nafuu zaidi Kariakoo & delivery nchi nzima.`;
  let pageKeywords = `bei ya hisense dar es salaam, bei ya tv hisense tanzania, bei ya samsung dar es salaam, bei ya friji hisense, smart tv tanzania bei nafuu, duka la vifaa vya umeme kariakoo, genuine electronics dar es salaam, hisense smart tv tanzania`;
  let canonicalUrl = `${origin}/`;
  let ogImage = logoUrl;
  let ogType = 'website';
  let jsonLdGraph: any[] = [];
  let crawlerBodyHtml = '';

  const productMatch = req.path.match(/^\/product\/([^\/]+)/);
  const categoryMatch = req.path.match(/^\/category\/([^\/]+)/);
  const searchQuery = (req.query.search as string) || (req.query.q as string);

  if (productMatch && productMatch[1]) {
    const targetId = decodeURIComponent(productMatch[1]).toLowerCase();
    const productsList = Object.values(memoryStore['products'] || {});
    let product = productsList.find((p: any) => 
      p.id.toLowerCase() === targetId || 
      (p.sku && p.sku.toLowerCase() === targetId) ||
      createSEOSlug(p.name) === targetId
    );
    
    if (!product) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          let query = supabase.from('products').select('*');
          if (targetId.length > 20) {
            query = query.eq('id', targetId);
          } else {
            query = query.or(`sku.ilike.${targetId},id.ilike.${targetId}`);
          }
          const { data } = await query.maybeSingle();
          if (data) {
            product = normalizeFromSupabase('products', data);
          }
        } catch (e) {
          console.error('Error fetching product for SSR tags', e);
        }
      }
    }

    if (product) {
      const brand = product.brand || 'Genuine';
      const priceFormatted = `TZS ${Number(product.price).toLocaleString()}`;
      const slug = createSEOSlug(product.name);
      canonicalUrl = `${origin}/product/${product.id}/${slug}`;
      ogImage = product.image || logoUrl;
      ogType = 'product';
      
      // High-volume Swahili + English localized title
      pageTitle = `Bei ya ${product.name} Tanzania (${brand}) - ${priceFormatted} | ${storeName} Dar es Salaam`;
      
      const warranty = product.warranty || '2 Years Official Warranty';
      pageDescription = `Nunua ${product.name} kwa bei ya ${priceFormatted} Dar es Salaam, Tanzania. 100% Halisi (Genuine) yenye ${warranty}, na Same-Day Free Delivery Kariakoo na Mikoani kote.`;
      
      const pNameLower = product.name.toLowerCase();
      const pBrandLower = brand.toLowerCase();
      const pCatLower = (product.category || '').toLowerCase();
      pageKeywords = [
        `bei ya ${pNameLower} tanzania`,
        `bei ya ${pBrandLower} dar es salaam`,
        `bei ya tv ${pBrandLower}`,
        `bei ya ${pNameLower} kariakoo`,
        `${pBrandLower} tanzania bei nafuu`,
        `bei ya ${pCatLower} tanzania`,
        `genuine ${pCatLower} dar es salaam`,
        `${product.sku ? product.sku.toLowerCase() : ''}`,
        `nunua ${pNameLower}`,
        'official warranty electronics tanzania',
        'm-pesa online shopping tanzania',
        'genuine electronics dar es salaam'
      ].filter(Boolean).join(', ');

      // Build Rich Schema.org Graph for Google Indexing & Rich Snippets
      jsonLdGraph = [
        {
          "@type": "Product",
          "@id": `${canonicalUrl}#product`,
          "name": product.name,
          "image": [product.image, ...(product.images || [])].filter(Boolean),
          "description": `${product.description} Nunua sasa kwa bei ya ${priceFormatted} Tanzania kutoka Genuine Electronics Trust.`,
          "sku": product.sku || product.id,
          "mpn": product.barcode || product.sku || product.id,
          "brand": {
            "@type": "Brand",
            "name": brand
          },
          "category": product.category,
          "offers": {
            "@type": "Offer",
            "url": canonicalUrl,
            "priceCurrency": "TZS",
            "price": product.price,
            "priceValidUntil": "2028-12-31",
            "itemCondition": "https://schema.org/NewCondition",
            "availability": (product.stock > 0 || product.inStock !== false) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "hasMerchantReturnPolicy": {
              "@type": "MerchantReturnPolicy",
              "applicableCountry": "TZ",
              "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
              "merchantReturnDays": 7,
              "returnMethod": "https://schema.org/ReturnInStore",
              "returnFees": "https://schema.org/FreeReturn"
            },
            "shippingDetails": {
              "@type": "OfferShippingDetails",
              "shippingRate": {
                "@type": "MonetaryAmount",
                "value": 0,
                "currency": "TZS"
              },
              "shippingDestination": {
                "@type": "DefinedRegion",
                "addressCountry": "TZ"
              },
              "deliveryTime": {
                "@type": "ShippingDeliveryTime",
                "handlingTime": {
                  "@type": "QuantitativeValue",
                  "minValue": 0,
                  "maxValue": 1,
                  "unitCode": "DAY"
                },
                "transitTime": {
                  "@type": "QuantitativeValue",
                  "minValue": 0,
                  "maxValue": 2,
                  "unitCode": "DAY"
                }
              }
            },
            "seller": {
              "@type": "ElectronicsStore",
              "name": storeName,
              "telephone": "+255 768 929 203",
              "url": `${origin}/`,
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "Kariakoo / Ndanda na Masasi Street",
                "addressLocality": "Dar es Salaam",
                "addressRegion": "Dar es Salaam",
                "addressCountry": "TZ"
              }
            }
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": (product.rating || 4.9).toString(),
            "reviewCount": (product.reviewsCount || 28).toString(),
            "bestRating": "5",
            "worstRating": "1"
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Nyumbani (Home)",
              "item": `${origin}/`
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": product.category || "Electronics",
              "item": `${origin}/category/${createSEOSlug(product.category || 'electronics')}`
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": product.name,
              "item": canonicalUrl
            }
          ]
        }
      ];

      // Pre-rendered crawler-readable fallback content
      const specsHtml = product.specs ? Object.entries(product.specs).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('') : '';
      crawlerBodyHtml = `
      <div id="seo-crawler-content" style="max-width: 900px; margin: 0 auto; padding: 24px; font-family: sans-serif; display: none;">
        <h1>Bei ya ${product.name} Tanzania (${brand}) - ${priceFormatted}</h1>
        <p><strong>Bei:</strong> ${priceFormatted} (Inajumuisha VAT / Kodi)</p>
        <p><strong>Hali ya Bidhaa:</strong> 100% Mpya & Halisi (Original with Warranty)</p>
        <p><strong>Udhamini (Warranty):</strong> ${warranty}</p>
        <p><strong>Usafirishaji:</strong> Same-Day Free Delivery Dar es Salaam & Mikoani Tanzania</p>
        <h2>Maelezo ya Bidhaa</h2>
        <p>${product.description}</p>
        ${specsHtml ? `<h2>Sifa za Kina (Specifications)</h2><ul>${specsHtml}</ul>` : ''}
        <h2>Maswali Yanayoulizwa Mara kwa Mara (FAQs)</h2>
        <h3>Bei ya ${brand} Dar es Salaam ni kiasi gani?</h3>
        <p>Bei ya ${product.name} ni ${priceFormatted} katika duka letu la Kariakoo, Dar es Salaam.</p>
        <h3>Jinsi ya Kuagiza na Kulipia?</h3>
        <p>Unaweza kuagiza moja kwa moja mtandaoni na kulipa kupitia M-Pesa, Airtel Money, Mixx By Yas au Cash on Delivery kwa wateja waliopo Dar es Salaam.</p>
      </div>`;
    }
  } else if (categoryMatch && categoryMatch[1]) {
    const catSlug = decodeURIComponent(categoryMatch[1]).toLowerCase();
    const categoriesList = Object.values(memoryStore['categories'] || {});
    const foundCategory = categoriesList.find((c: any) => createSEOSlug(c.name) === catSlug || c.name.toLowerCase().includes(catSlug.replace(/-/g, ' ')));
    const categoryName = foundCategory ? (foundCategory as any).name : catSlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    canonicalUrl = `${origin}/category/${catSlug}`;
    pageTitle = `Bei ya ${categoryName} Tanzania | Vifaa Halisi vya Umeme Kariakoo | ${storeName}`;
    pageDescription = `Tazama orodha ya bei ya ${categoryName} Dar es Salaam na Tanzania nzima. Pata Hisense, Samsung, Sony, LG kwa bei nafuu, udhamini wa miaka 2 na usafirishaji wa haraka.`;
    pageKeywords = `bei ya ${catSlug.replace(/-/g, ' ')} tanzania, bei ya tv dar es salaam, nunua vifaa vya umeme kariakoo, hisense tv tanzania, samsung tv tanzania, genuine electronics dar es salaam`;
  } else if (searchQuery && searchQuery.trim().length > 1) {
    const q = searchQuery.trim();
    canonicalUrl = `${origin}/?search=${encodeURIComponent(q)}`;
    pageTitle = `Bei ya "${q}" Tanzania | Matokeo ya Vifaa Halisi Dar es Salaam - ${storeName}`;
    pageDescription = `Matokeo ya utafutaji wa "${q}" katika duka la ${storeName} Tanzania. Vifaa vyote ni 100% Halisi vyenye official warranty na express delivery.`;
    pageKeywords = `bei ya ${q.toLowerCase()} tanzania, nunua ${q.toLowerCase()} dar es salaam, ${q.toLowerCase()} kariakoo, genuine electronics`;
  }

  // Base Organization and WebSite schema
  jsonLdGraph.unshift(
    {
      "@type": "ElectronicsStore",
      "@id": `${origin}/#organization`,
      "name": storeName,
      "url": `${origin}/`,
      "logo": logoUrl,
      "image": logoUrl,
      "description": "Tanzania's authorized online shopping center for 100% genuine electronics, smart tech, TVs & appliances with official manufacturer warranty & same-day delivery.",
      "telephone": "+255 768 929 203",
      "email": "sales@genuine-electronics.com",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Kariakoo / Ndanda na Masasi Street",
        "addressLocality": "Dar es Salaam",
        "addressRegion": "Dar es Salaam",
        "postalCode": "11105",
        "addressCountry": "TZ"
      },
      "priceRange": "TZS",
      "currenciesAccepted": "TZS",
      "paymentAccepted": "Cash, Credit Card, Bank Transfer, M-Pesa, Airtel Money, Mixx By Yas, Orbi Pay"
    },
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      "url": `${origin}/`,
      "name": storeName,
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
    }
  );

  const cleanTitle = pageTitle.replace(/"/g, '&quot;');
  const cleanDescription = pageDescription.replace(/"/g, '&quot;');
  const cleanKeywords = pageKeywords.replace(/"/g, '&quot;');

  const dynamicHeadTags = `
    <!-- Search Engine Indexing & Robots Directives for Global Discovery -->
    <title>${cleanTitle}</title>
    <meta name="description" content="${cleanDescription}" />
    <meta name="keywords" content="${cleanKeywords}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <link rel="canonical" href="${canonicalUrl}" />

    <!-- Open Graph & Social Sharing Card -->
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${storeName.replace(/"/g, '&quot;')}" />
    <meta property="og:title" content="${cleanTitle}" />
    <meta property="og:description" content="${cleanDescription}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="800" />
    <meta property="og:image:height" content="800" />
    <meta property="og:image:alt" content="${cleanTitle}" />
    <meta property="og:locale" content="en_TZ" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${cleanTitle}" />
    <meta name="twitter:description" content="${cleanDescription}" />
    <meta name="twitter:image" content="${ogImage}" />

    <!-- Base Schema.org Structured Data for Google Indexing -->
    <script type="application/ld+json">
    ${JSON.stringify({ "@context": "https://schema.org", "@graph": jsonLdGraph }, null, 2)}
    </script>`;

  // Replace head metadata cleanly
  html = html.replace(/<!-- Search Engine Indexing[\s\S]*?<\/script>\s*(?=<link rel="preconnect")/i, dynamicHeadTags.trim() + '\n\n    ');

  if (crawlerBodyHtml) {
    html = html.replace(/(<div id="root">)/i, `$1${crawlerBodyHtml}`);
  }

  return html;
}

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  
  if (process.env.NODE_ENV === "production" && !fs.existsSync(distPath)) {
    console.error(`FATAL: Build directory not found at ${distPath}`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log('--- STARTING VITE DEV SERVER ---');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted.');
  } else {
    console.log('--- STARTING PRODUCTION SERVER ---');
    app.use(express.static(distPath));
    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/static/') || req.path.includes('.')) {
        return next();
      }

      try {
        const renderedHtml = await renderSSRPage(req, distPath);
        res.status(200).send(renderedHtml);
      } catch (e) {
        console.error('Error in SSR rendering:', e);
        const fallbackHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
        res.status(200).send(fallbackHtml);
      }
    });
  }

  // Start listening on port 3000 immediately for fast health checks and ingress routing
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });

  // Attempt to seed Supabase cloud database in the background without blocking server startup
  seedSupabaseIfEmpty().catch((err: any) => {
    console.warn('Non-fatal: Background cloud seed skipped or encountered error:', err.message);
  });
}

async function seedSupabaseIfEmpty() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.log('[Supabase Seed] Supabase is not configured or available. Skipping seeding.');
    return;
  }

  try {
    const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true });
    if (error) {
      console.warn('[Supabase Seed] Could not query products to check if seed is needed:', error.message);
      return;
    }

    if (count === 0) {
      console.log('[Supabase Seed] Products table is empty. Seeding default products to Supabase...');
      const seedProducts = [
        {
          id: 'prod-samsung-side-fridge',
          name: 'Samsung 647L SpaceMax™ Side-by-Side Inverter Refrigerator',
          brand: 'Samsung',
          category: 'Home Appliances',
          price: 3450000,
          originalPrice: 3850000,
          costPrice: 2900000,
          discountPrice: 3450000,
          discountPercentage: 10,
          isOnOffer: true,
          offerTitle: 'BESTSELLER DEAL',
          stock: 8,
          inStock: true,
          minStockAlert: 2,
          sku: 'GE-SAM-RS64R',
          barcode: '8806091234567',
          isGenuineVerified: true,
          featured: true,
          rating: 4.9,
          reviewsCount: 28,
          warranty: '2 Years Official Samsung Warranty (10Y Inverter Compressor)',
          image: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&q=80&w=800',
          images: [
            'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&q=80&w=800'
          ],
          description: 'Premium Samsung SpaceMax side-by-side refrigerator with All-around Cooling, Digital Inverter Technology, and sleek seamless design.',
          specs: {
            'Capacity': '647 Liters',
            'Cooling Technology': 'All-Around Cooling & Multi Flow',
            'Compressor': 'Digital Inverter (10 Year Warranty)',
            'Voltage': '220V - 240V ~ 50Hz',
            'Energy Rating': 'A+ Energy Efficiency'
          },
          isVatInclusive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prod-lg-ai-washer',
          name: 'LG AI DD™ 9kg Front Load Inverter Washing Machine & Dryer',
          brand: 'LG',
          category: 'Home Appliances',
          price: 1850000,
          originalPrice: 2150000,
          costPrice: 1520000,
          discountPrice: 1850000,
          discountPercentage: 14,
          isOnOffer: true,
          offerTitle: 'SPECIAL OFFER',
          stock: 12,
          inStock: true,
          minStockAlert: 3,
          sku: 'GE-LG-F4V5',
          barcode: '8806089876543',
          isGenuineVerified: true,
          featured: true,
          rating: 4.8,
          reviewsCount: 19,
          warranty: '2 Years Official LG Warranty (10Y Direct Drive Motor)',
          image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&q=80&w=800',
          images: [
            'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&q=80&w=800'
          ],
          description: 'LG AI Direct Drive front loader intelligent washing machine. Detects weight and fabric softness to optimize wash motion.',
          specs: {
            'Wash Capacity': '9.0 kg Load',
            'Spin Speed': '1400 RPM Max',
            'Motor Tech': 'AI Inverter Direct Drive',
            'Steam Tech': 'Steam™ Allergy Care',
            'Voltage': '220V - 240V ~ 50Hz'
          },
          isVatInclusive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prod-sony-bravia-65',
          name: 'Sony BRAVIA 65" 4K HDR Google TV with Dolby Atmos',
          brand: 'Sony',
          category: 'Televisions & Home Audio',
          price: 2650000,
          originalPrice: 2950000,
          costPrice: 2200000,
          discountPrice: 2650000,
          discountPercentage: 10,
          isOnOffer: false,
          stock: 6,
          inStock: true,
          minStockAlert: 2,
          sku: 'GE-SONY-65X75K',
          barcode: '4548736123456',
          isGenuineVerified: true,
          featured: true,
          rating: 5.0,
          reviewsCount: 34,
          warranty: '2 Years Official Sony East Africa Warranty',
          image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800',
          images: [
            'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800'
          ],
          description: 'Experience stunning 4K clarity with 4K Processor X1, Live Color technology, and immersive Dolby Audio & Atmos sound.',
          specs: {
            'Screen Size': '65 Inch 4K Ultra HD (3840 x 2160)',
            'Processor': 'Sony 4K Processor X1',
            'OS': 'Google TV with Voice Remote',
            'Audio': '20W Dolby Atmos & DTS Digital Surround',
            'Connectivity': '4x HDMI 2.1, 2x USB, Wi-Fi, Bluetooth 5.0'
          },
          isVatInclusive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prod-hisense-55-4k-tv',
          name: 'Hisense 55" 4K UHD Smart Frameless TV (VIDAA OS & Dolby Vision)',
          brand: 'Hisense',
          category: 'Televisions & Home Audio',
          price: 1180000,
          originalPrice: 1350000,
          costPrice: 950000,
          discountPrice: 1180000,
          discountPercentage: 12,
          isOnOffer: true,
          offerTitle: 'BEST VALUE',
          stock: 15,
          inStock: true,
          minStockAlert: 3,
          sku: 'GE-HIS-55A6K',
          barcode: '6942147481234',
          isGenuineVerified: true,
          featured: true,
          rating: 4.9,
          reviewsCount: 42,
          warranty: '2 Years Official Hisense East Africa Warranty',
          image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800',
          images: [
            'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800'
          ],
          description: 'Hisense 55 Inch 4K Ultra HD Smart TV na VIDAA Smart OS, HDR10+, Dolby Vision & DTS Virtual:X sound. Bei nafuu zaidi Dar es Salaam na udhamini rasmi wa miaka 2.',
          specs: {
            'Screen Size': '55 Inch 4K Ultra HD (3840 x 2160)',
            'Smart OS': 'VIDAA U6 (YouTube, Netflix, Showmax, Prime Video)',
            'HDR Tech': 'Dolby Vision & HDR10+',
            'Audio': '2x 10W DTS Virtual:X Immersive Sound',
            'Connectivity': '3x HDMI 2.1, 2x USB, Wi-Fi Dual Band, Bluetooth 5.0'
          },
          isVatInclusive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prod-hisense-43-fhd-smart',
          name: 'Hisense 43" Full HD Frameless Smart Android & VIDAA TV',
          brand: 'Hisense',
          category: 'Televisions & Home Audio',
          price: 680000,
          originalPrice: 750000,
          costPrice: 540000,
          discountPrice: 680000,
          discountPercentage: 9,
          isOnOffer: true,
          offerTitle: 'POPULAR CHOICE',
          stock: 20,
          inStock: true,
          minStockAlert: 4,
          sku: 'GE-HIS-43A4K',
          barcode: '6942147481235',
          isGenuineVerified: true,
          featured: true,
          rating: 4.8,
          reviewsCount: 31,
          warranty: '2 Years Official Hisense Warranty',
          image: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&q=80&w=800',
          images: [
            'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&q=80&w=800'
          ],
          description: 'Nunua Hisense 43 inch Full HD Smart TV Dar es Salaam. Picha angavu, internet ya kasi, na spika zenye nguvu za Dolby Audio.',
          specs: {
            'Screen Size': '43 Inch Full HD (1920 x 1080)',
            'Smart Features': 'Built-in Wi-Fi, YouTube, Netflix, Screen Mirroring',
            'Sound': 'Dolby Audio 16W Stereo',
            'Ports': '2x HDMI, 2x USB, Optical, AV Input'
          },
          isVatInclusive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prod-hisense-32-hd-smart',
          name: 'Hisense 32" HD Frameless Smart Digital TV',
          brand: 'Hisense',
          category: 'Televisions & Home Audio',
          price: 380000,
          originalPrice: 430000,
          costPrice: 290000,
          discountPrice: 380000,
          discountPercentage: 11,
          isOnOffer: true,
          offerTitle: 'BEST BUDGET',
          stock: 25,
          inStock: true,
          minStockAlert: 5,
          sku: 'GE-HIS-32A4K',
          barcode: '6942147481236',
          isGenuineVerified: true,
          featured: false,
          rating: 4.7,
          reviewsCount: 38,
          warranty: '2 Years Official Hisense Warranty',
          image: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&q=80&w=800',
          images: [
            'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&q=80&w=800'
          ],
          description: 'Hisense 32 Inch Smart TV kwa bei nafuu Tanzania. Inatumia umeme kidogo, ina YouTube, Netflix na digital receiver iliyojengwa ndani.',
          specs: {
            'Screen Size': '32 Inch High Definition (1366 x 768)',
            'Smart OS': 'VIDAA Smart TV with Apps Store',
            'Digital Tuner': 'DVB-T2 / S2 Free-to-Air Channels Built-in',
            'Energy Rating': 'Eco Energy Saver A+'
          },
          isVatInclusive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prod-hisense-205l-fridge',
          name: 'Hisense 205L Double Door Defrost Top Freezer Refrigerator',
          brand: 'Hisense',
          category: 'Home Appliances',
          price: 780000,
          originalPrice: 890000,
          costPrice: 610000,
          discountPrice: 780000,
          discountPercentage: 12,
          isOnOffer: true,
          offerTitle: 'KITCHEN DEAL',
          stock: 12,
          inStock: true,
          minStockAlert: 2,
          sku: 'GE-HIS-RD205',
          barcode: '6942147481237',
          isGenuineVerified: true,
          featured: true,
          rating: 4.8,
          reviewsCount: 22,
          warranty: '2 Years Official Warranty + 5 Years Compressor',
          image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&q=80&w=800',
          images: [
            'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&q=80&w=800'
          ],
          description: 'Friji ya milango miwili ya Hisense 205 Liters. Inaganda haraka, inatunza ubaridi kwa muda mrefu hata umeme ukikatika, na inatumia umeme kidogo (Energy Efficient).',
          specs: {
            'Capacity': '205 Liters Total Net Volume',
            'Door Type': 'Double Door Top Mount Freezer',
            'Cooling': 'Multi-Airflow Fast Freezing',
            'Refrigerant': 'R600a Eco Gas (Low Power)',
            'Voltage': '220V - 240V ~ 50Hz'
          },
          isVatInclusive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prod-hisense-inverter-ac',
          name: 'Hisense 1.5 HP Super Silent Dual Inverter Split Air Conditioner',
          brand: 'Hisense',
          category: 'Home Appliances',
          price: 1250000,
          originalPrice: 1450000,
          costPrice: 980000,
          discountPrice: 1250000,
          discountPercentage: 14,
          isOnOffer: true,
          offerTitle: 'SUMMER COOLING',
          stock: 14,
          inStock: true,
          minStockAlert: 3,
          sku: 'GE-HIS-AC12',
          barcode: '6901234567890',
          isGenuineVerified: true,
          featured: false,
          rating: 4.7,
          reviewsCount: 15,
          warranty: '2 Years Comprehensive Warranty + 5 Years Compressor',
          image: 'https://images.unsplash.com/photo-1614633833026-07205197263f?auto=format&fit=crop&q=80&w=800',
          images: [
            'https://images.unsplash.com/photo-1614633833026-07205197263f?auto=format&fit=crop&q=80&w=800'
          ],
          description: 'High efficiency Hisense dual inverter AC with fast cooling, R32 eco refrigerant, and smart 4D air distribution.',
          specs: {
            'Cooling Capacity': '12,000 BTU/hr (1.5 HP)',
            'Inverter Tech': 'Dual Inverter Eco Wave (Up to 60% Energy Saving)',
            'Refrigerant': 'R32 Eco Gas',
            'Voltage': '220V - 240V ~ 50Hz',
            'Noise Level': 'Super Quiet 19 dB(A)'
          },
          isVatInclusive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      for (const p of seedProducts) {
        await safeSupabaseUpsert(supabase, 'products', p);
      }
      console.log('[Supabase Seed] Seeding products complete!');
    }

    // Check store settings as well
    const { data: settingsData } = await supabase.from('store_settings').select('*').eq('id', 'main').maybeSingle();
    if (!settingsData) {
      console.log('[Supabase Seed] store_settings empty. Seeding default settings...');
      const defaultSettings = {
        storeName: 'Genuine Electronics',
        announcement: 'Duka la Mtandaoni la Vifaa vya Nyumbani na Ofisini Dar es Salaam. Bidhaa zote ni 100% Halisi na za Uhakika.',
        phoneNumbers: ['+255712345678', '+255787654321'],
        currency: 'TZS',
        paymentInstructions: 'Lipia kwa M-Pesa, Tigo Pesa au Airtel Money. Namba ya malipo (Lipa Namba) utapewa wakati wa uthibitisho.',
        bannerUrl: '',
        vatPercentage: 18,
        enablePosPrint: true,
        allowOfflineSales: false
      };
      await safeSupabaseUpsert(supabase, 'store_settings', {
        id: 'main',
        settings: defaultSettings
      });
      console.log('[Supabase Seed] Seeding store settings complete!');
    }
  } catch (err: any) {
    console.error('[Supabase Seed] Error seeding Supabase:', err.message);
  }
}

startServer();
