# Releasing Komandio Extensions

All releases start from a reviewed commit on `main`. Tags are immutable release declarations: never retag a changed package. Preparing a release and publishing it are separate steps; do not create or push a release tag, publish to JSR, upload to R2, or update a catalog without explicit maintainer approval for that exact release.

The extension catalogue is curated: only Komandio Labs releases extensions, and every catalogue package is signed with the official Komandio key. Community pull requests can contribute source changes, but do not grant release or publishing authority.

## SDK release

1. Update `packages/komandio-sdk/jsr.json` using semantic versioning.
2. Run `deno publish --dry-run --allow-dirty` from `packages/komandio-sdk`.
3. Merge the change into `main`.
4. Show the intended version, commit, tag, and publication destination for approval.
5. After approval, tag the merged commit as `sdk-vX.Y.Z`.

The GitHub Actions workflow verifies the tag/version, publishes `@komandio/sdk@X.Y.Z` to JSR using GitHub OIDC, and records provenance. No publish token is stored in GitHub.

## Official extension release

1. Update `extensions/komandio-labs/<extension>/manifest.json` to the intended semantic version.
2. Run `deno task test` and `deno task build-all`.
3. Merge the change into `main`.
4. Show the intended version, commit, tag, and R2 destination for approval.
5. After approval, tag the merged commit as `<extension>-vX.Y.Z`, for example `spotify-v1.2.0`.

The release workflow validates the tag, builds the extension, signs its archive, uploads an immutable package to R2, and updates the single signed catalog. It rejects an existing package path rather than replacing it.

Manual workflow dispatch runs validation only; it cannot publish an extension.

## Versioning rules

- Patch: compatible bug fix.
- Minor: compatible feature.
- Major: breaking manifest, SDK, or behavior contract.
- Pre-release versions may use standard semantic-version suffixes, for example `1.3.0-beta.1`.
