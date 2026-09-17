import { ScriptContext, DatabaseStats } from './types.mjs';

declare function parseDirective(line: string): {
    name: string;
    arg: string;
} | null;
declare function replaceInlineDirectives(text: string, stats: DatabaseStats | null): string;
declare function executeBlockDirectives(content: string, context: ScriptContext): string;

export { executeBlockDirectives, parseDirective, replaceInlineDirectives };
