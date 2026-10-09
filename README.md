# Siar

Televisi analog dalam browser. Memutar 84 siaran TV Indonesia era 1990–2015 (iklan jadul, opening kartun dan tokusatsu, sinetron, jingle stasiun TV) melalui embed resmi YouTube, dengan bodi TV 3D, remote control fisik, antena interaktif, dan Blok Stasiun.

**Live:** https://tv.llunaticsys.web.id

## Fitur

- **Remote overlay melayang** — Ketuk tombol remote melayang di kanan bawah: remote muncul meluncur dari bawah dengan perspektif 3D seolah diarahkan ke TV. LED inframerah remote berkedip dan sensor di bodi TV menyala tiap tombol ditekan, plus bunyi klik dan getar halus di ponsel. Isinya: numpad 0–9 (ketik nomor channel, angka tampil di OSD, TV lompat setelah jeda singkat), rocker CH/VOL, power, mute, acak, favorit, panduan, Blok Stasiun, sleep timer, pengaturan, layar penuh. Tutup via tombol yang sama, ketuk di luar, atau `Esc`
- **Antena interaktif** — Dua batang antena bisa diseret; tiap channel punya posisi sinyal terbaik sendiri. Kualitas sinyal (persen di panel dan OSD) menggerakkan noise, tracking band, dan ketajaman gambar secara real-time. Posisi antena tersimpan di `localStorage`
- **Blok Stasiun** — Di Panduan Siaran: chip filter per stasiun + tombol **PUTAR BLOK** untuk marathon satu stasiun (dimulai dari ident stasiunnya). Selama blok aktif, CH+/CH−, auto-next, dan numpad tetap di dalam blok; badge blok tampil di bilah "Sedang Tayang"
- **Model TV** — Kayu 80-an, Plastik 90-an, Silver 2000-an (bezel dan plat merek menyesuaikan)
- **Bodi TV lebar ala TV asli** — Chassis persegi panjang menyamping: layar + kolom speaker grille dan sensor IR dalam satu bodi, strip status (power, display CH, meteran sinyal) di bawah layar, kaki/stand TV dengan bayangan lantai, dan cahaya layar yang memantul halus ke ruangan saat TV menyala. Tombol fisik timbul yang tenggelam saat ditekan, antena teleskopik dua batang, bezel tebal, kaca layar melengkung (highlight + vignette), tekstur plastik
- **Video bersih** — Overscan ala CRT memotong strip judul/kontrol YouTube; kontrol pemutar disembunyikan (`controls=0`); klik layar = putar/jeda, dobel-klik = layar penuh
- **Efek layar** — VHS (tracking, chromatic aberration, jitter), scanline CRT + intensitas, noise latar yang bereaksi terhadap kualitas sinyal, animasi power-on CRT, rasio 4:3 / 16:9
- **Panduan siaran** — Seluruh channel per kategori dengan thumbnail YouTube, pencarian, label stasiun, penanda ✓ sudah-ditonton, dan progres koleksi (X/84 ditonton)
- **Favorit** — Tandai siaran dengan bintang; terkumpul di grup teratas panduan
- **Channel kustom** — Tambah siaran dengan menempelkan URL/ID YouTube; tersimpan di `localStorage`
- **Sleep timer** — TV mati otomatis setelah 15/30/60/90 menit
- **Kontrol penuh** — Semua kontrol utama hidup di remote overlay: power, CH+/CH−, acak, volume (rocker + slider 3D bertick marks, bar volumenya tampil di OSD ala TV asli), mute, layar penuh (tombol FULL / dobel-klik layar). Di bodi TV tinggal elemen status: tombol power, display CH, meteran sinyal
- **Pintasan keyboard** — Lihat tabel di bawah

Pengaturan, favorit, channel kustom, posisi antena, dan riwayat tontonan tersimpan otomatis di browser (localStorage) dan berlaku pada kunjungan berikutnya.

## Siaran bawaan

Total **84 channel** siaran TV Indonesia 1990–2015:

| Kategori | Jumlah |
| --- | --- |
| Iklan Jadul | 14 |
| Opening Kartun | 37 |
| Opening Tokusatsu | 2 |
| Sinetron & Acara TV | 13 |
| Jingle & Ident | 18 |

| Stasiun | Jumlah |
| --- | --- |
| RCTI | 21 |
| Global TV | 15 |
| Multi-Stasiun (iklan TVC) | 14 |
| Indosiar | 11 |
| MNCTV/TPI | 4 |
| SCTV | 3 |
| Trans7 | 3 |
| ANTV | 3 |
| NET. | 3 |
| Trans TV | 2 |
| RTV | 2 |
| B Channel | 2 |
| TVRI | 1 |

Seluruh `video_id` telah diverifikasi satu per satu via YouTube oEmbed (HTTP 200 dan judul klip asli — bukan video lirik, episode, atau cover). Tidak ada berkas video yang disimpan atau diunggah ulang di repositori ini.

## Pintasan keyboard

| Tombol | Fungsi |
| --- | --- |
| `P` | Power nyala / mati |
| `↑` `↓` | Channel berikutnya / sebelumnya |
| `←` `→` | Volume naik / turun |
| `M` | Mute / unmute |
| `R` | Channel acak |
| `F` | Favoritkan siaran yang sedang tayang |
| `0`–`9` | Ketik nomor channel (tampil di OSD); TV lompat setelah jeda singkat |
| `G` | Panduan siaran |
| `S` | Pengaturan |
| `H` | Bantuan |
| `Esc` | Tutup remote / panel / modal |

Batang antena diatur dengan menyeretnya langsung (mouse/sentuh); tidak ada pintasan keyboard khusus.

## Menambah channel

**Permanen (lewat kode)** — tambahkan satu objek ke `assets/js/channels.js`:

```js
{ id: "VIDEO_ID_11_CHAR", title: "Nama Siaran", cat: "Kategori", st: "Stasiun" }
```

Kategori yang dikenali: `Iklan Jadul`, `Opening Kartun`, `Opening Tokusatsu`, `Sinetron & Acara TV`, `Jingle & Ident`. Nilai `st` dipakai filter dan Blok Stasiun, misalnya `RCTI`, `SCTV`, `Indosiar`, `Global TV`, `MNCTV/TPI`.

**Sementara (lewat UI)** — buka Panduan Siaran → "Tambah channel sendiri", tempel URL/ID YouTube dan nama siaran. Berlaku hanya di browser tersebut.

## Struktur proyek

```
.
├── index.html            # Halaman utama
├── assets/
│   ├── css/
│   │   └── style.css     # Seluruh gaya, efek CRT/VHS, model TV, remote
│   └── js/
│       ├── channels.js   # Daftar siaran bawaan
│       ├── settings.js   # localStorage: pengaturan, favorit, channel kustom, riwayat
│       └── app.js        # Logika TV, player YouTube, remote, antena, blok stasiun
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
- `localStorage` — preferensi, favorit, channel kustom, posisi antena, riwayat tontonan
- Hosting: Vercel (situs statis)

## Lisensi

Kode berlisensi MIT — lihat berkas `LICENSE`. Seluruh video yang tertanam adalah milik kreator dan pemegang haknya masing-masing di YouTube.
