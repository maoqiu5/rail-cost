export function findRailDestination(query, catalog) {
  return findCatalogDestination(query, catalog);
}

export function findRailDestinationFromInput(query, catalog) {
  return findCatalogDestination(query, catalog, { includeLabel: true });
}

export function calculateRailCost({ agentCode, border, destinationCode, containerSize, ownership }, catalog) {
  const agent = findCatalogAgent(agentCode, catalog);
  if (!agent) return unavailable("error.rail.unknownAgent");

  const destination = findCatalogDestination(destinationCode, catalog);
  if (!destination) return unavailable("error.rail.destinationNotFound");

  const borderRow = findCatalogBorder(border, catalog);
  if (!borderRow) return unavailable("error.rail.unknownBorder");

  const quote = findQuote({
    quotes: catalog.railPublicQuotes || [],
    agentCode: agent.code,
    borderCode: borderRow.code,
    destinationStationCode: destination.stationCode,
    containerSize,
    ownership,
  });
  if (!quote) return unavailable("error.rail.noQuote");

  const totalUsd = Number(quote.quoteUsd);
  return {
    available: true,
    agent,
    border: borderRow.code,
    destination,
    containerSize,
    ownership,
    baseUsd: totalUsd,
    adjustmentUsd: 0,
    totalUsd,
    ruleKey: "rule.rail.importedQuote",
  };
}

export function getAvailableLeasePickups(agentCode, border, containerSize, catalog) {
  return catalog.leasePickups.filter(
    (pickup) => calculateLeaseCost({ agentCode, border, pickupCode: pickup.code, containerSize }, catalog).available,
  );
}

export function calculateLeaseCost({ agentCode, border, pickupCode, containerSize }, catalog) {
  const agent = findCatalogAgent(agentCode, catalog);
  if (!agent) return unavailable("error.lease.unknownAgent");

  const borderRow = findCatalogBorder(border, catalog);
  if (!borderRow) return unavailable("error.lease.unknownBorder");

  const leasePrices = catalog.leasePrices || [];
  if (!leasePrices.length) return unavailable("error.lease.noContainer");

  const pickup = catalog.leasePickups.find((item) => item.code === pickupCode);
  if (!pickup) return unavailable("error.lease.pickupNotFound");

  const price = leasePrices.find(
    (item) =>
      item.agentCode === agent.code &&
      item.borderCode === borderRow.code &&
      item.pickupCode === pickup.code &&
      item.containerSize === containerSize,
  );
  if (!price) return unavailable("error.lease.noContainer");

  const tableUsd = Number(price.priceUsd);
  const totalUsd = Number(price.displayPriceUsd);
  return {
    available: true,
    agent,
    border: borderRow.code,
    pickup,
    containerSize,
    tableUsd,
    adjustmentUsd: totalUsd - tableUsd,
    totalUsd,
    ruleKey: "rule.lease.importedQuote",
  };
}

function findQuote({ quotes, agentCode, borderCode, destinationStationCode, containerSize, ownership }) {
  const matches = quotes.filter(
    (item) =>
      item.agentCode === agentCode &&
      item.borderCode === borderCode &&
      item.destinationStationCode === destinationStationCode &&
      item.containerSize === containerSize &&
      (item.ownership === ownership || item.ownership === "*"),
  );
  return [...matches].sort((a, b) => Number(b.ownership === ownership) - Number(a.ownership === ownership))[0];
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

function findCatalogAgent(query, catalog) {
  const normalized = String(query || "").trim().toLowerCase();
  return (catalog.agents || []).find((item) => [item.code, item.nameCn, item.nameEn].some((value) => String(value).toLowerCase() === normalized));
}

function unavailable(reasonKey) {
  return { available: false, reasonKey };
}
