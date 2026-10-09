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
  var player = null;
  var playerReady = false;
  var osdTimer = null;
  var audioCtx = null;
  var sleepDeadline = 0;              // timestamp ms; 0 = sleep mati
  var sleepTick = null;

  // --- State fitur baru ---
  var digitBuf = "";                  // buffer nomor channel dari numpad/keyboard
  var digitTimer = null;
  var blockStation = null;            // stasiun blok aktif; null = navigasi bebas
  var guideStation = "SEMUA";         // filter chip di panduan (visual saja)
  var signalQ = 100;                  // kualitas sinyal channel aktif, 0..100

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    tv: $("tv"), screen: $("screen"), osd: $("osd"), chNum: $("chNum"),
    staticC: $("staticCanvas"), shield: $("clickShield"),
    powerHint: $("powerHint"), powerBtn: $("powerBtn"),
    powerFlash: $("powerFlash"), sleepBadge: $("sleepBadge"),
    vol: $("volSlider"), muteBtn: $("muteBtn"), guide: $("guideList"),
    guideSearch: $("guideSearch"), brandPlate: $("brandPlate"),
    nowTitle: $("nowTitle"), nowCat: $("nowCat"), favBtn: $("favBtn"),
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
    irLed: $("irLed"), irEye: $("irEye")
  };

  var MODEL_PLATES = {
    wood: "WOODTONE&nbsp;•&nbsp;1984",
    black: "TRINITRON-ISH&nbsp;•&nbsp;1997",
    silver: "FLATRON-ISH&nbsp;•&nbsp;2004"
  };

  // Urutan tampil chip stasiun di panduan
  var STATION_ORDER = ["RCTI", "SCTV", "Indosiar", "Trans TV", "Trans7", "Global TV",
    "ANTV", "MNCTV/TPI", "TVRI", "RTV", "NET.", "B Channel", "Space Toon",
    "Multi-Stasiun", "Channel Saya"];

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function cur() { return list[current]; }
  function thumb(id) { return "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function countOf(station) {
    return list.filter(function (ch) { return ch.station === station; }).length;
  }

  /* ================= Pengaturan tampilan ================= */
  function applySettings() {
    els.tv.classList.remove("model-wood", "model-black", "model-silver");
    els.tv.classList.add("model-" + S.model);
    els.tv.classList.toggle("ratio-169", !!S.ratio169);
    els.tv.classList.toggle("vhs-on", !!S.vhs);
    els.tv.classList.toggle("scan-off", !S.scanlines);
    els.tv.style.setProperty("--scan-alpha", (S.scanIntensity / 100 * 0.5).toFixed(2));
    els.brandPlate.innerHTML = MODEL_PLATES[S.model] || MODEL_PLATES.black;
    $("setVhs").checked = !!S.vhs;
    $("setScan").checked = !!S.scanlines;
    $("setRatio").checked = !!S.ratio169;
    $("setScanInt").value = S.scanIntensity;
    $("setNoise").value = S.noise;
    els.scanVal.textContent = S.scanIntensity + "%";
    els.noiseVal.textContent = S.noise + "%";
    Array.prototype.forEach.call(document.querySelectorAll(".model-card"), function (b) {
      b.classList.toggle("sel", b.getAttribute("data-model") === S.model);
    });
    applyAntenna();
    refreshSignal();
    if (playerReady) {
      player.setVolume(S.volume);
      if (S.muted) player.mute(); else player.unMute();
      updateMuteLabel();
    }
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
    var h = hashStr(ch.id);
    return { l: -55 + (h % 110), r: -55 + (((h >> 4) % 110) + 110) % 110 };
  }
  function computeSignal() {
    if (!list.length) { signalQ = 100; return signalQ; }
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
    } else if (guideStation !== "SEMUA") {
      els.blockBar.hidden = false;
      els.blockLabel.textContent = "Blok " + guideStation + ": " + countOf(guideStation) + " siaran siap diputar marathon";
      els.blockPlayBtn.hidden = false;
      els.blockExitBtn.hidden = true;
    } else {
      els.blockBar.hidden = true;
    }
    els.blockBadge.hidden = !blockStation;
    if (blockStation) els.blockBadge.textContent = "BLOK " + blockStation;
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
    if (guideStation === "SEMUA" && PNStore.isFavorite(ch.id)) return "★ Favorit";
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
        var fav = PNStore.isFavorite(ch.id);
        var seen = PNStore.isWatched(ch.id);
        html += '<li data-idx="' + i + '"' + (seen ? ' class="watched"' : "") + '>' +
          '<img class="th" src="' + thumb(ch.id) + '" alt="" loading="lazy">' +
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
        PNStore.toggleFavorite(list[idx].id);
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
    var keepId = list.length ? list[current].id : null;
    list = PNStore.allChannels();
    var ni = keepId ? list.findIndex(function (c) { return c.id === keepId; }) : -1;
    current = ni === -1 ? Math.min(current, Math.max(0, list.length - 1)) : ni;
  }

  /* ================= Info sedang tayang ================= */
  function syncNow() {
    if (!powered || !list.length) {
      els.nowTitle.textContent = "— TV mati —";
      els.nowCat.textContent = "";
    } else {
      els.nowTitle.textContent = "CH " + pad(current + 1) + " — " + cur().title;
      els.nowCat.textContent = cur().cat + " • " + cur().station;
    }
    els.chNum.textContent = powered && list.length ? pad(current + 1) : "--";
    syncFavBtn();
  }
  function syncFavBtn() {
    var on = list.length && PNStore.isFavorite(cur().id);
    els.favBtn.textContent = on ? "★ FAVORIT" : "☆ FAVORIT";
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

  /* ================= YouTube player ================= */
  function loadApi() {
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }
  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("player", {
      width: "100%", height: "100%",
      playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, disablekb: 1, playsinline: 1 },
      events: {
        onReady: function () {
          playerReady = true;
          player.setVolume(S.volume);
          if (S.muted) player.mute();
          updateMuteLabel();
          if (powered && list.length) player.loadVideoById(cur().id);
        },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.ENDED && powered) nextChannel();
        }
      }
    });
  };

  function tuneTo(idx) {
    if (!list.length) return;
    current = ((idx % list.length) + list.length) % list.length;
    // Keluar dari blok kalau pindah ke stasiun lain (mis. lewat panduan)
    if (blockStation && cur().station !== blockStation) exitBlock(false);
    PNStore.markWatched(cur().id);
    refreshSignal();
    staticFx(signalQ < 45 ? 800 : 450);
    showOsd(signalHint());
    markActive();
    syncNow();
    if (playerReady) {
      player.loadVideoById(cur().id);
      player.setVolume(S.volume);
      updateMuteLabel();
    }
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

  function powerOn() {
    if (!list.length) return;
    powered = true;
    els.tv.classList.add("on");
    els.powerHint.classList.add("off");
    els.powerBtn.classList.add("on");
    els.remPower.classList.add("on");
    crtOnFx();
    refreshSignal();
    staticFx(650);
    if (playerReady) player.loadVideoById(cur().id);
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
    refreshSignal();
    if (!silent) staticFx(220);
    if (playerReady) player.stopVideo();
    markActive();
    syncNow();
  }

  function updateMuteLabel() {
    if (!playerReady) return;
    var m = player.isMuted();
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
    els.veil.classList.add("on");
    els.fab.classList.add("on");
    els.fab.setAttribute("aria-expanded", "true");
    els.fab.setAttribute("aria-label", "Tutup remote");
  }
  function closeRemote() {
    if (!remoteOpen) return;
    remoteOpen = false;
    els.remote.classList.remove("open");
    els.remote.setAttribute("aria-hidden", "true");
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
  function flashIR() {
    [els.irLed, els.irEye].forEach(function (el) {
      if (!el) return;
      el.classList.remove("flash");
      void el.offsetWidth; // restart animasi
      el.classList.add("flash");
    });
    playClick();
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) { /* abaikan */ } }
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
  // Klik di layar: putar / jeda lewat API (dobel-klik tetap layar penuh)
  els.shield.addEventListener("click", function () {
    if (!powered || !playerReady || typeof YT === "undefined") return;
    if (player.getPlayerState() === YT.PlayerState.PLAYING) { player.pauseVideo(); showOsd("❚❚ PAUSE"); }
    else { player.playVideo(); showOsd("▶ PLAY"); }
  });
  els.backdrop.addEventListener("click", closeSheets);
  Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) {
    b.addEventListener("click", closeSheets);
  });

  els.vol.addEventListener("input", function () {
    S.volume = parseInt(els.vol.value, 10);
    if (S.volume > 0 && S.muted) S.muted = false;
    PNStore.saveSettings();
    if (playerReady) {
      player.setVolume(S.volume);
      if (S.muted) player.mute(); else player.unMute();
      updateMuteLabel();
    }
    if (powered) showOsdText("VOLUME " + S.volume, volBar(S.volume));
  });
  els.muteBtn.addEventListener("click", function () {
    if (!playerReady) return;
    S.muted = !player.isMuted();
    if (S.muted) player.mute(); else player.unMute();
    PNStore.saveSettings();
    updateMuteLabel();
    if (powered) showOsdText(S.muted ? "MUTE" : "VOLUME " + S.volume, S.muted ? "Suara dibisukan" : volBar(S.volume));
  });
  els.sleepSelect.addEventListener("change", function () {
    startSleep(parseInt(els.sleepSelect.value, 10));
  });
  els.favBtn.addEventListener("click", function () {
    if (!list.length) return;
    if (!powered) powerOn();
    PNStore.toggleFavorite(cur().id);
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

  /* ================= Event: Blok Stasiun ================= */
  els.blockPlayBtn.addEventListener("click", function () {
    startBlock(guideStation);
    closeSheets();
  });
  els.blockExitBtn.addEventListener("click", function () { exitBlock(true); });

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
  $("setVhs").addEventListener("change", function (e) { S.vhs = e.target.checked; PNStore.saveSettings(); applySettings(); });
  $("setScan").addEventListener("change", function (e) { S.scanlines = e.target.checked; PNStore.saveSettings(); applySettings(); });
  $("setRatio").addEventListener("change", function (e) { S.ratio169 = e.target.checked; PNStore.saveSettings(); applySettings(); });
  $("setScanInt").addEventListener("input", function (e) { S.scanIntensity = parseInt(e.target.value, 10); PNStore.saveSettings(); applySettings(); });
  $("setNoise").addEventListener("input", function (e) { S.noise = parseInt(e.target.value, 10); PNStore.saveSettings(); applySettings(); });
  Array.prototype.forEach.call(document.querySelectorAll(".model-card"), function (b) {
    b.addEventListener("click", function () {
      S.model = b.getAttribute("data-model");
      PNStore.saveSettings(); applySettings();
    });
  });
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
      case "ArrowUp": if (powered) { nextChannel(); e.preventDefault(); } break;
      case "ArrowDown": if (powered) { prevChannel(); e.preventDefault(); } break;
      case "ArrowRight": bumpVolume(5); break;
      case "ArrowLeft": bumpVolume(-5); break;
      case "m": case "M": els.muteBtn.click(); break;
      case "r": case "R": if (powered) randomChannel(); break;
      case "p": case "P": powered ? powerOff() : powerOn(); break;
      case "f": case "F": els.favBtn.click(); break;
      case "g": case "G": anyOpen() ? closeSheets() : openSheet("guide"); break;
      case "s": case "S": anyOpen() ? closeSheets() : openSheet("settings"); break;
      case "h": case "H": anyOpen() ? closeSheets() : openSheet("help"); break;
      default:
        if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
    }
  });

  /* ================= Init ================= */
  bindRod(els.rodL, "antL");
  bindRod(els.rodR, "antR");
  els.vol.value = S.volume;
  applySettings();
  buildGuide();
  syncNow();
  drawStatic();
  loadApi();
})();
