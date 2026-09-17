# Egehan's Wiki Engine — Manifestosu ve Felsefesi

## 1. Kod ve Düşünce Ayrılığı (Code vs. Thought)

> **"AI kod yazar, düşünce insana aittir."**

Bir web sitesinin, bir metin derlemesinin veya bir dijital ikizin üzerindeki kodun kim (veya hangi yapay zekâ) tarafından yazıldığı önemsizdir. Önemli olan tek şey: **Bu web sitesinin hangi düşünceyi yaşattığı ve bu düşüncenin kime ait olduğudur.**

- Kod bir araçtır, lensdir, mekanik bir aktarım motorudur.
- Düşünce ise insanın bizzat yaşantısından, hafızasından, hislerinden ve iradesinden doğar.

## 2. Yapay Zekânın Sınırları (AI Operational Boundaries)

Yapay zekâ kodlama, derleyici kurma, ayrıştırma (parsing), veri akışı ve optimizasyon konusunda serbesttir. Ancak **yazı, fikir ve içerik üretme konusunda katı sınırlarla sınırlandırılmıştır:**

1. **Özne İhlali Yasağı:** AI asla kendisini insanın yerine koyup kişisel anı, uydurma hikâye, yapay biyografi veya sahte düşünce üretemez.
2. **Kalıp Prensibi (Skeleton / Template Principle):** AI tarafından üretilen metin alanları her zaman oldukça minimal, neredeyse *lorem ipsum* sadeliğinde ve yalnızca bir insanın kendi düşüncesiyle doldurmasını bekleyen açık kalıplar (placeholder) olmak zorundadır.
3. **Abartı ve Sıfat Yasağı:** Yapay "ai-slop" sıfatları, kurumsal abartılar ve yapay pazarlama jargonu motorda ve içeriğinde barınamaz.

## 3. Her Şey Bir TXT Sayfasıdır (Plain-Text Primacy)

- Sistemin ana veri kaynağı **UTF-8 düz metindir (`.txt`)**.
- JSON, XML veya karmaşık veritabanı şemaları asıl gerçeklik değildir; asıl gerçeklik diskte yaşayan ve insan tarafından doğrudan okunabilen saf metin dosyalarıdır.
- Bütün sayfalar basit bir TXT formatı üzerinden parse edilir, işlenir ve derlenir.

## 4. Üç Renkli Bağlantı Sistemi (Three-Color Hyperlink Resolution)

Motor, insan düşüncesinin ağ yapısını üç renkli ontolojik bağlantılarla işler:

1. 🔵 **Mavi Link (Blue Link — Doğrulanmış):** Sistemde fiziksel olarak mevcut olan, yolu ve içeriği doğrulanmış sayfalara işaret eder.
2. 🔴 **Kırmızı Link (Red Link — Potansiyel):** Metin içinde kavramsal olarak var olan, ancak henüz bağımsız bir `.txt` sayfası açılmamış olan boşlukları gösterir (Wikipedia felsefesi).
3. 🟡 **Sarı Link (Yellow / Candidate Link — Aday/Belirsiz):** Birden fazla anlam, kişi veya sayfa adayına denk gelebilecek; henüz insan tarafından kesinleştirilmemiş belirsizlikleri temsil eder. Belirsizlik silinmez, korunur.

## 5. Metadata ve Betik Sistemi (Metadata & Directives)

- **Metadata Blokları:** Sayfanın başında veya sonunda `@meta ... @end` blokları ile tanımlanır.
- **Betik Direktifleri:** `{{#sayfa_sayısı}}`, `{{#tarih}}`, `{{#sayaç:şiirler}}` gibi sade `{{#...}}` komutları metin akışını dinamik olarak zenginleştirir.

## 6. Mahremiyet ve Evrensellik

- Aynı motor hem yerel/gizli kişisel veritabanını (`/wiki`) hem de kamuya açık vitrini (`public site`) yönetir.
- Kamuya açık sayfalar ve gizli kişisel arşivler mutlak bir güvenlik bariyeri (air-gap) ile ayrılır.
