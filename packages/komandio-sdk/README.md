# Komandio Deno SDK

`@komandio/sdk` is the public SDK for building Komandio skills, services, and overlays.

```ts
import { Komandio, Result, Skill, Tool } from "jsr:@komandio/sdk@^1.0.0";
```

The SDK is executed inside Komandio's Deno extension host. It provides the typed bridge to storage, secrets, overlays, speech, profile commands, services, and application logging.

The host application pins and bundles a compatible SDK version, so installed extensions do not require internet access at runtime.
