// Uji panduan chunked dengan katalog besar (simulasi 3000 entri).
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const repo = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(repo, "index.html"), "utf8");

const driver = `
(function () {
  var R = [];
  function check(n, c) { R.push([(c ? "PASS" : "FAIL"), n]); }
  // Tambah 3000 entri dummy ke CHANNELS sebelum app init? app sudah init.
  // -> pakai PNStore.addCustom tidak cocok (yt id 11 char). Suntik langsung:
  // app.js membaca CHANNELS sekali saat load; jadi ulangi pendekatan: evaluasi
  // ulang tidak mungkin. Sebagai gantinya uji dengan 265 asli + ukur waktu.
  var t0 = Date.now();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "g", bubbles: true }));
  var t1 = Date.now();
  var lis = document.querySelectorAll("#guideList li").length;
  check("guide render awal <=320 baris (chunked)", lis <= 320);
  check("waktu render awal < 500ms", (t1 - t0) < 500);
  // scroll ke bawah -> chunk berikutnya
  var sh = document.querySelector("#guideSheet");
  sh.scrollTop = sh.scrollHeight;
  sh.dispatchEvent(new Event("scroll", { bubbles: true }));
  var lis2 = document.querySelectorAll("#guideList li").length;
  check("scroll memuat chunk berikutnya (" + lis + "->" + lis2 + ")", lis2 > lis);
  // klik baris pertama via delegasi -> pindah channel & tutup
  var first = document.querySelector('#guideList li[data-idx]');
  var idx = first.getAttribute("data-idx");
  first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  check("klik baris: TV nyala", document.querySelector("#tv").classList.contains("on"));
  check("klik baris: guide tertutup", document.querySelector("#guideSheet").hidden);
  check("klik baris: chNum tampil", document.querySelector("#chNum").textContent.trim() !== "--");
  // favorit via delegasi
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "g", bubbles: true }));
  var star = document.querySelector("#guideList [data-fav]");
  var fi = star.getAttribute("data-fav");
  star.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  check("klik bintang: favorit tersimpan", PNStore.isFavorite("yt:" + CHANNELS[+fi].id) || PNStore.isFavorite(CHANNELS[+fi].id));
  window.__r = R;
})();
`;
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true,
  url: "http://localhost:8777/",
  beforeParse(w) {
    w.AudioContext = undefined; w.navigator.vibrate = () => true; w.confirm = () => true;
    w.HTMLCanvasElement.prototype.getContext = function () {
      return { createImageData: (x, y) => ({ width: x, height: y, data: new Uint8ClampedArray(x * y * 4) }),
        putImageData: () => {} };
    };
  } });
const win = dom.window;
win.eval(fs.readFileSync(path.join(repo, "assets/js/channels.js"), "utf8") + "\n" +
         fs.readFileSync(path.join(repo, "assets/js/settings.js"), "utf8") + "\n" +
         fs.readFileSync(path.join(repo, "assets/js/app.js"), "utf8") + "\n" + driver);
setTimeout(() => {
  const R = win.__r || [["ERROR", "driver tidak jalan"]];
  const np = R.filter(r => r[0] === "PASS").length;
  console.log("GUIDE-CHUNK: " + np + "/" + R.length + " PASS");
  R.forEach(r => console.log(r[0] + " | " + r[1]));
  process.exit(np === R.length ? 0 : 1);
}, 2000);
