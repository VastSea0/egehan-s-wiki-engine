export type LinkStatus = "blue" | "red" | "yellow";

export interface WikiCandidate {
  path: string;
  title: string;
  type: string;
}

export interface WikiMention {
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

export interface WikiDatabaseRedLink {
  term: string;
  label: string;
  sources: string[];
  count: number;
}

export interface WikiCandidateEntity {
  term: string;
  candidates: WikiCandidate[];
}

export interface WikiMetadataItem {
  key: string;
  value: string;
}

export interface WikiPageSummary {
  path: string;
  title: string;
  parent: string | null;
  childCount: number;
  modifiedAt: string;
  excerpt: string;
  sacred?: boolean;
  metadata?: WikiMetadataItem[];
}

export interface WikiPageFrontmatter {
  id?: string;
  title?: string;
  type?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface WikiHeading {
  level: number;
  text: string;
  id: string;
}

export interface WikiInfoboxField {
  label: string;
  value: string;
}

export interface WikiInfobox {
  title: string;
  fields: WikiInfoboxField[];
}

export interface DatabaseStats {
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

export interface ScriptContext {
  pagePath: string;
  allPages: WikiPageSummary[];
  stats: DatabaseStats | null;
}

export interface ParseWikiOptions {
  existingSlugs?: Set<string>;
  linkBase?: "wiki" | "blog" | "public" | string;
  highlightCode?: boolean;
  pageTitle?: string;
  hrefFor?: (target: string, exists: boolean) => string;
}

export interface ParsedWikiDocument {
  metadata: WikiMetadataItem[];
  body: string;
  html: string;
  headings: WikiHeading[];
}
