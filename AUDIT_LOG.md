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
