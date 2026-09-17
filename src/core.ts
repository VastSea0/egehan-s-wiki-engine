import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { parseMetadataDocument, parseWikiContent, slugify } from "./parser";
import { executeBlockDirectives } from "./scriptEngine";
import type { DatabaseStats, ParseWikiOptions, WikiPageSummary } from "./types";

export interface LoadWikiOptions {
  rootDir: string;
  allowedExtensions?: string[];
  linkBase?: string;
  stats?: DatabaseStats | null;
}

export interface LoadedWikiPage extends WikiPageSummary {
  rawContent: string;
  bodyContent: string;
  html: string;
}

export class WikiEngine {
  private rootDir: string;
  private allowedExtensions: string[];
  private linkBase: string;
  private pages: Map<string, LoadedWikiPage> = new Map();

  constructor(options: LoadWikiOptions) {
    this.rootDir = resolve(options.rootDir);
    this.allowedExtensions = options.allowedExtensions || [".txt", ".md"];
    this.linkBase = options.linkBase || "wiki";
  }

  public scan(): Map<string, LoadedWikiPage> {
    this.pages.clear();
    if (!existsSync(this.rootDir)) {
      return this.pages;
    }

    const files: string[] = [];
    const walk = (dir: string) => {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const hasExt = this.allowedExtensions.some((ext) => entry.name.endsWith(ext));
          if (hasExt) {
            files.push(fullPath);
          }
        }
      }
    };

    walk(this.rootDir);

    const summaries: WikiPageSummary[] = [];

    // 1. Pass: Read all pages metadata & summaries
    for (const filePath of files) {
      const relPath = relative(this.rootDir, filePath);
      const ext = relPath.slice(relPath.lastIndexOf("."));
      const pathWithoutExt = relPath.slice(0, -ext.length).replace(/\\/g, "/");

      const raw = readFileSync(filePath, "utf-8");
      const stat = statSync(filePath);
      const { metadata, body } = parseMetadataDocument(raw);

      const titleMeta = metadata.find((m) => m.key.toLowerCase() === "başlık" || m.key.toLowerCase() === "title");
      const title = titleMeta?.value || basename(pathWithoutExt);

      const pathParts = pathWithoutExt.split("/");
      const parent = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : null;

      const summary: WikiPageSummary = {
        path: pathWithoutExt,
        title,
        parent,
        childCount: 0,
        modifiedAt: stat.mtime.toISOString(),
        excerpt: body.slice(0, 160).replace(/\s+/g, " ").trim(),
        metadata,
      };

      summaries.push(summary);

      this.pages.set(pathWithoutExt, {
        ...summary,
        rawContent: raw,
        bodyContent: body,
        html: "",
      });
    }

    // 2. Pass: Compute child counts
    for (const summary of summaries) {
      if (summary.parent && this.pages.has(summary.parent)) {
        const parentPage = this.pages.get(summary.parent)!;
        parentPage.childCount++;
      }
    }

    // 3. Pass: Render HTML with existing slugs
    const existingSlugs = new Set(Array.from(this.pages.keys()).map((k) => slugify(k)));
    for (const [key, page] of this.pages.entries()) {
      const processedBody = executeBlockDirectives(page.bodyContent, {
        pagePath: page.path,
        allPages: summaries,
        stats: null,
      });

      const { html } = parseWikiContent(processedBody, {
        existingSlugs,
        linkBase: this.linkBase,
      });

      page.html = html;
      this.pages.set(key, page);
    }

    return this.pages;
  }

  public getPage(path: string): LoadedWikiPage | undefined {
    return this.pages.get(path);
  }

  public getAllPages(): LoadedWikiPage[] {
    return Array.from(this.pages.values());
  }
}
