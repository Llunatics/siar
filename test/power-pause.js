// Uji regresi logika TV (deep-6, 2026-10-20) — klik & event SUNGGUHAN via jsdom.
// 1. nudgePlay tidak boleh membatalkan jeda user (hanya jaring pengaman autoplay).
// 2. Jaring pengaman autoplay tetap berfungsi bila play awal diblokir.
// 3. Timer digit channel yang belum di-commit tidak boleh me-tune saat TV mati.
// 4. Sleep timer yang kedaluwarsa tidak boleh mematikan power-on berikutnya.
// 5. holdRepeat: pointerleave membersihkan flag suppress (klik berikutnya jalan).
// Pola setup = test/hold-repeat.js. Jalankan: node test/power-pause.js
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeDom(ytStub) {
  const repo = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(repo, "index.html"), "utf8");
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "http://localhost:8777/",
    beforeParse(window) {
      window.AudioContext = undefined;
      window.navigator.vibrate = () => true;
      window.confirm = () => true;
      window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
      window.HTMLCanvasElement.prototype.getContext = function () {
        return {
          createImageData: (x, y) => ({ width: x, height: y, data: new Uint8ClampedArray(x * y * 4) }),
          putImageData: () => {}, clearRect: () => {}, fillRect: () => {},
        };
      };
      if (ytStub) {
        window.__ytCalls = { play: 0, pause: 0, load: 0 };
        window.__ytBlockFirst = !!ytStub.blockFirst;
        window.YT = {
          PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0, CUED: 5 },
          Player: function (id, opts) {
            const events = opts.events;
            const api = {
              playVideo() {
                window.__ytCalls.play++;
                // Simulasi blokir autoplay: panggilan pertama tanpa state change.
                if (window.__ytBlockFirst && window.__ytCalls.play === 1) return;
                events.onStateChange({ data: 1 });
              },
              pauseVideo() { window.__ytCalls.pause++; events.onStateChange({ data: 2 }); },
              stopVideo() {},
              setVolume() {}, mute() {}, unMute: () => {},
              destroy() {},
              loadVideoById() { window.__ytCalls.load++; events.onStateChange({ data: 1 }); },
            };
            setTimeout(() => events.onReady(), 0);
            return api;
          },
        };
      }
    },
  });
  const { window } = dom;
  const combined =
    fs.readFileSync(path.join(repo, "assets/js/channels.js"), "utf8") + "\n" +
    fs.readFileSync(path.join(repo, "assets/js/settings.js"), "utf8") + "\n" +
    fs.readFileSync(path.join(repo, "assets/js/app.js"), "utf8");
  window.eval(combined);
  return window;
}

(async () => {
  let fails = 0;
  const ok = (c, n) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };

  // ---------- 1 & 2: nudgePlay vs jeda ----------
  {
    const window = makeDom({ blockFirst: false });
    const doc = window.document;
    const $ = (id) => doc.getElementById(id);
    const key = (k) => doc.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true }));
    const click = (sel) => doc.querySelector(sel).dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

    click("#powerBtn");
    await sleep(250); // onReady async -> PLAYING
    ok(window.__ytCalls.play === 1, "1a. autoplay power-on dicoba 1x (play=" + window.__ytCalls.play + ")");
    ok(!$("pauseVeil").classList.contains("show"), "1b. veil jeda sembunyi saat playing");

    key(" "); // jeda via spasi
    await sleep(120);
    ok(window.__ytCalls.pause === 1, "1c. pauseVideo dipanggil saat spasi");
    ok($("pauseVeil").classList.contains("show"), "1d. veil jeda tampil saat paused");

    const playsBefore = window.__ytCalls.play;
    key("ArrowRight"); // gesture apa saja (volume) — tidak boleh membatalkan jeda
    await sleep(120);
    ok(window.__ytCalls.play === playsBefore, "1e. JEDA TAHAN: keydown lain tidak memutar ulang (play=" + window.__ytCalls.play + ")");
    ok($("pauseVeil").classList.contains("show"), "1f. veil jeda tetap tampil");

    doc.dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
    await sleep(60);
    ok(window.__ytCalls.play === playsBefore, "1g. JEDA TAHAN: pointerdown tidak memutar ulang");

    key(" "); // user sengaja memutar lagi -> boleh
    await sleep(120);
    ok(window.__ytCalls.play === playsBefore + 1, "1h. spasi tetap bisa memutar ulang (play=" + window.__ytCalls.play + ")");
    window.close();
  }

  // ---------- 2: jaring pengaman autoplay tetap jalan ----------
  {
    const window = makeDom({ blockFirst: true });
    const doc = window.document;
    const $ = (id) => doc.getElementById(id);
    const key = (k) => doc.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true }));
    const click = (sel) => doc.querySelector(sel).dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

    click("#powerBtn");
    await sleep(250); // onReady -> playVideo() DIBLOKIR (tanpa PLAYING)
    ok(window.__ytCalls.play === 1, "2a. percobaan play awal 1x");
    ok($("pauseVeil").classList.contains("show"), "2b. belum playing (veil tampil)");

    key("ArrowRight"); // gesture berikutnya -> jaring pengaman mengejar play
    await sleep(150);
    ok(window.__ytCalls.play === 2, "2c. SAFETY NET: gesture mengejar play ke-2 (play=" + window.__ytCalls.play + ")");
    ok(!$("pauseVeil").classList.contains("show"), "2d. kini playing (veil hilang)");
    window.close();
  }

  // ---------- 3: timer digit tidak me-tune saat TV mati ----------
  {
    const window = makeDom({ blockFirst: false });
    const doc = window.document;
    const $ = (id) => doc.getElementById(id);
    const key = (k) => doc.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true }));
    const click = (sel) => doc.querySelector(sel).dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

    click("#powerBtn");
    await sleep(250); // onReady -> PLAYING
    const loadsBefore = window.__ytCalls.load;
    key("1"); // digitBuf="1", timer 900ms
    await sleep(100);
    click("#powerBtn"); // matikan sebelum commit
    ok(doc.body.classList.contains("tv-off"), "3a. TV mati setelah power off");
    await sleep(1300); // lewat dari 900ms
    ok(doc.body.classList.contains("tv-off"), "3b. TV TETAP mati setelah timer digit kedaluwarsa");
    ok($("chNum").textContent.trim() === "--", "3c. display channel tetap -- (chNum=" + $("chNum").textContent.trim() + ")");
    ok(window.__ytCalls.load === loadsBefore, "3d. TIDAK ada video dimuat saat TV mati (load=" + window.__ytCalls.load + ")");
    ok(!$("osd").classList.contains("show"), "3e. tidak ada OSD saat TV mati");
    window.close();
  }

  // ---------- 5: holdRepeat suppress dibersihkan saat pointerleave ----------
  {
    const window = makeDom(null);
    const doc = window.document;
    const $ = (id) => doc.getElementById(id);
    const click = (sel) => doc.querySelector(sel).dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

    click("#powerBtn");
    await sleep(200);
    const before = $("chNum").textContent;
    const btn = $("remChUp");
    btn.dispatchEvent(new window.Event("pointerdown", { bubbles: true })); // fn jalan (ch+1), suppress=true
    btn.dispatchEvent(new window.Event("pointerleave", { bubbles: true })); // seret keluar: tak ada klik susulan
    const mid = $("chNum").textContent;
    ok(before !== mid, "5a. pointerdown menaikkan channel (" + before + "->" + mid + ")");
    btn.click(); // klik berikutnya (mis. via keyboard) tidak boleh tertelan
    await sleep(120);
    const after = $("chNum").textContent;
    ok(after !== mid, "5b. klik setelah pointerleave TETAP jalan (" + mid + "->" + after + ")");
    window.close();
  }

  // ---------- 4: sleep kedaluwarsa tidak membunuh power-on ----------
  // (Butuh hook __siarSleepDeadline; ditaruh terakhir supaya tidak
  // mengganggu uji lain bila hook belum ada.)
  {
    const window = makeDom(null);
    const doc = window.document;
    const $ = (id) => doc.getElementById(id);
    const click = (sel) => doc.querySelector(sel).dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

    if (typeof window.__siarSleepDeadline !== "function") {
      console.log("SKIP 4a/4b (hook __siarSleepDeadline tidak ada)");
    } else {
      click("#powerBtn");
      await sleep(200);
      $("sleepSelect").value = "15";
      $("sleepSelect").dispatchEvent(new window.Event("change", { bubbles: true }));
      window.__siarSleepDeadline(Date.now() - 500); // paksa kedaluwarsa
      click("#powerBtn"); // matikan; interval sleep tetap jalan
      await sleep(150);
      click("#powerBtn"); // nyalakan lagi SAAT deadline sudah lewat
      await sleep(800); // tick 500ms pasti sudah jalan
      ok($("tv").classList.contains("on"), "4a. TV tetap menyala setelah power-on (tidak dibunuh sleep basi)");
      ok($("sleepSelect").value === "0", "4b. pilihan sleep di-reset ke Mati (value=" + $("sleepSelect").value + ")");
    }
    window.close();
  }

  console.log(fails === 0 ? "SEMUA PASS" : fails + " GAGAL");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
