type LinkStatus = "blue" | "red" | "yellow";
interface WikiCandidate {
    path: string;
    title: string;
    type: string;
}
interface WikiMention {
    start: number;
    end: number;
    path: string;
    rawTarget?: string;
    label: string;
    exists?: boolean;
    ambiguous?: boolean;
    candidates?: WikiCandidate[];
    status?: LinkStatus;
}
interface WikiDatabaseRedLink {
    term: string;
    label: string;
    sources: string[];
    count: number;
}
interface WikiCandidateEntity {
    term: string;
    candidates: WikiCandidate[];
}
interface WikiMetadataItem {
    key: string;
    value: string;
}
interface WikiPageSummary {
    path: string;
    title: string;
    parent: string | null;
    childCount: number;
    modifiedAt: string;
    excerpt: string;
    sacred?: boolean;
    metadata?: WikiMetadataItem[];
}
interface WikiPageFrontmatter {
    id?: string;
    title?: string;
    type?: string;
    tags?: string[];
    [key: string]: unknown;
}
interface WikiHeading {
    level: number;
    text: string;
    id: string;
}
interface WikiInfoboxField {
    label: string;
    value: string;
}
interface WikiInfobox {
    title: string;
    fields: WikiInfoboxField[];
}
interface DatabaseStats {
    totalPages: number;
    persons: number;
    journal: number;
    poems: number;
    towhom: number;
    systemPages: number;
    words: number;
    characters: number;
    links: number;
    changedFromFirstGeneration: number;
    migratedObjects: number;
}
interface ScriptContext {
    pagePath: string;
    allPages: WikiPageSummary[];
    stats: DatabaseStats | null;
}
interface ParseWikiOptions {
    existingSlugs?: Set<string>;
    linkBase?: "wiki" | "blog" | "public" | string;
    highlightCode?: boolean;
}
interface ParsedWikiDocument {
    metadata: WikiMetadataItem[];
    body: string;
    html: string;
    headings: WikiHeading[];
}

export type { DatabaseStats, LinkStatus, ParseWikiOptions, ParsedWikiDocument, ScriptContext, WikiCandidate, WikiCandidateEntity, WikiDatabaseRedLink, WikiHeading, WikiInfobox, WikiInfoboxField, WikiMention, WikiMetadataItem, WikiPageFrontmatter, WikiPageSummary };
