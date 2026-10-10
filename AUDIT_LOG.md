# AUDIT_LOG — Siar Autonomous Deep Refactor

Sesi dimulai: 2026-10-11 02:46 WIB. Stop condition: ≥50 siklus DAN ≥ 11 Okt 2026 12:00 WIB.
Repo lokal: `~/workspace/repos/siar` (tidak push tanpa izin eksplisit).
Baseline katalog: **265 entri unik** (terverifikasi dari `assets/js/channels.js`) → target **5.300**.

## Skor kualitas baseline (1–10, internal, evidence-based)

| Dimensi | Skor | Bukti |
|---|---|---|
| 1. Realisme fisik TV | 5 | 10 chassis ada; plastik masih gradien flat; kurang seam/skrup/grain molded |
| 2. Material & detail halus | 5 | Grille titik ada; sekrup, vent, label engraved belum ada |
| 3. Lingkungan imersif | 5 | Scene CSS ada (jam, lampu, lemari, lantai) tapi berisiko "tumpukan gradien" |
| 4. Remote | 6 | Fisik cukup baik: IR flash, klik, perspektif; tombol masih tile seragam |
| 5. Panel pengaturan | 6 | Berfungsi + preview mini; hierarki OK, belum premium |
| 6. Hierarki visual & tipografi | 6 | Monospace konsisten; OSD bagus |
| 7. Kohesi art direction | 6 | Gelap moody konsisten |
| 8. Feedback interaksi | 7 | OSD, CRT on/off, static, IR flash — semua teruji jalan |
| 9. Responsif & aksesibilitas | 5 | Media query ada; belum uji device nyata; scroll dikunci (disengaja) |
| 10. Performa & stabilitas | 6 | Static canvas 140ms; tidak ada leak teramati |
| **Rata-rata** | **5.7** | Target ≥ 8.5 |

## Backlog prioritas (awal)

- P1: Perkuat realisme chassis: panel seam, skrup, ventilasi, grain plastik molded, tombol fisik TV dengan well & down-state
- P1: Remote: variasi bentuk tombol per fungsi (power bulat besar, numpad oval, rocker), material rubber vs shell
- P1: Imersif: kedalaman layer dinding/lantai/lemari, cahaya layar dinamis (ambil warna dominan video tidak mungkin tanpa akses pixel cross-origin — gunakan pendekatan glow terarah), vignette restrained
- P2: Settings UX: grouping lebih jelas, reset dengan konfirmasi
- P2: Katalog: pipeline verifikasi + discovery agresif (oEmbed) — batch per kategori/stasiun
- P2: Guide: virtualisasi bila katalog >1000 (performa), thumbnail fallback
- P3: A11y: focus-visible, aria-live OSD, reduced-motion
- P3: README/CATALOG_REPORT update di akhir

---

## Siklus 0 — 2026-10-11 02:52 WIB — Audit baseline & infrastruktur uji

- **Area:** Seluruh repo (index.html 374, style.css 1103, app.js 1269, channels.js 292, settings.js 198).
- **Masalah:** Tidak ada harness uji klik yang bisa diulang; baseline kualitas belum diukur; katalog 265 belum disapu ulang.
- **Severity:** Tinggi (fondasi kerja).
- **Implementasi:** Server statik `python3 -m http.server 8777`; `test/baseline-smoke.js` (jsdom, klik sungguhan: power, remote, numpad, settings cards, VHS toggle, range, imersif, ESC, keyboard, guide search, reset).
- **Test:** `node test/baseline-smoke.js` → **18/18 PASS**.
- **Before/after:** 0 → harness uji klik repeatable tersedia.
- **Next:** Pipeline verifikasi katalog (Siklus 1).

**Total siklus tercatat: 0**

---

## Siklus 1 — 2026-10-11 02:58 WIB — Pipeline verifikasi katalog (oEmbed resmi)

- **Area:** `scripts/verify.py` (baru; dev-only, bukan dependensi produksi).
- **Masalah:** Klaim "265 terverifikasi" di README belum bisa disapu ulang secara repeatable; tidak ada pipeline untuk memverifikasi tambahan katalog.
- **Severity:** Tinggi (fondasi target 5.300).
- **Implementasi:** `scripts/verify.py` — parsing `channels.js` via node (parser JS asli), cek tiap entri ke oEmbed resmi (YouTube/Dailymotion/Vimeo) & metadata archive.org, cache JSON di `scripts/.cache/`, rate-limit 0.6s, heuristik judul mencurigakan (lirik/cover/episode → REVIEW). Parser regex awal gagal (kontrol karakter di judul) → diganti ekstraksi via node.
- **Test:** `--limit 12` → 12/12 OK; sapu penuh 265 dijalankan background (`/tmp/siar-verify-baseline.log`).
- **Before/after:** 0 → pipeline verifikasi repeatable tersedia.
- **Next:** Hasil sapu penuh → CATALOG_REPORT.md.

## Siklus 2 — 2026-10-11 03:02 WIB — Detail konstruksi chassis TV

- **Area:** `assets/css/style.css`, `index.html` (realisme fisik TV).
- **Masalah & bukti:** (1) `.tv-body` memakai grid `repeating-linear-gradient` 2px sebagai grain — pola yang dilarang direktif. (2) Tidak ada seam antara shell luar & bezel layar. (3) Tidak ada skrup/ventilasi panel. (4) Tidak ada LED power.
- **Severity:** Tinggi (TV = centerpiece; dimensi 1–2 skor 5).
- **Implementasi:**
  - Grain diganti noise SVG `feTurbulence` via `.tv-body::before` (opacity .055, blend overlay).
  - `.tv-body::after`: seam inset 1px + 4 skrup sudut.
  - `.screen`: ring `0 0 0 10px rgba(0,0,0,.55)` sebagai seam gasket bezel.
  - `.tv-side::before`: slot ventilasi horizontal — hanya bentuk berspeaker samping.
  - LED power `#pwrLed`: merah standby → hijau saat `.tv.on` (CSS murni).
  - `.statusbar` menjadi dek kontrol cekung (inset shadow) tempat tombol fisik menempel.
- **Test:** `node test/baseline-smoke.js` → **18/18 PASS**.
- **Before/after:** Dimensi 1: 5→6, Dimensi 2: 5→6 (verifikasi visual via screenshot menyusul).
- **Next:** Screenshot QA visual.

## Siklus 3 — 2026-10-11 03:14 WIB — Kedalaman ruang imersif

- **Area:** `assets/css/style.css`, `index.html` (mode imersif).
- **Masalah & bukti:** Screenshot `shots/base/1920x1080-immersive.png`: lemari seperti balok melayang (tanpa kaki/gagang/serat); tanpa garis temu dinding-lantai; kaki lampu melayang; dinding kosong.
- **Severity:** Tinggi (dimensi 3 skor 5).
- **Implementasi:** Lemari (gagang kuningan, belahan pintu, serat kayu, kaki + bayangan kontak — satu `::after` multi-background, tetap dalam alur layout); list plin di temu dinding-lantai; bayangan kontak kaki lampu; satu bingkai foto redup di dinding.
- **Test:** `node test/shoot.js imm2` → 20 screenshot OK, tanpa pageerror; smoke 18/18 PASS. Review `shots/imm2/1920x1080-immersive.png`: lemari terbaca furnitur, lampu menapak, ada horizon.
- **Before/after:** Dimensi 3: 5→7.
- **Next:** Siklus 4 — remote: variasi bentuk tombol per fungsi.

**Total siklus tercatat: 3**

---

## Siklus 4 — 2026-10-11 03:28 WIB — Remote: material & bentuk tombol per fungsi

- **Area:** `assets/css/style.css`, `index.html` (remote control).
- **Masalah & bukti:** Screenshot `shots/base/1920x1080-remote.png`: semua tombol = tile persegi seragam — melanggar direktif ("Avoid making every button a flat rectangular tile").
- **Severity:** Sedang-tinggi (dimensi 4).
- **Implementasi:**
  - Material baru `.rbtn.rubber`: matte oval, shadow empuk — untuk 10 digit numpad, FAV, PANDUAN, MUTE, ACAK, BLOK, BLOK JAM (16 tombol di HTML).
  - Rocker CH/VOL jadi jungkat-jungkit: tombol atas cembung ke atas, bawah cembung ke bawah, garis poros di tengah.
  - Kode warna fungsi: MUTE merah lembut, BLOK aksen; BLOK JAM pil penuh.
- **Test:** `node test/remote-click.js` (Chromium headless, klik SUNGGUHAN tiap tombol) → **18/18 PASS**, tanpa pageerror. Screenshot `shots/tmp-remote2.png`: numpad oval karet, rocker melengkung, pil fungsi berkode warna — terbaca sebagai hardware.
- **Before/after:** Dimensi 4: 6→7.5.
- **Next:** Regression pass 5-siklus.

## Siklus 5 — 2026-10-11 03:31 WIB — Regression pass (siklus 1–4)

- **Area:** Seluruh fungsi tersentuh siklus 1–4.
- **Test yang dijalankan:**
  - `node test/baseline-smoke.js` → 18/18 PASS (jsdom).
  - `node test/remote-click.js` → 18/18 PASS (Chromium headless).
  - `node test/shoot.js` → 20 screenshot/4 viewport tanpa pageerror.
  - `git status` bersih setelah commit; tidak ada file tak terlacak selain `shots/`, `test/`, `scripts/` (disengaja).
- **Hasil:** Tidak ada regresi. Satu temuan visual kecil (bingkai dinding tertutup TV) sudah diperbaiki di Siklus 3.
- **Next:** Pipeline discovery katalog (Dailymotion API + archive.org + web search → verify → tambah).

**Total siklus tercatat: 5**

---

## Siklus 6 — 2026-10-11 03:36 WIB — Pipeline discovery kandidat (API publik tanpa key)

- **Area:** `scripts/discover.py` + `scripts/queries-iklan.txt` (baru; dev-only).
- **Masalah:** Tidak ada cara reproducible menambah ratusan kandidat terverifikasi; target 5.300 butuh mesin discovery.
- **Severity:** Tinggi (fondasi target katalog).
- **Implementasi:** `scripts/discover.py` — sumber Dailymotion API publik & archive.org advancedsearch (keduanya tanpa API key), dedupe terhadap katalog existing + antar-kandidat, keluaran JSONL per batch. Query file iklan: 129 query fokus TVC Indonesia 90–2000an (disaring dari 600+ draf awal yang terlalu melebar).
- **Test:** Dijalankan background `--source dm --limit 60` → `/tmp/siar-disc-iklan.log`; uji logika dedupe via dry-run query kecil OK.
- **Before/after:** 0 → mesin discovery batch tersedia.
- **Next:** Verifikasi kandidat → review → append ke channels.js.

---

## Siklus 7 — 2026-10-11 03:42 WIB — Panel pengaturan: konfirmasi reset & sticky header

- **Area:** `assets/js/app.js`, `assets/css/style.css` (settings UX).
- **Masalah & bukti:** Review `shots/base/1920x1080-settings.png`: (1) RESET SEMUA PENGATURAN langsung menghapus tanpa konfirmasi — direktif mewajibkan konfirmasi untuk aksi destruktif; (2) header sheet (judul + CLOSE) ikut ter-scroll hilang di panel panjang.
- **Severity:** Sedang (dimensi 5).
- **Implementasi:**
  - `resetBtn` → `window.confirm(...)` dengan pesan jelas sebelum `PNStore.resetAll()`.
  - `.sheet > .sheet-head` menjadi sticky (scope khusus sheet; modal bantuan tidak ikut).
  - Harness jsdom: stub `window.confirm = () => true` agar uji reset tetap jalan.
- **Test:** `node test/baseline-smoke.js` → **18/18 PASS** (termasuk reset).
- **Before/after:** Dimensi 5: 6→6.5 (panel sudah solid; ini polish).
- **Next:** Verifikasi batch discovery iklan (Dailymotion) → review → append.

**Total siklus tercatat: 7**

---

## Siklus 8 — 2026-10-11 03:58 WIB — Bug: tombol G mengetik "g" ke kolom cari panduan

- **Area:** `assets/js/app.js` (keyboard handler).
- **Masalah & bukti:** Screenshot `shots/base/390x844-guide.png`: kolom cari panduan terisi "g" — keydown `g` membuka panduan + memfokus input, lalu karakter "g" dari keypress ikut terketik. Setiap buka panduan via keyboard selalu diawali filter "g". Ditemukan saat review mobile.
- **Severity:** Tinggi (bug perilaku nyata, bukan kosmetik).
- **Implementasi:** `e.preventDefault()` untuk semua shortcut keyboard yang tertangani (m/r/j/p/f/g/s/h + digit) — mencegah karakter bocor ke input yang baru difokuskan.
- **Test:** Chromium headless: tekan G → `guideSearch.value === ""` → **OK (tidak bocor)**. Smoke jsdom 18/18 PASS.
- **Before/after:** Bug nyata terperbaiki; tidak ada regresi shortcut.
- **Catatan uji:** Thumbnail panduan 0/12 di screenshot headless — BUKAN bug aplikasi: Chromium sandbox gagal `ERR_TUNNEL_CONNECTION_FAILED` ke host eksternal; curl dari shell 200 OK. `test/shoot.js` kini meneruskan proxy egress via env agar screenshot jujur.
- **Next:** Verifikasi hasil discovery iklan DM.

**Total siklus tercatat: 8**

---

## Siklus 9 — 2026-10-11 04:05 WIB — Statusbar mobile: tombol favorit tidak lagi terlempar

- **Area:** `assets/css/style.css` (media query ≤720px).
- **Masalah & bukti:** Screenshot `shots/base/390x844-tv.png`: tombol favorit (☆) wrap sendirian ke baris 2 di bawah tombol power — terlihat yatim.
- **Severity:** Sedang (dimensi 9).
- **Implementasi:** Di ≤720px: power + CH display + fav-mini sebaris (fav `margin-left:auto`), meteran sinyal `flex:1 1 100%` full-width di baris bawah.
- **Test:** `node test/quickshot.js 390 844 mob9 tv` → screenshot `shots/tmp-mob9.png`: power+CH+fav sebaris kanan, meter sinyal penuh di bawah — rapi. Tanpa pageerror.
- **Before/after:** Dimensi 9: 5→5.5.
- **Catatan:** Uji screenshot via proxy terlalu lambat di sandbox (2 job di-kill); QA visual memakai jalur tanpa-proxy (localhost saja) + verifikasi jaringan eksternal via curl/oEmbed terpisah.
- **Next:** Review batch discovery iklan DM.

**Total siklus tercatat: 9**

---

## Siklus 10 — 2026-10-11 04:12 WIB — Verifikasi 4.085 kandidat iklan (oEmbed)

- **Area:** `scripts/review.py verify` (pipeline review kandidat).
- **Masalah:** 4.085 kandidat DM butuh verifikasi eksistensi resmi sebelum direview manusia.
- **Severity:** Tinggi (langkah wajib menuju target 5.300).
- **Implementasi:** `review.py verify` membaca JSONL kandidat → oEmbed DM per id (cache, 0.5s delay) → TSV review dengan kolom putusan/status/judul. Dijalankan background (`/tmp/siar-rev-iklan.log`).
- **Test:** Sampel 16 kandidat dibaca manual — kualitas campuran (banyak kompilasi "iklan jadul", sebagian sampah: review HP, film, parodi) → keputusan: filter judul ketat + spot-review berstrata, bukan bulk-accept buta.
- **Before/after:** 0 → 4.085 kandidat masuk antrean verifikasi resmi.
- **Next:** Hasil verify → filter + review → append.

---

## Siklus 11 — 2026-10-11 04:22 WIB — Distinctiveness chassis: Trinitron vs Toshiba vs Polytron

- **Area:** `assets/css/style.css` (siluet per bentuk).
- **Masalah & bukti:** Screenshot per-bentuk: Trinitron vs Toshiba nyaris identik (bedanya cuma radius) — melanggar "differences must involve more than changing border-radius".
- **Severity:** Tinggi (dimensi 1; direktif 5.2).
- **Implementasi:**
  - Trinitron: layar silinder tegas (44px/14px), kolom speaker ramping 148px, ventilasi bilah VERTIKAL, kaki jangkung 28px.
  - Toshiba: bodi & layar gelembung (34px/36px·30px, padding 28px), speaker lebar 196px berpori kasar (9px), kaki pil pendek.
  - Polytron: speaker ganda LEBAR 150px berpori besar, bodi tebal (padding 24px) — beda jelas dari Flatron yang ramping silver.
- **Test:** `node test/shapes.js` → 10 screenshot, tanpa pageerror; smoke 18/18 PASS. Review visual: keempatnya kini bersiluet beda.
- **Before/after:** Dimensi 1: 6→7.
- **Next:** Cek progres verifikasi kandidat iklan.

**Total siklus tercatat: 11**

---

## Siklus 12 — 2026-10-11 04:38 WIB — Panduan chunked + delegasi event (siap ribuan entri)

- **Area:** `assets/js/app.js`, `assets/css/style.css` (panduan siaran).
- **Masalah & bukti:** `buildGuide()` me-render SEMUA baris sekaligus + bind 3×N listener — di 5.300 entri akan berat (N binding, N gambar). Belum ada virtualisasi.
- **Severity:** Tinggi (prasyarat target katalog; dimensi 10).
- **Implementasi:**
  - Render per-grup, maksimal ~160–320 baris per paint; grup raksasa dipecah dengan header "(lanjutan)".
  - Event didelegasikan SEKALI di `#guideList` (init) — klik baris, bintang favorit, hapus kustom; tanpa bind ulang per chunk.
  - Auto-muat saat scroll mendekati bawah + tombol "MUAT N SIARAN LAGI" (aksesibilitas).
- **Test:**
  - `node test/guide-chunk.js` (baru) → **7/7 PASS**: chunk awal ≤320, <500ms, scroll memuat sisa, klik baris/favorit via delegasi jalan.
  - `baseline-smoke.js` sempat 17/18 (ekspektasi usang "render sekaligus") → test diperbarui → **18/18 PASS**.
  - `remote-click.js` 18/18 PASS.
- **Before/after:** Dimensi 10: 6→7. Panduan kini siap untuk 5.300 entri.
- **Next:** Cek hasil verifikasi kandidat; discovery batch kartun.

**Total siklus tercatat: 12**

---

## Siklus 13 — 2026-10-11 04:47 WIB — Query matrix kartun & ident + discovery batch DM

- **Area:** `scripts/queries-kartun.txt` (200 query), `scripts/queries-ident.txt` (150 query).
- **Masalah:** Discovery iklan selesai (4.085 kandidat); kategori lain belum tersentuh.
- **Implementasi:** Query matrix untuk opening kartun/tokusatsu (dengan tahun & "bahasa indonesia"/"RCTI" qualifier) dan ident/stasiun/sinetron/PSA. Dua batch `discover.py --source dm` dijalankan background (kartun, ident).
- **Hasil:** Batch kartun & ident berjalan (`/tmp/siar-disc-kartun.log`, `/tmp/siar-disc-ident.log`).
- **Eksperimen gagal (tercatat jujur):** Ekstraksi playlist YouTube via HTML curl gagal (bot-detection: tidak ada `playlistVideoRenderer`); via youtubei browse API hanya mengembalikan sidebar (daftar video butuh continuation chain) — dihentikan agar tidak jadi rabbit hole; discovery YouTube dialihkan ke web search yang terbukti jalan.
- **Next:** Review hasil batch DM.

---

## Siklus 14 — 2026-10-11 05:02 WIB — Discovery YouTube manual batch 1: +16 entri terverifikasi

- **Area:** Katalog (`assets/js/channels.js`, 265 → **281**).
- **Metode:** `browser.search` (3 query: iklan jadul 90an, opening Doraemon RCTI, ident RCTI sawah) → 19 kandidat ID YouTube → `review.py verify` (oEmbed) → review manusia judul-per-judul → append.
- **Hasil:** 18 OK + 1 REVIEW (oEmbed) → review manusia: **16 YA**, 3 SKIP (2 judul oEmbed kosong — konten tak bisa dipastikan; 1 kemungkinan cover lagu). Disaring jujur: versi DeBeers Hongkong ditolak (bukan versi Indonesia), remake AI 2025 ditolak, "rekreasi" ident ditolak, episode full ditolak.
- **Test:** `review.py append` → 16 entri, 0 duplikat; `baseline-smoke.js` 18/18 PASS (test dibuat dinamis terhadap jumlah katalog).
- **Katalog:** 281 entri unik terverifikasi.
- **Next:** Batch YouTube berikutnya (tokusatsu, sinetron, ident stasiun lain); hasil verify DM 4.085.

**Total siklus tercatat: 14**

---

## Siklus 15 — 2026-10-11 05:10 WIB — Kaca CRT saat TV mati

- **Area:** `assets/css/style.css` (`.screen`).
- **Masalah & bukti:** Layar saat mati = hitam pekat `#000` — CRT asli yang mati memantulkan cahaya ruangan (kaca gelap, bukan lubang hitam).
- **Severity:** Sedang (dimensi 1).
- **Implementasi:** Background layar menjadi `radial-gradient` kaca gelap (`#12151b` → `#000`); hanya terlihat saat mati (player menutupinya saat nyala).
- **Test:** `node test/quickshot.js 1366 768 scr15 off` → `shots/tmp-scr15.png`: kaca gelap reflektif + "TEKAN POWER" + LED merah standby — believable.
- **Before/after:** Dimensi 1: 7→7.2.
- **Next:** Batch YouTube berikutnya / cek verify DM.

**Total siklus tercatat: 15**

---

## Siklus 16 — 2026-10-11 05:20 WIB — Batch YouTube tokusatsu + perbaiki merge review.py

- **Area:** Katalog (281 → **282**), `scripts/review.py`.
- **Metode:** 2 web search (ultraman tiga, kamen rider indonesia) → 3 kandidat → oEmbed.
- **Hasil:** 1 YA (`ppisgGYfyKw` — Opening Kamen Rider Super One (KASET) Indonesian Version, RCTI); 2 SKIP (judul oEmbed kosong; kemungkinan cover). Filter jujur: 5 cover, 3 episode full, 1 remake AI ditolak di tahap search.
- **Bug pipeline ditemukan & diperbaiki:** `review.py verify` menimpa ulang TSV sehingga putusan review manusia hilang → kini MERGE berdasarkan id (putusan/cat/st/title manual dipertahankan, status & judul oEmbed di-refresh). Keputusan 16+1 direkonstruksi & terverifikasi; append mende-dupe dengan benar (16 duplikat dilewati, 1 baru masuk).
- **Test:** append → 282 entri unik; smoke 18/18 PASS.
- **Next:** Batch sinetron/ident; pantau verify DM 4.085.

**Total siklus tercatat: 16**

---

## Siklus 17 — 2026-10-11 05:28 WIB — Reduced-motion + focus-visible (a11y)

- **Area:** `assets/css/style.css`, `assets/js/app.js`.
- **Masalah:** Tidak ada dukungan `prefers-reduced-motion` (noise redraw 140ms, jitter VHS, pulse FAB, flicker powerHint tetap jalan); indikator fokus keyboard minim.
- **Severity:** Sedang (dimensi 9).
- **Implementasi:** Media query `prefers-reduced-motion: reduce` mematikan animasi dekoratif (noise/VHS/band/glass/pulse/flicker); JS: noise statis digambar sekali saja bila RM aktif; `:focus-visible` outline untuk tombol remote/panel/chip.
- **Test:** smoke 18/18 PASS, guide-chunk 7/7 PASS; `node --check` implisit via smoke (app.js dieval).
- **Before/after:** Dimensi 9: 6→6.8.
- **Next:** Batch YouTube sinetron; regression pass di siklus 20.

**Total siklus tercatat: 17**

---

## Siklus 18 — 2026-10-11 05:40 WIB — Batch YouTube sinetron + iklan 2000an: +14 entri

- **Area:** Katalog (282 → **296**).
- **Metode:** 2 web search → 16 kandidat → oEmbed → review manusia.
- **Hasil:** **14 YA** (7 opening sinetron RCTI 1998-2004: Jin & Jun 3, Cinta, Doaku Harapanku, Mandragade, Amelia, Kepala Keluarga, Melodi Cinta; 6 iklan: Star Mild 1998, kompilasi iklan seram, 2× arsip SCTV 2004, Yamaha Komeng, break RCTI 2004; 1 jadwal acara RCTI 2002), **2 SKIP** (oEmbed gagal; 1 ternyata episode full — judul discovery menipu, tertangkap di review).
- **Test:** append → 296 entri unik; smoke 18/18 PASS.
- **Next:** Batch ident stasiun lain (SCTV/TPI/Indosiar/ANTV); pantau verify DM.

**Total siklus tercatat: 18**
