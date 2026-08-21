# Komandio Extensions Contributor Guide

Use this repository to develop the public Deno SDK and Komandio extensions. Treat manifests, permissions, and release versions as part of the product contract.

## Working rules

- Use `jsr:@komandio/sdk` for new extension code. Do not import from `komandio-app`.
- Keep an extension self-contained under `extensions/<publisher>/<extension>/`.
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

- SDK: update `packages/komandio-sdk/jsr.json`, merge to `main`, then tag `sdk-vX.Y.Z`.
- Official extension: update its `manifest.json`, merge to `main`, then tag `<extension>-vX.Y.Z`.
- Only the trusted GitHub workflow publishes signed `.kxt` archives and the catalog. Never upload or overwrite packages manually.

Read [CONTRIBUTING.md](CONTRIBUTING.md), [docs/RELEASING.md](docs/RELEASING.md), and the relevant skill in `skills/` before making non-trivial changes.
