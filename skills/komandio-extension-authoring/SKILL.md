---
name: komandio-extension-authoring
description: Create, modify, test, or review a Komandio Deno extension in the komandio-extensions repository. Use for extension manifests, skills, services, overlays, permissions, commands, SDK usage, and extension test/build validation.
---

# Komandio Extension Authoring

Read `AGENTS.md` and `CONTRIBUTING.md` before editing.

1. Locate the extension at `extensions/<publisher>/<extension>/` and read its `manifest.json` first.
2. Use `jsr:@komandio/sdk` for new code. Never depend on `komandio-app` source.
3. Preserve manifest identity and declare only necessary permissions. Treat new permissions as security-relevant.
4. Add focused tests for behavior that can be tested outside the Komandio host.
5. Run `deno task test` and `deno task build-all` before handing off.

Do not commit generated `dist/`, `.kxt`, runtime data, credentials, or signing material. For a new official or community extension, read `references/extension-contract.md`.
