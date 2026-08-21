#!/usr/bin/env -S deno run -A
import { join, fromFileUrl, dirname, resolve } from "jsr:@std/path@1.0.8";
import { exists } from "jsr:@std/fs@1.0.11";

const scriptDir = dirname(fromFileUrl(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const extensionsRoot = join(repoRoot, "extensions");
const komander = join(scriptDir, "komander-cli", "komander.ts");
const sdkDevConfig = Deno.env.get("KOMANDIO_DENO_CONFIG");

interface Result {
    path: string;
    label: string;
    ok: boolean;
    output: string;
}

const results: Result[] = [];

for await (const publisher of Deno.readDir(extensionsRoot)) {
    if (!publisher.isDirectory) continue;
    const publisherPath = join(extensionsRoot, publisher.name);

    for await (const extension of Deno.readDir(publisherPath)) {
        if (!extension.isDirectory) continue;
        const extPath = join(publisherPath, extension.name);
        const label = `${publisher.name}.${extension.name}`;

        if (!await exists(join(extPath, "manifest.json"))) continue;

        console.log(`\n▶ Building ${label}...`);

        const cmd = new Deno.Command(Deno.execPath(), {
            args: [
                "run",
                "-A",
                ...(sdkDevConfig ? ["--config", sdkDevConfig] : []),
                komander,
                "build"
            ],
            cwd: extPath,
            stdout: "piped",
            stderr: "piped",
        });

        const { code, stdout, stderr } = await cmd.output();
        const output = new TextDecoder().decode(stdout) + new TextDecoder().decode(stderr);

        if (code === 0) {
            console.log(`  ✓ ${label}`);
        } else {
            console.error(`  ✗ ${label}\n${output.trim()}`);
        }

        results.push({ path: extPath, label, ok: code === 0, output });
    }
}

const passed = results.filter(r => r.ok);
const failed = results.filter(r => !r.ok);

console.log(`\n${"─".repeat(40)}`);
console.log(`Built: ${passed.length} succeeded, ${failed.length} failed`);

if (failed.length > 0) {
    console.error(`\nFailed extensions:`);
    for (const r of failed) console.error(`  ✗ ${r.label}`);
    Deno.exit(1);
}
