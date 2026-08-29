import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
`    payload.costPrice = resolvedCostPrice;
    payload.cost_price = resolvedCostPrice;
  }
  delete payload.costprice;`,
`    payload.costPrice = resolvedCostPrice;
    payload.cost_price = resolvedCostPrice;
    payload.costprice = resolvedCostPrice;
  }`
);
code = code.replace(
`    payload.minStockAlert = resolvedMinStock;
    payload.min_stock_alert = resolvedMinStock;
  }
  delete payload.minstockalert;`,
`    payload.minStockAlert = resolvedMinStock;
    payload.min_stock_alert = resolvedMinStock;
    payload.minstockalert = resolvedMinStock;
  }`
);
code = code.replace(
`    payload.reviewsCount = resolvedReviewsCount;
    payload.reviews_count = resolvedReviewsCount;
  }
  delete payload.reviewscount;`,
`    payload.reviewsCount = resolvedReviewsCount;
    payload.reviews_count = resolvedReviewsCount;
    payload.reviewscount = resolvedReviewsCount;
  }`
);
code = code.replace(
`    payload.isGenuineVerified = resolvedGenuine;
    payload.is_genuine_verified = resolvedGenuine;
  }
  delete payload.isgenuineverified;`,
`    payload.isGenuineVerified = resolvedGenuine;
    payload.is_genuine_verified = resolvedGenuine;
    payload.isgenuineverified = resolvedGenuine;
  }`
);
code = code.replace(
`    payload.energyRating = resolvedEnergy;
    payload.energy_rating = resolvedEnergy;
  }
  delete payload.energyrating;`,
`    payload.energyRating = resolvedEnergy;
    payload.energy_rating = resolvedEnergy;
    payload.energyrating = resolvedEnergy;
  }`
);
code = code.replace(
`    payload.applianceType = resolvedApplianceType;
    payload.appliance_type = resolvedApplianceType;
  }
  delete payload.appliancetype;`,
`    payload.applianceType = resolvedApplianceType;
    payload.appliance_type = resolvedApplianceType;
    payload.appliancetype = resolvedApplianceType;
  }`
);
fs.writeFileSync('server.ts', code);
