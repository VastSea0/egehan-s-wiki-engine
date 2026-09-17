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
    if (name === "saat") {
      return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    }

    return match;
  });
}

export function executeBlockDirectives(content: string, context: ScriptContext): string {
  if (!content || !content.includes("{{#")) return content;

  const lines = content.split(/\r?\n/);
  const output: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const directive = parseDirective(line);

    if (!directive) {
      output.push(replaceInlineDirectives(line, context.stats));
      continue;
    }

    const { name, arg } = directive;

    if (name === "çocuklar" || name === "alt_sayfalar") {
      const parentPath = arg || context.pagePath;
      const children = context.allPages.filter((p) => p.parent === parentPath);
      if (children.length === 0) {
        output.push("*(Alt sayfa bulunamadı)*");
      } else {
        children.forEach((c) => {
          output.push(`- [[${c.path}|${c.title}]]`);
        });
      }
      continue;
    }

    if (name === "son_değişiklikler") {
      const limit = parseInt(arg, 10) || 5;
      const sorted = [...context.allPages]
        .filter((p) => p.path !== "ANA")
        .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
        .slice(0, limit);

      if (sorted.length === 0) {
        output.push("*(Kayıt yok)*");
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
