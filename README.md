# Komandio Extensions Ecosystem

The official home for the Komandio SDK and Extension Library.

[Komandio website](https://www.komandio.com) · [Join the Discord community](https://discord.gg/NQ38d9jVnt)

This repository provides the SDK, extension source, and contribution standards that power Komandio's voice-activated automation experience for gaming and productivity workflows.

## 🚀 Vision
Komandio is more than just a voice-to-key application; it is an intelligent agent environment. By decoupling the extensions from the core application, we empower the community to build specialized knowledge bases and automation tools that can be maintained and updated independently of the main platform.

## 🛠️ SDK Support
The ecosystem is designed to be language-agnostic. Currently, we offer full support for **Web (TypeScript/Deno)**, with **.NET (C#)** support coming soon.

- **Web SDK (@komandio/sdk)**: A Deno-native, TypeScript-first toolkit for building lightweight, isolated extensions using TC39 decorators and the Deno runtime. No .NET dependencies are required for development.
- **.NET SDK**: (Coming Soon) Support for building performance-critical native extensions with deep OS integration.

## Public Deno SDK

`packages/komandio-sdk` is the canonical source of the public Deno SDK. Community developers consume it as `@komandio/sdk` through the repository import map.

## Community contribution

Start with [CONTRIBUTING.md](CONTRIBUTING.md), then use the repository's AI skills when working with a compatible coding agent:

- [`skills/komandio-extension-authoring`](skills/komandio-extension-authoring/) for creating, testing, or changing an extension.
- [`skills/komandio-sdk-maintenance`](skills/komandio-sdk-maintenance/) for SDK compatibility and release preparation.

Komandio Labs is the sole publisher of extensions in the Komandio Library. Community members grow the library by proposing extensions, reporting bugs, and contributing reviewed source changes through issues and pull requests. Accepted extensions are released as `komandio-labs` packages; contributors are credited, but do not need publishing access.

Maintainers should follow [docs/RELEASING.md](docs/RELEASING.md). Security reports belong in the private path described in [SECURITY.md](SECURITY.md), never in a public issue.

Official extensions are built and reviewed by Komandio Labs, then securely made available through the Komandio Library. They are installed on demand rather than bundled into the Komandio installer.

## 📂 Repository Structure

```text
komandio-extensions/
├── extensions/komandio-labs/  # Official extension source
├── packages/komandio-sdk/     # Public, self-contained Deno SDK
├── tools/                     # Build and development tools
└── .github/workflows/         # Project automation
```

## 🤖 AI-Native Development
The repository includes focused AI-agent skills under [`skills/`](skills/) for extension authoring and SDK maintenance. They document the project conventions, validation commands, and publication guardrails for compatible coding agents.

## 🏗️ Getting Started

Install Deno, clone the repository, and run the project checks:

```powershell
deno task test
deno task build-all
```

To suggest a new extension, open an Extension Proposal issue before starting implementation. To improve an existing extension, open an issue or submit a focused pull request with validation evidence.

## ⚖️ License
This repository is licensed under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for details.

---
© 2026 Komandio Labs. All rights reserved.
