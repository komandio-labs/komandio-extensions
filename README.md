# Komandio Extensions Ecosystem

The official home for the Komandio SDK and Extension Library.

This repository provides the toolkits, standards, and community contributions that power the Komandio voice-activated automation engine for Gamers. Designed with an AI-first approach, it enables developers to create cross-platform skills, background services, and interactive overlays that integrate seamlessly into modern gaming and productivity workflows.

## 🚀 Vision
Komandio is more than just a voice-to-key application; it is an intelligent agent environment. By decoupling the extensions from the core application, we empower the community to build specialized knowledge bases and automation tools that can be maintained and updated independently of the main platform.

## 🛠️ SDK Support
The ecosystem is designed to be language-agnostic. Currently, we offer full support for **Web (TypeScript/Deno)**, with **.NET (C#)** support coming soon.

- **Web SDK (@komandio/sdk)**: A Deno-native, TypeScript-first toolkit for building lightweight, isolated extensions using TC39 decorators and the Deno runtime. No .NET dependencies are required for development.
- **.NET SDK**: (Coming Soon) Support for building performance-critical native extensions with deep OS integration.

## Publishing official extensions

## Public Deno SDK

`packages/komandio-sdk` is the canonical source of the public Deno SDK. It is published to JSR as `@komandio/sdk` from `sdk-vX.Y.Z` tags using GitHub OIDC; no publishing secret is stored in GitHub. Community developers consume it with `jsr:@komandio/sdk@^X.Y.Z`.

## Community contribution

Start with [CONTRIBUTING.md](CONTRIBUTING.md), then use the repository's AI skills when working with a compatible coding agent:

- [`skills/komandio-extension-authoring`](skills/komandio-extension-authoring/) for creating, testing, or changing an extension.
- [`skills/komandio-extension-release`](skills/komandio-extension-release/) for semantic versioning and trusted publication.

Maintainers should follow [docs/RELEASING.md](docs/RELEASING.md). Security reports belong in the private path described in [SECURITY.md](SECURITY.md), never in a public issue.

Official extensions are built from this repository and distributed through the signed Komandio catalog at `https://extensions.komandio.com/catalog.json`. They are not bundled into the Komandio installer: the app retrieves the catalog, verifies its signature, and then lets users install a selected version.

Create a release tag only after the tagged commit is merged into `main`:

```text
spotify-v1.2.0
```

The workflow tests every official extension, builds the tagged extension, signs its immutable `.kxt` package, uploads it under `packages/komandio-labs/spotify/1.2.0/`, and updates the signed common catalog. It has no dependency on the retired Komandio backend.

The repository requires these GitHub Actions secrets:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `EXTENSIONS_SIGNING_KEY_BASE64`

## 📂 Repository Structure

```text
komandio-extensions/
├── extensions/komandio-labs/  # Official extension source
├── packages/komandio-sdk/     # Public, self-contained Deno SDK
├── keys/                      # Public verification key only
├── tools/                     # Build and development tools
└── .github/workflows/         # Test and signed R2 publication
```

The R2 distribution hierarchy is deliberately separate from the repository:

```text
extensions.komandio.com/
├── catalog.json
├── catalog.signature.json
└── packages/komandio-labs/<extension>/<version>/<publisher>.<extension>-<version>.kxt
```

## 🛡️ Extension Categories
To ensure a secure and high-performance user experience, we distinguish between two types of extensions:

- **Official (Komandio Labs)**: Rigorously tested for performance, security, and AI alignment. These extensions are signed and verified by the Komandio team.
- **Community**: Open contributions from the gaming and automation community. These are subject to user review and can be easily forked for customization.

## 🤖 AI-Native Development
Every extension in this repository includes an `AGENT.md` file. This is a technical specification designed to help AI agents (like Gemini or Claude) understand the extension's architecture, state management, and intent boundaries, making it incredibly easy to maintain and iterate via LLMs.

## 🏗️ Getting Started (Web)
1.  **Install Deno**: [deno.land](https://deno.land/)
2.  **Install 'kext' CLI**: (Coming Soon) `deno install -A https://raw.githubusercontent.com/komandio/extensions/main/tools/kext-cli/kext.ts`
3.  **Initialize**: `kext init my-extension`
4.  **Build**: `kext build`

## ⚖️ License
This repository is licensed under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for details.

---
© 2026 Komandio Labs. All rights reserved.
