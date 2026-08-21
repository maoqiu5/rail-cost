export const ADMIN_RESOURCES = [
  {
    key: "borders",
    sectionKey: "admin.sections.referenceData",
    labelKey: "admin.resources.borders",
    idField: "code",
    table: "rail_cost_borders",
    fields: [
      { key: "code", type: "text", required: true },
      { key: "nameCn", type: "text", required: true },
      { key: "nameEn", type: "text", required: true },
      { key: "sortOrder", type: "number", required: true },
      { key: "enabled", type: "boolean", required: true },
    ],
  },
  {
    key: "destinations",
    sectionKey: "admin.sections.referenceData",
    labelKey: "admin.resources.destinations",
    idField: "stationCode",
    table: "rail_cost_destinations",
    fields: [
      { key: "stationCode", type: "text", required: true },
      { key: "nameCn", type: "text", required: true },
      { key: "nameEn", type: "text", required: true },
      { key: "sortOrder", type: "number", required: true },
      { key: "enabled", type: "boolean", required: true },
    ],
  },
  {
    key: "freight-prices",
    sectionKey: "admin.sections.priceMaintenance",
    labelKey: "admin.resources.freightPrices",
    idField: "id",
    table: "rail_cost_freight_prices",
    fields: [
      { key: "id", type: "number", readonly: true },
      { key: "borderCode", type: "text", required: true, reference: { collection: "borders", valueKey: "code" } },
      { key: "destinationStationCode", type: "text", required: true, reference: { collection: "destinations", valueKey: "stationCode" } },
      { key: "containerSize", type: "text", required: true },
      { key: "socPriceUsd", type: "number", required: true },
      { key: "cocPriceUsd", type: "number", required: true },
      { key: "enabled", type: "boolean", required: true },
    ],
  },
  {
    key: "lease-pickups",
    sectionKey: "admin.sections.priceMaintenance",
    labelKey: "admin.resources.leasePickups",
    idField: "code",
    table: "rail_cost_lease_pickups",
    fields: [
      { key: "code", type: "text", required: true },
      { key: "nameCn", type: "text", required: true },
      { key: "nameEn", type: "text", required: true },
      { key: "sortOrder", type: "number", required: true },
      { key: "enabled", type: "boolean", required: true },
    ],
  },
  {
    key: "lease-prices",
    sectionKey: "admin.sections.priceMaintenance",
    labelKey: "admin.resources.leasePrices",
    idField: "id",
    table: "rail_cost_lease_prices",
    fields: [
      { key: "id", type: "number", readonly: true },
      { key: "borderCode", type: "text", required: true, reference: { collection: "borders", valueKey: "code" } },
      { key: "pickupCode", type: "text", required: true, reference: { collection: "leasePickups", valueKey: "code" } },
      { key: "containerSize", type: "text", required: true },
      { key: "displayPriceUsd", type: "number", required: true },
      { key: "enabled", type: "boolean", required: true },
    ],
  },
];

export function getAdminResource(key) {
  return ADMIN_RESOURCES.find((resource) => resource.key === key);
}
