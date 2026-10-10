# CATALOG_REPORT.md — Laporan Katalog Siar

> Status: **2026-10-11 12:05 WIB** · **480 entri terverifikasi** · target 5.300
> (final sesi audit otonom 2026-10-11; 178 siklus tercatat)

## 1. Ringkasan angka

| Metrik | Jumlah |
|---|---|
| Baseline awal (terverifikasi siklus 0–12) | 265 |
| Ditambahkan sesi 2026-10-11 (batch manual YouTube + hasil review DM) | 215 |
| **Total terverifikasi saat ini** | **480** |
| Target | 5.300 |
| Capaian vs target | 9,1% |
| Ditolak (SKIP: cover/remix/episode/AI/judul kosong/bukan siaran ID) | 38 |
| Duplikat discovery (sudah di katalog) | 249 |

## 2. Komposisi per kategori

| Kategori | Entri |
|---|---|
| Iklan Jadul | 245 |
| Opening Kartun | 141 |
| Jingle & Ident | 50 |
| Sinetron & Acara TV | 30 |
| Opening Tokusatsu | 14 |

## 3. Komposisi per stasiun

| Stasiun | Entri | Stasiun | Entri |
|---|---|---|---|
| Multi-Stasiun | 286 | Trans7 | 4 |
| RCTI | 62 | TPI | 4 |
| Indosiar | 47 | NET. | 3 |
| SCTV | 18 | RTV | 3 |
| Global TV | 16 | Trans TV | 2 |
| MNCTV/TPI | 9 | B Channel | 2 |
| ANTV | 9 | Spacetoon | 2 |
| TVRI | 9 | TV7 | 1 |

MNCTV: 1.

## 4. Komposisi per sumber

| Sumber | Entri |
|---|---|
| YouTube (`yt`) | 471 |
| Dailymotion (`dm`) | 8 |
| Vimeo (`vimeo`) | 1 |

## 5. Metode verifikasi

1. **Baseline 265** — sapu penuh: oEmbed resmi YouTube/Dailymotion/Vimeo + metadata
   archive.org untuk setiap ID; 265/265 OK, 0 FAIL.
2. **Discovery Dailymotion** (`scripts/discover.py`) — API publik tanpa key
   (`api.dailymotion.com/videos?search=`) + Internet Archive advancedsearch;
   dedupe vs katalog; 16.598 kandidat (iklan 4.085, ident 4.269, kartun 8.244).
3. **Batch manual YouTube** — web search → ekstrak ID dari URL hasil →
   oEmbed → **review manusia judul-per-judul** → `review.py append`
   (dedupe `src:id`). Aturan tolak: cover/remix/karaoke, episode full,
   remake AI, demo reel, MV modern, near-duplikat, bukan siaran Indonesia,
   judul oEmbed kosong. 213 entri baru ditambahkan lewat jalur ini (beserta
   hasil review DM yang ter-append sebelum gangguan jaringan).
4. **Cache** — `scripts/.cache/verify.json` (1.700+ kunci) agar re-run tidak
   mengulang request.

## 6. Limitasi yang diketahui

- **Dailymotion terblokir** sejak 2026-10-11 pagi (egress VM me-timeout ke
  `*.dailymotion.com`; YouTube oEmbed normal). 16.598 kandidat DM **tertunda** —
  perintah resume di `scripts/cand/RESUME_DM.md`. Hasil parsial review DM
  tersimpan di `scripts/cand/rev-iklan-dm.tsv` (1.519 baris),
  `rev-ident-dm.tsv` (1.555), `rev-kartun-dm.tsv` (840) — belum di-review
  judul-per-judul secara penuh.
- oEmbed hanya memvalidasi **keberadaan + judul**; isi video dinilai dari
  judul/deskripsi hasil search (risiko salah label kecil, dimitigasi review manusia).
- `review.py` pernah salah baca cache `verify.py` (`oembed_title` vs `title`) —
  sudah diperbaiki (siklus 40).
- Mapping indeks hasil search pernah bergeser (2 ID salah label) — tertangkap
  karena judul oEmbed dijadikan acuan, bukan judul discovery (siklus 35).
- Timestamp siklus 33–55 dan 99–109 di `AUDIT_LOG.md` sempat salah ±5–6,5 jam
  (kegagalan konteks jam sistem); semua sudah dikoreksi dan ditandai.
  Siklus 110+ memakai jam terverifikasi.

## 7. Gap tersisa & rekomendasi riset

- **Volume**: 480/5.300 (9,1%). Pipa terbesar (16,5rb kandidat DM) menunggu
  jaringan pulih; setelah itu butuh filter judul ketat + spot-review berstrata
  sebelum append.
- **Kategori tipis**: Opening Tokusatsu (14), Sinetron & Acara TV (30),
  Jingle & Ident (50).
- **Stasiun tipis**: Trans TV, B Channel, Spacetoon, RTV, NET., TV7, MNCTV
  (masing-masing ≤3 entri).
- **Sumber**: Vimeo & archive.org belum dieksplorasi sistematis
  (`discover.py --source ia` tersedia).
- Kueri yang 100% jenuh (tidak menghasilkan entri baru): pasta gigi,
  sabun/sampo, dragon ball, sailor moon, doraemon, tsubasa, atashinchi,
  mojacko, maruko, shinchan, ranma, yugioh, conan, shaman king, kr black,
  akazukin chacha, little women, makibao, wedding peach.
- Rekomendasi riset lanjutan: sinetron/PSA, tokusatsu lain (Daimos,
  Voltes V versi Indonesia), iklan rokok era 90-an, ident stasiun daerah
  (TV lokal), bumper sponsor program.
