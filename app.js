// Portal Nostalgia — logika TV analog.
// Memakai YouTube IFrame API buat putar embed resmi + kontrol volume/mute.
(function () {
  "use strict";

  var current = 0;          // index channel aktif
  var powered = false;      // TV nyala?
  var player = null;        // YT.Player
  var playerReady = false;
  var osdTimer = null;
  var audioCtx = null;

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    osd: $("osd"), chNum: $("chNum"), staticC: $("staticCanvas"),
    powerHint: $("powerHint"), powerBtn: $("powerBtn"),
    vol: $("volSlider"), muteBtn: $("muteBtn"), guide: $("guideList")
  };

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- Daftar siaran (guide) ---------- */
  function buildGuide() {
    var cats = [];
    CHANNELS.forEach(function (ch) { if (cats.indexOf(ch.cat) === -1) cats.push(ch.cat); });
    var html = "";
    cats.forEach(function (cat) {
      html += '<div class="cat">' + cat + "</div><ul>";
      CHANNELS.forEach(function (ch, i) {
        if (ch.cat !== cat) return;
        html += '<li data-idx="' + i + '"><span class="num">' + pad(i + 1) +
                '</span><span class="ttl">' + ch.title + "</span></li>";
      });
      html += "</ul>";
    });
    els.guide.innerHTML = html;
    Array.prototype.forEach.call(els.guide.querySelectorAll("li"), function (li) {
      li.addEventListener("click", function () {
        if (!powered) powerOn();
        tuneTo(parseInt(li.getAttribute("data-idx"), 10));
      });
    });
  }

  function markActive() {
    Array.prototype.forEach.call(els.guide.querySelectorAll("li"), function (li) {
      li.classList.toggle("active", powered && parseInt(li.getAttribute("data-idx"), 10) === current);
    });
  }

  /* ---------- OSD ala TV analog ---------- */
  function showOsd() {
    var ch = CHANNELS[current];
    els.osd.innerHTML = "CH " + pad(current + 1) + "<small>" + ch.title + "</small>";
    els.osd.classList.add("show");
    clearTimeout(osdTimer);
    osdTimer = setTimeout(function () { els.osd.classList.remove("show"); }, 2400);
  }

  /* ---------- Static + kresek ---------- */
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

  var staticTimer = null;
  function staticFx(ms) {
    els.staticC.classList.add("on");
    clearInterval(staticTimer);
    staticTimer = setInterval(drawStatic, 50);
    playNoise(ms);
    setTimeout(function () {
      clearInterval(staticTimer);
      els.staticC.classList.remove("on");
    }, ms);
  }

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
    } catch (e) { /* audio tidak tersedia: diam saja */ }
  }

  /* ---------- YouTube player ---------- */
  function loadApi() {
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }
  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("player", {
      width: "100%", height: "100%",
      playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, playsinline: 1 },
      events: {
        onReady: function () {
          playerReady = true;
          player.setVolume(parseInt(els.vol.value, 10));
        },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.ENDED && powered) nextChannel();
        }
      }
    });
  };

  function tuneTo(idx) {
    if (!CHANNELS.length) return;
    current = ((idx % CHANNELS.length) + CHANNELS.length) % CHANNELS.length;
    els.chNum.textContent = pad(current + 1);
    staticFx(500);
    showOsd();
    markActive();
    if (playerReady) {
      player.loadVideoById(CHANNELS[current].id);
      player.setVolume(parseInt(els.vol.value, 10));
      updateMuteLabel();
    }
  }

  function nextChannel() { tuneTo(current + 1); }
  function prevChannel() { tuneTo(current - 1); }
  function randomChannel() {
    if (CHANNELS.length < 2) return tuneTo(current);
    var n;
    do { n = (Math.random() * CHANNELS.length) | 0; } while (n === current);
    tuneTo(n);
  }

  /* ---------- Power ---------- */
  function powerOn() {
    powered = true;
    els.powerHint.classList.add("off");
    els.powerBtn.classList.add("on");
    els.chNum.textContent = pad(current + 1);
    staticFx(700);
    if (playerReady) { player.loadVideoById(CHANNELS[current].id); }
    showOsd(); markActive();
  }
  function powerOff() {
    powered = false;
    els.powerHint.classList.remove("off");
    els.powerBtn.classList.remove("on");
    els.chNum.textContent = "--";
    els.osd.classList.remove("show");
    staticFx(250);
    if (playerReady) player.stopVideo();
    markActive();
  }

  function updateMuteLabel() {
    if (!playerReady) return;
    els.muteBtn.textContent = player.isMuted() ? "SUARA: MATI" : "SUARA: ON";
  }

  /* ---------- Event controls ---------- */
  els.powerBtn.addEventListener("click", function () { powered ? powerOff() : powerOn(); });
  $("nextBtn").addEventListener("click", function () { if (powered) nextChannel(); });
  $("prevBtn").addEventListener("click", function () { if (powered) prevChannel(); });
  $("randomBtn").addEventListener("click", function () { if (powered) randomChannel(); });
  els.vol.addEventListener("input", function () {
    if (playerReady) { player.setVolume(parseInt(els.vol.value, 10)); if (player.isMuted() && +els.vol.value > 0) { player.unMute(); updateMuteLabel(); } }
  });
  els.muteBtn.addEventListener("click", function () {
    if (!playerReady) return;
    if (player.isMuted()) player.unMute(); else player.mute();
    updateMuteLabel();
  });

  document.addEventListener("keydown", function (e) {
    if (e.target.tagName === "INPUT" && e.target.type !== "range") return;
    switch (e.key) {
      case "ArrowUp": if (powered) { nextChannel(); e.preventDefault(); } break;
      case "ArrowDown": if (powered) { prevChannel(); e.preventDefault(); } break;
      case "ArrowRight": els.vol.value = Math.min(100, +els.vol.value + 5); els.vol.dispatchEvent(new Event("input")); break;
      case "ArrowLeft": els.vol.value = Math.max(0, +els.vol.value - 5); els.vol.dispatchEvent(new Event("input")); break;
      case "m": case "M": els.muteBtn.click(); break;
      case "r": case "R": if (powered) randomChannel(); break;
      case "p": case "P": powered ? powerOff() : powerOn(); break;
      default:
        if (/^[1-9]$/.test(e.key)) {
          var n = parseInt(e.key, 10) - 1;
          if (n < CHANNELS.length) { if (!powered) powerOn(); tuneTo(n); }
        }
    }
  });

  /* ---------- init ---------- */
  buildGuide();
  drawStatic();
  loadApi();
})();
