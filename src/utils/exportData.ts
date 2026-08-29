import { Product, POSTransaction } from '../types';

/**
 * Helper to download CSV file in browser
 */
function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Products / Inventory to CSV
 */
export function exportProductsToCSV(products: Product[]) {
  const headers = [
    'Product ID',
    'SKU',
    'Product Name',
    'Category',
    'Brand',
    'Cost Price (TZS)',
    'Selling Price (TZS)',
    'Stock Quantity',
    'Stock Status',
    'Barcode',
    'Warranty',
    'Featured',
    'Special Offer'
  ];

  const rows = products.map((p) => {
    const stockQty = p.stock ?? p.stockCount ?? 0;
    return [
      `"${p.id || ''}"`,
      `"${p.sku || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.category || ''}"`,
      `"${p.brand || ''}"`,
      p.costPrice || 0,
      p.price || 0,
      stockQty,
      stockQty <= 0 ? 'Out of Stock' : stockQty <= 5 ? 'Low Stock' : 'In Stock',
      `"${p.barcode || ''}"`,
      `"${p.warranty || ''}"`,
      p.featured ? 'Yes' : 'No',
      p.isOnOffer ? 'Yes' : 'No'
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `Genuine_Electronics_Inventory_${dateStr}.csv`);
}

/**
 * Export POS Transactions / Sales to CSV
 */
export function exportSalesToCSV(transactions: POSTransaction[]) {
  const headers = [
    'Receipt ID',
    'Date & Time',
    'Customer Name',
    'Customer Phone',
    'Cashier',
    'Payment Method',
    'Is Loan/Credit',
    'Subtotal (TZS)',
    'Discount (TZS)',
    'Total (TZS)',
    'Tendered (TZS)',
    'Change (TZS)',
    'Status',
    'Items Summary'
  ];

  const rows = transactions.map((t) => {
    const itemsSummary = (t.items || [])
      .map(i => `${i.quantity}x ${i.product.name} (@ ${i.product.price})`)
      .join('; ');

    const total = t.totalAmount ?? t.total ?? 0;
    const tendered = t.tenderedAmount ?? total;

    return [
      `"${t.id || ''}"`,
      `"${t.createdAt || ''}"`,
      `"${(t.customerName || 'Walk-in Customer').replace(/"/g, '""')}"`,
      `"${t.customerPhone || ''}"`,
      `"${(t.cashierName || 'Staff').replace(/"/g, '""')}"`,
      `"${t.paymentMethod || 'Cash'}"`,
      t.isLoan ? 'Credit/Loan' : 'Full Payment',
      t.subtotal || total,
      t.discount || 0,
      total,
      tendered,
      t.changeAmount || 0,
      `"${t.status || 'Completed'}"`,
      `"${itemsSummary.replace(/"/g, '""')}"`
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `Genuine_Electronics_Sales_Report_${dateStr}.csv`);
}

/**
 * Export Loans / Customer Debts (Lipa Deni) to CSV
 */
export function exportLoansToCSV(loans: POSTransaction[]) {
  const headers = [
    'Loan Account ID',
    'Date Issued',
    'Customer Name',
    'Customer Phone',
    'Customer Email',
    'Guarantor Name',
    'Guarantor Phone',
    'Total Value (TZS)',
    'Down Payment (TZS)',
    'Total Repaid (TZS)',
    'Remaining Outstanding Debt (TZS)',
    'Due Date',
    'Status',
    'Items Financed'
  ];

  const rows = loans.map((l) => {
    const total = l.totalAmount ?? l.total ?? 0;
    const down = l.downPayment || 0;
    const repaymentsSum = (l.loanRepayments || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const totalPaid = down + repaymentsSum;
    const remaining = Math.max(0, total - totalPaid);

    const itemsSummary = (l.items || [])
      .map(i => `${i.quantity}x ${i.product.name}`)
      .join('; ');

    return [
      `"${l.id || ''}"`,
      `"${l.createdAt || ''}"`,
      `"${(l.customerName || 'Customer').replace(/"/g, '""')}"`,
      `"${l.customerPhone || ''}"`,
      `"${l.customerEmail || ''}"`,
      `"${l.loanGuarantorName || ''}"`,
      `"${l.loanGuarantorPhone || ''}"`,
      total,
      down,
      totalPaid,
      remaining,
      `"${l.loanDueDate || 'Flexible'}"`,
      remaining <= 0 ? 'Settled' : 'Active Debt',
      `"${itemsSummary.replace(/"/g, '""')}"`
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `Genuine_Electronics_Loan_Debts_Report_${dateStr}.csv`);
}

/**
 * Export Tax Journal (Monthly/Periodic Journal) to CSV
 */
export function exportTaxJournalToCSV(transactions: POSTransaction[], vatRatePercentage: number = 18) {
  const headers = [
    'Date (EAT)',
    'Receipt Number',
    'Customer Name',
    'Customer TIN',
    'Customer Phone',
    'Price Tier',
    'Gross Total (TZS)',
    'Discount (TZS)',
    'Net Taxable Base (TZS)',
    'VAT Rate (%)',
    'TRA VAT Output (TZS)',
    'Grand Total Paid (TZS)',
    'Payment Tender',
    'Serial / IMEI Numbers',
    'Cashier'
  ];

  const rows = transactions.map((t) => {
    const total = Number(t.totalAmount ?? t.total ?? 0);
    const discount = Number(t.discount || 0);
    const isVat = t.includeVat !== false;
    const vatPct = t.vatPercentage ?? vatRatePercentage;
    const vatAmount = isVat ? Math.round(total * (vatPct / (100 + vatPct))) : 0;
    const netBase = isVat ? total - vatAmount : total;

    const allSerials: string[] = [];
    (t.items || []).forEach(item => {
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        allSerials.push(`${item.product.name}: [${item.serialNumbers.join(', ')}]`);
      }
    });

    const paymentSummary = t.splitPayments && t.splitPayments.length > 0
      ? t.splitPayments.map(sp => `${sp.method}: ${sp.amount}`).join('; ')
      : (t.paymentMethod || 'Cash');

    const priceTierSummary = t.priceTier || ((t.items || []).some(i => i.priceTier === 'wholesale') ? 'Wholesale' : 'Retail');

    return [
      `"${t.createdAt ? new Date(t.createdAt).toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' }) : ''}"`,
      `"${t.receiptNumber || t.id || ''}"`,
      `"${(t.customerName || 'Walk-in Customer').replace(/"/g, '""')}"`,
      `"${t.customerTin || ''}"`,
      `"${t.customerPhone || ''}"`,
      `"${priceTierSummary}"`,
      total + discount,
      discount,
      netBase,
      isVat ? vatPct : 0,
      vatAmount,
      total,
      `"${paymentSummary.replace(/"/g, '""')}"`,
      `"${allSerials.join(' | ').replace(/"/g, '""')}"`,
      `"${(t.cashierName || 'Staff').replace(/"/g, '""')}"`
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `TRA_Tax_Journal_Genuine_Electronics_${dateStr}.csv`);
}
