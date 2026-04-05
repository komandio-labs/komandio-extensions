#!/usr/bin/env -S deno run -A
import { Command } from "jsr:@cliffy/command@1.0.0-rc.7";
import { join, dirname, resolve, fromFileUrl, toFileUrl } from "jsr:@std/path@1.0.8";
import { exists, copy } from "jsr:@std/fs@1.0.11";
import * as esbuild from "https://deno.land/x/esbuild@v0.24.2/mod.js";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.11.1";

const VERSION = "1.0.0";

/**
 * Komandio Extension Toolkit (komander)
 */
await new Command()
  .name("komander")
  .version(VERSION)
  .description("Komandio Extension Toolkit")
  
  // INIT Command
  .command("init", "Initialize a new extension")
  .arguments("<name:string>")
  .option("-t, --type <type:string>", "Extension type (skill, service, overlay)", { default: "skill", collect: true })
  .action(async (options, name) => {
    console.log(`🚀 Initializing new extension: ${name}...`);
    const root = resolve(name);
    await Deno.mkdir(root, { recursive: true });

    const manifest = {
      schemaVersion: "1.0",
      publisher: { id: "community", displayName: "Community" },
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name: name,
      version: "1.0.0",
      description: "A new Komandio extension",
      icon: "Extension",
      category: "utility",
      supportedGames: ["Any"],
      permissions: [],
      entry: {}
    };

    // Create folders based on type
    for (const type of (options.type as string[])) {
        const dir = join(root, `${manifest.id}.${type}`);
        await Deno.mkdir(dir, { recursive: true });
        
        if (type === "skill") {
            const content = `import { Skill, Tool, ToolParam, Result, ToolResult } from "@komandio/sdk";\n\n@Skill({\n  name: "${manifest.id}",\n  description: "${manifest.description}"\n})\nexport default class ${name.replace(/[^a-zA-Z0-0]/g, '')}Skill {\n  @Tool({ name: "hello", description: "Say hello" })\n  async hello(@ToolParam({ name: "name", type: "string" }) name: string): Promise<ToolResult<string>> {\n    return Result.ok(\`Hello \${name}!\`);\n  }\n}\n`;
            await Deno.writeTextFile(join(dir, "index.ts"), content);
        } else if (type === "service") {
            const content = `import { Service, MessageHandler } from "@komandio/sdk";\n\n@Service({ name: "${manifest.id}-service" })\nexport default class ${name.replace(/[^a-zA-Z0-0]/g, '')}Service {\n  @MessageHandler("PING")\n  async onPing() { return { pong: true }; }\n}\n`;
            await Deno.writeTextFile(join(dir, "index.ts"), content);
        } else if (type === "overlay") {
            const content = `<!DOCTYPE html>\n<html>\n<head><title>${name}</title></head>\n<body><h1>${name} Overlay</h1></body>\n</html>`;
            await Deno.writeTextFile(join(dir, "index.html"), content);
        }
    }

    await Deno.writeTextFile(join(root, "manifest.json"), JSON.stringify(manifest, null, 2));
    await Deno.writeTextFile(join(root, "AGENT.md"), `# Extension Agent Guide: ${name}\n\n## Core Logic\n- **Primary Goal**: ${manifest.description}\n`);
    
    console.log(`✅ Extension '${name}' created successfully at ./${name}`);
  })

  // BUILD Command
  .command("build", "Build and bundle the extension")
  .option("-o, --out <dir:string>", "Output directory")
  .action(async (options) => {
    await performBuild(options.out as string | undefined);
    await esbuild.stop();
  })

  // DEV Command
  .command("dev", "Start development mode with live-sync to global dist")
  .action(async () => {
    console.log(`📡 Dev Mode Started: Watching for changes...`);

    // Initial Build (mirror path is computed inside performBuild)
    await performBuild(undefined);

    const watcher = Deno.watchFs(".");
    let debounceTimer: any = null;

    for await (const event of watcher) {
        if (event.kind === "modify" || event.kind === "create") {
            const path = event.paths[0];
            if (path.includes("dist") || path.includes(".git")) continue;

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                console.log(`🔄 Change detected, rebuilding...`);
                await performBuild(undefined);
            }, 300);
        }
    }
  })

  // PACK Command
  .command("pack", "Pack extension for distribution (.kxt)")
  .action(async () => {
    console.log("📦 Packing extension into .kxt...");
    const manifest = await readManifest();
    const tempDist = await Deno.makeTempDir();
    
    await performBuild(tempDist);
    
    const packageName = `${manifest.publisher.id}.${manifest.id}-${manifest.version}.kxt`;
    
    // We use a simple tar/zip approach. On Windows we can use PowerShell's Compress-Archive
    if (Deno.build.os === "windows") {
        const command = new Deno.Command("powershell.exe", {
            args: ["-NoProfile", "-Command", `Compress-Archive -Path "${tempDist}\\*" -DestinationPath "${resolve(packageName)}" -Force`],
        });
        await command.output();
    } else {
        const command = new Deno.Command("zip", {
            args: ["-r", resolve(packageName), "."],
            cwd: tempDist
        });
        await command.output();
    }

    await Deno.remove(tempDist, { recursive: true });
    console.log(`✅ Package created: ${packageName}`);
    await esbuild.stop();
  })

  .parse(Deno.args);

async function readManifest() {
    try {
        return JSON.parse(await Deno.readTextFile("./manifest.json"));
    } catch {
        console.error("❌ Error: manifest.json not found in current directory.");
        Deno.exit(1);
    }
}

async function performBuild(outDir: string | undefined) {
    const manifest = await readManifest();

    const resolvedOutDir = outDir
        ? resolve(outDir)
        : resolve(dirname(fromFileUrl(import.meta.url)), "../../dist", `${manifest.publisher.id}.${manifest.id}`);

    console.log(`Output directory: ${resolvedOutDir}`);
    const absOutDir = resolvedOutDir;
    await Deno.mkdir(absOutDir, { recursive: true });

    // Determine path to SDK for metadata extraction
    const scriptDir = fromFileUrl(import.meta.url);
    const sdkPath = resolve(dirname(scriptDir), "../../packages/web-sdk/src/deno/mod.ts");

    const isSkillDir   = (name: string) => name === "skill"   || name.endsWith(".skill");
    const isServiceDir = (name: string) => name === "service" || name.endsWith(".service");
    const isOverlayDir = (name: string) => name === "overlays" || name === "overlay" || name.endsWith(".overlay");

    for await (const entry of Deno.readDir(".")) {
        if (!entry.isDirectory) continue;
        if (!isSkillDir(entry.name) && !isServiceDir(entry.name) && !isOverlayDir(entry.name)) continue;

        const componentOutDir = join(absOutDir, entry.name);
        await Deno.mkdir(componentOutDir, { recursive: true });

            if (isOverlayDir(entry.name)) {
                await copy(entry.name, componentOutDir, { overwrite: true });
                continue;
            }

            const entryFile = join(entry.name, "index.ts");
            if (!await exists(entryFile)) continue;

            const outFile = join(componentOutDir, "index.js");

            console.log(`  📦 Bundling ${entry.name}...`);
            
            if (isSkillDir(entry.name)) {
                try {
                    const sourceEntryUrl = toFileUrl(resolve(entryFile)).href;
                    const sdkUrl = toFileUrl(sdkPath).href;
                    const code = `
                        const module = await import("${sourceEntryUrl}");
                        const TargetClass = module.default;
                        if (!TargetClass) {
                            console.log("META_START{}META_END");
                            Deno.exit(0);
                        }
                        const rawTools = TargetClass.prototype._komandio_tools || [];
                        const toolParams = TargetClass.prototype._komandio_tool_params || {};
                        const tools = rawTools.map(t => {
                            const params = toolParams[t.method] || [];
                            return {
                                name: t.name || t.method,
                                method: t.method,
                                description: t.description,
                                returns: t.returns || { type: "string", description: "Result" },
                                parameters: {
                                    type: "object",
                                    properties: params.reduce((acc, p) => {
                                        if (p) acc[p.name] = { type: p.type, description: p.description };
                                        return acc;
                                    }, {}),
                                    required: params.filter(p => p && p.required).map(p => p.name)
                                }
                            };
                        });
                        
                        const rawMeta = TargetClass._komandio_metadata || {};
                        const meta = {
                            category: rawMeta.category || "generic",
                            supportedGames: rawMeta.supportedGames || rawMeta.supportedApps || ["Any"],
                            tags: rawMeta.tags || [],
                            examples: rawMeta.examples || [],
                            tools
                        };
                        console.log("META_START" + JSON.stringify(meta) + "META_END");
                    `;
                    
                    const tempScript = await Deno.makeTempFile({ suffix: ".ts" });
                    const tempImportMap = await Deno.makeTempFile({ suffix: ".json" });
                    
                    await Deno.writeTextFile(tempScript, code);
                    await Deno.writeTextFile(tempImportMap, JSON.stringify({
                        imports: { "@komandio/sdk": sdkUrl }
                    }));
                    
                    const command = new Deno.Command(Deno.execPath(), {
                        args: ["run", "-A", "--import-map", tempImportMap, "--no-check", tempScript],
                        stdout: "piped",
                        stderr: "piped"
                    });
                    
                    const { stdout } = await command.output();
                    await Deno.remove(tempScript);
                    await Deno.remove(tempImportMap);
                    
                    const output = new TextDecoder().decode(stdout);
                    const match = output.match(/META_START(.*)META_END/);
                    if (match) {
                        manifest.skill = JSON.parse(match[1]);
                        console.log(`    ✨ Metadata enriched for skill`);
                    }
                } catch (e) {
                    console.warn(`    ⚠️  Metadata extraction failed: ${e.message}`);
                }
            }

            const denoConfigPath = resolve(dirname(fromFileUrl(import.meta.url)), "../../deno.json");

            let bundleOk = false;
            try {
                await esbuild.build({
                    plugins: [...denoPlugins({ configPath: denoConfigPath })],
                    entryPoints: [toFileUrl(resolve(entryFile)).href],
                    bundle: true,
                    format: "esm",
                    outfile: outFile,
                    platform: "neutral",
                    external: ["@komandio/sdk"],
                    tsconfigRaw: {
                        compilerOptions: {
                            experimentalDecorators: true,
                            emitDecoratorMetadata: false
                        }
                    }
                });
                bundleOk = true;
            } catch (e) {
                console.error(`  ❌ Bundle failed for ${entry.name}: ${e.message}`);
            }

            if (bundleOk) {
                // Copy any non-TypeScript supporting files (assets, JSON, etc.)
                for await (const file of Deno.readDir(entry.name)) {
                    if (file.isFile && !file.name.endsWith(".ts")) {
                        await Deno.copyFile(
                            join(entry.name, file.name),
                            join(componentOutDir, file.name)
                        );
                    }
                }

                if (!manifest.entry) manifest.entry = {};
                if (isSkillDir(entry.name))   manifest.entry.skill   = entry.name + "/index.js";
                if (isServiceDir(entry.name)) manifest.entry.service = entry.name + "/index.js";
            }
    }

    // Verify that every declared manifest.entry path exists in the output dir
    if (manifest.entry) {
        for (const [key, value] of Object.entries(manifest.entry)) {
            if (key === "overlays" && Array.isArray(value)) {
                for (const overlay of value as Array<{ id: string; path: string }>) {
                    const fullPath = join(absOutDir, overlay.path);
                    if (!await exists(fullPath)) {
                        console.warn(`  ⚠️  manifest.entry.overlays["${overlay.id}"] points to "${overlay.path}" but that file was not produced in the output dir`);
                    }
                }
            } else {
                const fullPath = join(absOutDir, value as string);
                if (!await exists(fullPath)) {
                    console.warn(`  ⚠️  manifest.entry.${key} points to "${value}" but that file was not produced in the output dir`);
                }
            }
        }
    }

    await Deno.writeTextFile(join(absOutDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    console.log("✅ Build complete!");
}
