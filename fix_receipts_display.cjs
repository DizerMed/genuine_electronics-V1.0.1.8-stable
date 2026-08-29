const fs = require('fs');

function formatFile(file) {
  let code = fs.readFileSync(file, 'utf-8');
  let changed = false;

  if (file.includes('POSReceiptModal.tsx')) {
    const target = `<span className="text-slate-800">{receipt.createdAt}</span>`;
    const replacement = `<span className="text-slate-800">
                {(() => {
                  try {
                    const d = new Date(receipt.createdAt);
                    if (isNaN(d.getTime())) return receipt.createdAt;
                    return d.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
                  } catch {
                    return receipt.createdAt;
                  }
                })()}
              </span>`;
    if (code.includes(target)) {
      code = code.split(target).join(replacement);
      changed = true;
    }
  }

  if (file.includes('InvoicePrintModal.tsx')) {
    const target = `const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today';`;
    const replacement = `const orderDate = order.createdAt ? (() => {
    try {
      const d = new Date(order.createdAt);
      return isNaN(d.getTime()) ? 'Today' : d.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'Today'; }
  })() : 'Today';`;
    if (code.includes(target)) {
      code = code.split(target).join(replacement);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, code);
    console.log("Fixed display timezone in", file);
  }
}

formatFile('src/components/POSReceiptModal.tsx');
formatFile('src/components/InvoicePrintModal.tsx');
