# Komandio Extensions Ecosystem

The official home for the Komandio SDK and Extension Library.

This repository provides the toolkits, standards, and community contributions that power the Komandio voice-activated automation engine for Gamers. Designed with an AI-first approach, it enables developers to create cross-platform skills, background services, and interactive overlays that integrate seamlessly into modern gaming and productivity workflows.

## 🚀 Vision
Komandio is more than just a voice-to-key application; it is an intelligent agent environment. By decoupling the extensions from the core application, we empower the community to build specialized knowledge bases and automation tools that can be maintained and updated independently of the main platform.

## 🛠️ SDK Support
The ecosystem is designed to be language-agnostic. Currently, we offer full support for **Web (TypeScript/Deno)**, with **.NET (C#)** support coming soon.

- **Web SDK (@komandio/sdk)**: A Deno-native, TypeScript-first toolkit for building lightweight, isolated extensions using TC39 decorators and the Deno runtime. No .NET dependencies are required for development.
- **.NET SDK**: (Coming Soon) Support for building performance-critical native extensions with deep OS integration.

## 📂 Repository Structure
We use a unified monorepo structure to ensure consistency across different SDK versions and extensions.

```text
komandio-extensions/
├── packages/
│   ├── web-sdk/                # Deno/TypeScript SDK source
│   └── dotnet-sdk/             # (Future) .NET C# SDK source
├── extensions/
│   ├── komandio-labs/          # Official extensions maintained by Komandio Labs
│   │   ├── web/                # Official Web-based extensions
│   │   └── dotnet/             # (Future) Official Native extensions
│   └── community/              # Community-contributed extensions
│       ├── web/                # Community Web extensions
│       └── dotnet/             # (Future) Community Native extensions
├── tools/
│   └── kext-cli/               # The 'kext' CLI for scaffolding and building
└── README.md
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
