import { ExtensionMessage, MessageType } from "../../core/types.ts";

function hostSend(message: unknown): void {
    const send = (globalThis as any).__komandio_pipe_send;
    if (!send) throw new Error("[SDK Bridge] Host pipe is not available.");
    send(message);
}

export async function sendToHost(type: string, cmd: string, payload: any, id?: string): Promise<void> {
    const extensionId = (globalThis as any).__komandio_extension_id;
    const message: ExtensionMessage = { target: "host", source: (globalThis as any).__komandio_source || `ext:${extensionId}`, type, id: id || crypto.randomUUID(), cmd, payload };
    try { hostSend(message); } catch (error) { console.error("[SDK Bridge] sendToHost failed:", error); }
}

export function callHost(cmd: string, payload: any): Promise<any> {
    const id = crypto.randomUUID();
    const extensionId = (globalThis as any).__komandio_extension_id;
    const message: ExtensionMessage = { target: "host", source: (globalThis as any).__komandio_source || `ext:${extensionId}`, type: MessageType.Command, id, cmd, payload };
    return new Promise((resolve, reject) => {
        const register = (globalThis as any).__komandio_pipe_register_handler;
        const unregister = (globalThis as any).__komandio_pipe_unregister_handler;
        if (!register) { reject(new Error("[SDK Bridge] Host pipe is not available.")); return; }
        register(id, (response: ExtensionMessage) => response.type === MessageType.Error ? reject(new Error((response.payload as any)?.message || "Host Error")) : resolve(response.payload));
        try { hostSend(message); } catch (error) { unregister?.(id); reject(error); }
    });
}
