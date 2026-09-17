// src/parser.ts
import hljs from "highlight.js";
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
      let val = line.slice(colonIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      } else if (val.startsWith("[") && val.endsWith("]")) {
        try {
          val = JSON.parse(val);
        } catch {
          val = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
        }
      }
      frontmatter[key] = val;
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
    if (highlightCode && lang && hljs.getLanguage(lang)) {
      try {
        highlighted = hljs.highlight(code.trimEnd(), { language: lang }).value;
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

export {
  parseMetadataDocument,
  slugify,
  extractFrontmatter,
  parseWikiContent
};
