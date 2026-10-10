# CATALOG_REPORT.md — Laporan Katalog Siar

> Status: **2026-10-11 ~09:00 WIB** · 363 entri terverifikasi · target 5.300

## 1. Ringkasan angka

| Metrik | Jumlah |
|---|---|
| Baseline awal (terverifikasi siklus 0–12) | 265 |
| Ditambahkan sesi 2026-10-11 (batch manual YouTube) | 98 |
| **Total terverifikasi saat ini** | **363** |
| Target | 5.300 |
| Capaian vs target | 6,8% |
| Ditolak (SKIP: cover/remix/episode/AI/judul kosong) | 22 |
| Duplikat discovery (sudah di katalog) | 18 |

## 2. Komposisi per kategori

| Kategori | Entri |
|---|---|
| Iklan Jadul | 165 |
| Opening Kartun | 105 |
| Jingle & Ident | 49 |
| Sinetron & Acara TV | 30 |
| Opening Tokusatsu | 14 |

## 3. Komposisi per stasiun

| Stasiun | Entri | Stasiun | Entri |
|---|---|---|---|
| Multi-Stasiun | 195 | ANTV | 9 |
| RCTI | 54 | MNCTV/TPI | 8 |
| Indosiar | 41 | TVRI | 7 |
| SCTV | 17 | Trans7 | 4 |
| Global TV | 16 | NET. | 3 |

Sisanya (RTV, B Channel, Trans TV, TPI): ≤3 entri per stasiun.

## 4. Komposisi per sumber

| Sumber | Entri |
|---|---|
| YouTube (`yt`) | 354 |
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
   judul oEmbed kosong.
4. **Cache** — `scripts/.cache/verify.json` (1.700+ kunci) agar re-run tidak
   mengulang request.

## 6. Limitasi yang diketahui

- **Dailymotion terblokir** sejak 2026-10-11 pagi (egress VM me-timeout ke
  `*.dailymotion.com`; YouTube oEmbed normal). 16.598 kandidat DM **tertunda** —
  perintah resume di `scripts/cand/RESUME_DM.md`.
- oEmbed hanya memvalidasi **keberadaan + judul**; isi video dinilai dari
  judul/deskripsi hasil search (risiko salah label kecil, dimitigasi review manusia).
- `review.py` pernah salah baca cache `verify.py` (`oembed_title` vs `title`) —
  sudah diperbaiki (siklus 40).
- Mapping indeks hasil search pernah bergeser (2 ID salah label) — tertangkap
  karena judul oEmbed dijadikan acuan, bukan judul discovery (siklus 35).

## 7. Gap tersisa & rekomendasi riset

- **Volume**: 363/5.300. Pipa terbesar (16,5rb kandidat DM) menunggu jaringan pulih;
  setelah itu butuh filter judul ketat + spot-review berstrata sebelum append.
- **Kategori tipis**: Opening Tokusatsu (14), Sinetron & Acara TV (30).
- **Stasiun tipis**: TVRI, Trans TV, NET., RTV, B Channel.
- **Sumber**: Vimeo & archive.org belum dieksplorasi sistematis
  (`discover.py --source ia` tersedia).
- Query lanjutan yang belum dijalankan: sinetron/PSA, tokusatsu lain
  (Daimos, Voltes V versi Indonesia), kartun (Perman, Let's & Go — hasil
  search sejauh ini hanya cover).
