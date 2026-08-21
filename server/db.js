import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { ADMIN_RESOURCES, getAdminResource } from "../web/admin-model.js";
import { buildSeedRows } from "./seed.js";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "rail-cost.db");
const INITIAL_SEED_VERSION = "2026-08-11";

const TABLE_COLUMNS = {
  rail_cost_borders: ["code", "nameCn", "nameEn", "sortOrder", "enabled"],
  rail_cost_destinations: ["stationCode", "nameCn", "nameEn", "sortOrder", "enabled"],
  rail_cost_rail_public_quotes: ["id", "borderCode", "destinationStationCode", "containerSize", "ownership", "quoteUsd", "enabled"],
  rail_cost_freight_prices: ["id", "borderCode", "destinationStationCode", "containerSize", "socPriceUsd", "cocPriceUsd", "enabled", "updatedAt"],
  rail_cost_rail_rules: [
    "id",
    "borderCode",
    "destinationStationCode",
    "containerSize",
    "ownership",
    "ruleType",
    "adjustmentUsd",
    "fixedUsd",
    "ruleKey",
    "priority",
    "note",
    "enabled",
  ],
  rail_cost_lease_pickups: ["code", "nameCn", "nameEn", "sortOrder", "enabled"],
  rail_cost_lease_table_prices: ["id", "pickupCode", "containerSize", "priceUsd", "enabled"],
  rail_cost_lease_prices: ["id", "borderCode", "pickupCode", "containerSize", "priceUsd", "discountUsd", "displayPriceUsd", "enabled"],
  rail_cost_lease_rules: [
    "id",
    "borderCode",
    "pickupCode",
    "containerSize",
    "ruleType",
    "adjustmentUsd",
    "fixedUsd",
    "ruleKey",
    "priority",
    "note",
    "enabled",
  ],
};

export function openDatabase(dbPath = process.env.RAIL_COST_DB || DEFAULT_DB_PATH) {
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  return new DatabaseSync(dbPath);
}

export function ensureSchema(db) {
  db.exec("pragma foreign_keys = on;");
  db.exec(`
    create table if not exists rail_cost_meta (
      key text primary key,
      value text not null
    );

    create table if not exists rail_cost_borders (
      code text primary key,
      nameCn text not null,
      nameEn text not null,
      sortOrder integer not null default 0,
      enabled integer not null default 1
    );

    create table if not exists rail_cost_destinations (
      stationCode text primary key,
      nameCn text not null,
      nameEn text not null,
      sortOrder integer not null default 0,
      enabled integer not null default 1
    );

    create table if not exists rail_cost_rail_public_quotes (
      id integer primary key,
      borderCode text not null,
      destinationStationCode text not null,
      containerSize text not null,
      ownership text not null default '*',
      quoteUsd real not null,
      enabled integer not null default 1,
      unique (borderCode, destinationStationCode, containerSize, ownership)
    );

    create table if not exists rail_cost_rail_rules (
      id integer primary key,
      borderCode text not null,
      destinationStationCode text not null default '',
      containerSize text not null,
      ownership text not null default '*',
      ruleType text not null,
      adjustmentUsd real,
      fixedUsd real,
      ruleKey text not null default '',
      priority integer not null default 0,
      note text not null default '',
      enabled integer not null default 1
    );

    create table if not exists rail_cost_freight_prices (
      id integer primary key,
      borderCode text not null,
      destinationStationCode text not null,
      containerSize text not null,
      socPriceUsd real not null,
      cocPriceUsd real not null,
      enabled integer not null default 1,
      updatedAt text not null default (datetime('now')),
      unique (borderCode, destinationStationCode, containerSize)
    );

    create table if not exists rail_cost_lease_pickups (
      code text primary key,
      nameCn text not null,
      nameEn text not null,
      sortOrder integer not null default 0,
      enabled integer not null default 1
    );

    create table if not exists rail_cost_lease_table_prices (
      id integer primary key,
      pickupCode text not null,
      containerSize text not null,
      priceUsd real not null,
      enabled integer not null default 1,
      unique (pickupCode, containerSize)
    );

    create table if not exists rail_cost_lease_prices (
      id integer primary key,
      borderCode text not null,
      pickupCode text not null,
      containerSize text not null,
      priceUsd real not null,
      discountUsd real not null default 0,
      displayPriceUsd real not null,
      enabled integer not null default 1,
      unique (borderCode, pickupCode, containerSize)
    );

    create table if not exists rail_cost_lease_rules (
      id integer primary key,
      borderCode text not null,
      pickupCode text not null default '',
      containerSize text not null,
      ruleType text not null,
      adjustmentUsd real,
      fixedUsd real,
      ruleKey text not null default '',
      priority integer not null default 0,
      note text not null default '',
      enabled integer not null default 1
    );
  `);
  migrateSchema(db);
}

export function seedDatabase(db) {
  if (db.prepare("select value from rail_cost_meta where key = ?").get("initial_seed_version")) {
    ensureLeasePrices(db);
    ensureFreightPrices(db);
    return;
  }
  if (domainRowCount(db) > 0) {
    db.prepare("insert or replace into rail_cost_meta (key, value) values (?, ?)").run("initial_seed_version", INITIAL_SEED_VERSION);
    ensureLeasePrices(db);
    ensureFreightPrices(db);
    return;
  }

  const rows = buildSeedRows();
  insertMany(db, "rail_cost_borders", rows.borders);
  insertMany(db, "rail_cost_destinations", rows.destinations);
  insertMany(db, "rail_cost_rail_public_quotes", rows.railPublicQuotes);
  insertMany(db, "rail_cost_rail_rules", rows.railRules);
  insertMany(db, "rail_cost_lease_pickups", rows.leasePickups);
  insertMany(db, "rail_cost_lease_table_prices", rows.leaseTablePrices);
  insertMany(db, "rail_cost_lease_rules", rows.leaseRules);
  db.prepare("insert or replace into rail_cost_meta (key, value) values (?, ?)").run("initial_seed_version", INITIAL_SEED_VERSION);
  ensureLeasePrices(db);
  ensureFreightPrices(db);
}

function ensureFreightPrices(db) {
  if (db.prepare("select count(1) as c from rail_cost_freight_prices").get().c > 0) return;
  const quotes = db.prepare("select * from rail_cost_rail_public_quotes where enabled = 1 order by id").all();
  const rules = db.prepare("select * from rail_cost_rail_rules where enabled = 1 order by priority desc, id").all();
  const rows = new Map();

  function rowFor(borderCode, destinationStationCode, containerSize) {
    const key = `${borderCode}|${destinationStationCode}|${containerSize}`;
    if (!rows.has(key)) rows.set(key, { borderCode, destinationStationCode, containerSize, socPriceUsd: null, cocPriceUsd: null, enabled: 1 });
    return rows.get(key);
  }

  for (const quote of quotes) {
    if (quote.ownership === "SOC" || quote.ownership === "*") {
      rowFor(quote.borderCode, quote.destinationStationCode, quote.containerSize).socPriceUsd = finalRailPrice({ quote, ownership: "SOC", rules });
    }
    if (quote.ownership === "COC" || quote.ownership === "*") {
      rowFor(quote.borderCode, quote.destinationStationCode, quote.containerSize).cocPriceUsd = finalRailPrice({ quote, ownership: "COC", rules });
    }
  }

  for (const rule of rules.filter((item) => item.ruleType === "fixed")) {
    if (!rule.destinationStationCode) continue;
    const row = rowFor(rule.borderCode, rule.destinationStationCode, rule.containerSize);
    const fixedUsd = Number(rule.fixedUsd);
    if (rule.ownership === "SOC" || rule.ownership === "*") row.socPriceUsd ??= fixedUsd;
    if (rule.ownership === "COC" || rule.ownership === "*") row.cocPriceUsd ??= fixedUsd;
  }

  let id = 1;
  for (const row of rows.values()) {
    if (!Number.isFinite(row.socPriceUsd) || !Number.isFinite(row.cocPriceUsd)) continue;
    db.prepare("insert or ignore into rail_cost_freight_prices (id, borderCode, destinationStationCode, containerSize, socPriceUsd, cocPriceUsd, enabled) values (@id, @borderCode, @destinationStationCode, @containerSize, @socPriceUsd, @cocPriceUsd, @enabled)").run({ id, ...row });
    id += 1;
  }
}

function finalRailPrice({ quote, ownership, rules }) {
  const quoteUsd = Number(quote.quoteUsd);
  if (quote.ownership === ownership) return quoteUsd;
  const rule = bestFinalRailRule(
    rules.filter(
      (item) =>
        item.borderCode === quote.borderCode &&
        item.containerSize === quote.containerSize &&
        (item.destinationStationCode === quote.destinationStationCode || item.destinationStationCode === "") &&
        (item.ownership === ownership || item.ownership === "*"),
    ),
    quote.destinationStationCode,
  );
  if (!rule || rule.ruleType === "unavailable") return null;
  if (rule.ruleType === "fixed") return Number(rule.fixedUsd);
  return quoteUsd + Number(rule.adjustmentUsd || 0);
}

function bestFinalRailRule(rules, destinationStationCode) {
  return [...rules]
    .sort((a, b) => {
      const priority = Number(b.priority || 0) - Number(a.priority || 0);
      if (priority !== 0) return priority;
      return Number(b.destinationStationCode === destinationStationCode) - Number(a.destinationStationCode === destinationStationCode);
    })
    [0];
}

function ensureLeasePrices(db) {
  if (db.prepare("select count(1) as c from rail_cost_lease_prices").get().c > 0) return;
  const borders = db.prepare("select code from rail_cost_borders where enabled = 1 order by sortOrder, code").all();
  const bases = db.prepare("select pickupCode, containerSize, priceUsd, enabled from rail_cost_lease_table_prices").all();
  const rules = db.prepare("select * from rail_cost_lease_rules where enabled = 1 order by priority desc, id").all();
  let id = 1;
  for (const border of borders) {
    for (const base of bases) {
      const rule = rules.find((item) => item.borderCode === border.code && item.containerSize === base.containerSize && (item.pickupCode === base.pickupCode || item.pickupCode === ""));
      if (rule?.ruleType === "unavailable") continue;
      const priceUsd = Number(base.priceUsd);
      const displayPriceUsd = rule?.ruleType === "fixed" ? Number(rule.fixedUsd) : priceUsd + Number(rule?.adjustmentUsd || 0);
      const discountUsd = priceUsd - displayPriceUsd;
      if (!Number.isFinite(displayPriceUsd) || displayPriceUsd < 0 || discountUsd < 0) continue;
      db.prepare("insert or ignore into rail_cost_lease_prices (id, borderCode, pickupCode, containerSize, priceUsd, discountUsd, displayPriceUsd, enabled) values (@id, @borderCode, @pickupCode, @containerSize, @priceUsd, @discountUsd, @displayPriceUsd, @enabled)").run({ id, borderCode: border.code, pickupCode: base.pickupCode, containerSize: base.containerSize, priceUsd, discountUsd, displayPriceUsd, enabled: base.enabled });
      id += 1;
    }
  }
}

export function loadQueryData(db) {
  return {
    borders: selectEnabled(db, "rail_cost_borders", "sortOrder, code"),
    destinations: selectEnabled(db, "rail_cost_destinations", "sortOrder, stationCode"),
    railPublicQuotes: selectEnabled(db, "rail_cost_rail_public_quotes", "borderCode, destinationStationCode, containerSize, ownership"),
    freightPrices: selectEnabled(db, "rail_cost_freight_prices", "borderCode, destinationStationCode, containerSize"),
    railRules: selectEnabled(db, "rail_cost_rail_rules", "priority desc, id"),
    leasePickups: selectEnabled(db, "rail_cost_lease_pickups", "sortOrder, code"),
    leasePrices: selectEnabled(db, "rail_cost_lease_prices", "borderCode, pickupCode, containerSize"),
    leaseTablePrices: selectEnabled(db, "rail_cost_lease_table_prices", "pickupCode, containerSize"),
    leaseRules: selectEnabled(db, "rail_cost_lease_rules", "priority desc, id"),
  };
}

export function loadAdminTables(db) {
  return Object.fromEntries(
    ADMIN_RESOURCES.map((resource) => [
      resource.key,
      {
        ...resource,
        rows: selectAll(db, resource.table, orderByFor(resource)),
      },
    ]),
  );
}

export function listResourceRows(db, resourceKey) {
  const resource = requireResource(resourceKey);
  return selectAll(db, resource.table, orderByFor(resource));
}

export function createResourceRow(db, resourceKey, payload) {
  const resource = requireResource(resourceKey);
  const row = cleanPayload(db, resource, payload, { creating: true });
  insertOne(db, resource.table, row);
  return getResourceRow(db, resourceKey, row[resource.idField] ?? lastInsertId(db));
}

export function updateResourceRow(db, resourceKey, id, payload) {
  const resource = requireResource(resourceKey);
  const row = cleanPayload(db, resource, { ...payload, [resource.idField]: id }, { creating: false });
  const idField = resource.idField;
  const columns = Object.keys(row).filter((column) => column !== idField);
  const assignments = columns.map((column) => `${column} = @${column}`).join(", ");
  const result = db.prepare(`update ${resource.table} set ${assignments} where ${idField} = @${idField}`).run(encodeBooleans(row));
  if (result.changes === 0) return null;
  return getResourceRow(db, resourceKey, id);
}

export function deleteResourceRow(db, resourceKey, id) {
  const resource = requireResource(resourceKey);
  return db.prepare(`delete from ${resource.table} where ${resource.idField} = ?`).run(id).changes > 0;
}

export function getResourceSchema(resourceKey) {
  const resource = requireResource(resourceKey);
  return { ...resource };
}

function insertMany(db, table, rows) {
  for (const row of rows) insertOne(db, table, row);
}

function insertOne(db, table, row) {
  const columns = TABLE_COLUMNS[table].filter((column) => row[column] !== undefined);
  const placeholders = columns.map((column) => `@${column}`);
  db.prepare(`insert or ignore into ${table} (${columns.join(", ")}) values (${placeholders.join(", ")})`).run(encodeBooleans(row));
}

function selectEnabled(db, table, orderBy) {
  return decodeRows(db.prepare(`select * from ${table} where enabled = 1 order by ${orderBy}`).all());
}

function selectAll(db, table, orderBy) {
  return decodeRows(db.prepare(`select * from ${table} order by ${orderBy}`).all());
}

function getResourceRow(db, resourceKey, id) {
  const resource = requireResource(resourceKey);
  const row = db.prepare(`select * from ${resource.table} where ${resource.idField} = ?`).get(id);
  return row ? decodeRow(row) : null;
}

function cleanPayload(db, resource, payload, { creating }) {
  const allowedFields = resource.fields.filter((field) => !field.readonly || !creating);
  const row = {};
  for (const field of allowedFields) {
    if (!(field.key in payload)) continue;
    row[field.key] = coerceField(field, payload[field.key]);
  }
  for (const field of resource.fields) {
    if (!field.required) continue;
    if (field.readonly && creating) continue;
    if (row[field.key] === undefined || row[field.key] === "") {
      throw appError("invalid_field", 400, field.key);
    }
  }
  validatePayload(db, resource, row);
  return row;
}

function coerceField(field, value) {
  if (field.type === "boolean") return Boolean(value);
  if (field.type === "number") return value === "" || value === null || value === undefined ? null : Number(value);
  return value === null || value === undefined ? "" : String(value);
}

function decodeRows(rows) {
  return rows.map(decodeRow);
}

function decodeRow(row) {
  const decoded = { ...row };
  if ("enabled" in decoded) decoded.enabled = Boolean(decoded.enabled);
  return decoded;
}

function encodeBooleans(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "boolean" ? Number(value) : value]));
}

function requireResource(resourceKey) {
  const resource = getAdminResource(resourceKey);
  if (!resource) throw appError("not_found", 404, `Unknown resource: ${resourceKey}`);
  return resource;
}

function validatePayload(db, resource, row) {
  for (const [key, value] of Object.entries(row)) {
    const field = resource.fields.find((item) => item.key === key);
    if (field?.type === "number" && value !== null && !Number.isFinite(value)) {
      throw appError("invalid_field", 400, key);
    }
  }

  if ("containerSize" in row && !["20", "40"].includes(row.containerSize)) {
    throw appError("invalid_field", 400, "containerSize");
  }
  if ("ruleType" in row && !["adjustment", "fixed", "unavailable"].includes(row.ruleType)) {
    throw appError("invalid_field", 400, "ruleType");
  }
  if ("ownership" in row && !["SOC", "COC", "*"].includes(row.ownership)) {
    throw appError("invalid_field", 400, "ownership");
  }
  if ("borderCode" in row && row.borderCode && !["MANZHOULI", "ERLIAN"].includes(row.borderCode)) {
    throw appError("invalid_field", 400, "borderCode");
  }
  for (const field of resource.fields) {
    if (!field.reference || !(field.key in row) || row[field.key] === null || row[field.key] === undefined || row[field.key] === "") continue;
    const collection = referenceTableFor(field.reference.collection);
    const exists = db.prepare(`select 1 from ${collection} where ${field.reference.valueKey} = ? limit 1`).get(row[field.key]);
    if (!exists) throw appError("invalid_field", 400, field.key);
  }
  if (resource.key === "freight-prices" && (row.socPriceUsd < 0 || row.cocPriceUsd < 0)) {
    throw appError("invalid_field", 400, row.socPriceUsd < 0 ? "socPriceUsd" : "cocPriceUsd");
  }
  if (resource.key === "lease-prices") {
    if (row.discountUsd < 0 || row.displayPriceUsd < 0 || row.displayPriceUsd !== row.priceUsd - row.discountUsd) {
      throw appError("invalid_lease_price", 400, "displayPriceUsd");
    }
  }
  if (resource.key === "lease-rules" && row.ruleType === "fixed" && row.fixedUsd === null) {
    throw appError("invalid_field", 400, "fixedUsd");
  }
  if (resource.key === "rail-rules" && row.ruleType === "fixed" && row.fixedUsd === null) {
    throw appError("invalid_field", 400, "fixedUsd");
  }
}

function migrateSchema(db) {
  const quoteColumns = db.prepare("pragma table_info(rail_cost_rail_public_quotes)").all().map((column) => column.name);
  if (!quoteColumns.includes("ownership")) {
    db.exec("alter table rail_cost_rail_public_quotes add column ownership text not null default '*';");
  }
  if (hasLegacyRailQuoteUniqueIndex(db)) rebuildRailPublicQuotes(db);
}

function hasLegacyRailQuoteUniqueIndex(db) {
  return db
    .prepare("pragma index_list(rail_cost_rail_public_quotes)")
    .all()
    .filter((index) => index.unique)
    .some((index) => {
      const columns = db.prepare(`pragma index_info(${index.name})`).all().map((column) => column.name);
      return columns.join(",") === "borderCode,destinationStationCode,containerSize";
    });
}

function rebuildRailPublicQuotes(db) {
  db.exec(`
    create table if not exists rail_cost_rail_public_quotes_new (
      id integer primary key,
      borderCode text not null,
      destinationStationCode text not null,
      containerSize text not null,
      ownership text not null default '*',
      quoteUsd real not null,
      enabled integer not null default 1,
      unique (borderCode, destinationStationCode, containerSize, ownership)
    );
    insert or ignore into rail_cost_rail_public_quotes_new (id, borderCode, destinationStationCode, containerSize, ownership, quoteUsd, enabled)
      select id, borderCode, destinationStationCode, containerSize, coalesce(nullif(ownership, ''), '*'), quoteUsd, enabled
      from rail_cost_rail_public_quotes;
    drop table rail_cost_rail_public_quotes;
    alter table rail_cost_rail_public_quotes_new rename to rail_cost_rail_public_quotes;
  `);
}

function domainRowCount(db) {
  return [
    "rail_cost_borders",
    "rail_cost_destinations",
    "rail_cost_rail_public_quotes",
    "rail_cost_rail_rules",
    "rail_cost_lease_pickups",
    "rail_cost_lease_table_prices",
    "rail_cost_lease_rules",
  ].reduce((total, table) => total + db.prepare(`select count(1) as c from ${table}`).get().c, 0);
}

function appError(code, statusCode, message = code) {
  return Object.assign(new Error(message), { code, statusCode });
}

function orderByFor(resource) {
  if (resource.idField === "id") return "id";
  if (resource.fields.some((field) => field.key === "sortOrder")) return `sortOrder, ${resource.idField}`;
  return resource.idField;
}

function referenceTableFor(collection) {
  return {
    borders: "rail_cost_borders",
    destinations: "rail_cost_destinations",
    leasePickups: "rail_cost_lease_pickups",
  }[collection] || null;
}

function lastInsertId(db) {
  return db.prepare("select last_insert_rowid() as id").get().id;
}
