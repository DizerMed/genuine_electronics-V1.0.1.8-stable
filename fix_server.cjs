const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const targetContent = `  // Normalize cost price formats (resolves lowercase costprice not-null violations)
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

  if (payload.stock !== undefined) payload.stock = Number(payload.stock) || 0;

  // Normalize min stock alert formats
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

  if (payload.rating !== undefined) payload.rating = Number(payload.rating) || 0;
  
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

  // Normalize Swahili name variants
  if (payload.swahiliName || payload.swahili_name || payload.swahiliname) {
    const sName = String(payload.swahiliName || payload.swahili_name || payload.swahiliname || '');
    payload.swahiliName = sName;
    payload.swahili_name = sName;
    payload.swahiliname = sName;
  }

  // Normalize totalAmount across all 3 key variants (camelCase, snake_case, lowercase)
  let resolvedTotal = 0;
  if (payload.totalAmount !== undefined && payload.totalAmount !== null) {
    resolvedTotal = Number(payload.totalAmount) || 0;
  } else if (payload.total_amount !== undefined && payload.total_amount !== null) {
    resolvedTotal = Number(payload.total_amount) || 0;
  } else if (payload.totalamount !== undefined && payload.totalamount !== null) {
    resolvedTotal = Number(payload.totalamount) || 0;
  } else if (payload.total !== undefined && payload.total !== null) {
    resolvedTotal = Number(payload.total) || 0;
  } else if (payload.subtotal !== undefined && payload.subtotal !== null) {
    resolvedTotal = Number(payload.subtotal) || 0;
  }
  payload.totalAmount = resolvedTotal;
  payload.total_amount = resolvedTotal;
  payload.totalamount = resolvedTotal;
  if (payload.total !== undefined) payload.total = resolvedTotal;

  if (payload.subtotal !== undefined) payload.subtotal = Number(payload.subtotal) || 0;
  if (payload.tax !== undefined) payload.tax = Number(payload.tax) || 0;
  if (payload.discount !== undefined) payload.discount = Number(payload.discount) || 0;
  if (payload.sequence !== undefined) payload.sequence = Number(payload.sequence) || 0;
  
  let resolvedProductCount = 0;
  if (payload.productCount !== undefined && payload.productCount !== null) {
    resolvedProductCount = Number(payload.productCount) || 0;
  } else if (payload.product_count !== undefined && payload.product_count !== null) {
    resolvedProductCount = Number(payload.product_count) || 0;
  } else if (payload.productcount !== undefined && payload.productcount !== null) {
    resolvedProductCount = Number(payload.productcount) || 0;
  }
  payload.productCount = resolvedProductCount;
  payload.product_count = resolvedProductCount;
  payload.productcount = resolvedProductCount;

  // Normalize payment status
  if (payload.paymentStatus || payload.payment_status || payload.paymentstatus || sqlTable === 'orders') {
    const pStat = String(payload.paymentStatus || payload.payment_status || payload.paymentstatus || 'Pending');
    payload.paymentStatus = pStat;
    payload.payment_status = pStat;
    payload.paymentstatus = pStat;
  }

  // Normalize order status
  if (payload.status || sqlTable === 'orders') {
    const stat = String(payload.status || 'Pending');
    payload.status = stat;
  }

  // Normalize tracking number
  if (payload.trackingNumber || payload.tracking_number || payload.trackingnumber || sqlTable === 'orders') {
    const tNum = String(payload.trackingNumber || payload.tracking_number || payload.trackingnumber || '');
    payload.trackingNumber = tNum;
    payload.tracking_number = tNum;
    payload.trackingnumber = tNum;
  }

  // Normalize courier name
  if (payload.courierName || payload.courier_name || payload.couriername) {
    const cName = String(payload.courierName || payload.courier_name || payload.couriername || '');
    payload.courierName = cName;
    payload.courier_name = cName;
    payload.couriername = cName;
  }

  // Normalize estimated delivery
  if (payload.estimatedDelivery || payload.estimated_delivery || payload.estimateddelivery) {
    const eDel = String(payload.estimatedDelivery || payload.estimated_delivery || payload.estimateddelivery || '');
    payload.estimatedDelivery = eDel;
    payload.estimated_delivery = eDel;
    payload.estimateddelivery = eDel;
  }

  // Normalize createdAt & updatedAt
  const nowIso = new Date().toISOString();
  const cAt = payload.createdAt || payload.created_at || payload.createdat || nowIso;
  payload.createdAt = cAt;
  payload.created_at = cAt;
  payload.createdat = cAt;

  const uAt = payload.updatedAt || payload.updated_at || payload.updatedat || nowIso;
  payload.updatedAt = uAt;
  payload.updated_at = uAt;
  payload.updatedat = uAt;

  // Ensure booleans and their lowercased variants
  let resolvedGenuine = true;
  if (payload.isGenuineVerified !== undefined && payload.isGenuineVerified !== null) {
    resolvedGenuine = Boolean(payload.isGenuineVerified);
  } else if (payload.is_genuine_verified !== undefined && payload.is_genuine_verified !== null) {
    resolvedGenuine = Boolean(payload.is_genuine_verified);
  } else if (payload.isgenuineverified !== undefined && payload.isgenuineverified !== null) {
    resolvedGenuine = Boolean(payload.isgenuineverified);
  }
  payload.isGenuineVerified = resolvedGenuine;
  payload.is_genuine_verified = resolvedGenuine;
  payload.isgenuineverified = resolvedGenuine;`;

const replacementContent = `  // Normalize cost price formats (resolves lowercase costprice not-null violations)
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
  if (payload.swahiliName || payload.swahili_name || payload.swahiliname) {
    const sName = String(payload.swahiliName || payload.swahili_name || payload.swahiliname || '');
    payload.swahiliName = sName;
    payload.swahili_name = sName;
    payload.swahiliname = sName;
  }

  // Normalize totalAmount across all 3 key variants (camelCase, snake_case, lowercase)
  if (payload.totalAmount !== undefined || payload.total_amount !== undefined || payload.totalamount !== undefined || payload.total !== undefined || payload.subtotal !== undefined) {
    let resolvedTotal = 0;
    if (payload.totalAmount !== undefined && payload.totalAmount !== null) {
      resolvedTotal = Number(payload.totalAmount) || 0;
    } else if (payload.total_amount !== undefined && payload.total_amount !== null) {
      resolvedTotal = Number(payload.total_amount) || 0;
    } else if (payload.totalamount !== undefined && payload.totalamount !== null) {
      resolvedTotal = Number(payload.totalamount) || 0;
    } else if (payload.total !== undefined && payload.total !== null) {
      resolvedTotal = Number(payload.total) || 0;
    } else if (payload.subtotal !== undefined && payload.subtotal !== null) {
      resolvedTotal = Number(payload.subtotal) || 0;
    }
    payload.totalAmount = resolvedTotal;
    payload.total_amount = resolvedTotal;
    payload.totalamount = resolvedTotal;
    if (payload.total !== undefined) payload.total = resolvedTotal;
  }

  if (payload.subtotal !== undefined) payload.subtotal = Number(payload.subtotal) || 0;
  if (payload.tax !== undefined) payload.tax = Number(payload.tax) || 0;
  if (payload.discount !== undefined) payload.discount = Number(payload.discount) || 0;
  if (payload.sequence !== undefined) payload.sequence = Number(payload.sequence) || 0;
  
  if (payload.productCount !== undefined || payload.product_count !== undefined || payload.productcount !== undefined) {
    let resolvedProductCount = 0;
    if (payload.productCount !== undefined && payload.productCount !== null) {
      resolvedProductCount = Number(payload.productCount) || 0;
    } else if (payload.product_count !== undefined && payload.product_count !== null) {
      resolvedProductCount = Number(payload.product_count) || 0;
    } else if (payload.productcount !== undefined && payload.productcount !== null) {
      resolvedProductCount = Number(payload.productcount) || 0;
    }
    payload.productCount = resolvedProductCount;
    payload.product_count = resolvedProductCount;
    payload.productcount = resolvedProductCount;
  }

  // Normalize payment status
  if (payload.paymentStatus || payload.payment_status || payload.paymentstatus || sqlTable === 'orders') {
    const pStat = String(payload.paymentStatus || payload.payment_status || payload.paymentstatus || 'Pending');
    payload.paymentStatus = pStat;
    payload.payment_status = pStat;
    payload.paymentstatus = pStat;
  }

  // Normalize order status
  if (payload.status || sqlTable === 'orders') {
    const stat = String(payload.status || 'Pending');
    payload.status = stat;
  }

  // Normalize tracking number
  if (payload.trackingNumber || payload.tracking_number || payload.trackingnumber || sqlTable === 'orders') {
    const tNum = String(payload.trackingNumber || payload.tracking_number || payload.trackingnumber || '');
    payload.trackingNumber = tNum;
    payload.tracking_number = tNum;
    payload.trackingnumber = tNum;
  }

  // Normalize courier name
  if (payload.courierName || payload.courier_name || payload.couriername) {
    const cName = String(payload.courierName || payload.courier_name || payload.couriername || '');
    payload.courierName = cName;
    payload.courier_name = cName;
    payload.couriername = cName;
  }

  // Normalize estimated delivery
  if (payload.estimatedDelivery || payload.estimated_delivery || payload.estimateddelivery) {
    const eDel = String(payload.estimatedDelivery || payload.estimated_delivery || payload.estimateddelivery || '');
    payload.estimatedDelivery = eDel;
    payload.estimated_delivery = eDel;
    payload.estimateddelivery = eDel;
  }

  // Normalize createdAt & updatedAt
  const nowIso = new Date().toISOString();
  const cAt = payload.createdAt || payload.created_at || payload.createdat || nowIso;
  payload.createdAt = cAt;
  payload.created_at = cAt;
  payload.createdat = cAt;

  const uAt = payload.updatedAt || payload.updated_at || payload.updatedat || nowIso;
  payload.updatedAt = uAt;
  payload.updated_at = uAt;
  payload.updatedat = uAt;

  // Ensure booleans and their lowercased variants
  if (payload.isGenuineVerified !== undefined || payload.is_genuine_verified !== undefined || payload.isgenuineverified !== undefined) {
    let resolvedGenuine = true;
    if (payload.isGenuineVerified !== undefined && payload.isGenuineVerified !== null) {
      resolvedGenuine = Boolean(payload.isGenuineVerified);
    } else if (payload.is_genuine_verified !== undefined && payload.is_genuine_verified !== null) {
      resolvedGenuine = Boolean(payload.is_genuine_verified);
    } else if (payload.isgenuineverified !== undefined && payload.isgenuineverified !== null) {
      resolvedGenuine = Boolean(payload.isgenuineverified);
    }
    payload.isGenuineVerified = resolvedGenuine;
    payload.is_genuine_verified = resolvedGenuine;
    payload.isgenuineverified = resolvedGenuine;
  }`;

if (code.includes(targetContent)) {
  code = code.replace(targetContent, replacementContent);
  fs.writeFileSync('server.ts', code);
  console.log("Successfully patched server.ts");
} else {
  console.log("Target content not found. Check exact match.");
}
