// devkit/server.ts — Overlay DevKit HTTP server
import { join, extname, dirname } from "node:path";
import { fromFileUrl } from "jsr:@std/path@1/from-file-url";
import { contentType } from "jsr:@std/media-types@1";

const DEVKIT_DIR = dirname(fromFileUrl(import.meta.url));

export interface ServerOptions {
  overlayDir: string;   // absolute path to the overlay source folder (e.g. .../sc.overlay/)
  mockFile: string;     // absolute path to overlay.mock.json (may not exist)
  port: number;
}

// ── HTML injection ─────────────────────────────────────────────────────────

const BRIDGE_TAG = `<script src="/__devkit/mock-bridge.js"></script>`;

function injectBridge(html: string): string {
  // Inject before </head> if possible, otherwise prepend
  if (html.includes("</head>")) {
    return html.replace("</head>", `${BRIDGE_TAG}\n</head>`);
  }
  return BRIDGE_TAG + "\n" + html;
}

// ── MIME types ─────────────────────────────────────────────────────────────

function mime(path: string): string {
  const ext = extname(path).toLowerCase();
  return contentType(ext) ?? "application/octet-stream";
}

// ── Request handler ────────────────────────────────────────────────────────

async function handleRequest(req: Request, opts: ServerOptions): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // ── DevKit assets ──────────────────────────────────────────────────────

  if (pathname === "/__devkit/mock-bridge.js") {
    const bridgePath = join(DEVKIT_DIR, "mock-bridge.js");
    try {
      const body = await Deno.readTextFile(bridgePath);
      return new Response(body, { headers: { "Content-Type": "application/javascript" } });
    } catch {
      return new Response("// mock-bridge.js not found", { status: 404 });
    }
  }

  if (pathname === "/__devkit/mock-config.json") {
    try {
      const body = await Deno.readTextFile(opts.mockFile);
      return new Response(body, { headers: { "Content-Type": "application/json" } });
    } catch {
      // Return empty config if file doesn't exist
      return new Response(JSON.stringify({ scenarios: [], serviceResponses: {} }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // ── Shell (DevKit UI) ──────────────────────────────────────────────────

  if (pathname === "/" || pathname === "/index.html") {
    const shellPath = join(DEVKIT_DIR, "shell.html");
    try {
      const body = await Deno.readTextFile(shellPath);
      return new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    } catch {
      return new Response("DevKit shell not found", { status: 500 });
    }
  }

  // ── Overlay files ──────────────────────────────────────────────────────

  if (pathname.startsWith("/overlay/")) {
    // Strip /overlay/ prefix and map to the overlay source directory
    const relative = pathname.slice("/overlay/".length) || "index.html";
    const filePath = join(opts.overlayDir, relative);

    try {
      const stat = await Deno.stat(filePath);
      if (stat.isDirectory) {
        // Try index.html
        const indexPath = join(filePath, "index.html");
        const body = await Deno.readTextFile(indexPath);
        return new Response(injectBridge(body), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }

      const ext = extname(filePath).toLowerCase();
      if (ext === ".html" || ext === ".htm") {
        const body = await Deno.readTextFile(filePath);
        return new Response(injectBridge(body), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }

      // Binary / text asset
      const body = await Deno.readFile(filePath);
      return new Response(body, { headers: { "Content-Type": mime(filePath) } });

    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return new Response(`Not found: ${relative}`, { status: 404 });
      }
      return new Response(`Server error: ${err}`, { status: 500 });
    }
  }

  return new Response("Not found", { status: 404 });
}

// ── Start server ───────────────────────────────────────────────────────────

export function startServer(opts: ServerOptions): void {
  const server = Deno.serve(
    { port: opts.port, hostname: "127.0.0.1" },
    (req) => handleRequest(req, opts)
  );
  console.log(`[DevKit] Server running at http://127.0.0.1:${opts.port}/`);
  console.log(`[DevKit] Overlay: ${opts.overlayDir}`);
  console.log(`[DevKit] Mock:    ${opts.mockFile}`);
}
