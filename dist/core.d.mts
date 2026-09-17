import { DatabaseStats, WikiPageSummary } from './types.mjs';

interface LoadWikiOptions {
    rootDir: string;
    allowedExtensions?: string[];
    linkBase?: string;
    stats?: DatabaseStats | null;
}
interface LoadedWikiPage extends WikiPageSummary {
    rawContent: string;
    bodyContent: string;
    html: string;
}
declare class WikiEngine {
    private rootDir;
    private allowedExtensions;
    private linkBase;
    private pages;
    constructor(options: LoadWikiOptions);
    scan(): Map<string, LoadedWikiPage>;
    getPage(path: string): LoadedWikiPage | undefined;
    getAllPages(): LoadedWikiPage[];
}

export { type LoadWikiOptions, type LoadedWikiPage, WikiEngine };
