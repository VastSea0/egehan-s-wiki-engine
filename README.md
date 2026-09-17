# egehan-s-wiki-engine

> **"AI kod yazar, düşünce insana aittir."**
> Düz metin (`.txt`) merkezli, üç renkli bağlantı çözümlemeli (mavi/kırmızı/sarı), metadata ve betik direktifli açık kaynak wiki motoru.

`egehan-s-wiki-engine`, hem kişisel gizli dijital ikiz arşivlerini hem de kamuya açık web sitelerini tamamen saf UTF-8 `.txt` dosyaları üzerinden derleyen ve sunan hafif, sıfır-şişkinlik (zero-bloat) bir içerik ve wiki motorudur.

---

## Özellikler

- **Saf TXT Sayfaları:** Tüm içerik `.txt` dosyalarından okunur. Ekstra veritabanı sürücüsü veya karmaşık şema gerektirmez.
- **Üç Renkli Bağlantı Çözümleme:**
  - 🔵 **Mavi Link:** Sistemde var olan sayfalara bağlanan doğrulanmış bağlantılar.
  - 🔴 **Kırmızı Link:** Henüz sayfası açılmamış kavramlara işaret eden Wikipedia tarzı bağlantılar.
  - 🟡 **Sarı Link:** Çoklu aday veya belirsizlik barındıran sayfalar için aday bağlantılar.
- **Metadata Sistemi:** `@meta ... @end` blokları ile sayfaya anahtar-değer ve bayrak özellikleri atama.
- **Betik & Direktif Sistemi:** `{{#sayfa_sayısı}}`, `{{#tarih}}`, `{{#sayaç:...}}` direktifleri ile dinamik metin hesaplamaları.
- **Wiki & Markdown Desteği:** Başlıklar, infobox tabloları, kod renklendirme (Highlight.js), listeler ve alıntılar.
- **Çift Katmanlı Kullanım:** Hem yerel gizli `/wiki` sayfalarını hem de kamuya açık portfolyo/doküman web sitelerini tek bir motordan çalıştırma yeteneği.

---

## Kurulum ve Kullanım

```bash
npm install egehan-s-wiki-engine
```

### Örnek Kullanım

```typescript
import { parseWikiContent, parseMetadataDocument, replaceInlineDirectives } from "egehan-s-wiki-engine";

// 1. Düz metinden metadata ve gövdeyi ayrıştır
const txtContent = `
@meta
başlık = Örnek Sayfa
yazar = Egehan
tarih = 2026-09-18
@end

# Örnek Sayfa
Bu metin [[Var Olan Sayfa]] mavi linki ve [[Henüz Olmayan Sayfa]] kırmızı linkini içerir.
Toplam sayfa sayısı: {{#sayfa_sayısı}}
`;

const { metadata, body } = parseMetadataDocument(txtContent);

// 2. Betik direktiflerini çalıştır
const processedBody = replaceInlineDirectives(body, {
  totalPages: 120,
  poems: 40,
  persons: 25,
  journal: 30,
  towhom: 15,
  systemPages: 10,
  words: 24000,
  characters: 150000,
  links: 450,
  changedFromFirstGeneration: 0,
  migratedObjects: 0
});

// 3. HTML çıktısını al
const html = parseWikiContent(processedBody, {
  existingSlugs: new Set(["var_olan_sayfa"]),
  linkBase: "wiki"
});
```

---

## Felsefe

Detaylı düşünce manifestosu için [PHILOSOPHY.md](./PHILOSOPHY.md) belgesini inceleyiniz.

---

## Lisans

MIT © [Egehan Kahraman](https://github.com/VastSea0)
