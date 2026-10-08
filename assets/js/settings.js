// Siar — penyimpanan lokal & penggabungan daftar channel.
// Mengelola: pengaturan tampilan, daftar favorit, dan channel kustom user.
// Semua tersimpan di localStorage browser (tidak ada data yang dikirim ke server).
var PNStore = (function () {
  "use strict";

  var SKEY = "pn-settings-v2";
  var FKEY = "pn-favorites-v1";
  var CKEY = "pn-custom-v1";

  var DEFAULTS = {
    vhs: false,          // efek VHS (tracking lines, chromatic aberration, jitter)
    scanlines: true,     // overlay scanline CRT
    scanIntensity: 55,   // 0..100
    noise: 25,           // 0..100 noise/static latar saat TV nyala
    model: "black",      // wood | black | silver
    ratio169: false,     // false = 4:3, true = 16:9
    volume: 70,
    muted: false
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

  var settings = Object.assign({}, DEFAULTS, loadJSON(SKEY, {}));
  var favorites = loadJSON(FKEY, []);            // array video_id
  var customs = loadJSON(CKEY, []);              // array {id, title}

  if (!Array.isArray(favorites)) favorites = [];
  if (!Array.isArray(customs)) customs = [];

  function saveSettings() { saveJSON(SKEY, settings); }
  function saveFavorites() { saveJSON(FKEY, favorites); }
  function saveCustoms() { saveJSON(CKEY, customs); }

  function resetAll() {
    settings = Object.assign({}, DEFAULTS);
    favorites = [];
    customs = [];
    try {
      localStorage.removeItem(SKEY);
      localStorage.removeItem(FKEY);
      localStorage.removeItem(CKEY);
    } catch (e) { /* abaikan */ }
    saveSettings();
  }

  /* ---------- Channel ---------- */
  // Daftar gabungan: bawaan (channels.js) + kustom user.
  // Setiap item dinormalisasi: {id, title, cat, custom:boolean}
  function allChannels() {
    var base = (typeof CHANNELS !== "undefined" ? CHANNELS : []).map(function (ch) {
      return { id: ch.id, title: ch.title, cat: ch.cat || "Siaran", custom: false };
    });
    var mine = customs.map(function (ch) {
      return { id: ch.id, title: ch.title, cat: "Channel Saya", custom: true };
    });
    return base.concat(mine);
  }

  function isFavorite(id) { return favorites.indexOf(id) !== -1; }
  function toggleFavorite(id) {
    var i = favorites.indexOf(id);
    if (i === -1) favorites.push(id); else favorites.splice(i, 1);
    saveFavorites();
    return i === -1;
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
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    extractVideoId: extractVideoId,
    addCustom: addCustom,
    removeCustom: removeCustom
  };
})();
