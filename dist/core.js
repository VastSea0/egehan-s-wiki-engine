"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/core.ts
var core_exports = {};
__export(core_exports, {
  WikiEngine: () => WikiEngine
});
module.exports = __toCommonJS(core_exports);
var import_node_fs = require("fs");
var import_node_path = require("path");

// src/parser.ts
var import_highlight = __toESM(require("highlight.js"));
function parseMetadataDocument(content) {
  const normalized = content.replace(/^\uFEFF/u, "");
  const leadingWs = normalized.match(/^\s*/u)?.[0] || "";
  const withoutLeading = normalized.slice(leadingWs.length);
  if (withoutLeading.startsWith("@meta\n") || withoutLeading.startsWith("@meta\r\n")) {
    const endMatch = withoutLeading.match(/\r?\n@end(?:\r?\n|$)/u);
    if (endMatch && endMatch.index !== void 0) {
      const headerEnd = leadingWs.length + endMatch.index + endMatch[0].length;
      const block = withoutLeading.slice(withoutLeading.indexOf("\n") + 1, endMatch.index);
      const metadata = block.split(/\r?\n/u).flatMap((line) => {
        const trimmed = line.trim();
        if (!trimmed) return [];
        const match = trimmed.match(/^([\p{L}\p{N}_-]+)\s*=\s*(.*)$/u);
        if (match) return [{ key: match[1].trim(), value: match[2].trim() }];
        const flagMatch = trimmed.match(/^([\p{L}\p{N}_-]+)$/u);
        if (flagMatch) return [{ key: flagMatch[1].trim(), value: "true" }];
        return [];
      });
      return { metadata, body: normalized.slice(headerEnd) };
    }
  }
  const endBlockMatch = normalized.match(/(?:\r?\n|^)@meta\r?\n([\s\S]*?)\r?\n@end\s*$/u);
  if (endBlockMatch && endBlockMatch.index !== void 0) {
    const block = endBlockMatch[1];
    const metadata = block.split(/\r?\n/u).flatMap((line) => {
      const trimmed = line.trim();
      if (!trimmed) return [];
      const match = trimmed.match(/^([\p{L}\p{N}_-]+)\s*=\s*(.*)$/u);
      if (match) return [{ key: match[1].trim(), value: match[2].trim() }];
      const flagMatch = trimmed.match(/^([\p{L}\p{N}_-]+)$/u);
      if (flagMatch) return [{ key: flagMatch[1].trim(), value: "true" }];
      return [];
    });
    return { metadata, body: normalized.slice(0, endBlockMatch.index).trimEnd() };
  }
  return { metadata: [], body: normalized };
}
function slugify(text) {
  return text.toLowerCase().trim().replace(/[^\w\s\u00C0-\u017F-]/g, "").replace(/\s+/g, "_");
}
function extractFrontmatter(rawContent) {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = rawContent.match(fmRegex);
  if (!match) {
    return {
      frontmatter: { id: "", title: "", type: "special" },
      body: rawContent.trim()
    };
  }
  const yamlBlock = match[1];
  const body = match[2].trim();
  const frontmatter = {};
  yamlBlock.split(/\r?\n/).forEach((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const rawVal = line.slice(colonIdx + 1).trim();
      let parsedVal = rawVal;
      if (rawVal.startsWith('"') && rawVal.endsWith('"') || rawVal.startsWith("'") && rawVal.endsWith("'")) {
        parsedVal = rawVal.slice(1, -1);
      } else if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
        try {
          parsedVal = JSON.parse(rawVal);
        } catch {
          parsedVal = rawVal.slice(1, -1).split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
        }
      }
      frontmatter[key] = parsedVal;
    }
  });
  return { frontmatter, body };
}
function parseWikiContent(rawContent, options = {}) {
  const { existingSlugs = /* @__PURE__ */ new Set(), linkBase = "wiki", highlightCode = true } = options;
  const headings = [];
  let infobox = null;
  const { body } = extractFrontmatter(rawContent);
  const { body: cleanBody } = parseMetadataDocument(body);
  const codeBlocks = [];
  let processed = cleanBody.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (_, lang, code) => {
    let highlighted = "";
    if (highlightCode && lang && import_highlight.default.getLanguage(lang)) {
      try {
        highlighted = import_highlight.default.highlight(code.trimEnd(), { language: lang }).value;
      } catch {
        highlighted = escapeHtml(code.trimEnd());
      }
    } else {
      highlighted = escapeHtml(code.trimEnd());
    }
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<pre class="hljs"><code class="language-${lang || "text"}">${highlighted}</code></pre>`
    );
    return `__CODE_BLOCK_${idx}__`;
  });
  const infoboxRegex = /:::\s*infobox\s*([\s\S]*?):::/;
  const infoboxMatch = processed.match(infoboxRegex);
  if (infoboxMatch) {
    const infoboxContent = infoboxMatch[1].trim();
    const lines = infoboxContent.split(/\r?\n/);
    let title = "";
    const fields = [];
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("#")) {
        title = trimmed.replace(/^#+\s*/, "");
      } else {
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0) {
          fields.push({
            label: trimmed.slice(0, colonIdx).trim(),
            value: trimmed.slice(colonIdx + 1).trim()
          });
        }
      }
    });
    infobox = { title, fields };
    processed = processed.replace(infoboxRegex, "");
  }
  processed = processed.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, text) => {
    const level = hashes.length;
    const cleanText = text.trim();
    const id = slugify(cleanText);
    headings.push({ level, text: cleanText, id });
    return `<h${level} id="${id}">${cleanText}</h${level}>`;
  });
  processed = processed.replace(
    /((?:^\|.+?\|(?:\r?\n|$))+)/gm,
    (tableMatch) => {
      const rows = tableMatch.trim().split(/\r?\n/);
      if (rows.length < 2) return tableMatch;
      let html2 = '<div class="wiki-table-wrapper"><table class="wiki-table">';
      let isHeader = true;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row.startsWith("|") || !row.endsWith("|")) continue;
        if (row.match(/^\|[\s:-|]+\|$/)) {
          isHeader = false;
          continue;
        }
        const cells = row.slice(1, -1).split("|").map((c) => c.trim());
        if (isHeader && i === 0) {
          html2 += "<thead><tr>";
          cells.forEach((c) => {
            html2 += `<th>${c}</th>`;
          });
          html2 += "</tr></thead><tbody>";
        } else {
          html2 += "<tr>";
          cells.forEach((c) => {
            html2 += `<td>${c}</td>`;
          });
          html2 += "</tr>";
        }
      }
      html2 += "</tbody></table></div>";
      return html2;
    }
  );
  processed = processed.replace(/\[\[(.*?)\]\]/g, (_, inner) => {
    let target = inner.trim();
    let label = target;
    if (target.includes("|")) {
      const parts = target.split("|");
      target = parts[0].trim();
      label = parts[1].trim();
    }
    const isYellowCandidate = target.startsWith("?") || target.startsWith("candidate:");
    if (isYellowCandidate) {
      const cleanTarget = target.replace(/^[?]|candidate:/, "").trim();
      return `<span class="is-yellow-link" title="Belirsiz / Aday Ba\u011Flant\u0131: ${cleanTarget}">[?] ${label}</span>`;
    }
    const slug = slugify(target);
    const exists = existingSlugs.size === 0 || existingSlugs.has(slug) || existingSlugs.has(target);
    if (!exists) {
      return `<a href="/${linkBase}/${slug}?create=1" class="is-red-link" title="${target} (sayfa hen\xFCz mevcut de\u011Fil)">${label}</a>`;
    }
    return `<a href="/${linkBase}/${slug}" class="is-blue-link">${label}</a>`;
  });
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  processed = processed.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  processed = processed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");
  processed = processed.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  processed = processed.replace(/((?:^-\s+.+?(?:\r?\n|$))+)/gm, (listMatch) => {
    const items = listMatch.trim().split(/\r?\n/);
    const lis = items.map((item) => `<li>${item.replace(/^-\s+/, "").trim()}</li>`).join("");
    return `<ul class="wiki-list">${lis}</ul>`;
  });
  const blocks = processed.split(/\r?\n\r?\n/);
  const finalBlocks = blocks.map((b) => {
    const trimmed = b.trim();
    if (trimmed.startsWith("<h") || trimmed.startsWith("<ul") || trimmed.startsWith("<ol") || trimmed.startsWith("<pre") || trimmed.startsWith("<table") || trimmed.startsWith("<div") || trimmed.startsWith("__CODE_BLOCK_")) {
      return trimmed;
    }
    if (!trimmed) return "";
    return `<p>${trimmed.replace(/\r?\n/g, "<br />")}</p>`;
  });
  let html = finalBlocks.filter(Boolean).join("\n");
  codeBlocks.forEach((codeHtml, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, codeHtml);
    html = html.replace(`<p>__CODE_BLOCK_${idx}__</p>`, codeHtml);
  });
  return { html, headings, infobox };
}
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// src/scriptEngine.ts
function parseDirective(line) {
  const trimmed = line.trim();
  const match = trimmed.match(/^\{\{#([a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]+)(?::([^}]+))?\}\}$/u);
  if (!match) return null;
  return {
    name: match[1].toLowerCase(),
    arg: (match[2] || "").trim()
  };
}
function replaceInlineDirectives(text, stats) {
  if (!text || !text.includes("{{#")) return text;
  return text.replace(/\{\{#([a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]+)(?::([^}]+))?\}\}/gu, (match, rawName, rawArg) => {
    const name = String(rawName).toLowerCase();
    const arg = String(rawArg || "").toLowerCase();
    if (!stats) return match;
    if (name === "sayfa_say\u0131s\u0131" || name === "saya\xE7" && (arg === "toplam" || arg === "sayfa")) {
      return stats.totalPages.toLocaleString("tr-TR");
    }
    if (name === "saya\xE7") {
      if (arg === "\u015Fiirler" || arg === "\u015Fiir") return stats.poems.toLocaleString("tr-TR");
      if (arg === "ki\u015Filer" || arg === "ki\u015Fi") return stats.persons.toLocaleString("tr-TR");
      if (arg === "g\xFCnl\xFCk") return stats.journal.toLocaleString("tr-TR");
      if (arg === "towhom" || arg === "ithaf") return stats.towhom.toLocaleString("tr-TR");
      if (arg === "sistem") return stats.systemPages.toLocaleString("tr-TR");
      if (arg === "kelime") return stats.words.toLocaleString("tr-TR");
      if (arg === "karakter") return stats.characters.toLocaleString("tr-TR");
      if (arg === "ba\u011Flant\u0131" || arg === "link") return stats.links.toLocaleString("tr-TR");
      if (arg === "g\xF6\xE7" || arg === "k\xF6ken") return stats.migratedObjects.toLocaleString("tr-TR");
      if (arg === "farkl\u0131") return stats.changedFromFirstGeneration.toLocaleString("tr-TR");
    }
    if (name === "tarih") {
      return (/* @__PURE__ */ new Date()).toLocaleDateString("tr-TR");
    }
    if (name === "saat") {
      return (/* @__PURE__ */ new Date()).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    }
    return match;
  });
}
function executeBlockDirectives(content, context) {
  if (!content || !content.includes("{{#")) return content;
  const lines = content.split(/\r?\n/);
  const output = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const directive = parseDirective(line);
    if (!directive) {
      output.push(replaceInlineDirectives(line, context.stats));
      continue;
    }
    const { name, arg } = directive;
    if (name === "\xE7ocuklar" || name === "alt_sayfalar") {
      const parentPath = arg || context.pagePath;
      const children = context.allPages.filter((p) => p.parent === parentPath);
      if (children.length === 0) {
        output.push("*(Alt sayfa bulunamad\u0131)*");
      } else {
        children.forEach((c) => {
          output.push(`- [[${c.path}|${c.title}]]`);
        });
      }
      continue;
    }
    if (name === "son_de\u011Fi\u015Fiklikler") {
      const limit = parseInt(arg, 10) || 5;
      const sorted = [...context.allPages].filter((p) => p.path !== "ANA").sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()).slice(0, limit);
      if (sorted.length === 0) {
        output.push("*(Kay\u0131t yok)*");
      } else {
        sorted.forEach((p) => {
          output.push(`- [[${p.path}|${p.title}]] *(${new Date(p.modifiedAt).toLocaleDateString("tr-TR")})*`);
        });
      }
      continue;
    }
    output.push(replaceInlineDirectives(line, context.stats));
  }
  return output.join("\n");
}

// src/core.ts
var WikiEngine = class {
  rootDir;
  allowedExtensions;
  linkBase;
  pages = /* @__PURE__ */ new Map();
  constructor(options) {
    this.rootDir = (0, import_node_path.resolve)(options.rootDir);
    this.allowedExtensions = options.allowedExtensions || [".txt", ".md"];
    this.linkBase = options.linkBase || "wiki";
  }
  scan() {
    this.pages.clear();
    if (!(0, import_node_fs.existsSync)(this.rootDir)) {
      return this.pages;
    }
    const files = [];
    const walk = (dir) => {
      const entries = (0, import_node_fs.readdirSync)(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = (0, import_node_path.join)(dir, entry.name);
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
    const summaries = [];
    for (const filePath of files) {
      const relPath = (0, import_node_path.relative)(this.rootDir, filePath);
      const ext = relPath.slice(relPath.lastIndexOf("."));
      const pathWithoutExt = relPath.slice(0, -ext.length).replace(/\\/g, "/");
      const raw = (0, import_node_fs.readFileSync)(filePath, "utf-8");
      const stat = (0, import_node_fs.statSync)(filePath);
      const { metadata, body } = parseMetadataDocument(raw);
      const titleMeta = metadata.find((m) => m.key.toLowerCase() === "ba\u015Fl\u0131k" || m.key.toLowerCase() === "title");
      const title = titleMeta?.value || (0, import_node_path.basename)(pathWithoutExt);
      const pathParts = pathWithoutExt.split("/");
      const parent = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : null;
      const summary = {
        path: pathWithoutExt,
        title,
        parent,
        childCount: 0,
        modifiedAt: stat.mtime.toISOString(),
        excerpt: body.slice(0, 160).replace(/\s+/g, " ").trim(),
        metadata
      };
      summaries.push(summary);
      this.pages.set(pathWithoutExt, {
        ...summary,
        rawContent: raw,
        bodyContent: body,
        html: ""
      });
    }
    for (const summary of summaries) {
      if (summary.parent && this.pages.has(summary.parent)) {
        const parentPage = this.pages.get(summary.parent);
        parentPage.childCount++;
      }
    }
    const existingSlugs = new Set(Array.from(this.pages.keys()).map((k) => slugify(k)));
    for (const [key, page] of this.pages.entries()) {
      const processedBody = executeBlockDirectives(page.bodyContent, {
        pagePath: page.path,
        allPages: summaries,
        stats: null
      });
      const { html } = parseWikiContent(processedBody, {
        existingSlugs,
        linkBase: this.linkBase
      });
      page.html = html;
      this.pages.set(key, page);
    }
    return this.pages;
  }
  getPage(path) {
    return this.pages.get(path);
  }
  getAllPages() {
    return Array.from(this.pages.values());
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WikiEngine
});
