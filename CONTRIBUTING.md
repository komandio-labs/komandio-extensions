# Contributing to Komandio Extensions

Thank you for helping improve Komandio's extension ecosystem.

## Before you start

- Search existing issues before opening a new one.
- For a new extension, open an extension proposal issue first so its purpose, permissions, external dependencies, and maintenance expectations can be reviewed.
- Komandio Labs operates a curated catalogue. Community members may propose extensions, report bugs, and submit focused pull requests, but Komandio Labs is the sole publisher and signer of catalogue extensions.
- Never include secrets, private keys, OAuth refresh tokens, or personal data in an issue, pull request, test fixture, or commit.

## Local workflow

Install Deno 2, then run:

```bash
deno task test
deno task build-all
```

Use the SDK alias resolved by the repository import map. Do not add a direct JSR version to an extension:

```ts
import { Komandio, Result, Skill, Tool } from "@komandio/sdk";
```

An accepted extension belongs in `extensions/komandio-labs/<extension-id>/`. Keep the manifest accurate, declare the smallest permission set, and add tests for behavior that can fail without Komandio running. A contributor can be credited in the manifest and documentation, but the published extension identity remains `komandio-labs`.

## Pull requests

Keep each pull request focused. Include a clear description, test evidence, and manifest/version changes when relevant. Do not commit generated `dist/` content, `.kxt` archives, or runtime data.

Changes to `packages/komandio-sdk` must preserve compatibility within the current major version and pass `deno publish --dry-run`.

## Maintainer releases

See [docs/RELEASING.md](docs/RELEASING.md). Contributors propose changes through issues and pull requests; only authorized Komandio Labs maintainers create release tags and publish signed packages.
