import { CartItem, OrderItem, Product } from '../types';

export interface TaxItemLike {
  product: Product;
  quantity: number;
  price?: number;
  serialNumbers?: string[];
  priceTier?: 'retail' | 'wholesale';
}

export interface TaxClassificationResult<T extends TaxItemLike = TaxItemLike> {
  taxableItems: T[];
  exemptItems: T[];
  taxableGross: number;
  exemptGross: number;
  totalGross: number;
  isMixed: boolean;
  hasTaxable: boolean;
  hasExempt: boolean;
  // Financial breakdown considering discounts and VAT rate
  vatRate: number;
  isVatEnabled: boolean;
  taxableDiscount: number;
  exemptDiscount: number;
  taxableDiscountedGross: number;
  exemptDiscountedGross: number;
  taxAmount: number;
  taxableNetSubtotal: number;
  exemptSubtotal: number;
  netSubtotal: number;
  totalBeforeExtra: number;
  extraCostsTotal: number;
  grandTotal: number;
}

/**
 * Helper to safely extract unit price of an item
 */
export function getItemUnitPrice(item: TaxItemLike): number {
  if (item.price !== undefined && Number(item.price) >= 0) {
    return Number(item.price);
  }
  if (item.priceTier === 'wholesale' && item.product.wholesalePrice && item.product.wholesalePrice > 0) {
    return Number(item.product.wholesalePrice);
  }
  return Number(item.product.price || 0);
}

/**
 * Iterates through cart/order items, groups them by tax status (VAT-taxable vs Non-VAT/Exempt),
 * and computes accurate and transparent subtotals and tax calculations.
 */
export function groupCartItemsByTaxStatus<T extends TaxItemLike>(
  items: T[] = [],
  options: {
    vatPercentage?: number;
    includeVat?: boolean;
    discount?: number;
    extraCosts?: { amount: number }[];
  } = {}
): TaxClassificationResult<T> {
  const {
    vatPercentage = 18,
    includeVat = true,
    discount = 0,
    extraCosts = []
  } = options;

  const taxableItems: T[] = [];
  const exemptItems: T[] = [];

  let taxableGross = 0;
  let exemptGross = 0;

  for (const item of items) {
    const unitPrice = getItemUnitPrice(item);
    const lineGross = unitPrice * (Number(item.quantity) || 1);
    
    // Explicitly check product tax status:
    // If isVatInclusive is explicitly false, it is Non-VAT / Exempt.
    // Otherwise, standard VAT applies if VAT is enabled.
    if (item.product?.isVatInclusive === false) {
      exemptItems.push(item);
      exemptGross += lineGross;
    } else {
      taxableItems.push(item);
      taxableGross += lineGross;
    }
  }

  const totalGross = taxableGross + exemptGross;
  const hasTaxable = taxableItems.length > 0;
  const hasExempt = exemptItems.length > 0;
  const isMixed = hasTaxable && hasExempt;

  // Clamped discount
  const clampedDiscount = Math.min(Math.max(0, Number(discount) || 0), totalGross);

  // Proportional discount distribution
  const taxableDiscount = totalGross > 0 ? (taxableGross / totalGross) * clampedDiscount : 0;
  const exemptDiscount = totalGross > 0 ? (exemptGross / totalGross) * clampedDiscount : 0;

  const taxableDiscountedGross = Math.max(0, taxableGross - taxableDiscount);
  const exemptDiscountedGross = Math.max(0, exemptGross - exemptDiscount);

  const effectiveVatRate = Math.max(0, Number(vatPercentage) || 0);
  const isVatEnabled = includeVat && effectiveVatRate > 0 && hasTaxable;

  // Standard Tanzania VAT formula on VAT-inclusive selling prices: Gross * (rate / (100 + rate))
  const taxAmount = isVatEnabled
    ? Math.round(taxableDiscountedGross * (effectiveVatRate / (100 + effectiveVatRate)))
    : 0;

  const taxableNetSubtotal = isVatEnabled && taxAmount > 0
    ? taxableDiscountedGross - taxAmount
    : taxableDiscountedGross;

  const exemptSubtotal = exemptDiscountedGross;
  const netSubtotal = taxableNetSubtotal + exemptSubtotal;
  const totalBeforeExtra = taxableDiscountedGross + exemptDiscountedGross;

  const extraCostsTotal = extraCosts.reduce((sum, cost) => sum + (Number(cost.amount) || 0), 0);
  const grandTotal = Math.max(0, totalBeforeExtra + extraCostsTotal);

  return {
    taxableItems,
    exemptItems,
    taxableGross,
    exemptGross,
    totalGross,
    isMixed,
    hasTaxable,
    hasExempt,
    vatRate: effectiveVatRate,
    isVatEnabled,
    taxableDiscount,
    exemptDiscount,
    taxableDiscountedGross,
    exemptDiscountedGross,
    taxAmount,
    taxableNetSubtotal,
    exemptSubtotal,
    netSubtotal,
    totalBeforeExtra,
    extraCostsTotal,
    grandTotal
  };
}
