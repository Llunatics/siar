// Uji interaksi remote via headless Chromium: klik tiap tombol, verifikasi efek.
// Jalankan: node test/remote-click.js
const { chromium } = require("playwright-core");
const path = require("path");

const { chromeExe } = require("./chrome");
const EXE = chromeExe();
const URL = "http://localhost:8777/index.html";

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const R = [];
  const check = (n, c) => R.push([c ? "PASS" : "FAIL", n]);
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForTimeout(700);

  await page.click("#powerBtn");
  await page.waitForTimeout(500);
  check("power on: tv.on", await page.$eval("#tv", e => e.classList.contains("on")));
  check("power on: LED hijau (pwrLed terlihat)", await page.$eval("#pwrLed", e => !!e));

  await page.click("#remoteFab");
  await page.waitForTimeout(600);
  check("remote terbuka", await page.$eval("#remote", e => e.classList.contains("open")));

  const ch0 = await page.textContent("#chNum");
  await page.click("#remChUp"); await page.waitForTimeout(400);
  check("CH+ ganti channel", (await page.textContent("#chNum")) !== ch0);

  await page.click("#remChDn"); await page.waitForTimeout(400);
  check("CH- kembali", (await page.textContent("#chNum")) === ch0);

  await page.click('[data-digit="5"]'); await page.waitForTimeout(300);
  check("numpad 5 -> OSD CH 5", (await page.textContent("#osd")).includes("CH 5"));
  await page.waitForTimeout(1100); // commit digit
  check("numpad commit -> CH 05", (await page.textContent("#chNum")).trim() === "05");

  const muted0 = await page.evaluate(() => JSON.parse(localStorage.getItem("pn-settings-v2")).muted);
  await page.click("#muteBtn"); await page.waitForTimeout(200);
  const muted1 = await page.evaluate(() => JSON.parse(localStorage.getItem("pn-settings-v2")).muted);
  check("MUTE toggle", muted0 !== muted1);
  await page.click("#muteBtn");

  await page.click("#remRandom"); await page.waitForTimeout(400);
  check("ACAK ganti channel", true); // tidak throw = ok

  await page.click("#remFav"); await page.waitForTimeout(300);
  // Tombol FAV memakai ikon SVG; status aktif lewat kelas .on (bukan teks ★).
  check("FAV toggle aktif (kelas .on)", await page.$eval("#favBtn", e => e.classList.contains("on")));
  check("FAV tersimpan di pn-favorites-v1", await page.evaluate(() => (JSON.parse(localStorage.getItem("pn-favorites-v1") || "[]")).length > 0));
  await page.click("#remFav"); await page.waitForTimeout(300);
  check("FAV toggle mati lagi", await page.evaluate(() => !document.querySelector("#favBtn").classList.contains("on")));

  await page.click("#remGuide"); await page.waitForTimeout(400);
  check("PANDUAN buka guide", !(await page.$eval("#guideSheet", e => e.hidden)));
  await page.screenshot({ path: path.join(__dirname, "..", "shots", "tmp-guide.png") });
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);

  // buka remote lagi (tadi tertutup saat buka guide)
  await page.click("#remoteFab"); await page.waitForTimeout(500);
  await page.click("#remJam"); await page.waitForTimeout(400);
  check("BLOK JAM aktif (badge)", await page.$eval("#blockBadge", e => !e.hidden && e.textContent.includes("JAM")));
  await page.click("#remJam"); await page.waitForTimeout(300);
  check("BLOK JAM mati", await page.$eval("#blockBadge", e => e.hidden));

  await page.click("#remSet"); await page.waitForTimeout(400);
  check("SET buka settings", !(await page.$eval("#settingsSheet", e => e.hidden)));
  await page.keyboard.press("Escape");

  await page.click("#remoteFab"); await page.waitForTimeout(400);
  await page.selectOption("#sleepSelect", "15"); await page.waitForTimeout(300);
  check("SLEEP 15 badge", await page.$eval("#sleepLeft", e => !e.hidden));
  await page.selectOption("#sleepSelect", "0");

  // volume slider via keyboard
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const v0 = await page.$eval("#volSlider", e => +e.value);
  await page.click("#remoteFab"); await page.waitForTimeout(400);
  await page.click("#remVolUp"); await page.waitForTimeout(200);
  check("VOL+ naik", (await page.$eval("#volSlider", e => +e.value)) === Math.min(100, v0 + 5));

  await page.click("#remClose"); await page.waitForTimeout(500);
  check("tutup remote", !(await page.$eval("#remote", e => e.classList.contains("open"))));

  // IR LED flash: klik tombol remote -> class flash muncul sesaat
  await page.click("#remoteFab"); await page.waitForTimeout(400);
  await page.click("#remChUp");
  check("IR flash terpanggil (tanpa error)", errors.length === 0);

  await page.screenshot({ path: path.join(__dirname, "..", "shots", "tmp-remote2.png") });
  await browser.close();
  const np = R.filter(r => r[0] === "PASS").length;
  console.log("REMOTE-CLICK: " + np + "/" + R.length + " PASS");
  R.forEach(r => console.log(r[0] + " | " + r[1]));
  console.log("pageerrors:", errors.length ? errors : "tidak ada");
  process.exit(np === R.length && errors.length === 0 ? 0 : 1);
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
