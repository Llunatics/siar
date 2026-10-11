# AUDIT VISUAL SEBELUM REDESAIN (2026-10-11, dari screenshot aktual)

## Akar masalah konkret

1. **Chassis memanjang di HP** — Bukan peregangan, tapi komposisi vertikal:
   - `@media (max-width:720px)`: `.tv-main{flex-direction:column}` + `.tv-side{display:none}` → kolom speaker hilang, siluet berubah total.
   - `.statusbar{flex-wrap:wrap}` → deck jadi 3 baris (power/CH/fav, tombol CH/VOL, meter sinyal full-width) → bodi jauh lebih tinggi dari TV tabung nyata (rasio ±0.85 vs ±1.3).
   - Tidak ada pengunci rasio aspek; `fitStage` (JS scale) hanya mengecilkan tumpukan yang sudah salah proporsi.
2. **Ikon power rusak** — memakai `⏻` (U+23FB): tidak ada di banyak font HP → tampil kotak tofu. `⛶` (fullscreen) dan `⚙` juga berisiko.
3. **Tombol generik** — semua `.btn` memakai gradien + radius yang sama; power hanya versi besar. Tidak ada diferensiasi fungsi.
4. **Remote seperti overlay** — bottom sheet datar dengan rotateX; tombol-tombol seragam, tidak ada karakter perangkat nyata.
5. **Settings seperti dashboard admin** — kartu-kartu datar, kontrol (switch/slider/model-card) tidak satu sistem.
6. **Imersif seperti ilustrasi** — lantai = satu gradien + transform perspektif; lemari = kotak cokelat datar; dinding = noise samar.
7. **Tekstur pola CSS** — grille speaker = grid titik 7px sempurna; finishing kayu = garis repeating-linear-gradient.

## Rencana perbaikan (dieksekusi)
- Sistem proporsi: `.tv-body{container-type:size; aspect-ratio:var(--body-ar)}` + unit cq → TV satu objek utuh, komposisi identik di semua viewport.
- Ikon: sprite SVG inline (power/close/star/gear/expand/clock), ganti semua ⏻⛶⚙⏰ di HTML + JS (favBtn, guide stars).
- Deck: satu baris tanpa wrap di semua ukuran; kontrol dalam satuan cqh.
- Remote: housing ergonomis, kunci karet berkubah, IR window, kode warna fungsi.
- Imersif: plester dinding berlapis, lantai keramik perspektif, lemari kayu grain SVG, kalender dinding (baru), lampu diperhalus.
- Settings: hierarki + token desain; pertahankan DOM (test) & logika persistensi/migrasi.
