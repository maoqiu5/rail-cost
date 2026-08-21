export function findRailDestination(query, catalog) {
  return findCatalogDestination(query, catalog);
}

export function findRailDestinationFromInput(query, catalog) {
  return findCatalogDestination(query, catalog, { includeLabel: true });
}

export function calculateRailCost({ border, destinationCode, containerSize, ownership }, catalog) {
  const destination = findCatalogDestination(destinationCode, catalog);
  if (!destination) return unavailable("error.rail.destinationNotFound");

  const borderRow = findCatalogBorder(border, catalog);
  if (!borderRow) return unavailable("error.rail.unknownBorder");

  const maintainedFreight = (catalog.freightPrices || []).find(
    (item) => item.borderCode === borderRow.code && item.destinationStationCode === destination.stationCode && item.containerSize === containerSize,
  );
  if (maintainedFreight) {
    const totalUsd = Number(ownership === "SOC" ? maintainedFreight.socPriceUsd : maintainedFreight.cocPriceUsd);
    return result({
      border: borderRow.code,
      destination,
      containerSize,
      ownership,
      baseUsd: totalUsd,
      adjustmentUsd: 0,
      totalUsd,
      ruleKey: "rule.rail.maintained",
    });
  }

  const exactQuote = findOwnershipQuote({
    quotes: catalog.railPublicQuotes,
    borderCode: borderRow.code,
    destinationStationCode: destination.stationCode,
    containerSize,
    ownership,
    exactOnly: true,
  });
  if (exactQuote) {
    return result({
      border: borderRow.code,
      destination,
      containerSize,
      ownership,
      baseUsd: Number(exactQuote.quoteUsd),
      adjustmentUsd: 0,
      totalUsd: Number(exactQuote.quoteUsd),
      ruleKey: "rule.rail.ownershipQuote",
    });
  }

  const rule = bestRule(
    catalog.railRules.filter(
      (item) =>
        item.borderCode === borderRow.code &&
        item.containerSize === containerSize &&
        (item.destinationStationCode === destination.stationCode || item.destinationStationCode === "") &&
        (item.ownership === ownership || item.ownership === "*"),
    ),
    "destinationStationCode",
    destination.stationCode,
  );

  if (!rule) {
    return borderRow.code === "ERLIAN" ? unavailable("error.rail.erlianNoRule") : unavailable("error.rail.manzhouliNoQuote");
  }
  if (rule.ruleType === "unavailable") return unavailable(rule.ruleKey);

  if (rule.ruleType === "fixed") {
    const totalUsd = Number(rule.fixedUsd);
    return result({
      border: borderRow.code,
      destination,
      containerSize,
      ownership,
      baseUsd: totalUsd,
      adjustmentUsd: 0,
      totalUsd,
      ruleKey: rule.ruleKey,
    });
  }

  const quote = findOwnershipQuote({
    quotes: catalog.railPublicQuotes,
    borderCode: borderRow.code,
    destinationStationCode: destination.stationCode,
    containerSize,
    ownership,
  });
  if (!quote) return unavailable("error.rail.manzhouliNoQuote");

  const adjustmentUsd = quote.ownership === ownership ? 0 : Number(rule.adjustmentUsd || 0);
  return result({
    border: borderRow.code,
    destination,
    containerSize,
    ownership,
    baseUsd: Number(quote.quoteUsd),
    adjustmentUsd,
    totalUsd: Number(quote.quoteUsd) + adjustmentUsd,
    ruleKey: rule.ruleKey,
    ruleParams: { ownership, adjustment: adjustmentUsd },
  });
}

export function getAvailableLeasePickups(border, containerSize, catalog) {
  return catalog.leasePickups.filter((pickup) => calculateLeaseCost({ border, pickupCode: pickup.code, containerSize }, catalog).available);
}

export function calculateLeaseCost({ border, pickupCode, containerSize }, catalog) {
  const borderRow = findCatalogBorder(border, catalog);
  if (!borderRow) return unavailable("error.lease.unknownBorder");

  const pickup = catalog.leasePickups.find((item) => item.code === pickupCode);
  if (!pickup) return unavailable("error.lease.pickupNotFound");

  const maintained = (catalog.leasePrices || []).find((item) => item.borderCode === borderRow.code && item.pickupCode === pickup.code && item.containerSize === containerSize);
  if (maintained) {
    const tableUsd = Number(maintained.priceUsd);
    const discountUsd = Number(maintained.discountUsd);
    const totalUsd = Number(maintained.displayPriceUsd);
    return { available: true, border: borderRow.code, pickup, containerSize, tableUsd, adjustmentUsd: -discountUsd, totalUsd, ruleKey: "rule.lease.maintained" };
  }

  const table = catalog.leaseTablePrices.find((item) => item.pickupCode === pickup.code && item.containerSize === containerSize);
  if (!table) return unavailable("error.lease.noTablePrice");

  const rule = bestRule(
    catalog.leaseRules.filter(
      (item) =>
        item.borderCode === borderRow.code &&
        item.containerSize === containerSize &&
        (item.pickupCode === pickup.code || item.pickupCode === ""),
    ),
    "pickupCode",
    pickup.code,
  );

  if (!rule) return unavailable("error.lease.unknownBorder");
  if (rule.ruleType === "unavailable") return unavailable(rule.ruleKey);

  const tableUsd = Number(table.priceUsd);
  const totalUsd = rule.ruleType === "fixed" ? Number(rule.fixedUsd) : tableUsd + Number(rule.adjustmentUsd || 0);
  return {
    available: true,
    border: borderRow.code,
    pickup,
    containerSize,
    tableUsd,
    adjustmentUsd: totalUsd - tableUsd,
    totalUsd,
    ruleKey: rule.ruleKey,
  };
}

function findCatalogDestination(query, catalog, { includeLabel = false } = {}) {
  const normalized = String(query || "").trim().toLowerCase();
  return catalog.destinations.find((item) => {
    const values = [item.nameCn, item.nameEn, item.stationCode];
    if (includeLabel) values.push(`${item.nameCn} / ${item.nameEn} / ${item.stationCode}`);
    return values.some((value) => String(value).toLowerCase() === normalized);
  });
}

function findCatalogBorder(query, catalog) {
  const normalized = String(query || "").trim().toLowerCase();
  return catalog.borders.find((item) => [item.code, item.nameCn, item.nameEn].some((value) => String(value).toLowerCase() === normalized));
}

function bestRule(rules, specificField, specificValue) {
  return [...rules]
    .sort((a, b) => {
      const priority = Number(b.priority || 0) - Number(a.priority || 0);
      if (priority !== 0) return priority;
      return Number(b[specificField] === specificValue) - Number(a[specificField] === specificValue);
    })
    [0];
}

function findOwnershipQuote({ quotes, borderCode, destinationStationCode, containerSize, ownership, exactOnly = false }) {
  const matches = quotes.filter(
    (item) =>
      item.borderCode === borderCode &&
      item.destinationStationCode === destinationStationCode &&
      item.containerSize === containerSize &&
      (exactOnly ? item.ownership === ownership : item.ownership === ownership || item.ownership === "*" || !item.ownership),
  );
  return [...matches].sort((a, b) => Number(b.ownership === ownership) - Number(a.ownership === ownership))[0];
}

function result(payload) {
  return { available: true, ...payload };
}

function unavailable(reasonKey) {
  return { available: false, reasonKey };
}
