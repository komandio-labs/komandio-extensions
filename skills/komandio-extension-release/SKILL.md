---
name: komandio-extension-release
description: Prepare, validate, version, or publish the Komandio Deno SDK or an official Komandio extension. Use for semantic versions, release tags, JSR SDK publication, signed R2 packages, and catalog releases.
---

# Komandio Extension Release

Read `docs/RELEASING.md` before changing a version or creating a tag.

1. Determine whether the change is SDK or an official extension.
2. Apply semantic versioning and make the version in source match the intended tag.
3. Run the required validation before a release.
4. Merge the reviewed release commit to `main`.
5. Create exactly one immutable tag:
   - SDK: `sdk-vX.Y.Z`
   - Extension: `<extension>-vX.Y.Z`

Only GitHub Actions publishes packages. Never manually upload R2 objects, overwrite a package, expose a signing key, or create a release from an unmerged commit.
