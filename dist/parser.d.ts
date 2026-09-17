import { WikiPageFrontmatter, WikiMetadataItem, ParseWikiOptions, WikiHeading, WikiInfobox } from './types.js';

declare function parseMetadataDocument(content: string): {
    metadata: WikiMetadataItem[];
    body: string;
};
declare function slugify(text: string): string;
declare function extractFrontmatter(rawContent: string): {
    frontmatter: WikiPageFrontmatter;
    body: string;
};
declare function parseWikiContent(rawContent: string, options?: ParseWikiOptions): {
    html: string;
    headings: WikiHeading[];
    infobox: WikiInfobox | null;
};

export { extractFrontmatter, parseMetadataDocument, parseWikiContent, slugify };
