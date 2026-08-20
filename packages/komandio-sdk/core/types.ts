export interface ExtensionMessage { target: string; source?: string; type: string; cmd?: string; id?: string; payload?: any; }
export const MessageType = { Command: "CMD", Response: "RES", Error: "ERR", Event: "EVT", System: "SYS" } as const;
export interface ServiceMetadata { name: string; description?: string; supportedGames?: string[]; category?: string; permissions?: string[]; }
export interface SkillMetadata { name: string; version: string; description: string; author: string; repository?: string; supportedGames: string[]; category: string; tags: string[]; image?: string; permissions?: string[]; examples?: string[]; }
export interface ToolParamMetadata { name?: string; description: string; type: "string" | "number" | "boolean" | "json"; optional?: boolean; enum?: string[]; }
export interface ToolMetadata { name?: string; description: string; returns?: string | { type: "string" | "number" | "boolean" | "json"; description: string; }; params?: ToolParamMetadata[]; }
export enum ToolErrorCategory { None = "None", General = "General", ConfigurationRequired = "ConfigurationRequired", PermissionDenied = "PermissionDenied", NotFound = "NotFound", ServiceUnavailable = "ServiceUnavailable" }
