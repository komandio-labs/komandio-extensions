// devkit.ts — Komandio Overlay DevKit CLI
//
// Usage:
//   deno run -A devkit.ts <overlay-dir> [--mock <path>] [--port <number>]
//
// Examples:
//   deno run -A devkit.ts ../../Extensions/.../sc.overlay
//   deno run -A devkit.ts ../../Extensions/.../sc.overlay --mock overlay.mock.json --port 7890

import { resolve, join, basename } from "node:path";
import { startServer } from "./devkit/server.ts";

// ── Argument parsing ────────────────────────────────────────────────────────

let overlayArg: string | undefined;
let mockArg: string | undefined;
let portArg = 7890;

for (let i = 0; i < Deno.args.length; i++) {
  const arg = Deno.args[i];
  if (arg === "--mock" || arg === "-m") {
    mockArg = Deno.args[++i];
  } else if (arg === "--port" || arg === "-p") {
    portArg = parseInt(Deno.args[++i], 10);
  } else if (!arg.startsWith("-")) {
    overlayArg = arg;
  }
}

if (!overlayArg) {
  console.error("Usage: deno run -A devkit.ts <overlay-dir> [--mock <path>] [--port <number>]");
  console.error("");
  console.error("  overlay-dir   Path to the overlay source folder (must contain index.html)");
  console.error("  --mock        Path to overlay.mock.json (default: <overlay-dir>/overlay.mock.json)");
  console.error("  --port        Port to listen on (default: 7890)");
  Deno.exit(1);
}

const overlayDir = resolve(overlayArg);
const mockFile = mockArg ? resolve(mockArg) : join(overlayDir, "overlay.mock.json");

// Verify overlay directory exists
try {
  const stat = await Deno.stat(overlayDir);
  if (!stat.isDirectory) {
    console.error(`[DevKit] Error: "${overlayDir}" is not a directory`);
    Deno.exit(1);
  }
} catch {
  console.error(`[DevKit] Error: directory not found: "${overlayDir}"`);
  Deno.exit(1);
}

// Warn if no index.html
try {
  await Deno.stat(join(overlayDir, "index.html"));
} catch {
  console.warn(`[DevKit] Warning: no index.html found in "${overlayDir}"`);
}

// Warn (don't fail) if mock file is missing
try {
  await Deno.stat(mockFile);
} catch {
  console.warn(`[DevKit] No overlay.mock.json found at "${mockFile}" — using empty config`);
  console.warn(`         Create one to define scenarios and mock service responses.`);
}

const overlayName = basename(overlayDir);

// ── Start ───────────────────────────────────────────────────────────────────

startServer({ overlayDir, mockFile, port: portArg });

const url = `http://127.0.0.1:${portArg}/?overlay=index.html`;
console.log(`[DevKit] Open: ${url}`);

// Try to open browser automatically
try {
  const cmd = Deno.build.os === "windows"
    ? new Deno.Command("cmd", { args: ["/c", "start", "", url] })
    : Deno.build.os === "darwin"
      ? new Deno.Command("open", { args: [url] })
      : new Deno.Command("xdg-open", { args: [url] });
  cmd.spawn();
} catch {
  // Non-fatal — user can open manually
}

console.log(`[DevKit] Serving "${overlayName}" — press Ctrl+C to stop`);
