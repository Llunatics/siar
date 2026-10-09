# Siar

Televisi analog dalam browser. Memutar 158 siaran TV Indonesia era 1990–2015 (iklan jadul, opening kartun dan tokusatsu, sinetron, jingle stasiun TV) melalui embed resmi YouTube, Dailymotion, dan Vimeo — dengan bodi TV yang bisa diganti bentuknya, remote control fisik, antena interaktif, dan Blok Stasiun.

**Live:** https://tv.llunaticsys.web.id

## Fitur

### Bodi TV

- **5 bentuk chassis** meniru siluet TV betulan: Trinitron (layar silinder, speaker samping), Philips (bodi rounded, speaker bawah), Sharp (bezel tipis, speaker bawah), Polytron (speaker ganda kiri–kanan), Kayu 80-an (kabinet kayu, kain speaker). Plat merek bergaya terinspirasi mengikuti bentuk (tanpa logo asli)
- **4 warna/finishing terpisah dari bentuk**: Hitam, Silver, Kayu, Putih gading
- Chassis persegi panjang lebar: layar + kolom speaker grille + sensor IR dalam satu bodi, strip status (power, display CH, meteran sinyal) di bawah layar, kaki/stand dengan bayangan lantai, cahaya layar memantul halus ke ruangan saat TV menyala
- Tombol fisik timbul yang tenggelam saat ditekan; antena teleskopik dua batang yang bisa diseret

### Remote control

- **Dua mode tampilan**: *Mengarah ke TV* (perspektif 3D — ujung jauh mengecil, LED IR menembak ke TV) atau *Datar*. Mode mengarah ke TV adalah default
- Ukuran mobile kompak (maks. 330px, ≤78% tinggi layar, tombol tetap ≥44px), nyaman satu tangan
- LED inframerah remote berkedip + sensor di bodi TV menyala tiap tombol ditekan; bunyi klik mekanis dan getar halus (keduanya bisa dimatikan)
- Isi remote: numpad 0–9 (angka tampil di OSD, TV lompat setelah jeda singkat), rocker CH/VOL, power, mute, acak, favorit, panduan, Blok Stasiun, sleep timer, volume slider, pengaturan, layar penuh

### Layar & sinyal

- Efek VHS (tracking, chromatic aberration, jitter), scanline CRT + intensitas, noise latar, **kelengkungan kaca** on/off, **flicker** on/off
- Knob gambar: **Kecerahan / Kontras / Warna** (filter CSS ke video, semua sumber)
- Rasio 4:3 / 16:9; animasi power-on CRT; overscan memotong strip judul/kontrol bawaan embed
- **Tiga mode sinyal**: *Antena interaktif* (geser batang antena — tiap channel punya posisi terbaik sendiri), *Selalu bersih*, *Acak per channel*. Kualitas sinyal menggerakkan noise, tracking band, dan ketajaman gambar real-time

### Pemutaran

- **Multi-sumber**: YouTube, Dailymotion, dan Vimeo diputar lewat API resmi masing-masing (volume, play/pause, auto-pindah saat habis); pemutar juga mendukung Internet Archive via iframe standar
- Power otomatis saat halaman dibuka (opsional), ingat channel terakhir (opsional), auto-pindah on/off (opsional)
- Klik layar = putar/jeda, dobel-klik = layar penuh; sleep timer 15/30/60/90 menit

### Panduan & koleksi

- **Blok Stasiun**: chip filter per stasiun + **PUTAR BLOK** untuk marathon satu stasiun (dimulai dari ident stasiunnya); CH+/CH−, auto-next, dan numpad tetap di dalam blok
- Panduan berkategori dengan thumbnail per sumber, pencarian, label stasiun, penanda ✓ sudah-ditonton, progres koleksi (X/158)
- Favorit (grup teratas panduan), channel kustom via URL/ID YouTube

Semua pengaturan, favorit, channel kustom, posisi antena, dan riwayat tontonan tersimpan di `localStorage` browser. Skema lama otomatis dimigrasikan (model TV lama → bentuk + warna).

## Siaran bawaan

Total **158 channel**:

| Kategori | Jumlah |
| --- | --- |
| Iklan Jadul | 47 |
| Opening Kartun | 54 |
| Opening Tokusatsu | 12 |
| Sinetron & Acara TV | 17 |
| Jingle & Ident | 28 |

| Stasiun | Jumlah |
| --- | --- |
| Multi-Stasiun (iklan TVC) | 47 |
| RCTI | 30 |
| Indosiar | 30 |
| Global TV | 15 |
| TVRI | 7 |
| MNCTV/TPI | 6 |
| SCTV | 5 |
| ANTV | 5 |
| Trans7 | 4 |
| NET. | 3 |
| Trans TV | 2 |
| RTV | 2 |
| B Channel | 2 |

| Sumber | Jumlah |
| --- | --- |
| YouTube | 149 |
| Dailymotion | 8 |
| Vimeo | 1 |

Sorotan katalog: Marsupilami, Curious George, The Jungle Book (Shōnen Mowgli), Dragon Quest, Digimon Adventure/Tamers/Frontier, Ultraman Mebius/Tiga/Dyna/Gaia/Cosmos, iklan Kumon, Djarum 76, Gudang Garam, dan puluhan ident stasiun (TVRI, RCTI Sawah 1994, SCTV Satu Untuk Semua, TPI 1999).

**Verifikasi:** seluruh 158 id dicek satu per satu ke endpoint resmi (YouTube/Dailymotion/Vimeo oEmbed, HTTP 200, judul = klip iklan/opening/bumper asli — bukan video lirik, episode, atau cover) dan disapu ulang penuh pada audit terakhir. Arsip verifikasi disimpan di luar repo bersama state program. Tidak ada berkas video yang disimpan atau diunggah ulang di repositori ini.

## Pengaturan

| Kelompok | Isi |
| --- | --- |
| Bentuk TV | 5 chassis, 4 finishing, rasio 4:3 / 16:9 |
| Remote | Mode Mengarah ke TV / Datar, bunyi klik, getar |
| Efek Layar | VHS, scanline + intensitas, noise, kelengkungan kaca, flicker, kecerahan/kontras/warna |
| Sinyal | Antena interaktif / Selalu bersih / Acak per channel |
| Putar | Power otomatis, ingat channel terakhir, auto-pindah saat video habis |
| Data | Reset semua pengaturan |

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
{ id: "VIDEO_ID", title: "Nama Siaran", cat: "Kategori", st: "Stasiun" }
{ id: "x123abc", title: "Opening Contoh", cat: "Opening Kartun", st: "TVRI", src: "dm", th: "https://…thumbnail…" }
```

- `cat`: `Iklan Jadul`, `Opening Kartun`, `Opening Tokusatsu`, `Sinetron & Acara TV`, atau `Jingle & Ident`
- `st`: stasiun asal siaran untuk filter dan Blok Stasiun, mis. `RCTI`, `Indosiar`, `TVRI`, `Multi-Stasiun`
- `src` (opsional, default `"yt"`): `"yt"` (YouTube), `"dm"` (Dailymotion), `"vimeo"` (Vimeo), `"ia"` (Internet Archive)
- `th` (opsional): URL thumbnail untuk sumber non-YouTube (dari oEmbed sumbernya); YouTube memakai `i.ytimg.com` otomatis

**Sementara (lewat UI)** — buka Panduan Siaran → "Tambah channel sendiri", tempel URL/ID YouTube dan nama siaran. Channel kustom hanya mendukung YouTube dan berlaku di browser tersebut saja.

## Struktur proyek

```
.
├── index.html            # Halaman utama
├── assets/
│   ├── css/
│   │   └── style.css     # Gaya, efek CRT/VHS, bentuk TV, finishing, remote
│   └── js/
│       ├── channels.js   # Daftar siaran bawaan (multi-sumber)
│       ├── settings.js   # localStorage: pengaturan, favorit, channel kustom, riwayat
│       └── app.js        # Logika TV, lapisan pemutar multi-sumber, remote, antena, blok stasiun
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

Buka http://localhost:8000. Koneksi internet diperlukan karena video disiarkan langsung dari sumbernya.

## Teknologi

- HTML, CSS, JavaScript murni (tanpa dependensi runtime)
- YouTube IFrame API, Dailymotion Player API, Vimeo Player API — pemutaran dan kontrol volume; Internet Archive — embed iframe standar
- Canvas 2D — efek static; WebAudio — bunyi kresek dan klik remote
- `localStorage` — preferensi, favorit, channel kustom, posisi antena, riwayat tontonan
- Hosting: Vercel (situs statis)

## Lisensi

Kode berlisensi MIT — lihat berkas `LICENSE`. Seluruh video yang tertanam adalah milik kreator dan pemegang haknya masing-masing di platform sumbernya.
