# Extension contract

- Manifest publisher/id/version form the stable extension identity.
- Catalogue extensions use publisher `komandio-labs` and are signed only by Komandio Labs. Contributor credit is metadata/documentation, not a separate publisher identity.
- `skill/index.ts`, `service/index.ts`, and overlay paths must match the manifest entry points.
- `data/` is user runtime state and is never source-controlled.
- `dist/` and `.kxt` are generated only by the build/release pipeline.
- Required secrets are stored through `Komandio.storage`; never place them in manifests or source fixtures.
