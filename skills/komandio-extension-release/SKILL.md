---
name: komandio-extension-release
description: Prepare and validate Komandio Deno SDK or official extension releases, including SemVer, immutable tags, JSR publication, signed R2 packages, and catalog updates. Use when a maintainer explicitly requests release preparation or publication.
---

# Komandio Extension Release

Read `docs/RELEASING.md` before changing a version or creating a tag.

1. Treat external publication as a separate approval step. Prepare and validate locally first; do not create or push a release tag, publish to JSR, upload to R2, or update a catalog unless the user explicitly authorizes that exact action in the current task.
2. Determine whether the change is SDK or an official extension.
3. Apply semantic versioning and make the version in source match the intended tag. JSR versions are immutable: never reuse a published version for different content.
4. Run the required validation before requesting publication.
5. Show the user the exact version, commit, tag, workflow, and external destinations that would be affected; wait for approval before the release action.
6. After approval, create exactly one immutable release tag from the reviewed commit on `main`:
   - SDK: `sdk-vX.Y.Z`
   - Extension: `<extension>-vX.Y.Z`

Only GitHub Actions publishes packages. Never manually upload R2 objects, overwrite a package, expose a signing key, or create a release from an unmerged commit. If approval is not explicit, stop after dry-run validation and report the exact next command without running it.
