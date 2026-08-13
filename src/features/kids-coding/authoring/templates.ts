import { KIDS_PROGRAM_SCHEMA, KIDS_PROGRAM_SCHEMA_VERSION, type ProgramDefinition, type ProgramInstruction } from "../engine";
export { kidsCommandCatalog } from "./command-catalog";

export function program(...instructions: readonly ProgramInstruction[]): ProgramDefinition {
  return { schema: KIDS_PROGRAM_SCHEMA, schemaVersion: KIDS_PROGRAM_SCHEMA_VERSION, instructions, functions: [] };
}

export function command(id: string, commandId: string, argumentsValue: Readonly<Record<string, string | number | boolean>> = {}): ProgramInstruction {
  return { id, type: "command", commandId, arguments: argumentsValue };
}

export function repeat(id: string, count: number, ...body: readonly ProgramInstruction[]): ProgramInstruction {
  return { id, type: "repeat", commandId: "repeat", count, body };
}
