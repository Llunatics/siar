const { chromium } = require("playwright-core");
const { chromeExe } = require("./chrome");
(async () => {
  const b = await chromium.launch({ executablePath: chromeExe(), args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(600);
  const R = [];
  const check = (n, c) => R.push([c ? "PASS" : "FAIL", n]);

  // Buka panduan -> form tambah channel (di <details class="addbox">)
  await p.evaluate(() => document.querySelector("#remoteFab").click());
  await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector("#remGuide").click());
  await p.waitForTimeout(600);
  await p.evaluate(() => { document.querySelector("details.addbox").open = true; });
  await p.waitForTimeout(300);

  // 1. XSS via judul channel kustom
  const payload = "<img src=x onerror=window.__xss=1>";
  await p.fill("#addUrl", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await p.fill("#addTitle", payload);
  await p.click("#addForm button[type=submit]");
  await p.waitForTimeout(400);
  check("XSS judul tidak dieksekusi", (await p.evaluate(() => window.__xss)) !== 1);

  // 2. Cari payload di panduan — pastikan ter-escape di DOM
  await p.fill("#guideSearch", "onerror");
  await p.waitForTimeout(800);
  const guideHtml = await p.$eval("#guideList", e => e.innerHTML);
  check("payload ter-escape di guide", guideHtml.includes("&lt;img") && !guideHtml.includes("<img src=x onerror"));

  // 3. Hapus channel kustom lagi (bersih-bersih)
  const delBtn = await p.$("#guideList .del");
  check("tombol hapus ada", !!delBtn);
  if (delBtn) { await delBtn.click(); await p.waitForTimeout(400); }
  const gone = await p.evaluate(() => (JSON.parse(localStorage.getItem("pn-custom-v1") || "[]")).length === 0);
  check("channel kustom terhapus", gone);

  // 4. Numpad di luar jangkauan
  await p.keyboard.press("Escape");
  await p.waitForTimeout(200);
  await p.evaluate(() => { document.querySelector("#powerBtn").click(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector("#remoteFab").click());
  await p.waitForTimeout(400);
  await p.evaluate(() => { [...document.querySelectorAll("[data-digit]")].find(e => e.getAttribute("data-digit") === "9").click(); });
  await p.evaluate(() => { [...document.querySelectorAll("[data-digit]")].find(e => e.getAttribute("data-digit") === "9").click(); });
  await p.evaluate(() => { [...document.querySelectorAll("[data-digit]")].find(e => e.getAttribute("data-digit") === "9").click(); });
  await p.waitForTimeout(1400); // commit digit 999
  const osd = await p.textContent("#osd");
  check("numpad 999 -> OSD TIDAK ADA (tanpa crash)", osd.includes("TIDAK ADA"));

  console.log("FUZZ: " + R.filter(r => r[0] === "PASS").length + "/" + R.length + " PASS");
  R.forEach(r => console.log(r[0] + " | " + r[1]));
  console.log("pageerrors:", errs.length ? errs : "tidak ada");
  await b.close();
  process.exit(R.every(r => r[0] === "PASS") && !errs.length ? 0 : 1);
})();
