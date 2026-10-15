/** Types for templates/core/placeholders.js (structured placeholder markers). */
export declare function placeholder(head: string, instruction?: string): string;
export declare function findPlaceholders(text: string): Array<{ marker: string; head: string; instruction: string | null }>;
export declare function findUnfilledPlaceholders(structure: unknown): string[];
export declare function blankPlaceholders(text: string): string;
export declare function blankPlaceholdersDeep<T>(value: T): T;
export declare const COURT_COMPLETED: ReadonlySet<string>;
export declare const MARKER_SOURCE: string;
