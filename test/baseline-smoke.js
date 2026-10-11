// Baseline smoke test via jsdom: klik SUNGGUHAN (bukan cek statis).
// Semua script + driver dijalankan dalam SATU eval agar scope global konsisten.
// Jalankan: node test/baseline-smoke.js
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const repo = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(repo, "index.html"), "utf8");

const driver = `
(function () {
  var results = [];
  function check(name, fn) {
    try { fn(); results.push(["PASS", name]); }
    catch (e) { results.push(["FAIL", name + " — " + (e && e.message)]); }
  }
  function assert(cond, msg) { if (!cond) throw new Error(msg); }
  var doc = document;
  function click(sel) {
    var el = doc.querySelector(sel);
    assert(el, "elemen " + sel + " tidak ada");
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }
  function key(k) {
    doc.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
  }
  check("katalog: CHANNELS terdefinisi & 265 entri", function () {
    assert(typeof CHANNELS !== "undefined", "CHANNELS undefined");
    assert(CHANNELS.length >= 265, "jumlah=" + CHANNELS.length + " (< baseline 265!)");
  });
  check("katalog: tidak ada id duplikat", function () {
    var keys = CHANNELS.map(function (c) { return (c.src || "yt") + ":" + c.id; });
    var seen = {}, dup = 0;
    keys.forEach(function (k) { if (seen[k]) dup++; seen[k] = 1; });
    assert(dup === 0, dup + " duplikat");
  });
  check("TV: power nyala via klik tombol power", function () {
    click("#powerBtn");
    assert(doc.querySelector("#tv").classList.contains("on"), "kelas .on tidak dipasang");
    assert(!doc.querySelector("#powerHint"), "#powerHint masih ada di DOM");
  });
  check("OSD: tampil nomor channel setelah power", function () {
    assert(doc.querySelector("#chNum").textContent.trim() !== "--", "chNum masih --");
  });
  check("Remote: buka via FAB", function () {
    click("#remoteFab");
    assert(doc.querySelector("#remote").classList.contains("open"), "remote tidak open");
  });
  check("Remote: CH+ ganti channel", function () {
    var before = doc.querySelector("#chNum").textContent;
    click("#remChUp");
    var after = doc.querySelector("#chNum").textContent;
    assert(before !== after, "channel tidak berubah: " + before);
  });
  check("Remote: numpad digit -> OSD digit", function () {
    doc.querySelector('[data-digit="2"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
    var osd = doc.querySelector("#osd").textContent;
    assert(osd.indexOf("CH 2") !== -1, "OSD digit tidak tampil: " + osd);
  });
  check("Remote: tutup via veil", function () {
    click("#remoteVeil");
    assert(!doc.querySelector("#remote").classList.contains("open"), "remote masih open");
  });
  check("Settings: panel buka & klik kartu bentuk", function () {
    key("s");
    assert(!doc.querySelector("#settingsSheet").hidden, "settings tidak terbuka");
    click('[data-shape="flatron"]');
    assert(doc.querySelector("#tv").classList.contains("shape-flatron"), "shape tidak diterapkan");
    assert(PNStore.settings.shape === "flatron", "settings tidak tersimpan");
  });
  check("Settings: klik kartu finishing", function () {
    click('[data-finish="kayu"]');
    assert(doc.querySelector("#tv").classList.contains("finish-kayu"), "finish tidak diterapkan");
  });
  check("Settings: checkbox VHS -> class vhs-on", function () {
    var c = doc.querySelector("#setVhs");
    c.checked = true;
    c.dispatchEvent(new Event("change", { bubbles: true }));
    assert(doc.querySelector("#tv").classList.contains("vhs-on"), "vhs-on tidak dipasang");
  });
  check("Settings: range kecerahan menyimpan nilai", function () {
    var r = doc.querySelector("#setBright");
    r.value = "130";
    r.dispatchEvent(new Event("input", { bubbles: true }));
    assert(PNStore.settings.bright === 130, "bright=" + PNStore.settings.bright);
  });
  check("TV mati: layar hitam total tanpa teks (powerHint dihapus)", function () {
    assert(!doc.querySelector("#powerHint"), "#powerHint masih ada di DOM");
    click("#powerBtn"); // matikan TV bila sedang menyala
    assert(doc.body.classList.contains("tv-off"), "body tidak tv-off");
    assert(!doc.querySelector("#tv").classList.contains("on"), "kelas .on masih ada");
    var bug = doc.querySelector("#stationBug");
    assert(!bug || bug.hidden, "station bug masih terlihat saat TV mati");
    assert(!doc.querySelector("#osd").classList.contains("show"), "OSD masih tampil saat TV mati");
    // Mekanisme sembunyi OSD = class "show" (CSS: #osd{opacity:0} #osd.show{opacity:1}).
    // jsdom tidak mengkaskade opacity dari stylesheet, jadi kehadiran class-lah yang diverifikasi.
    click("#powerBtn"); // nyalakan kembali untuk cek berikutnya
    assert(doc.body.classList.contains("tv-off") === false, "TV tidak menyala kembali");
  });
  check("Settings: ESC menutup panel", function () {
    key("Escape");
    assert(doc.querySelector("#settingsSheet").hidden, "settings masih terbuka");
  });
  check("Keyboard: P mematikan TV, M mute", function () {
    key("p");
    assert(!doc.querySelector("#tv").classList.contains("on"), "TV masih nyala");
    key("m");
    assert(PNStore.settings.muted === true, "mute tidak aktif");
  });
  check("Guide: panel buka & chunk awal tampil", function () {
    key("g");
    assert(!doc.querySelector("#guideSheet").hidden, "guide tidak terbuka");
    var n0 = doc.querySelectorAll("#guideList li").length;
    assert(n0 > 0 && n0 <= 320, "chunk awal=" + n0);
    // Muat SEMUA chunk (klik tombol MUAT + scroll) sampai tidak bertambah —
    // satu scroll event hanya memuat satu chunk berikutnya.
    var sh = doc.querySelector("#guideSheet");
    var guard = 0, prev = -1, n1 = n0;
    while (guard++ < 20) {
      var mb = doc.querySelector("#guideMore");
      if (mb) mb.click();
      sh.scrollTop = sh.scrollHeight;
      sh.dispatchEvent(new Event("scroll", { bubbles: true }));
      n1 = doc.querySelectorAll("#guideList li").length;
      if (n1 === prev) break;
      prev = n1;
    }
    assert(n1 >= CHANNELS.length, "total item=" + n1 + " vs katalog " + CHANNELS.length);
  });
  check("Guide: search menyaring", function () {
    var s = doc.querySelector("#guideSearch");
    s.value = "doraemon";
    s.dispatchEvent(new Event("input", { bubbles: true }));
    var n = doc.querySelectorAll("#guideList li").length;
    assert(n >= 1 && n < 265, "hasil search=" + n);
  });
  check("Reset: mengembalikan shape default", function () {
    key("s");
    click("#resetBtn");
    assert(PNStore.settings.shape === "trinitron", "shape=" + PNStore.settings.shape);
    assert(doc.querySelector("#tv").classList.contains("shape-trinitron"), "shape TV tidak kembali");
  });
  window.__smoke = results;
})();
`;

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "http://localhost:8777/",
  beforeParse(window) {
    window.AudioContext = undefined;
    window.navigator.vibrate = () => true;
    window.confirm = () => true; // reset butuh konfirmasi; di test selalu setuju
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    window.HTMLCanvasElement.prototype.getContext = function () {
      return {
        createImageData: (x, y) => ({ width: x, height: y, data: new Uint8ClampedArray(x * y * 4) }),
        putImageData: () => {}, clearRect: () => {}, fillRect: () => {},
        getImageData: (x, y, a, b) => ({ width: a, height: b, data: new Uint8ClampedArray(a * b * 4) })
      };
    };
  }
});
const win = dom.window;
const combined =
  fs.readFileSync(path.join(repo, "assets/js/channels.js"), "utf8") + "\n" +
  fs.readFileSync(path.join(repo, "assets/js/settings.js"), "utf8") + "\n" +
  fs.readFileSync(path.join(repo, "assets/js/app.js"), "utf8") + "\n" +
  driver;
try {
  win.eval(combined);
} catch (e) {
  console.log("EVAL FATAL: " + e.message);
  process.exit(2);
}
setTimeout(() => {
  const results = win.__smoke || [["ERROR", "driver tidak jalan"]];
  const pass = results.filter(r => r[0] === "PASS").length;
  console.log("SMOKE: " + pass + "/" + results.length + " PASS");
  results.forEach(r => console.log(r[0] + " | " + r[1]));
  process.exit(results.some(r => r[0] !== "PASS") ? 1 : 0);
}, 2500);
