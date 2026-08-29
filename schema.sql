-- Supabase Database Schema for Genuine Electronics
-- This script is completely idempotent (auto-healing). You can safely run it multiple times in your Supabase SQL Editor.
-- It creates all required tables, handles column casing (snake_case and camelCase), enables RLS policies, and configures storage.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PRODUCTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(100) PRIMARY KEY
);

-- Drop dependent policies before altering column type to avoid dependency errors
DROP POLICY IF EXISTS "Public Access Products" ON products;

-- Ensure id column is VARCHAR(100) / TEXT if previously created as UUID or BIGINT
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'id' AND data_type NOT IN ('character varying', 'text')
  ) THEN
    ALTER TABLE products ALTER COLUMN id TYPE VARCHAR(100);
  END IF;
END $$;

-- Add all product columns safely (supports both snake_case and camelCase)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
  ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "costPrice" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "wholesalePrice" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "minStockAlert" INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS sku VARCHAR(100),
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS images_gallery JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "imagesGallery" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS additional_images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reviewsCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS warranty VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_genuine_verified BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "isGenuineVerified" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tonnage VARCHAR(50),
  ADD COLUMN IF NOT EXISTS capacity VARCHAR(50),
  ADD COLUMN IF NOT EXISTS energy_rating VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "energyRating" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS appliance_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "applianceType" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS original_price DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "originalPrice" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_price DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountPrice" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountPercentage" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_on_offer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isOnOffer" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "offerEndsAt" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS offer_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "offerTitle" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_vat_inclusive BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "isVatInclusive" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Safely heal any existing costprice / cost_price columns to remove blocking NOT NULL constraints and ensure defaults
DO $$ 
BEGIN
  -- If lowercase "costprice" column exists in public.products, drop NOT NULL and set default 0
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'costprice'
  ) THEN
    ALTER TABLE public.products ALTER COLUMN costprice DROP NOT NULL;
    ALTER TABLE public.products ALTER COLUMN costprice SET DEFAULT 0;
  END IF;

  -- If standard "cost_price" column exists in public.products, drop NOT NULL and set default 0
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE public.products ALTER COLUMN cost_price DROP NOT NULL;
    ALTER TABLE public.products ALTER COLUMN cost_price SET DEFAULT 0;
  END IF;

  -- If double-quoted camelCase "costPrice" column exists in public.products, drop NOT NULL and set default 0
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'costPrice'
  ) THEN
    ALTER TABLE public.products ALTER COLUMN "costPrice" DROP NOT NULL;
    ALTER TABLE public.products ALTER COLUMN "costPrice" SET DEFAULT 0;
  END IF;

  -- If lowercase "minstockalert" column exists, drop NOT NULL and set default 5
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'minstockalert'
  ) THEN
    ALTER TABLE public.products ALTER COLUMN minstockalert DROP NOT NULL;
    ALTER TABLE public.products ALTER COLUMN minstockalert SET DEFAULT 5;
  END IF;

  -- If lowercase "isgenuineverified" column exists, drop NOT NULL and set default true
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'isgenuineverified'
  ) THEN
    ALTER TABLE public.products ALTER COLUMN isgenuineverified DROP NOT NULL;
    ALTER TABLE public.products ALTER COLUMN isgenuineverified SET DEFAULT true;
  END IF;

  -- Ensure images and images_gallery columns do not have blocking NOT NULL constraints
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'images'
  ) THEN
    ALTER TABLE public.products ALTER COLUMN images DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'images_gallery'
  ) THEN
    ALTER TABLE public.products ALTER COLUMN images_gallery DROP NOT NULL;
  END IF;
END $$;

-- Safely add unique constraints
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_sku_key') THEN
    ALTER TABLE products ADD CONSTRAINT products_sku_key UNIQUE (sku);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_barcode_key') THEN
    ALTER TABLE products ADD CONSTRAINT products_barcode_key UNIQUE (barcode);
  END IF;
END $$;


-- ==========================================
-- 2. CATEGORIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(100) PRIMARY KEY
);

-- Drop dependent policies before altering column type to avoid dependency errors
DROP POLICY IF EXISTS "Public Access Categories" ON categories;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'id' AND data_type NOT IN ('character varying', 'text')
  ) THEN
    ALTER TABLE categories ALTER COLUMN id TYPE VARCHAR(100);
  END IF;
END $$;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS swahili_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "swahiliName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon VARCHAR(100),
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS product_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "productCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sequence INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;


-- ==========================================
-- 3. ORDERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(100) PRIMARY KEY
);

-- Drop dependent policies before altering column type to avoid dependency errors
DROP POLICY IF EXISTS "Public Access Orders" ON orders;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'id' AND data_type NOT IN ('character varying', 'text')
  ) THEN
    ALTER TABLE orders ALTER COLUMN id TYPE VARCHAR(100);
  END IF;
END $$;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS user_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "userId" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS customer_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "customerId" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS deadline VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "deadline" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "customerName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "customerEmail" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "customerPhone" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS "shippingAddress" TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "paymentMethod" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "trackingNumber" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "courierName" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS estimated_delivery VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "estimatedDelivery" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tracking_timeline JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "trackingTimeline" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS extra_costs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "extraCosts" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_loan BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isLoan" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS down_payment DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "downPayment" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "outstandingBalance" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_payments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "partialPayments" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS loan_balance DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "loanBalance" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loan_due_date VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "loanDueDate" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS loan_due_time VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "loanDueTime" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS loan_due_date_time VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "loanDueDateTime" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS loan_national_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "loanNationalId" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS loan_guarantor_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "loanGuarantorName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS loan_guarantor_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "loanGuarantorPhone" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS loan_status VARCHAR(50) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS "loanStatus" VARCHAR(50) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS loan_repayments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "loanRepayments" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;


-- ==========================================
-- 4. POS TRANSACTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS pos_transactions (
  id VARCHAR(100) PRIMARY KEY
);

-- Drop dependent policies before altering column type to avoid dependency errors
DROP POLICY IF EXISTS "Public Access POS" ON pos_transactions;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pos_transactions' AND column_name = 'id' AND data_type NOT IN ('character varying', 'text')
  ) THEN
    ALTER TABLE pos_transactions ALTER COLUMN id TYPE VARCHAR(100);
  END IF;
END $$;

ALTER TABLE pos_transactions
  ADD COLUMN IF NOT EXISTS user_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "userId" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS customer_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "customerId" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS deadline VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "deadline" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "receiptNumber" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Completed',
  ADD COLUMN IF NOT EXISTS price_tier VARCHAR(50) DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS "priceTier" VARCHAR(50) DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS split_payments JSONB,
  ADD COLUMN IF NOT EXISTS "splitPayments" JSONB,
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_costs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "extraCosts" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS "paymentMethod" VARCHAR(50) DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "cashierName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_loan BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isLoan" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS down_payment DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "downPayment" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "outstandingBalance" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_payments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "partialPayments" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS loan_balance DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "loanBalance" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loan_due_date VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "loanDueDate" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS loan_due_time VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "loanDueTime" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS loan_due_date_time VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "loanDueDateTime" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS loan_national_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "loanNationalId" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS loan_guarantor_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "loanGuarantorName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS loan_guarantor_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "loanGuarantorPhone" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS loan_status VARCHAR(50) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS "loanStatus" VARCHAR(50) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "customerName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "customerPhone" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS customer_tin VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "customerTin" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tendered_amount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tenderedAmount" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS change_amount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "changeAmount" DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS vat_percentage DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vatPercentage" DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS include_vat BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "includeVat" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS loan_repayments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "loanRepayments" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Safely heal any existing paymentmethod / payment_method columns in pos_transactions to remove blocking NOT NULL constraints
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pos_transactions' AND column_name = 'paymentmethod'
  ) THEN
    ALTER TABLE public.pos_transactions ALTER COLUMN paymentmethod DROP NOT NULL;
    ALTER TABLE public.pos_transactions ALTER COLUMN paymentmethod SET DEFAULT 'Cash';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pos_transactions' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE public.pos_transactions ALTER COLUMN payment_method DROP NOT NULL;
    ALTER TABLE public.pos_transactions ALTER COLUMN payment_method SET DEFAULT 'Cash';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pos_transactions' AND column_name = 'paymentMethod'
  ) THEN
    ALTER TABLE public.pos_transactions ALTER COLUMN "paymentMethod" DROP NOT NULL;
    ALTER TABLE public.pos_transactions ALTER COLUMN "paymentMethod" SET DEFAULT 'Cash';
  END IF;
END $$;


-- ==========================================
-- 5. STAFF TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(100) PRIMARY KEY
);

-- Drop dependent policies before altering column type to avoid dependency errors
DROP POLICY IF EXISTS "Public Access Staff" ON staff;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'id' AND data_type NOT IN ('character varying', 'text')
  ) THEN
    ALTER TABLE staff ALTER COLUMN id TYPE VARCHAR(100);
  END IF;
END $$;

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS role VARCHAR(100),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS avatar TEXT,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_email_key') THEN
    ALTER TABLE staff ADD CONSTRAINT staff_email_key UNIQUE (email);
  END IF;
END $$;


-- ==========================================
-- 6. STORE SETTINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS store_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'main',
  settings JSONB NOT NULL
);


-- ==========================================
-- 7. PROFILES / CUSTOMERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(100) PRIMARY KEY
);

-- Drop dependent policies before altering column type to avoid dependency errors
DROP POLICY IF EXISTS "Public Access Profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Safely drop foreign key constraint if it exists to allow column type alteration (VARCHAR vs UUID compatibility)
ALTER TABLE ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id' AND data_type NOT IN ('character varying', 'text')
  ) THEN
    ALTER TABLE profiles ALTER COLUMN id TYPE VARCHAR(100);
  END IF;
END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS "fullName" TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar TEXT,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;


-- ==========================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate permissive sync policies so backend & client can read/write
DROP POLICY IF EXISTS "Public Access Products" ON products;
DROP POLICY IF EXISTS "Public Access Categories" ON categories;
DROP POLICY IF EXISTS "Public Access Orders" ON orders;
DROP POLICY IF EXISTS "Public Access POS" ON pos_transactions;
DROP POLICY IF EXISTS "Public Access Staff" ON staff;
DROP POLICY IF EXISTS "Public Access Settings" ON store_settings;
DROP POLICY IF EXISTS "Public Access Profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Public Access Products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access POS" ON pos_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Staff" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Settings" ON store_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- 8.5. OFFERS & LIMITED TIME CAMPAIGNS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS offers (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  badge_text VARCHAR(100) DEFAULT 'LIMITED TIME OFFER',
  "badgeText" VARCHAR(100) DEFAULT 'LIMITED TIME OFFER',
  discount_percentage INTEGER DEFAULT 0,
  "discountPercentage" INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  "startDate" TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  "endDate" TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  "isActive" BOOLEAN DEFAULT true,
  category_ids JSONB DEFAULT '[]'::jsonb,
  "categoryIds" JSONB DEFAULT '[]'::jsonb,
  product_ids JSONB DEFAULT '[]'::jsonb,
  "productIds" JSONB DEFAULT '[]'::jsonb,
  banner_image TEXT,
  "bannerImage" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Offers" ON offers;
CREATE POLICY "Public Access Offers" ON offers FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 9. REVIEWS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id VARCHAR(100) NOT NULL REFERENCES products(id),
  user_id VARCHAR(100),
  user_name VARCHAR(255),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Reviews" ON reviews;
CREATE POLICY "Public Access Reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- 9.5. LOAN REPAYMENTS TABLE (Dedicated Relational Table)
-- ==========================================
CREATE TABLE IF NOT EXISTS loan_repayments (
  id VARCHAR(100) PRIMARY KEY,
  transaction_id VARCHAR(100) NOT NULL,
  amount DECIMAL(12, 2) DEFAULT 0,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(50) DEFAULT 'M-Pesa',
  recorded_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Loan Repayments" ON loan_repayments;
CREATE POLICY "Public Access Loan Repayments" ON loan_repayments FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- 9.6. ORDER ITEMS & POS TRANSACTION ITEMS (Dedicated Relational Tables)
-- ==========================================
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(100) PRIMARY KEY,
  order_id VARCHAR(100) NOT NULL,
  product_id VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(12, 2) DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Order Items" ON order_items;
CREATE POLICY "Public Access Order Items" ON order_items FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS pos_transaction_items (
  id VARCHAR(100) PRIMARY KEY,
  transaction_id VARCHAR(100) NOT NULL,
  product_id VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(12, 2) DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE pos_transaction_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access POS Transaction Items" ON pos_transaction_items;
CREATE POLICY "Public Access POS Transaction Items" ON pos_transaction_items FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- 10. USER SIGNUP AUTH TRIGGER
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id::text, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 
    new.raw_user_meta_data->>'avatar_url', 
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;


-- ==========================================
-- 10. STORAGE BUCKET & POLICIES (IMAGES)
-- ==========================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('genuine_electronics', 'genuine_electronics', true)
    ON CONFLICT (id) DO NOTHING;

    DROP POLICY IF EXISTS "Public Access Select" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access Insert" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access Update" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access Delete" ON storage.objects;

    CREATE POLICY "Public Access Select" ON storage.objects FOR SELECT USING ( bucket_id = 'genuine_electronics' );
    CREATE POLICY "Public Access Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'genuine_electronics' );
    CREATE POLICY "Public Access Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'genuine_electronics' );
    CREATE POLICY "Public Access Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'genuine_electronics' );
  END IF;
END $$;


-- =========================================================================
-- 11. VISITOR ANALYTICS & INTERACTION LOGS TABLE (2-MONTH RETENTION SPEC)
-- =========================================================================
CREATE TABLE IF NOT EXISTS visitor_logs (
  id VARCHAR(100) PRIMARY KEY,
  visitor_id VARCHAR(100) NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100),
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  interaction_type VARCHAR(50) NOT NULL,
  product_id VARCHAR(100),
  product_name VARCHAR(255),
  product_price DECIMAL(12, 2) DEFAULT 0,
  product_category VARCHAR(100),
  product_brand VARCHAR(100),
  product_image TEXT,
  search_query TEXT,
  search_results_count INTEGER DEFAULT 0,
  category_filter VARCHAR(100),
  brand_filter VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  order_id VARCHAR(100),
  page_url TEXT,
  referrer TEXT,
  device_type VARCHAR(50) DEFAULT 'Unknown',
  browser VARCHAR(100),
  os VARCHAR(100),
  ip_address VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fast Indexes for Queries, Product-level filtering, and 2-Month Retention Purging
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON visitor_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_interaction ON visitor_logs (interaction_type);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_product_id ON visitor_logs (product_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_visitor_id ON visitor_logs (visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_session_id ON visitor_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_search ON visitor_logs (search_query);

-- Row Level Security
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Visitor Logs" ON visitor_logs;
CREATE POLICY "Public Insert Visitor Logs" ON visitor_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Read Visitor Logs" ON visitor_logs;
CREATE POLICY "Public Read Visitor Logs" ON visitor_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Delete Visitor Logs" ON visitor_logs;
CREATE POLICY "Public Delete Visitor Logs" ON visitor_logs FOR DELETE USING (true);

-- Auto-Pruning Function to retain logs for maximum 2 months (60 days) to save storage
CREATE OR REPLACE FUNCTION purge_expired_visitor_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM visitor_logs
  WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '60 days');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


