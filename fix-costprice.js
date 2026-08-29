const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
`  if (payload.costPrice !== undefined || payload.cost_price !== undefined || payload.costprice !== undefined) {
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
  }
  delete payload.costprice;`,
`  if (payload.costPrice !== undefined || payload.cost_price !== undefined || payload.costprice !== undefined) {
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
  }`
);
fs.writeFileSync('server.ts', code);
