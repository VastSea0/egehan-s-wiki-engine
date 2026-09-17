import { describe, expect, it } from "vitest";
import {
  parseMetadataDocument,
  parseWikiContent,
  replaceInlineDirectives,
  executeBlockDirectives,
} from "../src/index";

describe("egehan-s-wiki-engine", () => {
  it("should parse @meta block correctly", () => {
    const raw = `@meta
başlık = Test Sayfası
tür = doküman
@end

Sayfa içeriği burada.`;

    const { metadata, body } = parseMetadataDocument(raw);
    expect(metadata).toEqual([
      { key: "başlık", value: "Test Sayfası" },
      { key: "tür", value: "doküman" },
    ]);
    expect(body.trim()).toBe("Sayfa içeriği burada.");
  });

  it("should distinguish blue links from red links", () => {
    const raw = "Bağlantılar: [[Var Olan|Açık]] ve [[Yok Olan|Kapalı]]";
    const existing = new Set(["var_olan"]);

    const { html } = parseWikiContent(raw, {
      existingSlugs: existing,
      linkBase: "wiki",
    });

    expect(html).toContain('class="is-blue-link"');
    expect(html).toContain('href="/wiki/var_olan"');
    expect(html).toContain('class="is-red-link"');
    expect(html).toContain('href="/wiki/yok_olan?create=1"');
  });

  it("should render yellow candidate links for ambiguous concepts", () => {
    const raw = "Şüpheli durum: [[?Belirsiz Şahıs|Şahıs]]";

    const { html } = parseWikiContent(raw);
    expect(html).toContain('class="is-yellow-link"');
    expect(html).toContain("[?] Şahıs");
  });

  it("should replace script directives like {{#sayfa_sayısı}}", () => {
    const raw = "Sistemde {{#sayfa_sayısı}} sayfa ve {{#sayaç:şiirler}} şiir var.";
    const stats = {
      totalPages: 100,
      persons: 20,
      journal: 30,
      poems: 45,
      towhom: 5,
      systemPages: 5,
      words: 10000,
      characters: 60000,
      links: 350,
      changedFromFirstGeneration: 0,
      migratedObjects: 0,
    };

    const result = replaceInlineDirectives(raw, stats);
    expect(result).toContain("100");
    expect(result).toContain("45");
  });

  it("should render markdown tables properly", () => {
    const raw = `
| İsim | Değer |
| --- | --- |
| Hilal | Tarayıcı |
| Hüma | Sanal Makine |
`;

    const { html } = parseWikiContent(raw);
    expect(html).toContain('<table class="wiki-table">');
    expect(html).toContain("<th>İsim</th>");
    expect(html).toContain("<td>Hilal</td>");
  });
});
