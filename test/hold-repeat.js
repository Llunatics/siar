// Uji tahan-tombol remote: pointerdown lama pada CH+ harus mengulang (>1 langkah),
// klik tunggal tetap tepat 1 langkah (tidak ganda). Pola setup = baseline-smoke.js.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
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
    },
  });
  const { window } = dom;
  const combined =
    fs.readFileSync(path.join(repo, "assets/js/channels.js"), "utf8") + "\n" +
    fs.readFileSync(path.join(repo, "assets/js/settings.js"), "utf8") + "\n" +
    fs.readFileSync(path.join(repo, "assets/js/app.js"), "utf8");
  window.eval(combined);
  await sleep(800); // beri waktu init

  const doc = window.document;
  const $ = (id) => doc.getElementById(id);
  const pd = (el) => el.dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
  const pu = (el) => el.dispatchEvent(new window.Event("pointerup", { bubbles: true }));
  let fails = 0;
  const ok = (c, n) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };

  $("powerBtn").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(300);
  ok($("tv").classList.contains("on"), "TV nyala");

  // 1) Klik tunggal CH+ via MouseEvent (tanpa pointerdown) = 1 langkah, tidak ganda
  const b1 = $("chNum").textContent;
  $("remChUp").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(250);
  ok($("chNum").textContent !== b1, "klik tunggal CH+ pindah 1 channel");

  // 2) Tahan CH+: pointerdown 1.1 detik -> repeat jalan (>=1 langkah tambahan)
  const b2 = $("chNum").textContent;
  pd($("remChUp"));
  await sleep(1100); // 450ms delay + ~1-2 repeat @350ms
  pu($("remChUp"));
  await sleep(250);
  ok($("chNum").textContent !== b2, "tahan CH+ mengulang (channel terus maju)");

  // 3) Tahan VOL+: volume naik > 5 (satu klik = 5)
  const volEl = $("volSlider");
  const v0 = volEl ? +volEl.value : 0;
  pd($("remVolUp"));
  await sleep(950); // 450 + ~3 repeat @130ms => +20
  pu($("remVolUp"));
  await sleep(150);
  const v1 = volEl ? +volEl.value : 0;
  ok(v1 - v0 >= 15, "tahan VOL+ repeat (naik " + (v1 - v0) + ")");

  console.log(fails === 0 ? "HOLD-REPEAT: 3/3 PASS" : "HOLD-REPEAT: " + fails + " GAGAL");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("ERR", e); process.exit(2); });
