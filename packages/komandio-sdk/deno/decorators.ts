import { ServiceMetadata, SkillMetadata, ToolMetadata } from "../core/types.ts";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
const tools = new WeakMap<object, Map<string, any>>();
const routes = new WeakMap<object, Map<string, any>>();
const handlers = new WeakMap<object, Map<string, any>>();
const initializers = new WeakMap<object, Set<string>>();
const parameters = new WeakMap<object, Map<string, any[]>>();
const modernTools = new WeakMap<Function, any>();
const modernRoutes = new WeakMap<Function, any>();
const modernHandlers = new WeakMap<Function, any>();
const modernInitializers = new WeakSet<Function>();
const isLegacy = (value: unknown): value is string | symbol => typeof value === "string" || typeof value === "symbol";
function set(map: WeakMap<object, Map<string, any>>, target: object, key: string, value: any) { if (!map.has(target)) map.set(target, new Map()); map.get(target)!.set(key, value); }
function attach(target: any) {
    const proto = target.prototype;
    const toolParams: Record<string, any[]> = {};
    const allTools: any[] = [];
    const allRoutes: any[] = [];
    const allHandlers: any[] = [];
    for (const key of Object.getOwnPropertyNames(proto)) {
        if (key === "constructor" || typeof proto[key] !== "function") continue;
        const method = proto[key] as Function;
        const tool = modernTools.get(method) ?? tools.get(proto)?.get(key);
        if (tool) { allTools.push(tool); const p = parameters.get(proto)?.get(key) ?? tool.params ?? []; if (p.length) toolParams[tool.method] = p; }
        const route = modernRoutes.get(method) ?? routes.get(proto)?.get(key); if (route) allRoutes.push(route);
        const handler = modernHandlers.get(method) ?? handlers.get(proto)?.get(key); if (handler) allHandlers.push(handler);
        if (modernInitializers.has(method) || initializers.get(proto)?.has(key)) proto._komandio_on_init = key;
    }
    proto._komandio_tools = allTools;
    proto._komandio_tool_params = toolParams;
    if (allRoutes.length) proto._komandio_routes = allRoutes;
    if (allHandlers.length) proto._komandio_handlers = allHandlers;
}
export function Skill(metadata: SkillMetadata): (target: any) => any { return (target: any): any => { target._komandio_metadata = metadata; attach(target); return target; }; }
export function Service(metadata: ServiceMetadata): (target: any) => any { return (target: any): any => { target._komandio_metadata = metadata; attach(target); return target; }; }
export function Tool(metadata: ToolMetadata): (target: any, key: any) => void { return (target: any, key: any): void => { if (isLegacy(key)) set(tools, target, String(key), { ...metadata, method: String(key) }); else modernTools.set(target as Function, { ...metadata, method: String(key.name) }); }; }
export function ToolParam(metadata: { name: string; type: string; description?: string; required?: boolean }): (target: object, key: string | symbol, index: number) => void { return (target: object, key: string | symbol, index: number): void => { if (!parameters.has(target)) parameters.set(target, new Map()); const values = parameters.get(target)!; const name = String(key); if (!values.has(name)) values.set(name, []); values.get(name)![index] = { ...metadata }; }; }
export function Route(method: HttpMethod, path: string): (target: any, key: any) => void { return (target: any, key: any): void => { if (isLegacy(key)) set(routes, target, String(key), { method, path, handler: String(key) }); else modernRoutes.set(target as Function, { method, path, handler: String(key.name) }); }; }
export function MessageHandler(command: string): (target: any, key: any) => void { return (target: any, key: any): void => { if (isLegacy(key)) set(handlers, target, String(key), { command, handler: String(key) }); else modernHandlers.set(target as Function, { command, handler: String(key.name) }); }; }
export function OnInit(target: any, key: any): void { if (isLegacy(key)) { if (!initializers.has(target)) initializers.set(target, new Set()); initializers.get(target)!.add(String(key)); } else modernInitializers.add(target as Function); }
