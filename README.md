# Siar

Televisi analog dalam browser. Memutar 42 siaran TV Indonesia era 1990–2015 (iklan jadul, opening kartun, sinetron, jingle stasiun TV) melalui embed resmi YouTube, dengan bodi TV 3D, efek CRT/VHS, tiga model TV, panduan siaran, favorit, dan channel kustom.

**Live:** https://tv.llunaticsys.web.id

## Fitur

- **Model TV** — Kayu 80-an, Plastik 90-an, Silver 2000-an (bezel dan plat merek menyesuaikan)
- **Bodi 3D ala TV asli** — Tombol fisik timbul yang tenggelam saat ditekan, antena teleskopik dua batang, speaker grille perforasi, bezel tebal, kaca layar melengkung (highlight + vignette), tekstur plastik
- **Video bersih** — Overscan ala CRT memotong strip judul/kontrol YouTube; kontrol pemutar disembunyikan (`controls=0`); klik layar = putar/jeda, dobel-klik = layar penuh
- **Efek layar** — VHS (tracking, chromatic aberration, jitter), scanline CRT + intensitas, noise latar, animasi power-on CRT, rasio 4:3 / 16:9
- **Panduan siaran** — Panel berisi seluruh channel per kategori, thumbnail YouTube, pencarian
- **Favorit** — Tandai siaran dengan bintang; terkumpul di grup teratas panduan
- **Channel kustom** — Tambah siaran dengan menempelkan URL/ID YouTube; tersimpan di `localStorage`
- **Sleep timer** — TV mati otomatis setelah 15/30/60/90 menit
- **Kontrol penuh** — Power, CH+/CH−, acak, volume (slider 3D + tick marks), mute, layar penuh (tombol FULL / dobel-klik layar)
- **Pintasan keyboard** — Lihat tabel di bawah

Pengaturan, favorit, dan channel kustom tersimpan otomatis di browser (localStorage) dan berlaku pada kunjungan berikutnya.

## Siaran bawaan

Total **42 channel** siaran TV Indonesia 1990–2015:

| Kategori | Jumlah |
| --- | --- |
| Iklan Jadul | 14 |
| Opening Kartun | 15 |
| Sinetron & Acara TV | 8 |
| Jingle & Ident | 5 |

Seluruh `video_id` telah diverifikasi satu per satu via YouTube oEmbed (HTTP 200 dan judul sesuai item). Tidak ada berkas video yang disimpan atau diunggah ulang di repositori ini.

## Pintasan keyboard

| Tombol | Fungsi |
| --- | --- |
| `P` | Power nyala / mati |
| `↑` `↓` | Channel berikutnya / sebelumnya |
| `←` `→` | Volume naik / turun |
| `M` | Mute / unmute |
| `R` | Channel acak |
| `F` | Favoritkan siaran yang sedang tayang |
| `1`–`9` | Lompat ke channel nomor tersebut |
| `G` | Panduan siaran |
| `S` | Pengaturan |
| `H` | Bantuan |
| `Esc` | Tutup panel / modal |

## Menambah channel

**Permanen (lewat kode)** — tambahkan satu objek ke `assets/js/channels.js`:

```js
{ id: "VIDEO_ID_11_CHAR", title: "Nama Siaran", cat: "Kategori" }
```

**Sementara (lewat UI)** — buka Panduan Siaran → "Tambah channel sendiri", tempel URL/ID YouTube dan nama siaran. Berlaku hanya di browser tersebut.

## Struktur proyek

```
.
├── index.html            # Halaman utama
├── assets/
│   ├── css/
│   │   └── style.css     # Seluruh gaya, efek CRT/VHS, model TV
│   └── js/
│       ├── channels.js   # Daftar siaran bawaan
│       ├── settings.js   # localStorage: pengaturan, favorit, channel kustom
│       └── app.js        # Logika TV, player YouTube, panduan, pintasan
├── LICENSE
└── README.md
```

## Menjalankan secara lokal

Situs statis murni, tanpa perkakas bangun.

```bash
git clone https://github.com/Llunatics/siar.git
cd siar
python3 -m http.server 8000
# atau: npx serve .
```

Buka http://localhost:8000. Koneksi internet diperlukan karena video disiarkan langsung dari YouTube.

## Teknologi

- HTML, CSS, JavaScript murni (tanpa dependensi runtime)
- YouTube IFrame API — pemutaran dan kontrol volume
- Canvas 2D — efek static; WebAudio — bunyi kresek
- `localStorage` — preferensi, favorit, channel kustom
- Hosting: Vercel (situs statis)

## Lisensi

Kode berlisensi MIT — lihat berkas `LICENSE`. Seluruh video yang tertanam adalah milik kreator dan pemegang haknya masing-masing di YouTube.
