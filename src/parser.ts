import hljs from "highlight.js";
import type {
  ParseWikiOptions,
  ParsedWikiDocument,
  WikiHeading,
  WikiInfobox,
  WikiInfoboxField,
  WikiMetadataItem,
  WikiPageFrontmatter,
} from "./types";

export function parseMetadataDocument(content: string): { metadata: WikiMetadataItem[]; body: string } {
  const normalized = content.replace(/^\uFEFF/u, "");
  // 1. Başta yer alan @meta bloğu
  const leadingWs = normalized.match(/^\s*/u)?.[0] || "";
  const withoutLeading = normalized.slice(leadingWs.length);

  if (withoutLeading.startsWith("@meta\n") || withoutLeading.startsWith("@meta\r\n")) {
    const endMatch = withoutLeading.match(/\r?\n@end(?:\r?\n|$)/u);
    if (endMatch && endMatch.index !== undefined) {
      const headerEnd = leadingWs.length + endMatch.index + endMatch[0].length;
      const block = withoutLeading.slice(withoutLeading.indexOf("\n") + 1, endMatch.index);
      const metadata: WikiMetadataItem[] = block.split(/\r?\n/u).flatMap((line) => {
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

  // 2. Sonda yer alan @meta bloğu
  const endBlockMatch = normalized.match(/(?:\r?\n|^)@meta\r?\n([\s\S]*?)\r?\n@end\s*$/u);
  if (endBlockMatch && endBlockMatch.index !== undefined) {
    const block = endBlockMatch[1];
    const metadata: WikiMetadataItem[] = block.split(/\r?\n/u).flatMap((line) => {
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

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u00C0-\u017F-]/g, "")
    .replace(/\s+/g, "_");
}

export function extractFrontmatter(rawContent: string): { frontmatter: WikiPageFrontmatter; body: string } {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = rawContent.match(fmRegex);

  if (!match) {
    return {
      frontmatter: { id: "", title: "", type: "special" },
      body: rawContent.trim(),
    };
  }

  const yamlBlock = match[1];
  const body = match[2].trim();
  const frontmatter: Record<string, unknown> = {};

  yamlBlock.split(/\r?\n/).forEach((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const rawVal = line.slice(colonIdx + 1).trim();
      let parsedVal: unknown = rawVal;

      if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
        parsedVal = rawVal.slice(1, -1);
      } else if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
        try {
          parsedVal = JSON.parse(rawVal);
        } catch {
          parsedVal = rawVal
            .slice(1, -1)
            .split(",")
            .map((s: string) => s.trim().replace(/^['"]|['"]$/g, ""));
        }
      }
      frontmatter[key] = parsedVal;
    }
  });

  return { frontmatter, body };
}

export function parseWikiContent(
  rawContent: string,
  options: ParseWikiOptions = {}
): {
  html: string;
  headings: WikiHeading[];
  infobox: WikiInfobox | null;
} {
  const { existingSlugs = new Set(), linkBase = "wiki", highlightCode = true } = options;
  const headings: WikiHeading[] = [];
  let infobox: WikiInfobox | null = null;

  // 1. Düz metin / Frontmatter ayırma
  const { body } = extractFrontmatter(rawContent);
  const { body: cleanBody } = parseMetadataDocument(body);

  // 2. Kod bloklarını güvene alma
  const codeBlocks: string[] = [];
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

  // 3. Infobox tespiti
  const infoboxRegex = /:::\s*infobox\s*([\s\S]*?):::/;
  const infoboxMatch = processed.match(infoboxRegex);
  if (infoboxMatch) {
    const infoboxContent = infoboxMatch[1].trim();
    const lines = infoboxContent.split(/\r?\n/);
    let title = "";
    const fields: WikiInfoboxField[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("#")) {
        title = trimmed.replace(/^#+\s*/, "");
      } else {
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0) {
          fields.push({
            label: trimmed.slice(0, colonIdx).trim(),
            value: trimmed.slice(colonIdx + 1).trim(),
          });
        }
      }
    });

    infobox = { title, fields };
    processed = processed.replace(infoboxRegex, "");
  }

  // 4. Başlıklar & Çıkarımı
  processed = processed.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, text) => {
    const level = hashes.length;
    const cleanText = text.trim();
    const id = slugify(cleanText);
    headings.push({ level, text: cleanText, id });
    return `<h${level} id="${id}">${cleanText}</h${level}>`;
  });

  // 5. Tablolar (Markdown pipe tables)
  processed = processed.replace(
    /((?:^\|.+?\|(?:\r?\n|$))+)/gm,
    (tableMatch) => {
      const rows = tableMatch.trim().split(/\r?\n/);
      if (rows.length < 2) return tableMatch;

      let html = '<div class="wiki-table-wrapper"><table class="wiki-table">';
      let isHeader = true;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row.startsWith("|") || !row.endsWith("|")) continue;

        if (row.match(/^\|[\s:-|]+\|$/)) {
          isHeader = false;
          continue;
        }

        const cells = row
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());

        if (isHeader && i === 0) {
          html += "<thead><tr>";
          cells.forEach((c) => {
            html += `<th>${c}</th>`;
          });
          html += "</tr></thead><tbody>";
        } else {
          html += "<tr>";
          cells.forEach((c) => {
            html += `<td>${c}</td>`;
          });
          html += "</tr>";
        }
      }

      html += "</tbody></table></div>";
      return html;
    }
  );

  // 6. Wiki Bağlantıları: [[Hedef|Etiket]] veya [[Hedef]]
  // Mavi Link (var olan), Kırmızı Link (var olmayan), Sarı Link (aday/belirsiz)
  processed = processed.replace(/\[\[(.*?)\]\]/g, (_, inner) => {
    let target = inner.trim();
    let label = target;

    if (target.includes("|")) {
      const parts = target.split("|");
      target = parts[0].trim();
      label = parts[1].trim();
    }

    // Sarı Link (Candidate / Ambiguous Link): ? ile başlıyorsa veya sarı etiketli ise
    const isYellowCandidate = target.startsWith("?") || target.startsWith("candidate:");
    if (isYellowCandidate) {
      const cleanTarget = target.replace(/^[?]|candidate:/, "").trim();
      return `<span class="is-yellow-link" title="Belirsiz / Aday Bağlantı: ${cleanTarget}">[?] ${label}</span>`;
    }

    const slug = slugify(target);
    const exists = existingSlugs.size === 0 || existingSlugs.has(slug) || existingSlugs.has(target);

    // Kırmızı Link (Red Link — Sayfası henüz açılmamış)
    if (!exists) {
      return `<a href="/${linkBase}/${slug}?create=1" class="is-red-link" title="${target} (sayfa henüz mevcut değil)">${label}</a>`;
    }

    // Mavi Link (Blue Link — Doğrulanmış)
    return `<a href="/${linkBase}/${slug}" class="is-blue-link">${label}</a>`;
  });

  // 7. Standart Markdown Linkleri [Etiket](URL)
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 8. Kalın ve İtalik
  processed = processed.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  processed = processed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // 9. Satır İçi Kod
  processed = processed.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // 10. Listeler
  processed = processed.replace(/((?:^-\s+.+?(?:\r?\n|$))+)/gm, (listMatch) => {
    const items = listMatch.trim().split(/\r?\n/);
    const lis = items
      .map((item) => `<li>${item.replace(/^-\s+/, "").trim()}</li>`)
      .join("");
    return `<ul class="wiki-list">${lis}</ul>`;
  });

  // 11. Paragraflar
  const blocks = processed.split(/\r?\n\r?\n/);
  const finalBlocks = blocks.map((b) => {
    const trimmed = b.trim();
    if (
      trimmed.startsWith("<h") ||
      trimmed.startsWith("<ul") ||
      trimmed.startsWith("<ol") ||
      trimmed.startsWith("<pre") ||
      trimmed.startsWith("<table") ||
      trimmed.startsWith("<div") ||
      trimmed.startsWith("__CODE_BLOCK_")
    ) {
      return trimmed;
    }
    if (!trimmed) return "";
    return `<p>${trimmed.replace(/\r?\n/g, "<br />")}</p>`;
  });

  let html = finalBlocks.filter(Boolean).join("\n");

  // 12. Kod bloklarını geri yükleme
  codeBlocks.forEach((codeHtml, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, codeHtml);
    html = html.replace(`<p>__CODE_BLOCK_${idx}__</p>`, codeHtml);
  });

  return { html, headings, infobox };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
