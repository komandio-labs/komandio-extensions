#!/usr/bin/env -S deno run -A
import { join, fromFileUrl, dirname, resolve } from "jsr:@std/path@1.0.8";
import { exists, copy } from "jsr:@std/fs@1.0.11";

const scriptDir = dirname(fromFileUrl(import.meta.url));
const repoRoot  = resolve(scriptDir, "..");
const distRoot  = join(repoRoot, "dist");

const localAppData = Deno.env.get("LOCALAPPDATA");
if (!localAppData) {
    console.error("❌ LOCALAPPDATA environment variable not found.");
    Deno.exit(1);
}

const extensionsRoot = join(localAppData, "Komandio", "Extensions");

if (!await exists(extensionsRoot)) {
    console.error(`❌ Komandio Extensions folder not found at:\n   ${extensionsRoot}`);
    console.error(`   Make sure Komandio is installed and has been run at least once.`);
    Deno.exit(1);
}

// Collect all built extensions from dist (pattern: {publisher}.{extension})
const built: Array<{ publisher: string; id: string; distPath: string }> = [];

for await (const entry of Deno.readDir(distRoot)) {
    if (!entry.isDirectory) continue;
    const dot = entry.name.indexOf(".");
    if (dot === -1) continue; // skip folders without a dot (e.g. bare publisher folders)
    const publisher = entry.name.slice(0, dot);
    const id        = entry.name.slice(dot + 1);
    built.push({ publisher, id, distPath: join(distRoot, entry.name) });
}

if (built.length === 0) {
    console.log("No built extensions found in dist/. Run: deno task build-all");
    Deno.exit(0);
}

console.log(`Found ${built.length} built extension(s) in dist/\n`);

let yesAll = false;

async function prompt(message: string): Promise<string> {
    process.stdout.write(message);
    const buf = new Uint8Array(16);
    const n = await Deno.stdin.read(buf);
    return new TextDecoder().decode(buf.subarray(0, n ?? 0)).trim().toLowerCase();
}

for (const { publisher, id, distPath } of built) {
    const destDir = join(extensionsRoot, publisher, id);
    const label   = `${publisher}.${id}`;

    if (await exists(destDir)) {
        if (!yesAll) {
            const answer = await prompt(`⚠️  ${label} already exists. Override? [y]es / [a]ll / [n]o: `);
            if (answer === "a" || answer === "all") {
                yesAll = true;
            } else if (answer !== "y" && answer !== "yes") {
                console.log(`   Skipped ${label}`);
                continue;
            }
        }
        console.log(`  ↻ Overwriting ${label}...`);
    } else {
        console.log(`  + Deploying ${label}...`);
    }

    await Deno.mkdir(join(extensionsRoot, publisher), { recursive: true });
    await copy(distPath, destDir, { overwrite: true });
    console.log(`  ✓ ${label} → ${destDir}`);
}

console.log("\n✅ Deploy complete.");
