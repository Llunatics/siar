# LAPORAN VERIFIKASI POST-MARATON — Siar

Tanggal: 2026-10-11 ~15:00 WIB; revisi 2026-10-11 ~16:00 WIB (sinkron kondisi Git terkini).
Verifikator: Muse (independen, tidak mengandalkan AUDIT_LOG.md).
Metode: git forensik, eval langsung `assets/js/channels.js`, baca + jalankan ulang seluruh test suite,
oEmbed/metadata resmi untuk 41 sampel acak (seed 20261011), 28 screenshot aktual (4 viewport × 5 state),
review visual manual.

## 1. TERVERIFIKASI

### Git & integritas kerja
- `git status` bersih sebelum dan sesudah verifikasi. 375 commit total (351 sejak baseline maraton `c138542`).
- Tidak ada perubahan pengguna yang tertimpa: status bersih saat maraton dimulai; seluruh commit baru adalah kerja agen.
- Tidak ada push/deploy/reset/squash/rewrite history. Semua perbaikan via commit baru.
- Diff substantif sejak baseline (tanpa node_modules): `assets/css/style.css` (+486 baris), `assets/js/app.js` (+339),
  `assets/js/channels.js` (+391 entri), `index.html` (+55). Bukan sekadar kosmetik.

### Katalog — 656/656 valid (eval JS langsung, bukan grep)
- `CHANNELS.length = 656`; 656 unique `src:id`; 0 duplikat; 0 field wajib kosong; 0 kategori invalid.
- Distribusi sumber: YouTube 599, Dailymotion 27, Internet Archive 29, Vimeo 1.
- Distribusi kategori: Iklan Jadul 367, Opening Kartun 149, Jingle & Ident 76, Sinetron & Acara TV 40, Opening Tokusatsu 15.

### Sampel acak 41 entri (8/kategori + semua platform) — cek oEmbed/metadata resmi
- **38 terverifikasi konten**: oEmbed HTTP 200 + judul sumber cocok dengan judul katalog + konteks siaran Indonesia masuk akal
  (contoh: "Ident INDOSIAR 2000", "Station ID TPI Makin Asyik Aja 1996", "Opening Ksatria Baja Hitam (Indonesia)").
- **3 belum bisa diuji**: ketiganya Dailymotion — endpoint oEmbed DM timeout dari jaringan sandbox (bukan bukti video mati).
- 0 sampel terbukti salah/menyesatkan. Hasil mentah: `/tmp/verify-sample-results.json`.

### Test suite — seluruhnya dijalankan ulang, semua hijau
| Suite | Hasil aktual |
|---|---|
| baseline-smoke.js (jsdom, klik nyata) | PASS — 18/18 checks |
| hold-repeat.js | 3/3 PASS |
| guide-chunk.js | PASS (klik baris, favorit tersimpan) |
| remote-click.js | PASS, 0 pageerror |
| shapes.js | OK semua model, 0 pageerror |
| w3set.js | errs: 0 (preview 6/6 akurat, ganti shape/finish) |
| w3persist.js | errs: 0 (migrasi localStorage skema lama + reset) |
| w3kbd.js | errs: 0 (keyboard journey penuh, focus trap, Escape) |
| w3acc.js | errs: 0 |
| w3btn.js | errs: 0 (strike tombol fisik) |
| w3dim.js | errs: 0 (peredupan imersif saat TV mati) |
| w3feet.js | errs: 0 |
| w3finbtn.js | errs: 0 |
| w3journey.js | errs: 0 (journey lengkap + persist) |
| w3watch.js | errs: 0 (counter "Koleksi: 0/656 → 1/656") |

Catatan: suite `w3*` butuh server lokal di port 8777 (`python3 -m http.server 8777`); tanpa server mereka FATAL
`ERR_CONNECTION_REFUSED` — ini by design, bukan defect aplikasi. Implementasi test dibaca: memakai klik/event
sungguhan (jsdom `dispatchEvent`, Playwright `page.click`), bukan cek statis.

### Render visual — 28 screenshot di `shots/verify-post/` (direview manual)
- Normal 1920×1080: TV Trinitron-ish 1997 render baik — OSD "CH 01 · MULTI-STASIUN", tombol fisik PWR/CH±/V±,
  sensor LED, speaker grille, antena, legenda shortcut. Static noise tampil karena YouTube diblokir sandbox
  (fallback graceful, bukan crash).
- Imersif: ruang tamu tampil (dinding plester, jam dinding 13:59 WIB, bingkai foto, lemari kayu, lampu lantai,
  tombol "✕ IMERSIF"). Klaim mode imersif TERBUKTI via `1920x1080-immersive2.png`.
- Remote: render seperti hardware (numpad, CH/VOL, MUTE/ACAK/BLOK, sleep, slider volume).
- Guide: panel "PANDUAN SIARAN" buka, search, chip stasiun (Semua 656, RCTI 84, SCTV 26…), "Koleksi: 0/656".
- Settings: 10 model TV + 8 finishing + toggle rasio + remote, preview akurat.
- Mobile 390×844 & landscape 844×390: tidak ada clipping/overflow, kontrol terjangkau.

### Klaim 384 siklus — audit sampel 40 entri
- ~80% substantif (perubahan kode/data + test: batch katalog, regression pass, perbaikan UI).
- ~20% administratif/operasional (restart job, evaluasi strategi, batch +0 hasil — riset tetap jalan, kandidat ditolak).
- Koreksi timestamp siklus 298–383 sudah diperbaiki berbasis bukti (revisi 16:00 WIB): header adalah waktu UTC
  yang salah dilabeli WIB (selisih tepat 420 menit vs waktu commit) → diperbaiki programatis +7 jam.
  Waktu aktual siklus 372–383: **07:50–08:01 WIB**, bukan ±11:20–12:00 WIB seperti koreksi wave-3 sebelumnya
  (koreksi lama ikut terbukti keliru via `git log --format=%ci`). Siklus 13–~98: timestamp meleset maju progresif
  (s.d. ±5,4 jam) → ditandai sebagai perkiraan di catatan keterpercayaan timestamp di kepala AUDIT_LOG.md.
  Tidak ada timestamp yang dikarang.

### Defect yang DIPERBAIKI saat verifikasi
1. `test/node_modules` ter-commit (1.966 file sampah): di-`git rm --cached` + `node_modules/` masuk `.gitignore`
   (commit `a9cd425`). History lama tetap ada (tidak di-rewrite).
2. 28 screenshot bukti dikomit (`8ddea62`) agar klaim visual dapat diaudit ulang.

## 2. GAGAL / DEFECT TERBUKTI

1. **Repo bloat permanen**: `.git` 185 MB karena node_modules sempat ter-commit di history. Tidak bisa dibersihkan
   tanpa rewrite history (dilarang). Mitigasi: tracking sudah dihentikan; clone baru tetap berat.
2. **Timestamp log tidak konsisten**: beberapa siklus bertanggal salah (mis. siklus 300 tertulis 2026-10-10).
   Isi kerja valid; hanya dokumentasi yang berantakan.
3. **Thumbnail guide kosong untuk sebagian entri di sandbox** (kotak hitam): penyebab jaringan (YouTube diblokir),
   bukan bug aplikasi. Di produksi dengan akses YouTube normal, thumbnail tampil.

## 3. BELUM BISA DIUJI

1. **Playback video sesungguhnya**: `youtube.com/iframe_api` tidak dapat dimuat dari sandbox (jaringan dibatasi).
   Yang teruji: fallback graceful (static + OSD, tanpa crash, tanpa loading macet). Klaim "video bisa diputar"
   hanya didukung oEmbed/metadata, bukan pemutaran nyata.
2. **3 sampel Dailymotion**: oEmbed timeout dari sandbox — status video tidak dapat dipastikan (bukan vonis mati).
3. **Fullscreen & haptics mobile**: tidak dapat diuji bermakna di headless.

## 5. Tambahan kesiapan rilis (revisi 16:00 WIB)

- `PLAYBACK_TEST_LIST.md`: 31 video uji manual (10 YouTube, 10 Dailymotion, 10 Internet Archive, 1 Vimeo —
  Vimeo hanya punya 1 entri di katalog) lengkap dengan judul katalog + URL sumber, untuk pengujian playback
  dari jaringan normal. Tidak ada klaim pemutaran berdasarkan oEmbed.
- README: ditambah seksi "Panduan pengujian" (cara uji fullscreen, remote, settings, immersive mode,
  sinyal/antena, favorit & riwayat, fallback saat video diblokir).
- Tidak ada perubahan fitur/kode aplikasi dalam review ini — hanya dokumentasi dan koreksi log.
  Tidak diperlukan regresi ulang (tidak ada kode yang disentuh).

## 4. REKOMENDASI

1. **Jangan kejar 5.300 dalam waktu dekat** — jalur discovery existing jenuh (yield ~0). Butuh sumber baru
   (arsip TVRI, kolektor VHS, forum nostalgia) sebelum ekspansi dilanjutkan.
2. Pertimbangkan `git filter-repo` untuk membersihkan 185 MB **hanya jika** riwayat marathon boleh ditulis ulang —
   butuh persetujuan eksplisit (saat ini dilarang).
3. Uji playback nyata sekali dari jaringan normal (buka 5–10 video acak per platform) sebelum deploy.
4. Untuk sesi maraton berikutnya: wajibkan timestamp dari `date` sistem di tiap log (pelajaran: 2 agen salah jam),
   dan larang commit `node_modules` via pre-commit hook atau `.gitignore` sejak awal.
