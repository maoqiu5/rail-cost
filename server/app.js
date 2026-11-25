import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ensureSchema,
  importAgentQuotes,
  listQuoteImports,
  loadQueryData,
  openDatabase,
  seedDatabase,
} from "./db.js";
import { buildXlsxTemplate, parsePdfQuote, parseXlsxQuote } from "./quote-import.js";
import { normalizeLocale } from "../web/i18n.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_WEB_ROOT = resolve(__dirname, "..", "web");
const DEFAULT_BASE_PATH = "/rail-cost";
const DEFAULT_IMPORTS_DIR = join(process.cwd(), "data", "imports");
const MAX_JSON_BODY_BYTES = 20 * 1024 * 1024;

export function createApp({ dbPath, webRoot = DEFAULT_WEB_ROOT, basePath = DEFAULT_BASE_PATH, importsDir = DEFAULT_IMPORTS_DIR } = {}) {
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

      if (pathname === "/api/quotes/template.xlsx") {
        const auth = authFromHeaders(req);
        if (!auth.isAdmin) return sendJson(res, 403, { error: "admin_required" });
        const data = loadQueryData(db);
        const buffer = buildXlsxTemplate({ borders: data.borders, destinations: data.destinations });
        res.writeHead(200, {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="rail-cost-quote-template.xlsx"',
          "Cache-Control": "no-store",
        });
        return res.end(buffer);
      }

      if (pathname === "/api/quotes/imports" && req.method === "GET") {
        const auth = authFromHeaders(req);
        if (!auth.isAdmin) return sendJson(res, 403, { error: "admin_required" });
        return sendJson(res, 200, { imports: listQuoteImports(db, url.searchParams.get("limit")) });
      }

      if (pathname === "/api/quotes/import" && req.method === "POST") {
        const auth = authFromHeaders(req);
        if (!auth.isAdmin) return sendJson(res, 403, { error: "admin_required" });
        const payload = await readJsonBody(req);
        return await handleQuoteImport({ db, importsDir, auth, res, payload });
      }

      return serveStatic({ req, res, pathname, webRoot, basePath });
    } catch (error) {
      const status = error.statusCode || 500;
      return sendJson(res, status, {
        error: status === 500 ? "internal_error" : error.code || error.message,
        message: status === 500 ? undefined : error.message,
      });
    }
  };
}

async function handleQuoteImport({ db, importsDir, auth, res, payload }) {
  const agentCode = String(payload.agentCode || "").trim().toUpperCase();
  const fileName = String(payload.fileName || "").trim();
  const contentBase64 = String(payload.contentBase64 || "");
  if (!agentCode) return sendJson(res, 400, { error: "agent_required", message: "Agent is required." });
  if (!fileName) return sendJson(res, 400, { error: "file_required", message: "File name is required." });
  if (!contentBase64) return sendJson(res, 400, { error: "file_required", message: "File content is required." });

  const buffer = Buffer.from(contentBase64, "base64");
  if (!buffer.length) return sendJson(res, 400, { error: "file_empty", message: "Uploaded file is empty." });

  const sourceType = detectSourceType(fileName, buffer);
  if (!sourceType) return sendJson(res, 400, { error: "unsupported_file_type", message: "Only PDF and XLSX quote files are supported." });

  const reference = loadQueryData(db);
  const parsed =
    sourceType === "pdf"
      ? await parsePdfQuote({ buffer, agentCode })
      : parseXlsxQuote({ buffer, agentCode, reference: { borders: reference.borders, destinations: reference.destinations } });

  const warnings = [...(parsed.warnings || [])];
  let storedFile = "";
  try {
    storedFile = saveImportFile({ importsDir, agentCode, fileName, buffer });
  } catch {
    warnings.push("source_file_not_saved");
  }

  const summary = importAgentQuotes(db, {
    agentCode,
    sourceType,
    fileName,
    effectiveFrom: parsed.effectiveFrom,
    effectiveTo: parsed.effectiveTo,
    quotes: parsed.quotes,
    importedBy: auth.user,
  });

  return sendJson(res, 200, { ok: true, ...summary, storedFile, warnings });
}

function detectSourceType(fileName, buffer) {
  const extension = extname(fileName).toLowerCase();
  if (extension === ".pdf" && buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (extension === ".xlsx" && buffer[0] === 0x50 && buffer[1] === 0x4b) return "xlsx";
  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return "xlsx";
  return "";
}

function saveImportFile({ importsDir, agentCode, fileName, buffer }) {
  const safeName = basename(fileName).replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_").slice(0, 200) || "quote";
  const dir = join(importsDir, agentCode);
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storedName = `${stamp}-${safeName}`;
  writeFileSync(join(dir, storedName), buffer);
  return `${agentCode}/${storedName}`;
}

export function authFromHeaders(req) {
  const role = header(req, "x-brianhub-role") || "";
  const roles = role
    .split(/[,\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return {
    user: header(req, "x-brianhub-user") || "",
    role,
    isAdmin: roles.includes("admin"),
    locale: normalizeLocale(header(req, "x-brianhub-locale")),
  };
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

function readJsonBody(req) {
  return new Promise((resolveBody, reject) => {
    let text = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      text += chunk;
      if (text.length > MAX_JSON_BODY_BYTES) {
        reject(Object.assign(new Error("body_too_large"), { code: "body_too_large", statusCode: 413 }));
      }
    });
    req.on("end", () => {
      try {
        resolveBody(text ? JSON.parse(text) : {});
      } catch {
        reject(Object.assign(new Error("invalid_json"), { code: "invalid_json", statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
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
  const host = process.env.HOST || "127.0.0.1";
  const server = createServer(createApp());
  server.listen(port, host, () => {
    console.log(`rail-cost listening on http://${host}:${port}`);
  });
}
