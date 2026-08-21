import type { KomandioOverlayApi } from "./mod.ts";

declare global {
    interface Window {
        Komandio: KomandioOverlayApi;
    }
}

export {};
