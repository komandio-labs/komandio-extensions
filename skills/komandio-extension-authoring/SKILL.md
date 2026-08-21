---
name: komandio-extension-authoring
description: Create, modify, test, or review a Komandio Deno extension in the komandio-extensions repository. Use for new extension scaffolding, manifests, skills, services, overlays, permissions, commands, SDK usage, and local test/build validation.
---

# Komandio Extension Authoring

Read `AGENTS.md` and `CONTRIBUTING.md` before editing.

1. Locate the extension at `extensions/komandio-labs/<extension>/` and read its `manifest.json` first.
2. For a proposed new extension, first check for an approved extension proposal. Work under `extensions/komandio-labs/`, using `deno run -A ../../tools/komander-cli/komander.ts init <name>` only as a starting point, then review every generated file.
3. Use the latest published compatible `@komandio/sdk` selected by the repository import map. Never copy SDK source from `komandio-app` or invent a separate SDK version in an extension.
4. Preserve manifest identity and version. Declare only necessary permissions; treat new permissions as security-relevant.
5. Add focused tests for behavior that can be tested without Komandio running.
6. Run `deno task test`, `deno task build-all`, and inspect the generated `dist/komandio-labs.<extension>/manifest.json`. Skill packages must contain non-empty `skill.tools` metadata.

The catalogue is curated: community members may propose or contribute source, while Komandio Labs is the sole publisher and signer. Do not create a new publisher identity, signing key, independent catalogue entry, or release tag. Do not commit generated `dist/`, `.kxt`, runtime data, credentials, or signing material. Do not publish, tag, push, upload to R2, or modify a live catalog as part of authoring. For a new extension, read `references/extension-contract.md`.
