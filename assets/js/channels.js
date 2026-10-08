// Daftar "siaran" Siar — siaran TV Indonesia 1990–2015.
// Mau nambah channel? Tambah satu objek di bawah, simpan, refresh halaman.
// id = video_id YouTube (bagian setelah "watch?v=" pada URL video).
// Semua id diverifikasi via YouTube oEmbed (HTTP 200 + judul cocok);
// daftar lengkap + judul asli: siar-channels-verified.json di arsip program.
// Semua video diputar lewat embed resmi YouTube — tidak ada file yang di-upload ulang.
const CHANNELS = [
  // --- Iklan Jadul ---
  { id: "KfyHxh0029M", title: "Iklan Agung Podomoro (APG)", cat: "Iklan Jadul" },
  { id: "P4WOjJrgVKg", title: "Iklan Meikarta", cat: "Iklan Jadul" },
  { id: "y8Gzh8Hqpgs", title: "Iklan Indomie — Seleraku", cat: "Iklan Jadul" },
  { id: "0Vu62O_pSZw", title: "Iklan Indomie Pegunungan (1997)", cat: "Iklan Jadul" },
  { id: "1YiE2gLi52o", title: "Kumpulan Iklan Aqua (1994–1997)", cat: "Iklan Jadul" },
  { id: "aLSMpKszdq0", title: "Iklan Aqua Orkestra", cat: "Iklan Jadul" },
  { id: "L6eMgIaApSE", title: "Kompilasi Iklan Sirup Marjan (2003–2018)", cat: "Iklan Jadul" },
  { id: "tFb9U6IcyQE", title: "Iklan Pepsodent — Tasya ke Dokter Gigi (1999)", cat: "Iklan Jadul" },
  { id: "jpYmU3FdnHM", title: "Iklan Pepsodent Undian (1996)", cat: "Iklan Jadul" },
  { id: "HXOUn2kjH54", title: "Iklan Extra Joss (2004)", cat: "Iklan Jadul" },
  { id: "DRQG1m_fRJY", title: "Iklan Extra Joss — Ronaldo di Bali", cat: "Iklan Jadul" },
  { id: "SXQi3Vq9bFw", title: "Iklan Susu Bendera Frisian Flag", cat: "Iklan Jadul" },
  { id: "YzMe-7utHik", title: "Iklan Teh Botol Sosro — Rantai Makanan", cat: "Iklan Jadul" },
  { id: "1-pglprBNIM", title: "Iklan Teh Botol Sosro (1993)", cat: "Iklan Jadul" },
  // --- Opening Kartun ---
  { id: "-IP2J3MxWQ8", title: "Opening Doraemon (Bahasa Indonesia)", cat: "Opening Kartun" },
  { id: "PECah26yMmQ", title: "Opening Captain Tsubasa (Indonesia)", cat: "Opening Kartun" },
  { id: "GYKVugt0I9M", title: "Opening Chalk Zone", cat: "Opening Kartun" },
  { id: "OSB6CHS70Oc", title: "Opening Shin-chan (Indonesia)", cat: "Opening Kartun" },
  { id: "oU9XqvVg3Jc", title: "Opening Dragon Ball (Indonesia)", cat: "Opening Kartun" },
  { id: "vyDfm86n8i8", title: "Opening Sailor Moon (Indonesia)", cat: "Opening Kartun" },
  { id: "dAvRHk0-ZMk", title: "Opening Digimon Adventure 02 (Indonesia)", cat: "Opening Kartun" },
  { id: "P8gZbrDNbHM", title: "Opening Beyblade", cat: "Opening Kartun" },
  { id: "IbirQfeFXT4", title: "Opening Slam Dunk", cat: "Opening Kartun" },
  { id: "cqj90nVeaCI", title: "Opening Hamtaro (Indonesia)", cat: "Opening Kartun" },
  { id: "H9SPcyMSy04", title: "Opening Cardcaptor Sakura (Indonesia)", cat: "Opening Kartun" },
  { id: "thunHQ7C3_w", title: "Opening Ninja Hattori (Indonesia)", cat: "Opening Kartun" },
  { id: "86nwcvaI5PQ", title: "Opening P-Man (Indonesia)", cat: "Opening Kartun" },
  { id: "CjsZAuXZDmg", title: "Opening Kobo Chan (Indonesia)", cat: "Opening Kartun" },
  { id: "jF21eSABOf4", title: "Opening One Piece (Indonesia)", cat: "Opening Kartun" },
  // --- Sinetron & Acara TV ---
  { id: "SQpT2G17pog", title: "Opening Tersanjung", cat: "Sinetron & Acara TV" },
  { id: "5gq7AktFwFk", title: "Si Doel Anak Sekolahan", cat: "Sinetron & Acara TV" },
  { id: "A0plMjLC4T4", title: "Opening Jinny Oh Jinny", cat: "Sinetron & Acara TV" },
  { id: "A-Yo4TQtmfQ", title: "Saras 008", cat: "Sinetron & Acara TV" },
  { id: "g1_rI5mCBIw", title: "Panji Manusia Millenium", cat: "Sinetron & Acara TV" },
  { id: "3oTdB8iIQwI", title: "Meteor Garden — Qing Fei De Yi", cat: "Sinetron & Acara TV" },
  { id: "0l2QFb1uk_4", title: "Lorong Waktu — Episode 1", cat: "Sinetron & Acara TV" },
  { id: "Po2IY2th7ms", title: "Mak Lampir — Misteri Gunung Merapi", cat: "Sinetron & Acara TV" },
  // --- Jingle & Ident ---
  { id: "shP9qjFCSJM", title: "Ident RCTI 1990", cat: "Jingle & Ident" },
  { id: "59xUF0JW7Yc", title: "Station ID SCTV NgeTop!", cat: "Jingle & Ident" },
  { id: "eVuG_OFi6GQ", title: "Station ID Indosiar Ikan Terbang", cat: "Jingle & Ident" },
  { id: "ky8-Hw_QVkg", title: "Station ID TPI Makin Asyik Aja", cat: "Jingle & Ident" },
  { id: "8nIC7LzTFhE", title: "Station ID TPI (1992)", cat: "Jingle & Ident" },
];
