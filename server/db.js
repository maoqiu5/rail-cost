import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { buildSeedRows, QUOTE_DATA_VERSION } from "./seed.js";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "rail-cost.db");

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

    create table if not exists rail_cost_agents (
      code text primary key,
      nameCn text not null,
      nameEn text not null,
      sortOrder integer not null default 0,
      enabled integer not null default 1
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
      agentCode text not null default 'TC',
      borderCode text not null,
      destinationStationCode text not null,
      containerSize text not null,
      ownership text not null default '*',
      quoteUsd real not null,
      enabled integer not null default 1,
      unique (agentCode, borderCode, destinationStationCode, containerSize, ownership)
    );

    create table if not exists rail_cost_lease_pickups (
      code text primary key,
      nameCn text not null,
      nameEn text not null,
      sortOrder integer not null default 0,
      enabled integer not null default 1
    );

    create table if not exists rail_cost_lease_prices (
      id integer primary key,
      agentCode text not null default 'TC',
      borderCode text not null,
      pickupCode text not null,
      containerSize text not null,
      priceUsd real not null,
      discountUsd real not null default 0,
      displayPriceUsd real not null,
      enabled integer not null default 1,
      unique (agentCode, borderCode, pickupCode, containerSize)
    );
  `);
  migrateRailPublicQuotes(db);
  migrateLeasePrices(db);
}

export function seedDatabase(db) {
  const rows = buildSeedRows();
  insertMany(db, "rail_cost_agents", rows.agents);
  insertMany(db, "rail_cost_borders", rows.borders);
  insertMany(db, "rail_cost_destinations", rows.destinations);
  importCurrentQuotes(db, rows.railQuotes);
}

export function loadQueryData(db) {
  return {
    agents: selectEnabled(db, "rail_cost_agents", "sortOrder, code"),
    borders: selectEnabled(db, "rail_cost_borders", "sortOrder, code"),
    destinations: selectEnabled(db, "rail_cost_destinations", "sortOrder, stationCode"),
    railPublicQuotes: selectEnabled(
      db,
      "rail_cost_rail_public_quotes",
      "agentCode, borderCode, destinationStationCode, containerSize, ownership",
    ),
    leasePickups: selectEnabled(db, "rail_cost_lease_pickups", "sortOrder, code"),
    leasePrices: selectEnabled(db, "rail_cost_lease_prices", "agentCode, borderCode, pickupCode, containerSize"),
  };
}

function importCurrentQuotes(db, quotes) {
  const current = db.prepare("select value from rail_cost_meta where key = 'quote_data_version'").get()?.value;
  if (current === QUOTE_DATA_VERSION) return;

  db.exec("begin");
  try {
    db.prepare("delete from rail_cost_rail_public_quotes").run();
    for (const row of quotes) {
      db.prepare(
        "insert or replace into rail_cost_rail_public_quotes (agentCode, borderCode, destinationStationCode, containerSize, ownership, quoteUsd, enabled) values (?, ?, ?, ?, ?, ?, ?)",
      ).run(row.agentCode, row.borderCode, row.destinationStationCode, row.containerSize, row.ownership, row.quoteUsd, row.enabled ? 1 : 0);
    }

    // Container lease prices are currently empty because containers are unavailable.
    db.prepare("delete from rail_cost_lease_prices").run();
    for (const table of [
      "rail_cost_freight_prices",
      "rail_cost_rail_rules",
      "rail_cost_lease_table_prices",
      "rail_cost_lease_rules",
    ]) {
      if (tableExists(db, table)) db.prepare(`delete from ${table}`).run();
    }

    db.prepare("insert or replace into rail_cost_meta (key, value) values ('quote_data_version', ?)").run(QUOTE_DATA_VERSION);
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

function migrateRailPublicQuotes(db) {
  if (!tableExists(db, "rail_cost_rail_public_quotes")) return;
  const columns = tableColumns(db, "rail_cost_rail_public_quotes");
  const hasAgent = columns.includes("agentCode");
  const hasOwnership = columns.includes("ownership");
  const uniqueOk = hasUniqueIndexOn(db, "rail_cost_rail_public_quotes", [
    "agentCode",
    "borderCode",
    "destinationStationCode",
    "containerSize",
    "ownership",
  ]);
  if (hasAgent && uniqueOk) return;

  db.exec("begin");
  try {
    db.exec("drop table if exists rail_cost_rail_public_quotes_new");
    db.exec("alter table rail_cost_rail_public_quotes rename to rail_cost_rail_public_quotes_old");
    db.exec(`
      create table rail_cost_rail_public_quotes_new (
        id integer primary key,
        agentCode text not null default 'TC',
        borderCode text not null,
        destinationStationCode text not null,
        containerSize text not null,
        ownership text not null default '*',
        quoteUsd real not null,
        enabled integer not null default 1,
        unique (agentCode, borderCode, destinationStationCode, containerSize, ownership)
      );
    `);
    const ownershipExpr = hasOwnership ? "coalesce(nullif(ownership, ''), '*')" : "'*'";
    db.exec(`
      insert or ignore into rail_cost_rail_public_quotes_new
        (agentCode, borderCode, destinationStationCode, containerSize, ownership, quoteUsd, enabled)
      select
        ${hasAgent ? "coalesce(nullif(agentCode, ''), 'TC')" : "'TC'"},
        borderCode,
        destinationStationCode,
        containerSize,
        ${ownershipExpr},
        quoteUsd,
        enabled
      from rail_cost_rail_public_quotes_old;
      drop table rail_cost_rail_public_quotes_old;
      alter table rail_cost_rail_public_quotes_new rename to rail_cost_rail_public_quotes;
    `);
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

function migrateLeasePrices(db) {
  if (!tableExists(db, "rail_cost_lease_prices")) return;
  const columns = tableColumns(db, "rail_cost_lease_prices");
  if (
    columns.includes("agentCode") &&
    hasUniqueIndexOn(db, "rail_cost_lease_prices", ["agentCode", "borderCode", "pickupCode", "containerSize"])
  ) {
    return;
  }

  db.exec("begin");
  try {
    db.exec("drop table if exists rail_cost_lease_prices_new");
    db.exec("alter table rail_cost_lease_prices rename to rail_cost_lease_prices_old");
    db.exec(`
      create table rail_cost_lease_prices_new (
        id integer primary key,
        agentCode text not null default 'TC',
        borderCode text not null,
        pickupCode text not null,
        containerSize text not null,
        priceUsd real not null,
        discountUsd real not null default 0,
        displayPriceUsd real not null,
        enabled integer not null default 1,
        unique (agentCode, borderCode, pickupCode, containerSize)
      );
    `);
    db.exec(`
      insert or ignore into rail_cost_lease_prices_new
        (agentCode, borderCode, pickupCode, containerSize, priceUsd, discountUsd, displayPriceUsd, enabled)
      select
        '@PLACEHOLDER_AGENT@',
        borderCode,
        pickupCode,
        containerSize,
        priceUsd,
        discountUsd,
        displayPriceUsd,
        enabled
      from rail_cost_lease_prices_old;
      drop table rail_cost_lease_prices_old;
      alter table rail_cost_lease_prices_new rename to rail_cost_lease_prices;
    `.replaceAll("@PLACEHOLDER_AGENT@", "TC"));
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

function insertMany(db, table, rows) {
  for (const row of rows) insertOne(db, table, row);
}

function insertOne(db, table, row) {
  const columns = Object.keys(row);
  const placeholders = columns.map((column) => `@${column}`);
  db.prepare(`insert or ignore into ${table} (${columns.join(", ")}) values (${placeholders.join(", ")})`).run(encodeBooleans(row));
}

function selectEnabled(db, table, orderBy) {
  return decodeRows(db.prepare(`select * from ${table} where enabled = 1 order by ${orderBy}`).all());
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

function tableExists(db, table) {
  return Boolean(db.prepare("select 1 from sqlite_master where type = 'table' and name = ?").get(table));
}

function tableColumns(db, table) {
  return db.prepare(`pragma table_info(${table})`).all().map((column) => column.name);
}

function hasUniqueIndexOn(db, table, expectedColumns) {
  return db
    .prepare(`pragma index_list(${table})`)
    .all()
    .filter((index) => index.unique)
    .some((index) => {
      const columns = db.prepare(`pragma index_info(${index.name})`).all().map((column) => column.name);
      return columns.join(",") === expectedColumns.join(",");
    });
}
