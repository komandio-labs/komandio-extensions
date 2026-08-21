/**
 * Browser-facing Komandio SDK surface for extension overlays.
 *
 * Komandio injects the matching ./web/browser asset into WebView overlays.
 * This module is exported for type-aware browser tooling and documentation.
 */

export type WebToolResult<T = unknown> =
    | { success: true; data?: T; handled?: boolean }
    | { success: false; error: string };

export const Result = {
    ok: <T>(data?: T, handled = false): WebToolResult<T> => ({ success: true, data, handled }),
    fail: (message: string): WebToolResult<never> => ({ success: false, error: message }),
    error: (message: string): WebToolResult<never> => ({ success: false, error: message })
};

export interface KomandioOverlayApi {
    service: {
        call: <T = unknown>(command: string, payload?: unknown) => Promise<T>;
        getProxy: <T extends object>() => T;
    };
    ui: { onCommand: (command: string, handler: (payload: unknown) => void) => void };
    os: {
        openSettings: (extensionId?: string) => void;
        reportReady: () => void;
    };
}
