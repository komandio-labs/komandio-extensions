---
name: komandio-sdk-maintenance
description: Safely plan, modify, validate, and release the Komandio SDK in the komandio-extensions repository. Use for SDK API changes, JSR package metadata, compatibility decisions, app-bundled SDK updates, release dry runs, tags, and publication approval.
---

# Komandio SDK Maintenance

Treat the SDK as the compatibility contract between extension authors and the Komandio App host. Use the latest published compatible SDK selected by the repository import map; do not publish a new JSR version merely to make a local change look current.

## Before editing

1. Read `AGENTS.md`, `CONTRIBUTING.md`, and `docs/RELEASING.md`.
2. Inspect `packages/komandio-sdk/jsr.json`, the root `deno.json`, and the Komandio App's SDK configuration if the app is in scope.
3. Classify the change:
   - authoring-only types/docs: may not require an app update;
   - runtime bug fix: requires coordinated app validation;
   - new bridge API: requires native Komandio App support;
   - breaking change: requires a new major compatibility line.

## Implement and validate

1. Keep Deno, browser-overlay, and shared types in the SDK package when they form one public contract.
2. Preserve SemVer compatibility and add focused type/runtime tests.
3. Run from `packages/komandio-sdk`:

   ```powershell
   deno check tests/result-types.ts
   deno publish --dry-run --allow-dirty
   ```

4. Run repository validation:

   ```powershell
   deno task test
   deno task build-all
   ```

5. If the runtime SDK changed, update the Komandio App's exact JSR lock, generated offline vendor cache, and runtime import map together. Verify the app can import the SDK with `--no-remote`. Do not launch or publish the app unless requested.

## Test an unpublished SDK

Use `deno.sdk-dev.json` to test extension code against the local SDK source without changing the normal import map. In PowerShell:

```powershell
$sdkDevConfig = (Resolve-Path deno.sdk-dev.json).Path
$env:KOMANDIO_DENO_CONFIG = $sdkDevConfig
deno test --config $sdkDevConfig --allow-read --allow-write --allow-env --no-check extensions/
deno run -A --config $sdkDevConfig tools/build-all.ts
Remove-Item Env:KOMANDIO_DENO_CONFIG
```

Never commit a local source override into an extension manifest or source file.

## Publication gate

JSR versions are immutable. Never overwrite, reuse, or publish a version speculatively. A real release requires:

1. A reviewed commit on `main`.
2. A version change in `packages/komandio-sdk/jsr.json`.
3. A successful dry run and repository validation.
4. Explicit user approval naming the exact JSR version to publish.
5. Only after approval: create and push `sdk-vX.Y.Z`; GitHub Actions performs the JSR publication.

Without step 4, stop after validation and report the proposed version, tag, and publication workflow. Never call `deno publish` without `--dry-run` during preparation, and never push a release tag without approval.
