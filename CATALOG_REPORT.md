# CATALOG_REPORT.md — Laporan Katalog Siar

> Status: **2026-10-11 05:52 WIB** · **524 entri terverifikasi** · target 5.300
> (sesi lanjutan 05:27–12:00 WIB; 190 siklus tercatat)

## 1. Ringkasan angka

| Metrik | Jumlah |
|---|---|
| Baseline awal (terverifikasi siklus 0–12) | 265 |
| Ditambahkan sesi 2026-10-11 (semua jalur) | 259 |
| **Total terverifikasi saat ini** | **524** |
| Target | 5.300 |
| Capaian vs target | 9,9% |
| Ditolak sesi lanjutan (SKIP tier1/tier2/review manual) | 210+ |
| Duplikat discovery (sudah di katalog) | 253+ |

## 2. Komposisi per kategori

| Kategori | Entri |
|---|---|
| Iklan Jadul | 276 |
| Opening Kartun | 143 |
| Jingle & Ident | 58 |
| Sinetron & Acara TV | 32 |
| Opening Tokusatsu | 15 |

## 3. Komposisi per stasiun

| Stasiun | Entri | Stasiun | Entri |
|---|---|---|---|
| Multi-Stasiun | 316 | TPI | 5 |
| RCTI | 71 | Trans7 | 4 |
| Indosiar | 48 | NET. | 3 |
| SCTV | 21 | RTV | 3 |
| Global TV | 16 | Trans TV | 2 |
| TVRI | 10 | B Channel | 2 |
| MNCTV/TPI | 9 | Spacetoon | 2 |
| ANTV | 9 | TV7 | 1 |
| | | MNCTV | 1 |
| | | Metro TV | 1 |

## 4. Komposisi per sumber

| Sumber | Entri |
|---|---|
| YouTube (`yt`) | 475 |
| Dailymotion (`dm`) | 25 |
| Internet Archive (`ia`) | 23 |
| Vimeo (`vimeo`) | 1 |

## 5. Metode verifikasi

1. **Baseline 265** — sapu penuh: oEmbed resmi YouTube/Dailymotion/Vimeo + metadata
   archive.org untuk setiap ID; 265/265 OK, 0 FAIL.
2. **Discovery Dailymotion** (`scripts/discover.py`) — API publik tanpa key
   (`api.dailymotion.com/videos?search=`); dedupe vs katalog; 16.598 kandidat
   awal (iklan 4.085, ident 4.269, kartun 8.244).
3. **Batch manual YouTube** — web search → ekstrak ID dari URL hasil →
   oEmbed → **review manusia judul-per-judul** → `review.py append`
   (dedupe `src:id`). Aturan tolak: cover/remix/karaoke, episode full,
   remake AI, demo reel, MV modern, near-duplikat, bukan siaran Indonesia,
   judul oEmbed kosong.
4. **Sesi lanjutan 05:27+** — DM pulih → `tier1_skip.py` (169 junk SKIP) +
   `tier2_filter.py` (47 kandidat judul-jelas) → review manual → +16 DM.
   **Internet Archive** (`discover.py --source ia`, 3 batch, 84 kandidat) →
   verifikasi metadata IA → +23 IA (batch1; batch2/3 +0).
   Batch YT iklan rokok 90an → +5. Discovery DM batch2 (4 kueri) → +1.
5. **Cache** — `scripts/.cache/verify.json` (1.700+ kunci) agar re-run tidak
   mengulang request.

## 6. Limitasi yang diketahui

- **Dailymotion sempat terblokir** lalu **pulih 05:27 WIB** (probe HTTP 200).
  Dari 3.575 YA|OK DM: 169 tier1-SKIP, 47 tier2-review (+16 YA),
  sisanya ~3.360 belum direview judul-per-judul (kualitas sampel rendah:
  film, berita, konten asing).
- oEmbed hanya memvalidasi **keberadaan + judul**; isi video dinilai dari
  judul/deskripsi hasil search (risiko salah label kecil, dimitigasi review manusia).
- `review.py` pernah salah baca cache `verify.py` (`oembed_title` vs `title`) —
  sudah diperbaiki (siklus 40).
- Mapping indeks hasil search pernah bergeser (2 ID salah label) — tertangkap
  karena judul oEmbed dijadikan acuan, bukan judul discovery (siklus 35).
- Timestamp siklus 33–55, 99–109, dan 162–179 di `AUDIT_LOG.md` sempat salah
  (kegagalan konteks jam sistem); dikoreksi dan ditandai. Siklus 180+
  memakai `date` sistem terverifikasi per siklus.

## 7. Gap tersisa & rekomendasi riset

- **Volume**: 524/5.300 (9,9%). Sisa ~3.360 kandidat DM belum direview
  (yield rendah); IA menjanjikan untuk iklan (batch1: 22/63).
- **Kategori tipis**: Opening Tokusatsu (15), Sinetron & Acara TV (32),
  Jingle & Ident (58).
- **Stasiun tipis**: Trans TV, B Channel, Spacetoon, RTV, NET., TV7, MNCTV,
  Metro TV (masing-masing ≤2 entri).
- **Sumber**: Vimeo belum dieksplorasi sistematis.
- Kueri yang 100% jenuh (tidak menghasilkan entri baru): pasta gigi,
  sabun/sampo, dragon ball, sailor moon, doraemon, tsubasa, atashinchi,
  mojacko, maruko, shinchan, ranma, yugioh, conan, shaman king, kr black,
  akazukin chacha, little women, makibao, wedding peach, ultraman covers.
- Rekomendasi riset lanjutan: sinetron/PSA, tokusatsu (Daimos, Voltes V),
  ident stasiun daerah (TV lokal), bumper sponsor program.
