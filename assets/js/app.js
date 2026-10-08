// Siar v2 — logika TV analog.
// YouTube IFrame API buat putar embed resmi; pengaturan/favorit/channel kustom dari PNStore.
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
    settingsSheet: $("settingsSheet"), helpModal: $("helpModal")
  };

  var MODEL_PLATES = {
    wood: "WOODTONE&nbsp;•&nbsp;1984",
    black: "TRINITRON-ISH&nbsp;•&nbsp;1997",
    silver: "FLATRON-ISH&nbsp;•&nbsp;2004"
  };

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function cur() { return list[current]; }
  function thumb(id) { return "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
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
    if (playerReady) {
      player.setVolume(S.volume);
      if (S.muted) player.mute(); else player.unMute();
      updateMuteLabel();
    }
  }

  /* ================= Panduan siaran ================= */
  function groupOf(ch) {
    if (PNStore.isFavorite(ch.id)) return "★ Favorit";
    return ch.cat;
  }

  function buildGuide() {
    var q = (els.guideSearch.value || "").trim().toLowerCase();
    var groups = [];
    list.forEach(function (ch, i) {
      if (q && ch.title.toLowerCase().indexOf(q) === -1) return;
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
        if (q && ch.title.toLowerCase().indexOf(q) === -1) return;
        var fav = PNStore.isFavorite(ch.id);
        html += '<li data-idx="' + i + '">' +
          '<img class="th" src="' + thumb(ch.id) + '" alt="" loading="lazy">' +
          '<span class="num">' + pad(i + 1) + "</span>" +
          '<span class="ttl">' + esc(ch.title) + "</span>" +
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
      els.nowCat.textContent = cur().cat;
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
  function showOsd(extra) {
    if (!list.length) return;
    els.osd.innerHTML = "CH " + pad(current + 1) + "<small>" + esc(cur().title) + "</small>" +
      (extra ? "<small>" + esc(extra) + "</small>" : "");
    els.osd.classList.add("show");
    clearTimeout(osdTimer);
    osdTimer = setTimeout(function () { els.osd.classList.remove("show"); }, 2400);
  }

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

  // Noise latar pelan saat TV nyala (intensitas dari pengaturan)
  setInterval(function () {
    if (!powered || document.hidden) return;
    if (S.noise <= 0 || els.staticC.classList.contains("burst")) return;
    els.staticC.style.opacity = (S.noise / 100 * 0.28).toFixed(2);
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
    staticFx(500);
    showOsd();
    markActive();
    syncNow();
    if (playerReady) {
      player.loadVideoById(cur().id);
      player.setVolume(S.volume);
      updateMuteLabel();
    }
  }

  function nextChannel() { tuneTo(current + 1); }
  function prevChannel() { tuneTo(current - 1); }
  function randomChannel() {
    if (list.length < 2) return tuneTo(current);
    var n;
    do { n = (Math.random() * list.length) | 0; } while (n === current);
    tuneTo(n);
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
    crtOnFx();
    staticFx(650);
    if (playerReady) player.loadVideoById(cur().id);
    showOsd();
    markActive();
    syncNow();
  }
  function powerOff(silent) {
    powered = false;
    els.tv.classList.remove("on");
    els.powerHint.classList.remove("off");
    els.powerBtn.classList.remove("on");
    els.osd.classList.remove("show");
    if (!silent) staticFx(220);
    if (playerReady) player.stopVideo();
    markActive();
    syncNow();
  }

  function updateMuteLabel() {
    if (!playerReady) return;
    els.muteBtn.textContent = player.isMuted() ? "SUARA: MATI" : "SUARA: ON";
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

  /* ================= Event: kontrol TV ================= */
  els.powerBtn.addEventListener("click", function () { powered ? powerOff() : powerOn(); });
  $("fsBtn").addEventListener("click", toggleFs);
  els.screen.addEventListener("dblclick", toggleFs);
  // Klik di layar: putar / jeda lewat API (dobel-klik tetap layar penuh)
  els.shield.addEventListener("click", function () {
    if (!powered || !playerReady || typeof YT === "undefined") return;
    if (player.getPlayerState() === YT.PlayerState.PLAYING) { player.pauseVideo(); showOsd("❚❚ PAUSE"); }
    else { player.playVideo(); showOsd("▶ PLAY"); }
  });
  $("nextBtn").addEventListener("click", function () { if (powered) nextChannel(); });
  $("prevBtn").addEventListener("click", function () { if (powered) prevChannel(); });
  $("randomBtn").addEventListener("click", function () { if (powered) randomChannel(); });
  $("guideBtn").addEventListener("click", function () { openSheet("guide"); });
  $("settingsBtn").addEventListener("click", function () { openSheet("settings"); });
  $("helpBtn").addEventListener("click", function () { openSheet("help"); });
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
  });
  els.muteBtn.addEventListener("click", function () {
    if (!playerReady) return;
    S.muted = !player.isMuted();
    if (S.muted) player.mute(); else player.unMute();
    PNStore.saveSettings();
    updateMuteLabel();
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
    refreshList();
    els.vol.value = S.volume;
    applySettings(); buildGuide(); syncNow();
  });

  /* ================= Keyboard ================= */
  document.addEventListener("keydown", function (e) {
    var tag = e.target.tagName;
    var typing = (tag === "INPUT" && e.target.type !== "range") || tag === "TEXTAREA" || tag === "SELECT";
    if (e.key === "Escape") { closeSheets(); return; }
    if (typing) return;
    switch (e.key) {
      case "ArrowUp": if (powered) { nextChannel(); e.preventDefault(); } break;
      case "ArrowDown": if (powered) { prevChannel(); e.preventDefault(); } break;
      case "ArrowRight": els.vol.value = Math.min(100, +els.vol.value + 5); els.vol.dispatchEvent(new Event("input")); break;
      case "ArrowLeft": els.vol.value = Math.max(0, +els.vol.value - 5); els.vol.dispatchEvent(new Event("input")); break;
      case "m": case "M": els.muteBtn.click(); break;
      case "r": case "R": if (powered) randomChannel(); break;
      case "p": case "P": powered ? powerOff() : powerOn(); break;
      case "f": case "F": els.favBtn.click(); break;
      case "g": case "G": anyOpen() ? closeSheets() : openSheet("guide"); break;
      case "s": case "S": anyOpen() ? closeSheets() : openSheet("settings"); break;
      case "h": case "H": anyOpen() ? closeSheets() : openSheet("help"); break;
      default:
        if (/^[1-9]$/.test(e.key)) {
          var n = parseInt(e.key, 10) - 1;
          if (n < list.length) { if (!powered) powerOn(); tuneTo(n); }
        }
    }
  });

  /* ================= Init ================= */
  els.vol.value = S.volume;
  applySettings();
  buildGuide();
  syncNow();
  drawStatic();
  loadApi();
})();
