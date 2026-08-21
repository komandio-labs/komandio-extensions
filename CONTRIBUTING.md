# Contributing to Komandio Extensions

Thank you for helping improve Komandio's extension ecosystem.

## Before you start

- Search existing issues before opening a new one.
- For a new extension, open an extension proposal issue first so its purpose, permissions, and maintenance owner can be reviewed.
- Never include secrets, private keys, OAuth refresh tokens, or personal data in an issue, pull request, test fixture, or commit.

## Local workflow

Install Deno 2, then run:

```bash
deno task test
deno task build-all
```

Use the published SDK in new code:

```ts
import { Komandio, Result, Skill, Tool } from "jsr:@komandio/sdk@^1.0.0";
```

An extension belongs in `extensions/<publisher-id>/<extension-id>/`. Keep the manifest accurate, declare the smallest permission set, and add tests for behavior that can fail without Komandio running.

## Pull requests

Keep each pull request focused. Include a clear description, test evidence, and manifest/version changes when relevant. Do not commit generated `dist/` content, `.kxt` archives, or runtime data.

Changes to `packages/komandio-sdk` must preserve compatibility within the current major version and pass `deno publish --dry-run`.

## Maintainer releases

See [docs/RELEASING.md](docs/RELEASING.md). Contributors propose changes through pull requests; only trusted maintainers create release tags and publish official packages.
