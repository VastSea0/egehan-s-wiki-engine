import type { DatabaseStats, ScriptContext, WikiPageSummary } from "./types";

export function parseDirective(line: string): { name: string; arg: string } | null {
  const trimmed = line.trim();
  const match = trimmed.match(/^\{\{#([a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]+)(?::([^}]+))?\}\}$/u);
  if (!match) return null;
  return {
    name: match[1].toLowerCase(),
    arg: (match[2] || "").trim(),
  };
}

export function replaceInlineDirectives(text: string, stats: DatabaseStats | null): string {
  if (!text || !text.includes("{{#")) return text;

  return text.replace(/\{\{#([a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]+)(?::([^}]+))?\}\}/gu, (match, rawName, rawArg) => {
    const name = String(rawName).toLowerCase();
    const arg = String(rawArg || "").toLowerCase();

    if (!stats) return match;

    if (name === "sayfa_sayısı" || (name === "sayaç" && (arg === "toplam" || arg === "sayfa"))) {
      return stats.totalPages.toLocaleString("tr-TR");
    }
    if (name === "sayaç") {
      if (arg === "şiirler" || arg === "şiir") return stats.poems.toLocaleString("tr-TR");
      if (arg === "kişiler" || arg === "kişi") return stats.persons.toLocaleString("tr-TR");
      if (arg === "günlük") return stats.journal.toLocaleString("tr-TR");
      if (arg === "towhom" || arg === "ithaf") return stats.towhom.toLocaleString("tr-TR");
      if (arg === "sistem") return stats.systemPages.toLocaleString("tr-TR");
      if (arg === "kelime") return stats.words.toLocaleString("tr-TR");
      if (arg === "karakter") return stats.characters.toLocaleString("tr-TR");
      if (arg === "bağlantı" || arg === "link") return stats.links.toLocaleString("tr-TR");
      if (arg === "göç" || arg === "köken") return stats.migratedObjects.toLocaleString("tr-TR");
      if (arg === "farklı") return stats.changedFromFirstGeneration.toLocaleString("tr-TR");
    }

    if (name === "tarih") {
      return new Date().toLocaleDateString("tr-TR");
    }

    return match;
  });
}

export function executeBlockDirectives(content: string, context: ScriptContext): string {
  if (!content || !content.includes("{{#")) return content;

  return content.split(/\r?\n/).flatMap((line) => {
    const directive = parseDirective(line);
    if (!directive) return [replaceInlineDirectives(line, context.stats)];

    const { name, arg } = directive;
    if (name === "çocuklar" || name === "alt_sayfalar") {
      const children = context.allPages.filter((page) => page.parent === (arg || context.pagePath));
      return children.length ? children.map((page) => `- [[${page.path}|${page.title}]]`) : ["*(Alt sayfa bulunamadı)*"];
    }

    if (name === "son_değişiklikler") {
      const limit = Number.parseInt(arg, 10) || 5;
      const pages = [...context.allPages]
        .filter((page) => page.path !== "ANA")
        .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
        .slice(0, limit);
      return pages.length
        ? pages.map((page) => `- [[${page.path}|${page.title}]] *(${new Date(page.modifiedAt).toLocaleDateString("tr-TR")})*`)
        : ["*(Kayıt yok)*"];
    }

    return [replaceInlineDirectives(line, context.stats)];
  }).join("\n");
}

export function renderStatsTable(stats: DatabaseStats | null): string {
  if (!stats) return "*İstatistikler yükleniyor…*";

  return `| Metrik | Değer |
|:---|:---|
| Toplam TXT Sayfası | ${stats.totalPages.toLocaleString("tr-TR")} sayfa |
| Kişiler Koleksiyonu | ${stats.persons.toLocaleString("tr-TR")} çocuk sayfa |
| Günlük Koleksiyonu | ${stats.journal.toLocaleString("tr-TR")} çocuk sayfa |
| Şiirler Koleksiyonu | ${stats.poems.toLocaleString("tr-TR")} şiir |
| İthaf (Towhom) | ${stats.towhom.toLocaleString("tr-TR")} kayıt |
| Sistem Metinleri | ${stats.systemPages.toLocaleString("tr-TR")} ana sayfa |
| Toplam Sözcük | ${stats.words.toLocaleString("tr-TR")} kelime |
| Toplam Karakter | ${stats.characters.toLocaleString("tr-TR")} bayt/karakter |
| İç Vikibağlantı | ${stats.links.toLocaleString("tr-TR")} bağlantı |
| İlk Nesilden Farklı | ${stats.changedFromFirstGeneration.toLocaleString("tr-TR")} sayfa |
| Onaylı Göç Kaydı | ${stats.migratedObjects.toLocaleString("tr-TR")} nesne |`;
}

export function renderPagesTable(pages: WikiPageSummary[], prefix: string): string {
  const cleanPrefix = prefix.replace(/\/+$/, "");
  const filtered = cleanPrefix
    ? pages.filter((p) => p.path.startsWith(`${cleanPrefix}/`) || p.path === cleanPrefix)
    : pages;

  if (filtered.length === 0) {
    return `*${prefix} dizininde kayıtlı çocuk sayfa bulunamadı.*`;
  }

  const rows = filtered.map((p, idx) => {
    const num = String(idx + 1).padStart(3, "0");
    const link = `[[${p.path}]]`;
    const excerpt = (p.excerpt || "—").replace(/\|/g, "\\|").slice(0, 100);
    return `| ${num} | ${link} | ${p.childCount ? `${p.childCount} çocuk` : "TXT"} | ${excerpt} |`;
  });

  return `| No | Sayfa | Kapsam | Özet |
|:---|:---|:---|:---|
${rows.join("\n")}`;
}

export function renderMetadataTable(pages: WikiPageSummary[], filterKey?: string): string {
  const cleanFilter = filterKey ? filterKey.trim().toLowerCase() : "";
  const isTableDirective = cleanFilter === "" || cleanFilter === "tablo" || cleanFilter === "hepsi" || cleanFilter === "tümü";

  const fieldMap = new Map<string, Array<{ path: string; title: string; value: string }>>();

  pages.forEach((page) => {
    (page.metadata || []).forEach((item) => {
      if (!item || !item.key) return;
      const k = item.key.trim();
      const lowerK = k.toLowerCase();
      if (!isTableDirective && lowerK !== cleanFilter) return;

      if (!fieldMap.has(k)) {
        fieldMap.set(k, []);
      }
      fieldMap.get(k)!.push({
        path: page.path,
        title: page.title,
        value: item.value || "—",
      });
    });
  });

  if (fieldMap.size === 0) {
    return `*${cleanFilter ? `"${filterKey}" alanına sahip` : "Kayıtlı"} metadata bulunamadı.*`;
  }

  const sortedEntries = Array.from(fieldMap.entries()).sort((a, b) => b[1].length - a[1].length);

  const rows = sortedEntries.map(([key, occurrences], idx) => {
    const num = String(idx + 1).padStart(2, "0");
    const count = occurrences.length;
    const uniqueValues = Array.from(new Set(occurrences.map((o) => o.value)));
    const samples = uniqueValues.slice(0, 3).map((v) => v.replace(/\|/g, "\\|")).join("; ") + (uniqueValues.length > 3 ? "…" : "");
    const links = occurrences.slice(0, 3).map((o) => `[[${o.path}]]`).join(", ") + (occurrences.length > 3 ? "…" : "");
    return `| ${num} | **\`${key}\`** | ${count} | ${samples} | ${links} |`;
  });

  return `| No | Metadata Alanı | Adet | Örnek Değerler | Bulunduğu Sayfalar |
|:---|:---|:---|:---|:---|
${rows.join("\n")}`;
}

export function executeScript(scriptBody: string, context: ScriptContext): { output: string; error?: string } {
  try {
    const db = {
      stats: context.stats,
      pages: context.allPages,
      filter: (prefix: string) =>
        context.allPages.filter((p) => p.path.startsWith(prefix) || p.path.startsWith(`${prefix}/`)),
      count: (category: string) => {
        if (!context.stats) return 0;
        const s = context.stats as any;
        return s[category] || 0;
      },
      table: (headers: string[], rows: (string | number)[][]) => {
        const headerRow = `| ${headers.join(" | ")} |`;
        const sepRow = `| ${headers.map(() => ":---").join(" | ")} |`;
        const bodyRows = rows.map((r) => `| ${r.map((c) => String(c).replace(/\|/g, "\\|")).join(" | ")} |`).join("\n");
        return `${headerRow}\n${sepRow}\n${bodyRows}`;
      },
      statsTable: () => renderStatsTable(context.stats),
      pagesTable: (prefix: string) => renderPagesTable(context.allPages, prefix),
      metadataTable: (filterKey?: string) => renderMetadataTable(context.allPages, filterKey),
      metadataKeys: () => {
        const keys = new Set<string>();
        context.allPages.forEach((p) => (p.metadata || []).forEach((m) => keys.add(m.key)));
        return Array.from(keys);
      },
      metadata: (filterKey?: string) => {
        const items: Array<{ key: string; value: string; path: string; title: string }> = [];
        const lowerFilter = filterKey ? filterKey.toLowerCase() : null;
        context.allPages.forEach((p) => {
          (p.metadata || []).forEach((m) => {
            if (!lowerFilter || m.key.toLowerCase() === lowerFilter) {
              items.push({ key: m.key, value: m.value, path: p.path, title: p.title });
            }
          });
        });
        return items;
      },
    };

    const runner = new Function("db", "pagePath", "stats", "pages", scriptBody);
    const result = runner(db, context.pagePath, context.stats, context.allPages);

    if (result === undefined || result === null) {
      return { output: "" };
    }
    if (typeof result === "object") {
      return { output: JSON.stringify(result, null, 2) };
    }
    return { output: String(result) };
  } catch (err) {
    return {
      output: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface LinksDatabasePayload {
  red: Array<{ term: string; label?: string; sources: string[] }>;
  yellow: Array<{
    term: string;
    label?: string;
    candidates?: Array<{ path: string; title: string; type?: string }>;
    sources: string[];
  }>;
  blue: Array<{ target: string; label?: string; sources: string[] }>;
}

export function renderLinksMarkdown(data: LinksDatabasePayload): string {
  const redRows = (data.red || []).map((item, idx) => {
    const term = item.label || item.term;
    const sources = (item.sources || []).map((s) => `[[${s}]]`).join(", ");
    return `| ${idx + 1} | [[${term}]] | ${sources || "—"} |`;
  });

  const yellowRows = (data.yellow || []).map((item, idx) => {
    const term = item.label || item.term;
    const cands = (item.candidates || []).map((c) => `[[${c.path}|${c.title}]]`).join(", ");
    const sources = (item.sources || []).map((s) => `[[${s}]]`).join(", ");
    return `| ${idx + 1} | [[${term}]] | ${cands || "—"} | ${sources || "—"} |`;
  });

  const blueRows = (data.blue || []).map((item, idx) => {
    const target = item.target;
    const sources = (item.sources || []).map((s) => `[[${s}]]`).join(", ");
    return `| ${idx + 1} | [[${target}]] | ${sources || "—"} |`;
  });

  const sections: string[] = [];

  sections.push("# Kırmızı Bağlantılar\n");
  if (redRows.length > 0) {
    sections.push("| No | Bağlantı Hedefi | Geçtiği Sayfalar |\n|:---|:---|:---|\n" + redRows.join("\n"));
  } else {
    sections.push("*Kırmızı bağlantı bulunmuyor.*");
  }

  sections.push("\n# Sarı Bağlantılar\n");
  if (yellowRows.length > 0) {
    sections.push("| No | Kelime / Kök | Aday Kayıtlar | Geçtiği Sayfalar |\n|:---|:---|:---|:---|\n" + yellowRows.join("\n"));
  } else {
    sections.push("*Sarı bağlantı bulunmuyor.*");
  }

  sections.push("\n# Mavi Bağlantılar\n");
  if (blueRows.length > 0) {
    sections.push("| No | Hedef Sayfa | Bu Sayfaya Bağlanan Kaynaklar |\n|:---|:---|:---|\n" + blueRows.join("\n"));
  } else {
    sections.push("*Mavi bağlantı bulunmuyor.*");
  }

  return sections.join("\n");
}

export interface ArchiveMetadata {
  id: string;
  name: string;
  scope: string;
  period: string;
  description?: string;
  count: number;
  words?: number;
  characters?: number;
  tokens?: number;
}

export function renderExportMarkdown(archives: ArchiveMetadata[]): string {
  const rows = archives.map((arch, idx) => {
    const wordCount = arch.words !== undefined ? ` (${arch.words.toLocaleString("tr-TR")} kelime)` : "";
    const tokenCount = arch.tokens !== undefined ? `, ~${arch.tokens.toLocaleString("tr-TR")} token` : "";
    return `| ${idx + 1} | [[export/${arch.id}|${arch.name}]] | \`${arch.scope}\` | \`${arch.period}\` | ${arch.count} sayfa${wordCount}${tokenCount} | TXT, JSONL | [[export/${arch.id}|TXT Özeti]] | [Tek Dosya (.txt)](/api/wiki/export?id=${arch.id}&format=txt&download=1) · [JSONL](/api/wiki/export?id=${arch.id}&format=jsonl&download=1) |`;
  });

  return `# LLM Eğitim Arşivleri ve Dışa Aktarım Tablosu

| No | Arşiv Tanımı | Alan / Kapsam | Dönem | Kayıt Sayısı | Format | Özet Sayfası | İndir |
|:---|:---|:---|:---|:---|:---|:---|:---|
${rows.join("\n")}`;
}
