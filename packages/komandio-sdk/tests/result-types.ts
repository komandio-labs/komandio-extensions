import { Result, type ToolResult } from "../deno/mod.ts";

const typedError: ToolResult<string> = Result.error("Expected failure");
const typedFailure: ToolResult<string> = Result.fail("Expected failure");

void typedError;
void typedFailure;
