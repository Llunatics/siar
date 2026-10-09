// Siar — penyimpanan lokal & penggabungan daftar channel.
// Mengelola: pengaturan tampilan, daftar favorit, dan channel kustom user.
// Semua tersimpan di localStorage browser (tidak ada data yang dikirim ke server).
var PNStore = (function () {
  "use strict";

  var SKEY = "pn-settings-v2";
  var FKEY = "pn-favorites-v1";
  var CKEY = "pn-custom-v1";
  var WKEY = "pn-watched-v1";

  var DEFAULTS = {
    // Bentuk & warna TV (dipisah sejak v6; dulu menyatu di "model")
    shape: "trinitron",  // trinitron|toshiba|akari|philips|sharp|polytron|jvc|panasonic|wood
    finish: "hitam",     // hitam|silver|grafit|ivory|krem|kayu|marun|dongker
    ratio169: false,     // false = 4:3, true = 16:9
    // Remote
    remoteMode: "point", // point = mengarah ke TV | flat = datar
    remoteClick: true,   // bunyi klik mekanis remote
    vibrate: true,       // getar halus di ponsel saat tombol ditekan
    // Efek layar
    vhs: false,          // efek VHS (tracking lines, chromatic aberration, jitter)
    scanlines: true,     // overlay scanline CRT
    scanIntensity: 55,   // 0..100
    noise: 25,           // 0..100 noise/static latar saat TV nyala
    flicker: true,       // kedip kaca CRT halus
    curvature: true,     // vignette kelengkungan tabung
    bright: 100,         // kecerahan gambar 50..150
    contrast: 100,       // kontras gambar 50..150
    saturate: 100,       // kejenuhan warna 50..150
    // Sinyal
    signalMode: "antenna", // antenna = interaktif | clean = selalu bersih | random = acak
    // Putar
    autoPower: false,    // TV langsung nyala saat halaman dibuka
    rememberCh: true,    // ingat channel terakhir ditonton
    autoNext: true,      // otomatis pindah saat video habis
    lastCh: "",          // kunci channel terakhir ("sumber:id")
    volume: 70,
    muted: false,
    antL: -27,           // sudut batang antena kiri (derajat) — bisa digeser user
    antR: 17             // sudut batang antena kanan (derajat)
  };

  // Migrasi skema lama: "model" (wood|black|silver) → shape + finish.
  var SHAPE_FINISH_FROM_MODEL = {
    wood: { shape: "wood", finish: "kayu" },
    black: { shape: "trinitron", finish: "hitam" },
    silver: { shape: "philips", finish: "silver" }
  };

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* abaikan */ }
  }

  var savedSettings = loadJSON(SKEY, {});
  var settings = Object.assign({}, DEFAULTS, savedSettings);
  if (!savedSettings.shape && SHAPE_FINISH_FROM_MODEL[savedSettings.model]) {
    var mig = SHAPE_FINISH_FROM_MODEL[savedSettings.model];
    settings.shape = mig.shape;
    settings.finish = mig.finish;
  }
  var favorites = loadJSON(FKEY, []);            // array kunci channel "sumber:id" (lama: id YouTube mentah)
  var customs = loadJSON(CKEY, []);              // array {id, title}
  var watched = loadJSON(WKEY, []);              // array kunci channel yang pernah ditonton

  if (!Array.isArray(favorites)) favorites = [];
  if (!Array.isArray(customs)) customs = [];
  if (!Array.isArray(watched)) watched = [];

  function saveSettings() { saveJSON(SKEY, settings); }
  function saveFavorites() { saveJSON(FKEY, favorites); }
  function saveCustoms() { saveJSON(CKEY, customs); }
  function saveWatched() { saveJSON(WKEY, watched); }

  function resetAll() {
    settings = Object.assign({}, DEFAULTS);
    favorites = [];
    customs = [];
    watched = [];
    try {
      localStorage.removeItem(SKEY);
      localStorage.removeItem(FKEY);
      localStorage.removeItem(CKEY);
      localStorage.removeItem(WKEY);
    } catch (e) { /* abaikan */ }
    saveSettings();
  }

  /* ---------- Kunci channel multi-sumber ---------- */
  // Bentuk kunci: "yt:<id>", "dm:<id>", "vimeo:<id>", "ia:<id>".
  // Favorit/riwayat lama menyimpan id YouTube mentah — tetap dikenali.
  function keyOf(src, id) { return (src || "yt") + ":" + id; }
  function hasKey(arr, key) {
    if (arr.indexOf(key) !== -1) return true;
    if (key.indexOf("yt:") === 0) return arr.indexOf(key.slice(3)) !== -1; // warisan lama
    return false;
  }
  function dropKey(arr, key) {
    var bare = key.indexOf("yt:") === 0 ? key.slice(3) : null;
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i] === key || (bare && arr[i] === bare)) arr.splice(i, 1);
    }
  }

  /* ---------- Channel ---------- */
  // Daftar gabungan: bawaan (channels.js, multi-sumber) + kustom user (YouTube).
  // Item dinormalisasi: {id, src, key, title, cat, station, thumb, custom}
  function allChannels() {
    var base = (typeof CHANNELS !== "undefined" ? CHANNELS : []).map(function (ch) {
      var src = ch.src || "yt";
      return {
        id: ch.id, src: src, key: keyOf(src, ch.id),
        title: ch.title, cat: ch.cat || "Siaran",
        station: ch.st || "Multi-Stasiun",
        thumb: ch.th || null, custom: false
      };
    });
    var mine = customs.map(function (ch) {
      return {
        id: ch.id, src: "yt", key: keyOf("yt", ch.id),
        title: ch.title, cat: "Channel Saya", station: "Channel Saya",
        thumb: null, custom: true
      };
    });
    return base.concat(mine);
  }

  /* ---------- Riwayat tontonan ---------- */
  function isWatched(key) { return hasKey(watched, key); }
  function markWatched(key) {
    if (!hasKey(watched, key)) { watched.push(key); saveWatched(); }
  }
  function watchedCount() { return watched.length; }

  function isFavorite(key) { return hasKey(favorites, key); }
  function toggleFavorite(key) {
    var on = hasKey(favorites, key);
    dropKey(favorites, key);
    if (!on) favorites.push(key);
    saveFavorites();
    return !on;
  }

  /* ---------- Channel kustom ---------- */
  // Terima ID mentah atau berbagai bentuk URL YouTube; kembalikan ID 11 char atau null.
  function extractVideoId(input) {
    if (!input) return null;
    var s = String(input).trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    var m = s.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
            s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
            s.match(/\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function addCustom(id, title) {
    if (customs.some(function (c) { return c.id === id; })) return false;
    if (allChannels().some(function (c) { return c.id === id && !c.custom; })) return false;
    customs.push({ id: id, title: title });
    saveCustoms();
    return true;
  }

  function removeCustom(id) {
    customs = customs.filter(function (c) { return c.id !== id; });
    saveCustoms();
  }

  return {
    settings: settings,
    saveSettings: saveSettings,
    resetAll: resetAll,
    allChannels: allChannels,
    keyOf: keyOf,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    isWatched: isWatched,
    markWatched: markWatched,
    watchedCount: watchedCount,
    extractVideoId: extractVideoId,
    addCustom: addCustom,
    removeCustom: removeCustom
  };
})();
