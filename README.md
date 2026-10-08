# Portal Nostalgia — TV Analog

Portal nostalgia ber-UI TV analog: layar CRT lengkap dengan scanlines, vignette, flicker halus, efek static + suara kresek tiap ganti channel, dan OSD nomor channel ala TV jadul. Isi "siarannya" adalah iklan jadul Indonesia dan opening kartun legendaris yang diputar lewat **embed resmi YouTube**.

## Fitur

- TV analog: bezel, layar CRT (scanlines, vignette, flicker), tombol power, display nomor channel LED hijau
- Efek static (noise visual) + bunyi kresek singkat (WebAudio) setiap pindah channel
- OSD ala TV analog: nomor + judul channel muncul sesaat di pojok layar
- Daftar siaran bisa diklik, tombol CH+/CH−, mode **ACAK**, volume slider + mute (via YouTube IFrame API)
- Video habis → otomatis pindah ke channel berikutnya
- Kontrol keyboard: `↑`/`↓` channel, `←`/`→` volume, `M` mute, `R` acak, `P` power, angka `1-9` lompat channel

## Menjalankan

Tanpa build tool. Pilih salah satu:

1. Buka langsung `index.html` di browser, atau
2. Jalankan static server di folder ini, misal:
   - `python3 -m http.server 8000` lalu buka http://localhost:8000
   - `npx serve .`

Butuh koneksi internet karena video di-stream dari YouTube.

## Nambah / ganti channel

Edit file `channels.js` — tambahkan satu objek per channel:

```js
{ id: "VIDEO_ID_YOUTUBE", title: "Judul tampil di daftar & OSD", cat: "Iklan Jadul" },
```

`id` adalah video_id YouTube (bagian setelah `watch?v=`). `cat` menentukan pengelompokan di daftar siaran. Simpan, refresh halaman, selesai.

## Catatan soal video

Semua video diputar menggunakan embed resmi YouTube (`youtube.com/embed/...` via IFrame API). Tidak ada file video yang diunduh, disimpan, atau di-upload ulang di repo ini — hak cipta tetap milik pemilik masing-masing video.

## Lisensi

MIT — lihat file [LICENSE](LICENSE).
