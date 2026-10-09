// Siar — logika TV analog.
// YouTube IFrame API buat putar embed resmi; pengaturan/favorit/channel kustom dari PNStore.
// Fitur: remote fisik (numpad + rocker), antena interaktif berburu sinyal,
// Blok Stasiun (marathon satu stasiun), penanda sudah-ditonton.
(function () {
  "use strict";

  var S = PNStore.settings;
  var list = PNStore.allChannels();   // daftar gabungan bawaan + kustom
  var current = 0;
  var powered = false;
  var osdTimer = null;
  var audioCtx = null;
  var sleepDeadline = 0;              // timestamp ms; 0 = sleep mati
  var sleepTick = null;

  // --- State fitur baru ---
  var digitBuf = "";                  // buffer nomor channel dari numpad/keyboard
  var digitTimer = null;
  var blockStation = null;            // stasiun blok aktif; null = navigasi bebas
  var hourBlock = null;               // label blok jam aktif (PAGI/SIANG/…); null = mati
  var hourIdxs = [];                  // antrean indeks global untuk blok jam aktif
  var guideStation = "SEMUA";         // filter chip di panduan (visual saja)
  var signalQ = 100;                  // kualitas sinyal channel aktif, 0..100

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    tv: $("tv"), screen: $("screen"), osd: $("osd"), chNum: $("chNum"),
    playerBox: $("player"),
    staticC: $("staticCanvas"), shield: $("clickShield"),
    powerHint: $("powerHint"), powerBtn: $("powerBtn"),
    powerFlash: $("powerFlash"), sleepBadge: $("sleepBadge"),
    vol: $("volSlider"), muteBtn: $("muteBtn"), guide: $("guideList"),
    guideSearch: $("guideSearch"), brandPlate: $("brandPlate"),
    favBtn: $("favBtn"),
    sleepSelect: $("sleepSelect"), sleepLeft: $("sleepLeft"),
    scanVal: $("scanVal"), noiseVal: $("noiseVal"),
    backdrop: $("backdrop"), guideSheet: $("guideSheet"),
    settingsSheet: $("settingsSheet"), helpModal: $("helpModal"),
    rodL: $("rodL"), rodR: $("rodR"), antenna: $("antenna"),
    sigVal: $("sigVal"), sigBar: $("sigBar"),
    stationChips: $("stationChips"), blockBar: $("blockBar"),
    blockLabel: $("blockLabel"), blockPlayBtn: $("blockPlayBtn"),
    blockExitBtn: $("blockExitBtn"), blockBadge: $("blockBadge"),
    guideProgress: $("guideProgress"), remPower: $("remPower"),
    remote: $("remote"), veil: $("remoteVeil"), fab: $("remoteFab"),
    irLed: $("irLed"), irEye: $("irEye"),
    stationBug: $("stationBug"), roomClock: $("roomClock"),
    clockDigital: $("clockDigital"), clockH: $("clockH"),
    clockM: $("clockM"), clockS: $("clockS")
  };

  // Plat merek mengikuti BENTUK TV (terinspirasi, bukan logo asli)
  var PLATES = {
    trinitron: "TRINITRON-ISH&nbsp;•&nbsp;1997",
    toshiba: "TOSHIBA-ISH&nbsp;•&nbsp;2002",
    akari: "AKARI-ISH&nbsp;•&nbsp;1999",
    philips: "PHILIPS-ISH&nbsp;•&nbsp;2001",
    sharp: "SHARP-ISH&nbsp;•&nbsp;2004",
    polytron: "POLITRON-ISH&nbsp;•&nbsp;2003",
    jvc: "JVC-ISH&nbsp;•&nbsp;2005",
    panasonic: "PANAFLAT-ISH&nbsp;•&nbsp;2006",
    wood: "WOODTONE&nbsp;•&nbsp;1984"
  };
  // Daftar bentuk & finishing — dipakai applySettings buat bersih-bersih kelas.
  var SHAPES = ["trinitron", "toshiba", "akari", "philips", "sharp", "polytron", "jvc", "panasonic", "wood"];
  var FINISHES = ["hitam", "silver", "grafit", "ivory", "krem", "kayu", "marun", "dongker"];
  // Finishing yang masuk akal per bentuk (kabinet kayu tak ditawari metalik)
  var FINISH_BY_SHAPE = { wood: ["kayu", "hitam", "ivory", "krem", "marun", "dongker"] };
  function finishAllowed(shape, finish) {
    var allow = FINISH_BY_SHAPE[shape];
    return !allow || allow.indexOf(finish) !== -1;
  }

  // Urutan tampil chip stasiun di panduan
  var STATION_ORDER = ["RCTI", "SCTV", "Indosiar", "Trans TV", "Trans7", "Global TV",
    "ANTV", "MNCTV/TPI", "TVRI", "RTV", "NET.", "B Channel", "Space Toon",
    "Multi-Stasiun", "Channel Saya"];

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function cur() { return list[current]; }
  function thumbOf(ch) {
    if (ch.thumb) return ch.thumb;
    if (ch.src === "yt") return "https://i.ytimg.com/vi/" + ch.id + "/hqdefault.jpg";
    if (ch.src === "dm") return "https://www.dailymotion.com/thumbnail/video/" + ch.id;
    if (ch.src === "ia") return "https://archive.org/services/img/" + ch.id;
    return ""; // vimeo tanpa thumbnail tersimpan → tanpa gambar
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function countOf(station) {
    return list.filter(function (ch) { return ch.station === station; }).length;
  }

  /* ================= Pengaturan tampilan ================= */
  function setChk(id, v) { var e = $(id); if (e) e.checked = !!v; }
  function setRange(id, v) { var e = $(id); if (e) e.value = v; }
  function setLbl(id, v) { var e = $(id); if (e) e.textContent = v; }
  function markCards(attr, val) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-" + attr + "]"), function (b) {
      var on = b.getAttribute("data-" + attr) === String(val);
      b.classList.toggle("sel", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function applySettings() {
    if (!finishAllowed(S.shape, S.finish)) S.finish = S.shape === "wood" ? "kayu" : "hitam";
    SHAPES.forEach(function (s) {
      els.tv.classList.toggle("shape-" + s, S.shape === s);
    });
    FINISHES.forEach(function (f) {
      els.tv.classList.toggle("finish-" + f, S.finish === f);
    });
    els.tv.classList.toggle("ratio-169", !!S.ratio169);
    els.tv.classList.toggle("vhs-on", !!S.vhs);
    els.tv.classList.toggle("scan-off", !S.scanlines);
    els.tv.classList.toggle("flicker-off", !S.flicker);
    els.tv.classList.toggle("curve-off", !S.curvature);
    els.tv.style.setProperty("--scan-alpha", (S.scanIntensity / 100 * 0.5).toFixed(2));
    els.brandPlate.innerHTML = PLATES[S.shape] || PLATES.trinitron;
    els.remote.classList.toggle("point", S.remoteMode === "point");

    markCards("shape", S.shape);
    markCards("finish", S.finish);
    Array.prototype.forEach.call(document.querySelectorAll("[data-finish]"), function (b) {
      b.classList.toggle("disabled", !finishAllowed(S.shape, b.getAttribute("data-finish")));
    });
    // Preview mini bentuk TV mengikuti finishing yang lagi aktif
    Array.prototype.forEach.call(document.querySelectorAll(".pv"), function (pv) {
      FINISHES.forEach(function (f) { pv.classList.toggle("finish-" + f, S.finish === f); });
    });
    markCards("rmode", S.remoteMode);
    markCards("sig", S.signalMode);

    setChk("setRatio", S.ratio169);
    setChk("setClick", S.remoteClick);
    setChk("setVibrate", S.vibrate);
    setChk("setVhs", S.vhs);
    setChk("setScan", S.scanlines);
    setRange("setScanInt", S.scanIntensity);
    setLbl("scanVal", S.scanIntensity + "%");
    setRange("setNoise", S.noise);
    setLbl("noiseVal", S.noise + "%");
    setChk("setCurve", S.curvature);
    setChk("setFlicker", S.flicker);
    setRange("setBright", S.bright);
    setLbl("brightVal", S.bright + "%");
    setRange("setContrast", S.contrast);
    setLbl("contrastVal", S.contrast + "%");
    setRange("setSaturate", S.saturate);
    setLbl("saturateVal", S.saturate + "%");
    setChk("setAutoPower", S.autoPower);
    setChk("setRemember", S.rememberCh);
    setChk("setAutoNext", S.autoNext);
    setChk("setImmersive", S.immersive);
    setChk("setClock", S.roomClock);
    setChk("setBug", S.stationBug);
    document.body.classList.toggle("immersive", !!S.immersive);
    document.body.classList.toggle("clock-off", !S.roomClock);
    refreshBug();

    applyAntenna();
    refreshSignal();
    vpApplyVolume();
    updateMuteLabel();
    fitStage(); // bentuk/warna/rasio mengubah tinggi panggung — samakan skala
  }

  /* Panggung satu layar: halaman terkunci (tidak bisa scroll/zoom), jadi
     bila konten alami lebih tinggi dari viewport, panggung diskalakan
     proporsional sampai pas — fokus selalu di TV, di semua ukuran layar
     (termasuk HP landscape pendek). Panel sheets tidak ikut terskala. */
  function fitStage() {
    var room = document.querySelector(".room");
    if (!room) return;
    room.style.transform = "";
    var s = Math.min(1,
      window.innerHeight / Math.max(1, room.offsetHeight),
      window.innerWidth / Math.max(1, room.offsetWidth));
    room.style.transform = s < 0.999 ? "scale(" + s.toFixed(4) + ")" : "";
  }
  window.addEventListener("resize", fitStage);
  window.addEventListener("orientationchange", fitStage);

  /* Filter gambar ala knob TV (kecerahan/kontras/warna) + degradasi sinyal + VHS.
     Diterapkan ke wadah player — berlaku untuk semua sumber video. */
  function applyPicture() {
    var b = S.bright, c = S.contrast, s = S.saturate;
    if (S.vhs) { b *= 1.03; c *= 1.06; s *= 1.25; }
    var f = "brightness(" + (b / 100).toFixed(3) + ") contrast(" + (c / 100).toFixed(3) +
            ") saturate(" + (s / 100).toFixed(3) + ")";
    if (powered && signalQ < 45) f += " saturate(0.5) contrast(1.08) brightness(0.94)";
    else if (powered && signalQ < 75) f += " saturate(0.85) contrast(1.03)";
    els.playerBox.style.filter = f;
  }

  /* ================= Antena & sinyal ================= */
  // Tiap channel punya "posisi antena terbaik" sendiri, diturunkan deterministik
  // dari video id — jadi berburu sinyal terasa beda tiap channel, tanpa data ekstra.
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function antTarget(ch) {
    var h = hashStr(ch.key);
    return { l: -55 + (h % 110), r: -55 + (((h >> 4) % 110) + 110) % 110 };
  }
  function computeSignal() {
    if (!list.length) { signalQ = 100; return signalQ; }
    if (S.signalMode === "clean") { signalQ = 100; return signalQ; }
    if (S.signalMode === "random") { signalQ = 30 + (hashStr(cur().key) % 67); return signalQ; } // 30–96, beda tiap channel
    var t = antTarget(cur());
    var dist = Math.abs(S.antL - t.l) + Math.abs(S.antR - t.r);
    signalQ = Math.max(4, Math.round(100 - dist * 0.62));
    return signalQ;
  }
  function applyAntenna() {
    els.rodL.style.transform = "rotate(" + S.antL + "deg)";
    els.rodR.style.transform = "rotate(" + S.antR + "deg)";
  }
  function refreshSignal() {
    computeSignal();
    els.sigVal.textContent = powered ? signalQ + "%" : "--%";
    els.sigBar.style.width = (powered ? signalQ : 0) + "%";
    els.tv.classList.toggle("sig-bad", powered && signalQ < 45);
    els.tv.classList.toggle("sig-mid", powered && signalQ >= 45 && signalQ < 75);
    // Pantulan cahaya layar ke ruangan (dipakai Mode Imersif): hidup mengikuti
    // nyala TV, kecerahan knob, dan bersihnya sinyal.
    var glow = powered ? Math.min(1, (S.bright / 150) * (0.45 + signalQ / 100 * 0.55)) : 0;
    els.tv.style.setProperty("--screen-glow", glow.toFixed(2));
    applyPicture();
  }
  function signalHint() {
    return "SINYAL " + signalQ + "%" + (signalQ < 45 ? " — GESER ANTENA" : "");
  }

  function bindRod(rod, key) {
    rod.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      try { rod.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
      var pivot = els.antenna.getBoundingClientRect();
      var px = pivot.left, py = pivot.top;
      function move(ev) {
        var dx = ev.clientX - px, dy = py - ev.clientY;
        if (dy < 8) dy = 8;
        var deg = Math.atan2(dx, dy) * 180 / Math.PI;
        deg = Math.max(-75, Math.min(75, Math.round(deg)));
        if (S[key] !== deg) {
          S[key] = deg;
          applyAntenna();
          refreshSignal();
          if (powered && signalQ < 60 && Math.random() < 0.25) playNoise(50);
        }
      }
      function up() {
        rod.removeEventListener("pointermove", move);
        rod.removeEventListener("pointerup", up);
        rod.removeEventListener("pointercancel", up);
        PNStore.saveSettings();
        if (powered) showOsd(signalHint());
      }
      rod.addEventListener("pointermove", move);
      rod.addEventListener("pointerup", up);
      rod.addEventListener("pointercancel", up);
    });
  }

  /* ================= Blok Stasiun ================= */
  // Daftar indeks global yang sedang "dijelajahi" CH+/CH−, auto-next & numpad.
  function navList() {
    var all = list.map(function (_, i) { return i; });
    if (hourBlock && hourIdxs.length) return hourIdxs;
    if (!blockStation) return all;
    var inBlock = all.filter(function (i) { return list[i].station === blockStation; });
    return inBlock.length ? inBlock : all;
  }
  function startBlock(station) {
    if (!station || station === "SEMUA") return;
    var nav = list.map(function (_, i) { return i; })
      .filter(function (i) { return list[i].station === station; });
    if (!nav.length) return;
    blockStation = station;
    hourBlock = null; hourIdxs = [];
    if (!powered) powerOn();
    // Awali dari ident stasiunnya kalau ada — seperti TV asli mulai dari station ID.
    var startIdx = nav[0];
    for (var k = 0; k < nav.length; k++) {
      if (list[nav[k]].cat === "Jingle & Ident") { startIdx = nav[k]; break; }
    }
    tuneTo(startIdx);
    showOsd("📡 BLOK " + station + " • " + nav.length + " SIARAN");
    updateBlockUI();
  }
  function exitBlock(announce) {
    if (!blockStation) return;
    blockStation = null;
    updateBlockUI();
    if (announce && powered) showOsd("BLOK MATI — SEMUA CHANNEL");
  }
  function updateBlockUI() {
    buildChips();
    if (blockStation) {
      els.blockBar.hidden = false;
      els.blockLabel.textContent = "📡 BLOK AKTIF: " + blockStation + " • " + countOf(blockStation) +
        " siaran — CH+/CH−, auto-next & numpad tetap di blok ini";
      els.blockPlayBtn.hidden = true;
      els.blockExitBtn.hidden = false;
      els.blockExitBtn.textContent = "✕ KELUAR BLOK";
    } else if (hourBlock) {
      els.blockBar.hidden = false;
      els.blockLabel.textContent = "⏰ BLOK JAM AKTIF: " + hourBlock + " • " + hourIdxs.length +
        " siaran — CH+/CH−, auto-next & numpad tetap di antrean jam ini";
      els.blockPlayBtn.hidden = true;
      els.blockExitBtn.hidden = false;
      els.blockExitBtn.textContent = "✕ KELUAR BLOK JAM";
    } else if (guideStation !== "SEMUA") {
      els.blockBar.hidden = false;
      els.blockLabel.textContent = "Blok " + guideStation + ": " + countOf(guideStation) + " siaran siap diputar marathon";
      els.blockPlayBtn.hidden = false;
      els.blockExitBtn.hidden = true;
    } else {
      els.blockBar.hidden = true;
    }
    els.blockBadge.hidden = !(blockStation || hourBlock);
    if (blockStation) els.blockBadge.textContent = "BLOK " + blockStation;
    else if (hourBlock) els.blockBadge.textContent = "⏰ JAM " + hourBlock;
  }

  /* ================= Blok Jam (jam tayang asli, WIB) ================= */
  // Susunan seperti jadwal TV betulan: pagi kartun, siang iklan,
  // sore sinetron, malam acara. Jam dihitung selalu dengan zona WIB.
  function wibNow() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  }
  function hourBlockInfo() {
    var h = wibNow().getHours();
    if (h >= 5 && h < 11) return { label: "PAGI", name: "Blok Kartun Pagi", cats: ["Opening Kartun", "Opening Tokusatsu"] };
    if (h >= 11 && h < 15) return { label: "SIANG", name: "Blok Iklan Siang", cats: ["Iklan Jadul"] };
    if (h >= 15 && h < 19) return { label: "SORE", name: "Sinetron Sore", cats: ["Sinetron & Acara TV"] };
    if (h >= 19 && h < 23) return { label: "MALAM", name: "Acara Malam", cats: ["Sinetron & Acara TV", "Jingle & Ident"] };
    return { label: "TENGAH MALAM", name: "Iklan Tengah Malam", cats: ["Iklan Jadul", "Jingle & Ident"] };
  }
  function startHourBlock() {
    var info = hourBlockInfo();
    var idxs = [];
    list.forEach(function (ch, i) { if (info.cats.indexOf(ch.cat) !== -1) idxs.push(i); });
    if (!idxs.length) return;
    hourIdxs = idxs;
    hourBlock = info.label;
    blockStation = null;
    if (!powered) powerOn();
    tuneTo(idxs[0]);
    showOsd("⏰ " + info.name + " • " + idxs.length + " SIARAN");
    updateBlockUI();
  }
  function exitHourBlock(announce) {
    if (!hourBlock) return;
    hourBlock = null;
    hourIdxs = [];
    updateBlockUI();
    if (announce && powered) showOsd("BLOK JAM MATI — SEMUA CHANNEL");
  }
  function toggleHourBlock() {
    if (hourBlock) exitHourBlock(true);
    else startHourBlock();
  }
  function buildChips() {
    var counts = {};
    list.forEach(function (ch) { counts[ch.station] = (counts[ch.station] || 0) + 1; });
    var html = '<button class="chip' + (guideStation === "SEMUA" ? " sel" : "") +
      '" data-st="SEMUA">Semua (' + list.length + ")</button>";
    STATION_ORDER.forEach(function (st) {
      if (!counts[st]) return;
      html += '<button class="chip' + (guideStation === st ? " sel" : "") +
        (blockStation === st ? " blk" : "") + '" data-st="' + esc(st) + '">' +
        esc(st) + " (" + counts[st] + ")</button>";
    });
    els.stationChips.innerHTML = html;
    Array.prototype.forEach.call(els.stationChips.querySelectorAll("[data-st]"), function (b) {
      b.addEventListener("click", function () {
        guideStation = b.getAttribute("data-st");
        buildGuide();
      });
    });
  }

  /* ================= Panduan siaran ================= */
  function groupOf(ch) {
    if (guideStation === "SEMUA" && PNStore.isFavorite(ch.key)) return "★ Favorit";
    return ch.cat;
  }
  function matchGuide(ch) {
    if (guideStation !== "SEMUA" && ch.station !== guideStation) return false;
    var q = (els.guideSearch.value || "").trim().toLowerCase();
    return !q || ch.title.toLowerCase().indexOf(q) !== -1;
  }

  function buildGuide() {
    buildChips();
    updateBlockUI();
    els.guideProgress.innerHTML = "Koleksi: <b>" + PNStore.watchedCount() + "</b>/" +
      list.length + " siaran sudah ditonton";

    var groups = [];
    list.forEach(function (ch) {
      if (!matchGuide(ch)) return;
      var g = groupOf(ch);
      if (groups.indexOf(g) === -1) groups.push(g);
    });
    // Favorit selalu paling atas, "Channel Saya" paling bawah
    groups.sort(function (a, b) {
      var rank = function (g) { return g === "★ Favorit" ? 0 : g === "Channel Saya" ? 2 : 1; };
      return rank(a) - rank(b);
    });

    if (!list.length) {
      els.guide.innerHTML = '<p class="empty">Belum ada siaran.</p>';
      return;
    }
    if (!groups.length) {
      els.guide.innerHTML = '<p class="empty">Tidak ada siaran yang cocok.</p>';
      return;
    }

    var html = "";
    groups.forEach(function (g) {
      html += '<div class="cat">' + esc(g) + "</div><ul>";
      list.forEach(function (ch, i) {
        if (groupOf(ch) !== g) return;
        if (!matchGuide(ch)) return;
        var fav = PNStore.isFavorite(ch.key);
        var seen = PNStore.isWatched(ch.key);
        var th = thumbOf(ch);
        html += '<li data-idx="' + i + '"' + (seen ? ' class="watched"' : "") + '>' +
          (th ? '<img class="th" src="' + th + '" alt="" loading="lazy">' : '<span class="th th-none" aria-hidden="true"></span>') +
          '<span class="num">' + pad(i + 1) + "</span>" +
          '<span class="ttl">' + esc(ch.title) +
          '<span class="stn">' + esc(ch.station) + "</span></span>" +
          (seen ? '<span class="seen" title="Sudah ditonton">✓</span>' : "") +
          '<button class="star' + (fav ? " on" : "") + '" data-fav="' + i + '" title="Favorit (F)">' + (fav ? "★" : "☆") + "</button>" +
          (ch.custom ? '<button class="del" data-del="' + i + '" title="Hapus channel">✕</button>' : "") +
          "</li>";
      });
      html += "</ul>";
    });
    els.guide.innerHTML = html;

    Array.prototype.forEach.call(els.guide.querySelectorAll("li"), function (li) {
      li.addEventListener("click", function (e) {
        if (e.target.closest("button")) return;
        var idx = parseInt(li.getAttribute("data-idx"), 10);
        if (!powered) powerOn();
        tuneTo(idx);
        closeSheets();
      });
    });
    Array.prototype.forEach.call(els.guide.querySelectorAll("[data-fav]"), function (b) {
      b.addEventListener("click", function () {
        var idx = parseInt(b.getAttribute("data-fav"), 10);
        PNStore.toggleFavorite(list[idx].key);
        buildGuide(); markActive(); syncFavBtn();
      });
    });
    Array.prototype.forEach.call(els.guide.querySelectorAll("[data-del]"), function (b) {
      b.addEventListener("click", function () {
        var idx = parseInt(b.getAttribute("data-del"), 10);
        var goneId = list[idx].id;
        PNStore.removeCustom(goneId);
        if (blockStation && !countOf(blockStation)) blockStation = null;
        refreshList();
        if (powered && list.length) tuneTo(Math.min(current, list.length - 1));
        buildGuide(); markActive(); syncNow();
      });
    });
    markActive();
  }

  function markActive() {
    Array.prototype.forEach.call(els.guide.querySelectorAll("li"), function (li) {
      li.classList.toggle("active", powered && parseInt(li.getAttribute("data-idx"), 10) === current);
    });
  }

  function refreshList() {
    var keepKey = list.length ? list[current].key : null;
    list = PNStore.allChannels();
    var ni = keepKey ? list.findIndex(function (c) { return c.key === keepKey; }) : -1;
    current = ni === -1 ? Math.min(current, Math.max(0, list.length - 1)) : ni;
  }

  /* ================= Info sedang tayang (di OSD layar saja) ================= */
  function syncNow() {
    els.chNum.textContent = powered && list.length ? pad(current + 1) : "--";
    syncFavBtn();
    refreshBug();
  }
  // Logo bug stasiun ala watermark TV asli (pojok layar, mengikuti st channel).
  function refreshBug() {
    if (!els.stationBug) return;
    var show = powered && S.stationBug && list.length;
    els.stationBug.hidden = !show;
    if (show) els.stationBug.textContent = cur().station;
  }
  function syncFavBtn() {
    var on = list.length && PNStore.isFavorite(cur().key);
    els.favBtn.textContent = on ? "★" : "☆";
    els.favBtn.classList.toggle("on", !!on);
  }

  /* ================= OSD ================= */
  function osdRender(main, sub, sub2) {
    els.osd.innerHTML = esc(main) +
      (sub ? "<small>" + esc(sub) + "</small>" : "") +
      (sub2 ? "<small>" + esc(sub2) + "</small>" : "");
    els.osd.classList.add("show");
    clearTimeout(osdTimer);
    osdTimer = setTimeout(function () { els.osd.classList.remove("show"); }, 2400);
  }
  function showOsd(extra) {
    if (!list.length) return;
    osdRender("CH " + pad(current + 1), cur().title, extra || null);
  }
  function showOsdText(main, sub) { osdRender(main, sub, null); }

  /* ================= Static / noise ================= */
  function drawStatic() {
    var c = els.staticC, ctx = c.getContext("2d");
    var img = ctx.createImageData(c.width, c.height);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  var burstTimer = null;
  function staticFx(ms) {
    els.staticC.style.opacity = "";
    els.staticC.classList.add("burst");
    clearInterval(burstTimer);
    burstTimer = setInterval(drawStatic, 50);
    playNoise(ms);
    setTimeout(function () {
      clearInterval(burstTimer);
      els.staticC.classList.remove("burst");
    }, ms);
  }

  // Noise latar pelan saat TV nyala: pengaturan user + bonus dari sinyal buruk
  setInterval(function () {
    if (!powered || document.hidden) return;
    if (els.staticC.classList.contains("burst")) return;
    var eff = Math.min(100, S.noise + (100 - signalQ) * 0.5);
    if (eff <= 0) { els.staticC.style.opacity = "0"; return; }
    els.staticC.style.opacity = (eff / 100 * 0.55).toFixed(2);
    drawStatic();
  }, 140);

  function playNoise(ms) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var len = Math.max(1, (audioCtx.sampleRate * ms) / 1000) | 0;
      var buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      var src = audioCtx.createBufferSource();
      src.buffer = buf;
      var filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass"; filter.frequency.value = 1800; filter.Q.value = 0.6;
      var gain = audioCtx.createGain();
      var t = audioCtx.currentTime;
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000);
      src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
      src.start(); src.stop(t + ms / 1000);
    } catch (e) { /* audio tidak tersedia */ }
  }

  /* ================= Lapisan pemutar multi-sumber ================= */
  // YouTube / Dailymotion / Vimeo lewat API resmi masing-masing;
  // archive.org memakai iframe standar (kontrol bawaan videonya).
  var vpMode = "none";        // yt | dm | vimeo | ia | none
  var vpPlaying = false;
  var ytPlayer = null, ytReady = false, ytWanted = null;
  var dmPlayer = null, vmPlayer = null;
  var apiLoading = {};

  function vpInject(src, cb) {
    var t = document.createElement("script");
    t.src = src;
    t.onload = function () { cb(true); };
    t.onerror = function () { cb(false); };
    document.head.appendChild(t);
  }
  function vpSetBox() {
    els.playerBox.className = "src-" + vpMode;
    els.playerBox.style.opacity = "1";
    els.screen.classList.toggle("native-ui", vpMode === "ia");
  }
  function vpTeardown(keep) {
    if (keep !== "yt" && ytPlayer) { try { ytPlayer.destroy(); } catch (e) { /* abaikan */ } ytPlayer = null; ytReady = false; }
    if (keep !== "vimeo" && vmPlayer) { try { vmPlayer.destroy(); } catch (e) { /* abaikan */ } vmPlayer = null; }
    if (keep !== "dm") dmPlayer = null;
    els.playerBox.innerHTML = "";
    vpPlaying = false;
  }
  function vpEnded() {
    vpPlaying = false;
    if (S.autoNext && powered) nextChannel();
  }
  function vpApplyVolume() {
    try {
      if (vpMode === "yt" && ytPlayer && ytReady) {
        ytPlayer.setVolume(S.volume);
        if (S.muted) ytPlayer.mute(); else ytPlayer.unMute();
      } else if (vpMode === "dm" && dmPlayer) {
        if (dmPlayer.setVolume) dmPlayer.setVolume(S.muted ? 0 : S.volume / 100);
        if (dmPlayer.setMuted) dmPlayer.setMuted(!!S.muted);
      } else if (vpMode === "vimeo" && vmPlayer) {
        var p = vmPlayer.setVolume(S.muted ? 0 : S.volume / 100);
        if (p && p.catch) p.catch(function () {});
        if (vmPlayer.setMuted) vmPlayer.setMuted(!!S.muted);
      }
    } catch (e) { /* abaikan */ }
  }
  function vpLoad(ch) {
    if (!ch) return;
    var src = ch.src || "yt";
    if (src === "dm") vpLoadDm(ch);
    else if (src === "vimeo") vpLoadVm(ch);
    else if (src === "ia") vpLoadIa(ch);
    else vpLoadYt(ch);
  }

  function vpLoadYt(ch) {
    var reuse = (vpMode === "yt" && ytPlayer && ytReady);
    vpMode = "yt"; vpSetBox();
    if (reuse) { try { ytPlayer.loadVideoById(ch.id); } catch (e) { /* abaikan */ } vpApplyVolume(); return; }
    vpTeardown("yt");
    ytWanted = ch;
    if (window.YT && YT.Player) { buildYt(ch); return; }
    window.onYouTubeIframeAPIReady = function () { if (vpMode === "yt" && ytWanted) buildYt(ytWanted); };
    if (!apiLoading.yt) { apiLoading.yt = true; vpInject("https://www.youtube.com/iframe_api", function () {}); }
  }
  function buildYt(ch) {
    els.playerBox.innerHTML = "";
    var slot = document.createElement("div");
    slot.id = "ytSlot";
    els.playerBox.appendChild(slot);
    ytPlayer = new YT.Player("ytSlot", {
      width: "100%", height: "100%", videoId: ch.id,
      playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, disablekb: 1, playsinline: 1 },
      events: {
        onReady: function () {
          ytReady = true;
          vpApplyVolume();
          try { ytPlayer.playVideo(); } catch (e) { /* abaikan */ }
        },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) vpPlaying = true;
          else if (e.data === YT.PlayerState.PAUSED) vpPlaying = false;
          else if (e.data === YT.PlayerState.ENDED) vpEnded();
        }
      }
    });
  }

  function vpLoadDm(ch) {
    vpMode = "dm"; vpSetBox();
    vpTeardown("dm");
    if (window.DM && DM.Player) { buildDm(ch); return; }
    if (!apiLoading.dm) {
      apiLoading.dm = true;
      vpInject("https://api.dmcdn.net/all.js", function (ok) {
        if (ok && vpMode === "dm" && list.length) buildDm(cur());
      });
    }
  }
  function buildDm(ch) {
    els.playerBox.innerHTML = "";
    var slot = document.createElement("div");
    slot.id = "dmSlot";
    els.playerBox.appendChild(slot);
    try {
      dmPlayer = new DM.Player(slot, {
        video: ch.id, width: "100%", height: "100%",
        params: { autoplay: true, controls: false, "ui-logo": false, sharing_enable: false }
      });
      dmPlayer.addEventListener("play", function () { vpPlaying = true; });
      dmPlayer.addEventListener("playing", function () { vpPlaying = true; });
      dmPlayer.addEventListener("pause", function () { vpPlaying = false; });
      dmPlayer.addEventListener("video_end", function () { vpEnded(); });
      dmPlayer.addEventListener("apiready", function () { vpApplyVolume(); });
    } catch (e) {
      dmPlayer = null;
      els.playerBox.innerHTML = '<iframe src="https://www.dailymotion.com/embed/video/' +
        encodeURIComponent(ch.id) + '?autoplay=1" allow="autoplay; fullscreen" allowfullscreen title=""></iframe>';
    }
  }

  function vpLoadVm(ch) {
    vpMode = "vimeo"; vpSetBox();
    if (vmPlayer && window.Vimeo) {
      try {
        var pr = vmPlayer.loadVideo(ch.id);
        if (pr && pr.then) {
          pr.then(function () { vpApplyVolume(); try { vmPlayer.play(); } catch (e) { /* abaikan */ } },
                  function () { buildVm(ch); });
          return;
        }
      } catch (e) { /* bangun ulang di bawah */ }
    }
    vpTeardown("vimeo");
    if (window.Vimeo && Vimeo.Player) { buildVm(ch); return; }
    if (!apiLoading.vm) {
      apiLoading.vm = true;
      vpInject("https://player.vimeo.com/api/player.js", function (ok) {
        if (ok && vpMode === "vimeo" && list.length) buildVm(cur());
      });
    }
  }
  function buildVm(ch) {
    els.playerBox.innerHTML = "";
    var slot = document.createElement("div");
    slot.id = "vmSlot";
    els.playerBox.appendChild(slot);
    try {
      vmPlayer = new Vimeo.Player(slot, {
        id: ch.id, width: "100%", height: "100%", autoplay: true,
        controls: false, title: false, byline: false, portrait: false, loop: false
      });
      vmPlayer.on("play", function () { vpPlaying = true; });
      vmPlayer.on("pause", function () { vpPlaying = false; });
      vmPlayer.on("ended", function () { vpEnded(); });
      vmPlayer.ready().then(function () { vpApplyVolume(); });
    } catch (e) { vmPlayer = null; }
  }

  function vpLoadIa(ch) {
    vpMode = "ia"; vpSetBox();
    vpTeardown("ia");
    var f = document.createElement("iframe");
    f.src = "https://archive.org/embed/" + encodeURIComponent(ch.id) + "?autoplay=1";
    f.setAttribute("allow", "autoplay; fullscreen");
    f.setAttribute("allowfullscreen", "");
    f.title = ch.title;
    els.playerBox.appendChild(f);
    vpPlaying = true; // kontrol play/pause dari UI bawaan arsip
  }

  function vpStop() {
    try {
      if (vpMode === "yt" && ytPlayer && ytReady) ytPlayer.stopVideo();
      else if (vpMode === "dm" && dmPlayer && dmPlayer.pause) dmPlayer.pause();
      else if (vpMode === "vimeo" && vmPlayer) { var p = vmPlayer.pause(); if (p && p.catch) p.catch(function () {}); }
      else if (vpMode === "ia") els.playerBox.innerHTML = "";
    } catch (e) { /* abaikan */ }
    vpPlaying = false;
    els.playerBox.style.opacity = "0";
  }
  function vpToggle() {
    if (vpMode === "ia" || vpMode === "none") return; // ia: shield disembunyikan, pakai kontrol arsip
    try {
      if (vpMode === "yt" && ytPlayer && ytReady) {
        if (vpPlaying) { ytPlayer.pauseVideo(); showOsd("❚❚ PAUSE"); }
        else { ytPlayer.playVideo(); showOsd("▶ PLAY"); }
      } else if (vpMode === "dm" && dmPlayer) {
        if (dmPlayer.togglePlay) dmPlayer.togglePlay();
        else if (vpPlaying) dmPlayer.pause(); else dmPlayer.play();
        showOsd(vpPlaying ? "❚❚ PAUSE" : "▶ PLAY");
      } else if (vpMode === "vimeo" && vmPlayer) {
        if (vpPlaying) vmPlayer.pause(); else vmPlayer.play();
        showOsd(vpPlaying ? "❚❚ PAUSE" : "▶ PLAY");
      }
    } catch (e) { /* abaikan */ }
  }

  function tuneTo(idx) {
    if (!list.length) return;
    current = ((idx % list.length) + list.length) % list.length;
    // Keluar dari blok kalau pindah ke stasiun lain (mis. lewat panduan)
    if (blockStation && cur().station !== blockStation) exitBlock(false);
    // Keluar dari blok jam kalau pindah ke siaran di luar antrean jam
    if (hourBlock && hourIdxs.indexOf(current) === -1) exitHourBlock(false);
    PNStore.markWatched(cur().key);
    if (S.rememberCh) { S.lastCh = cur().key; PNStore.saveSettings(); }
    refreshSignal();
    flashEye();
    staticFx(signalQ < 45 ? 800 : 450);
    showOsd(signalHint());
    markActive();
    syncNow();
    vpLoad(cur());
  }

  function stepChannel(dir) {
    var nav = navList();
    var pos = nav.indexOf(current);
    if (pos === -1) pos = dir > 0 ? -1 : 0;
    tuneTo(nav[(pos + dir + nav.length) % nav.length]);
  }
  function nextChannel() { stepChannel(1); }
  function prevChannel() { stepChannel(-1); }
  function randomChannel() {
    var nav = navList();
    if (nav.length < 2) return tuneTo(current);
    var pick;
    do { pick = nav[(Math.random() * nav.length) | 0]; } while (pick === current);
    tuneTo(pick);
  }

  /* ================= Numpad / digit buffer ================= */
  function pushDigit(d) {
    if (!list.length) return;
    if (!powered) powerOn();
    digitBuf = (digitBuf + d).slice(-3);
    showOsdText("CH " + digitBuf + "_",
      blockStation ? "Blok " + blockStation + " — nomor urut dalam blok" : "Ketik nomor channel…");
    clearTimeout(digitTimer);
    digitTimer = setTimeout(commitDigit, 900);
  }
  function commitDigit() {
    if (!digitBuf) return;
    var n = parseInt(digitBuf, 10);
    digitBuf = "";
    var nav = navList();
    if (n >= 1 && n <= nav.length) tuneTo(nav[n - 1]);
    else showOsdText("CH " + n + " TIDAK ADA", blockStation ? "Blok " + blockStation + " cuma " + nav.length + " siaran" : "Cuma ada " + nav.length + " channel");
  }

  /* ================= Power ================= */
  function crtOnFx() {
    els.powerFlash.classList.remove("go");
    void els.powerFlash.offsetWidth; // restart animasi
    els.powerFlash.classList.add("go");
  }
  // Animasi mati CRT: gambar kolaps jadi garis cahaya lalu padam.
  function crtOffFx() {
    els.powerFlash.classList.remove("go-off");
    void els.powerFlash.offsetWidth; // restart animasi
    els.powerFlash.classList.add("go-off");
  }

  function powerOn() {
    if (!list.length) return;
    powered = true;
    els.tv.classList.add("on");
    els.powerHint.classList.add("off");
    els.powerBtn.classList.add("on");
    els.remPower.classList.add("on");
    crtOnFx();
    flashEye();
    refreshSignal();
    staticFx(650);
    vpLoad(cur());
    showOsd(signalHint());
    markActive();
    syncNow();
  }
  function powerOff(silent) {
    powered = false;
    els.tv.classList.remove("on");
    els.powerHint.classList.remove("off");
    els.powerBtn.classList.remove("on");
    els.remPower.classList.remove("on");
    els.osd.classList.remove("show");
    flashEye();
    refreshSignal();
    if (!silent) { crtOffFx(); staticFx(220); }
    vpStop();
    markActive();
    syncNow();
  }

  function updateMuteLabel() {
    var m = !!S.muted;
    els.muteBtn.textContent = "MUTE";
    els.muteBtn.classList.toggle("on", m);
    els.muteBtn.title = m ? "Suara mati — klik untuk menyalakan (M)" : "Mute (M)";
  }

  /* ================= Sleep timer ================= */
  function fmtLeft(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    return pad((s / 60) | 0) + ":" + pad(s % 60);
  }
  function startSleep(mins) {
    clearInterval(sleepTick);
    if (!mins) {
      sleepDeadline = 0;
      els.sleepLeft.hidden = true;
      els.sleepBadge.textContent = "";
      return;
    }
    sleepDeadline = Date.now() + mins * 60000;
    els.sleepLeft.hidden = false;
    sleepTick = setInterval(function () {
      var left = sleepDeadline - Date.now();
      if (left <= 0) {
        clearInterval(sleepTick);
        els.sleepLeft.hidden = true;
        els.sleepBadge.textContent = "";
        els.sleepSelect.value = "0";
        if (powered) { powerOff(); }
        return;
      }
      var txt = "SLEEP " + fmtLeft(left);
      els.sleepLeft.textContent = txt;
      els.sleepBadge.textContent = txt;
    }, 500);
  }

  /* ================= Panel / overlay ================= */
  function openSheet(which) {
    closeRemote();
    closeSheets();
    els.backdrop.hidden = false;
    if (which === "guide") { els.guideSheet.hidden = false; els.guideSheet.classList.add("open"); els.guideSearch.focus(); }
    if (which === "settings") { els.settingsSheet.hidden = false; els.settingsSheet.classList.add("open"); }
    if (which === "help") { els.helpModal.hidden = false; }
  }
  function closeSheets() {
    els.backdrop.hidden = true;
    els.guideSheet.hidden = true; els.guideSheet.classList.remove("open");
    els.settingsSheet.hidden = true; els.settingsSheet.classList.remove("open");
    els.helpModal.hidden = true;
  }
  function anyOpen() {
    return !els.guideSheet.hidden || !els.settingsSheet.hidden || !els.helpModal.hidden;
  }

  /* ================= Layar penuh ================= */
  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (els.tv.requestFullscreen) els.tv.requestFullscreen();
  }

  function bumpVolume(delta) {
    els.vol.value = Math.max(0, Math.min(100, +els.vol.value + delta));
    els.vol.dispatchEvent(new Event("input"));
  }

  /* ================= Remote overlay & efek IR ================= */
  var remoteOpen = false;
  function openRemote() {
    remoteOpen = true;
    els.remote.classList.add("open");
    els.remote.setAttribute("aria-hidden", "false");
    try { els.remote.inert = false; } catch (e) { /* abaikan */ }
    els.veil.classList.add("on");
    els.fab.classList.add("on");
    els.fab.classList.add("seen");
    els.fab.setAttribute("aria-expanded", "true");
    els.fab.setAttribute("aria-label", "Tutup remote");
  }
  function closeRemote() {
    if (!remoteOpen) return;
    remoteOpen = false;
    els.remote.classList.remove("open");
    els.remote.setAttribute("aria-hidden", "true");
    try { els.remote.inert = true; } catch (e) { /* abaikan */ }
    els.veil.classList.remove("on");
    els.fab.classList.remove("on");
    els.fab.setAttribute("aria-expanded", "false");
    els.fab.setAttribute("aria-label", "Buka remote");
  }
  function toggleRemote() { remoteOpen ? closeRemote() : openRemote(); }

  // Bunyi klik mekanis pendek ala tombol remote (WebAudio, tanpa aset).
  function playClick() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var t = audioCtx.currentTime;
      var osc = audioCtx.createOscillator(), g = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(1900, t);
      g.gain.setValueAtTime(0.045, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.045);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + 0.05);
    } catch (e) { /* audio tidak tersedia */ }
  }

  // LED inframerah remote berkedip + sensor di bodi TV menyala menerima sinyal.
  function flashEye() {
    var el = els.irEye;
    if (!el) return;
    el.classList.remove("flash");
    void el.offsetWidth; // restart animasi
    el.classList.add("flash");
  }
  function flashIR() {
    var led = els.irLed;
    if (led) {
      led.classList.remove("flash");
      void led.offsetWidth;
      led.classList.add("flash");
    }
    // Mode "mengarah ke TV": pancaran IR terasa menembak ke depan.
    var beam = $("irBeam");
    if (beam && S.remoteMode === "point") {
      beam.classList.remove("flash");
      void beam.offsetWidth;
      beam.classList.add("flash");
    }
    flashEye();
    if (S.remoteClick) playClick();
    if (S.vibrate && navigator.vibrate) { try { navigator.vibrate(10); } catch (e) { /* abaikan */ } }
  }

  function volBar(v) {
    var filled = Math.round(v / 10);
    var s = "";
    for (var i = 0; i < 10; i++) s += i < filled ? "▮" : "▯";
    return s;
  }

  /* ================= Event: kontrol TV ================= */
  els.powerBtn.addEventListener("click", function () { powered ? powerOff() : powerOn(); });
  els.screen.addEventListener("dblclick", toggleFs);
  // Klik di layar: putar / jeda lewat API pemutar aktif (dobel-klik tetap layar penuh)
  els.shield.addEventListener("click", function () {
    if (!powered) return;
    vpToggle();
  });
  els.backdrop.addEventListener("click", closeSheets);
  Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) {
    b.addEventListener("click", closeSheets);
  });

  els.vol.addEventListener("input", function () {
    S.volume = parseInt(els.vol.value, 10);
    if (S.volume > 0 && S.muted) S.muted = false;
    PNStore.saveSettings();
    vpApplyVolume();
    updateMuteLabel();
    if (powered) showOsdText("VOLUME " + S.volume, volBar(S.volume));
    flashEye();
  });
  els.muteBtn.addEventListener("click", function () {
    S.muted = !S.muted;
    PNStore.saveSettings();
    vpApplyVolume();
    updateMuteLabel();
    if (powered) showOsdText(S.muted ? "MUTE" : "VOLUME " + S.volume, S.muted ? "Suara dibisukan" : volBar(S.volume));
    flashEye();
  });
  els.sleepSelect.addEventListener("change", function () {
    startSleep(parseInt(els.sleepSelect.value, 10));
  });
  els.favBtn.addEventListener("click", function () {
    if (!list.length) return;
    if (!powered) powerOn();
    PNStore.toggleFavorite(cur().key);
    syncFavBtn(); buildGuide();
  });

  /* ================= Event: remote overlay ================= */
  els.fab.addEventListener("click", function () {
    if (anyOpen()) closeSheets();
    toggleRemote();
  });
  els.veil.addEventListener("click", closeRemote);
  // Tiap tombol remote ditekan: LED IR + sensor TV berkedip, klik, getar halus.
  els.remote.addEventListener("pointerdown", function (e) {
    if (e.target.closest(".rbtn")) flashIR();
  });
  $("remClose").addEventListener("click", closeRemote);
  els.remPower.addEventListener("click", function () { powered ? powerOff() : powerOn(); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-digit]"), function (b) {
    b.addEventListener("click", function () { pushDigit(b.getAttribute("data-digit")); });
  });
  $("remChUp").addEventListener("click", function () { if (powered) nextChannel(); });
  $("remChDn").addEventListener("click", function () { if (powered) prevChannel(); });
  $("remVolUp").addEventListener("click", function () { bumpVolume(5); });
  $("remVolDn").addEventListener("click", function () { bumpVolume(-5); });
  $("remRandom").addEventListener("click", function () { if (powered) randomChannel(); });
  $("remFav").addEventListener("click", function () { els.favBtn.click(); });
  $("remGuide").addEventListener("click", function () { openSheet("guide"); });
  $("remSet").addEventListener("click", function () { openSheet("settings"); });
  $("remHelp").addEventListener("click", function () { openSheet("help"); });
  $("remFull").addEventListener("click", function () { toggleFs(); closeRemote(); });
  $("remBlock").addEventListener("click", function () {
    if (blockStation) exitBlock(true);
    else openSheet("guide");
  });
  $("remJam").addEventListener("click", function () { toggleHourBlock(); });

  /* ================= Event: Blok Stasiun ================= */
  els.blockPlayBtn.addEventListener("click", function () {
    startBlock(guideStation);
    closeSheets();
  });
  els.blockExitBtn.addEventListener("click", function () {
    if (hourBlock) exitHourBlock(true);
    else exitBlock(true);
  });
  $("guideJamBtn").addEventListener("click", function () {
    startHourBlock();
    closeSheets();
  });

  /* ================= Event: panduan ================= */
  els.guideSearch.addEventListener("input", buildGuide);
  $("addForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var id = PNStore.extractVideoId($("addUrl").value);
    var title = $("addTitle").value.trim();
    var msg = $("addMsg");
    if (!id) { msg.textContent = "Link / ID YouTube tidak valid."; msg.className = "form-msg err"; return; }
    if (!title) { msg.textContent = "Isi nama siarannya dulu."; msg.className = "form-msg err"; return; }
    if (!PNStore.addCustom(id, title)) {
      msg.textContent = "Channel itu sudah ada di daftar.";
      msg.className = "form-msg err";
      return;
    }
    msg.textContent = "Tersimpan di grup Channel Saya.";
    msg.className = "form-msg ok";
    $("addUrl").value = ""; $("addTitle").value = "";
    refreshList(); buildGuide();
  });

  /* ================= Event: pengaturan ================= */
  // Simpan ke localStorage lalu terapkan ulang SELURUH tampilan.
  // (Dulu helper ini dipanggil bindChk/bindRange/bindCards tapi TIDAK PERNAH
  //  didefinisikan — setiap klik/geser melempar ReferenceError tepat setelah
  //  state di-assign, jadi applySettings() & penyimpanan tak pernah jalan.
  //  Itulah bug "opsi Model & Warna tidak bisa diklik" di v6.)
  function saveAndApply() {
    PNStore.saveSettings();
    applySettings();
  }
  function bindChk(id, key) {
    $(id).addEventListener("change", function (e) { S[key] = e.target.checked; saveAndApply(); });
  }
  function bindRange(id, key) {
    $(id).addEventListener("input", function (e) { S[key] = parseInt(e.target.value, 10); saveAndApply(); });
  }
  function bindCards(attr, key) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-" + attr + "]"), function (b) {
      b.addEventListener("click", function () { S[key] = b.getAttribute("data-" + attr); saveAndApply(); });
    });
  }
  bindChk("setRatio", "ratio169");
  bindChk("setClick", "remoteClick");
  bindChk("setVibrate", "vibrate");
  bindChk("setVhs", "vhs");
  bindChk("setScan", "scanlines");
  bindRange("setScanInt", "scanIntensity");
  bindRange("setNoise", "noise");
  bindChk("setCurve", "curvature");
  bindChk("setFlicker", "flicker");
  bindRange("setBright", "bright");
  bindRange("setContrast", "contrast");
  bindRange("setSaturate", "saturate");
  bindChk("setAutoPower", "autoPower");
  bindChk("setRemember", "rememberCh");
  bindChk("setAutoNext", "autoNext");
  bindChk("setImmersive", "immersive");
  bindChk("setClock", "roomClock");
  bindChk("setBug", "stationBug");
  bindCards("shape", "shape");
  bindCards("finish", "finish");
  bindCards("rmode", "remoteMode");
  bindCards("sig", "signalMode");
  $("resetBtn").addEventListener("click", function () {
    PNStore.resetAll();
    S = PNStore.settings;
    blockStation = null;
    refreshList();
    els.vol.value = S.volume;
    applySettings(); buildGuide(); syncNow();
  });

  /* ================= Keyboard ================= */
  document.addEventListener("keydown", function (e) {
    var tag = e.target.tagName;
    var typing = (tag === "INPUT" && e.target.type !== "range") || tag === "TEXTAREA" || tag === "SELECT";
    if (e.key === "Escape") { closeSheets(); closeRemote(); return; }
    if (typing) return;
    switch (e.key) {
      case " ":
        // Spasi = putar/jeda; jangan rebut bila fokus lagi di tombol/kontrol.
        if (e.target.closest && e.target.closest("button, select, a")) break;
        if (powered) { vpToggle(); e.preventDefault(); }
        break;
      case "ArrowUp": if (powered) { nextChannel(); e.preventDefault(); } break;
      case "ArrowDown": if (powered) { prevChannel(); e.preventDefault(); } break;
      case "ArrowRight": bumpVolume(5); break;
      case "ArrowLeft": bumpVolume(-5); break;
      case "m": case "M": els.muteBtn.click(); break;
      case "r": case "R": if (powered) randomChannel(); break;
      case "j": case "J": toggleHourBlock(); break;
      case "p": case "P": powered ? powerOff() : powerOn(); break;
      case "f": case "F": els.favBtn.click(); break;
      case "g": case "G": anyOpen() ? closeSheets() : openSheet("guide"); break;
      case "s": case "S": anyOpen() ? closeSheets() : openSheet("settings"); break;
      case "h": case "H": anyOpen() ? closeSheets() : openSheet("help"); break;
      default:
        if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
    }
  });

  /* ================= Jam dinding ruangan (WIB) ================= */
  function updateClock() {
    if (!els.clockDigital) return;
    var now = wibNow();
    var hh = now.getHours(), mm = now.getMinutes(), ss = now.getSeconds();
    els.clockDigital.textContent = pad(hh) + ":" + pad(mm) + " WIB";
    if (els.clockH) els.clockH.style.transform = "translateX(-50%) rotate(" + ((hh % 12) * 30 + mm * 0.5) + "deg)";
    if (els.clockM) els.clockM.style.transform = "translateX(-50%) rotate(" + (mm * 6 + ss * 0.1) + "deg)";
    if (els.clockS) els.clockS.style.transform = "translateX(-50%) rotate(" + (ss * 6) + "deg)";
  }
  setInterval(updateClock, 1000);

  /* ================= Init ================= */
  try { els.remote.inert = true; } catch (e) { /* abaikan */ }
  bindRod(els.rodL, "antL");
  bindRod(els.rodR, "antR");
  els.vol.value = S.volume;
  // Ingat channel terakhir: mulai dari siaran terakhir yang ditonton.
  if (S.rememberCh && S.lastCh) {
    var lastIdx = list.findIndex(function (c) { return c.key === S.lastCh; });
    if (lastIdx !== -1) current = lastIdx;
  }
  applySettings();
  buildGuide();
  syncNow();
  updateClock();
  drawStatic();
  if (S.autoPower && list.length) powerOn();
})();
