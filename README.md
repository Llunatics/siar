# Siar

Dulu, mengganti channel berarti menekan tombol yang bunyinya keras, menunggu gambar bergoyang sesaat, lalu berharap antena di atap sedang tidak miring. Siar mencoba menghadirkan lagi rasa itu di dalam browser: sebuah televisi analog yang bisa dinyalakan, dipindah-pindah channel-nya, dan dibiarkan berdengung pelan di pojok layar. Isi siarannya adalah rekaman yang mungkin pernah menemani masa kecil banyak orang Indonesia, dari iklan Agung Podomoro dan Meikarta sampai opening Chalk Zone dan Doraemon versi Bahasa Indonesia.

Siar dapat dibuka di https://tv.llunaticsys.web.id. Semua video diputar melalui embed resmi YouTube, jadi tidak ada berkas video yang disimpan atau diunggah ulang di repositori ini. Hak cipta tetap sepenuhnya milik para pemilik video.

## Cara kerja televisinya

Begitu halaman dibuka, televisi masih dalam keadaan mati. Tekan tombol power dan layar akan menyala dengan animasi khas tabung CRT lama: garis putih tipis yang melebar dari tengah, disusul suara kresek singkat. Setelah itu siaran berjalan, lengkap dengan on-screen display nomor channel ala TV jadul di pojok kiri atas layar.

Channel dapat diganti dengan tombol CH+ dan CH−, tombol ACAK untuk melompat sembarang, atau dengan mengklik judul siaran pada panduan siaran. Siaran yang sedang tayang diringkas pada bilah "Sedang Tayang" di bawah televisi, dan jika sebuah video habis, televisi otomatis berpindah ke channel berikutnya, persis seperti siaran yang memang tidak pernah berhenti.

## Fitur

Versi 2 memperkenalkan panel pengaturan yang tersimpan otomatis di peramban, sehingga pilihan yang terakhir dipakai akan tetap berlaku pada kunjungan berikutnya. Di dalamnya pengguna dapat menyalakan efek VHS yang menghadirkan garis tracking, sedikit distorsi warna, dan getaran halus pada gambar; mengatur keberadaan dan ketebalan scanline CRT; mengendalikan seberapa ramai noise latar yang menemani siaran; mengganti rasio layar antara 4:3 dan 16:9; dan memilih satu dari tiga model televisi, yaitu Kayu 80-an dengan bodi corak kayu, Plastik 90-an berwarna hitam, serta Silver 2000-an.

Panduan siaran kini tampil sebagai panel geser berisi daftar seluruh channel yang dikelompokkan menurut kategori, lengkap dengan cuplikan gambar dari YouTube dan kolom pencarian. Saluran favorit yang ditandai dengan bintang akan terkumpul pada kelompok tersendiri di bagian paling atas. Pengguna juga dapat menambahkan channel sendiri dengan menempelkan tautan atau ID video YouTube beserta nama siarannya; channel tambahan itu tersimpan secara lokal dan dapat dihapus kapan saja. Di luar itu tersedia pengatur waktu tidur yang mematikan televisi secara otomatis setelah 15 sampai 90 menit, kendali volume dan bisu, serta tombol bantuan berisi seluruh pintasan papan ketik.

## Pintasan papan ketik

Tekan **P** untuk menyalakan atau mematikan televisi, panah **atas** dan **bawah** untuk berpindah channel, panah **kiri** dan **kanan** untuk mengatur volume, **M** untuk membisukan, **R** untuk channel acak, **F** untuk memfavoritkan siaran yang sedang tayang, serta angka **1** hingga **9** untuk melompat langsung ke nomor channel. Panel panduan siaran dibuka dengan **G**, pengaturan dengan **S**, bantuan dengan **H**, dan semuanya ditutup dengan **Esc**.

## Menambah channel

Daftar bawaan tersimpan di `assets/js/channels.js`. Untuk menambah siaran permanen, cukup tambahkan satu objek berisi `id` video YouTube, `title`, dan `cat`, lalu muat ulang halaman. Channel bawaan yang tersedia saat ini telah diverifikasi satu per satu dari halaman tontonnya: iklan Agung Podomoro (Kota Podomoro Tenjo), iklan Meikarta, opening Chalk Zone, opening Doraemon versi Bahasa Indonesia, dan opening Captain Tsubasa versi Indonesia. Apabila hanya ingin menambahkan untuk keperluan pribadi tanpa menyentuh kode, gunakan formulir tambah channel di dalam panduan siaran; isinya tersimpan di peramban masing-masing.

## Menjalankan secara lokal

Repositori ini adalah situs statis murni tanpa perkakas bangun. Salin atau klona repositori, kemudian jalankan peladen statis apa pun dari direktori akarnya, misalnya `python3 -m http.server 8000` atau `npx serve .`, lalu buka http://localhost:8000. Koneksi internet diperlukan karena video disiarkan langsung dari YouTube. Struktur berkasnya sederhana: `index.html` di direktori akar, `style.css` di `assets/css/`, serta `channels.js`, `settings.js`, dan `app.js` di `assets/js/`.

## Teknologi

Siar dibangun dengan HTML, CSS, dan JavaScript murni tanpa dependensi masa jalan, selain YouTube IFrame API untuk pemutaran dan kontrol volume. Efek static dan bunyi kresek dibuat dengan Canvas 2D dan WebAudio. Preferensi, favorit, dan channel kustom disimpan di `localStorage`. Situs ini disebarkan (deploy) sebagai situs statis di Vercel dan dapat diakses melalui domain https://tv.llunaticsys.web.id.

## Lisensi

Berkas kode dalam repositori ini berlisensi MIT; isinya dapat dilihat pada berkas `LICENSE`. Seluruh video yang tertanam merupakan milik para kreator dan pemegang haknya masing-masing di YouTube.
