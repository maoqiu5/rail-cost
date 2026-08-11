import { createReadStream, existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createResourceRow,
  deleteResourceRow,
  ensureSchema,
  getResourceSchema,
  listResourceRows,
  loadQueryData,
  openDatabase,
  seedDatabase,
  updateResourceRow,
} from "./db.js";
import { normalizeLocale } from "../web/i18n.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_WEB_ROOT = resolve(__dirname, "..", "web");
const DEFAULT_BASE_PATH = "/rail-cost";

export function createApp({ dbPath, webRoot = DEFAULT_WEB_ROOT, basePath = DEFAULT_BASE_PATH } = {}) {
  const db = openDatabase(dbPath);
  ensureSchema(db);
  seedDatabase(db);

  return async function railCostApp(req, res) {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      const pathname = stripBasePath(url.pathname, basePath);

      if (pathname === "/health") return sendJson(res, 200, { ok: true });
      if (pathname === "/api/me") return sendJson(res, 200, authFromHeaders(req));
      if (pathname === "/api/query/bootstrap") return sendJson(res, 200, loadQueryData(db));

      if (pathname.startsWith("/api/admin/")) {
        const auth = authFromHeaders(req);
        if (!auth.isAdmin) return sendJson(res, 403, { error: "admin_required" });
        return await handleAdminRoute({ db, req, res, pathname });
      }

      return serveStatic({ req, res, pathname, webRoot, basePath });
    } catch (error) {
      const status = error.statusCode || 500;
      return sendJson(res, status, { error: status === 500 ? "internal_error" : error.code || error.message });
    }
  };
}

export function authFromHeaders(req) {
  const role = header(req, "x-brianhub-role") || "";
  return {
    user: header(req, "x-brianhub-user") || "",
    role,
    isAdmin: role
      .split(/[,\s]+/)
      .map((item) => item.trim().toLowerCase())
      .includes("admin"),
    locale: normalizeLocale(header(req, "x-brianhub-locale")),
  };
}

async function handleAdminRoute({ db, req, res, pathname }) {
  const [, , , resourceKey, encodedId] = pathname.split("/");
  if (!resourceKey) return sendJson(res, 404, { error: "not_found" });

  const id = encodedId ? decodeURIComponent(encodedId) : "";

  if (req.method === "GET" && !id) {
    const schema = getResourceSchema(resourceKey);
    return sendJson(res, 200, { ...schema, rows: listResourceRows(db, resourceKey) });
  }

  if (req.method === "POST" && !id) {
    const row = createResourceRow(db, resourceKey, await readJsonBody(req));
    return sendJson(res, 201, { row });
  }

  if (req.method === "PUT" && id) {
    const row = updateResourceRow(db, resourceKey, id, await readJsonBody(req));
    if (!row) return sendJson(res, 404, { error: "not_found" });
    return sendJson(res, 200, { row });
  }

  if (req.method === "DELETE" && id) {
    const deleted = deleteResourceRow(db, resourceKey, id);
    if (!deleted) return sendJson(res, 404, { error: "not_found" });
    return sendJson(res, 200, { deleted });
  }

  return sendJson(res, 405, { error: "method_not_allowed" });
}

function serveStatic({ req, res, pathname, webRoot, basePath }) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "method_not_allowed" });
  if (basePath && req.url.split("?")[0] === basePath) {
    res.writeHead(308, { Location: `${basePath}/`, "Cache-Control": "no-store" });
    return res.end();
  }
  if (pathname === "/favicon.ico") {
    res.writeHead(204, { "Cache-Control": "public, max-age=86400" });
    return res.end();
  }
  const safePathname = pathname === "/" || pathname === "" ? "/index.html" : pathname;
  const filePath = resolve(webRoot, `.${normalize(safePathname)}`);
  if (!filePath.startsWith(resolve(webRoot)) || !existsSync(filePath)) return sendJson(res, 404, { error: "not_found" });

  if (extname(filePath).toLowerCase() === ".html") {
    const html = readFileSync(filePath, "utf8").replaceAll(
      '{{placeholder "http.request.header.X-BrianHub-Locale"}}',
      escapeHtml(header(req, "x-brianhub-locale")),
    );
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(html);
  }

  res.writeHead(200, { "Content-Type": contentType(filePath), "Cache-Control": "no-cache" });
  if (req.method === "HEAD") return res.end();
  return createReadStream(filePath).pipe(res);
}

function stripBasePath(pathname, basePath) {
  if (basePath && pathname === basePath) return "/";
  if (basePath && pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length);
  return pathname;
}

function header(req, name) {
  return String(req.headers[name] || "").trim();
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolveBody, reject) => {
    let text = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      text += chunk;
      if (text.length > 1_000_000) reject(Object.assign(new Error("body_too_large"), { statusCode: 413 }));
    });
    req.on("end", () => {
      try {
        resolveBody(text ? JSON.parse(text) : {});
      } catch {
        reject(Object.assign(new Error("invalid_json"), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function contentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".pdf": "application/pdf",
      ".html": "text/html; charset=utf-8",
    }[ext] || "application/octet-stream"
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { createServer } = await import("node:http");
  const port = Number(process.env.PORT || 8036);
  const server = createServer(createApp());
  server.listen(port, "127.0.0.1", () => {
    console.log(`rail-cost listening on http://127.0.0.1:${port}`);
  });
}
