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

export {
  parseDirective,
  replaceInlineDirectives,
  executeBlockDirectives
};
