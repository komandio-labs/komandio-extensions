# Komandio Extensions Contributor Guide

Use this repository to develop the public Deno SDK and Komandio extensions. Treat manifests, permissions, and release versions as part of the product contract.

## Working rules

- Use `@komandio/sdk` for new extension code. The repository import map selects the latest published compatible SDK; do not add a direct JSR version to an extension. Do not import from `komandio-app`.
- This is a curated catalogue: accepted extension source lives under `extensions/komandio-labs/<extension>/`. Contributors never create publisher identities, signing keys, or independent catalogue entries.
- Request only the permissions the extension genuinely needs. Do not add broad network or filesystem permissions for convenience.
- Do not commit generated `dist/`, `.kxt`, runtime `data/`, private keys, credentials, or API tokens.
- Preserve backwards compatibility within an SDK major version. Make breaking SDK changes in the next major version.

## Validate before proposing a change

```bash
deno task test
deno task build-all
```

For SDK changes, also run:

```bash
cd packages/komandio-sdk
deno publish --dry-run --allow-dirty
```

## Releases

- SDK: update `packages/komandio-sdk/jsr.json`, validate it, and merge the reviewed commit to `main`. Create/push the `sdk-vX.Y.Z` tag only after explicit maintainer approval for that release.
- Official extension: update its `manifest.json`, validate it, and merge the reviewed commit to `main`. Create/push the `<extension>-vX.Y.Z` tag only after explicit Komandio Labs maintainer approval for that release.
- Only the trusted GitHub workflow publishes signed `.kxt` archives and the catalog. Never upload or overwrite packages manually.

Read [CONTRIBUTING.md](CONTRIBUTING.md), [docs/RELEASING.md](docs/RELEASING.md), and the relevant skill in `skills/` before making non-trivial changes.
