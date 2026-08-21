import { callHost, sendToHost } from "./internal/bridge.ts";
import { MessageType, ToolErrorCategory } from "../core/types.ts";

export { ToolErrorCategory };

export type ToolResult<T = unknown> = { value: T | null; hasError: boolean; category?: ToolErrorCategory; };
export const Result = {
    ok: <T>(value: T | null = null): ToolResult<T> => ({ value, hasError: false, category: ToolErrorCategory.None }),
    error: <T = string>(value: T, category: ToolErrorCategory = ToolErrorCategory.General): ToolResult<T> => ({ value, hasError: true, category }),
    fail: <T = string>(value: T, category: ToolErrorCategory = ToolErrorCategory.General): ToolResult<T> => ({ value, hasError: true, category })
};

export const Komandio = {
    log: (message: string): void => {
        console.log(`[Komandio] ${message}`);
        void sendToHost(MessageType.Event, "LOG", { message });
    },
    storage: {
        getSetting: <T>(key: string): Promise<T | null> => callHost("BROKER_GET_SETTING", { key }) as Promise<T | null>,
        saveSetting: (key: string, value: unknown): Promise<void> => callHost("BROKER_SAVE_SETTING", { key, value }) as Promise<void>,
        deleteSetting: (key: string): Promise<void> => callHost("BROKER_DELETE_SETTING", { key }) as Promise<void>,
        getSecret: (key: string): Promise<string> => callHost("BROKER_GET_SECRET", { key }) as Promise<string>,
        saveSecret: (key: string, value: string): Promise<void> => callHost("BROKER_SAVE_SECRET", { key, value }) as Promise<void>,
        deleteSecret: (key: string): Promise<void> => callHost("BROKER_DELETE_SECRET", { key }) as Promise<void>
    },
    ui: {
        showOverlay: (target?: string, settings?: unknown): Promise<void> => callHost("BROKER_OVERLAY_SHOW", { target, settings }) as Promise<void>,
        hideOverlay: (target?: string): Promise<void> => callHost("BROKER_OVERLAY_HIDE", { target }) as Promise<void>,
        closeOverlay: (target?: string): Promise<void> => callHost("BROKER_OVERLAY_CLOSE", { target }) as Promise<void>,
        updateOverlay: (target: string, payload: unknown, command?: string): Promise<void> => callHost("BROKER_OVERLAY_UPDATE", { target, payload, command }) as Promise<void>,
        openSettings: (extensionId?: string): Promise<void> => callHost("BROKER_OPEN_SETTINGS", { extensionId }) as Promise<void>
    },
    speech: { speak: (text: string): Promise<void> => callHost("TTS_SAY", { text }) as Promise<void> },
    os: { openUrl: (url: string): Promise<void> => callHost("BROKER_OPEN_URL", { url }) as Promise<void> },
    commands: { execute: (commandId: string): Promise<void> => callHost("BROKER_EXECUTE_PROFILE_COMMAND", { commandId }) as Promise<void> },
    service: { call: <T>(params: { targetId: string; command: string; payload?: unknown }): Promise<T> => callHost("BROKER_CALL_SERVICE", params) as Promise<T> },
    events: { emit: (command: string, payload: Record<string, unknown>): Promise<void> => sendToHost(MessageType.Event, "ACTION", { cmd: command, ...payload }) },
    network: { fetch: (url: string | URL, init?: RequestInit): Promise<Response> => fetch(url, init) }
};

export * from "./decorators.ts";
