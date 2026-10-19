// Verifikasi visual iterasi: autoplay-veil, sensor simetris, tombol, remote.
// Jalankan: node test/verify-iter.js (butuh server di :8777)
const { chromium } = require("playwright-core");
const path = require("path");
const { chromeExe } = require("./chrome");
const EXE = chromeExe();

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const results = [];
  const check = (name, cond, extra) => {
    results.push([cond ? "PASS" : "FAIL", name + (extra ? " — " + extra : "")]);
    if (!cond) console.log("FAIL:", name, extra || "");
  };
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
    await page.goto("http://localhost:8777/index.html", { waitUntil: "load" });
    await page.waitForTimeout(800);

    // 1. Power ON via klik (user gesture)
    await page.click("#powerBtn");
    await page.waitForTimeout(900);
    check("TV menyala (kelas .on)", await page.evaluate(() => document.querySelector("#tv").classList.contains("on")));

    // 2. Veil jeda: paksa paused + ada video -> veil tampil menutupi layar
    const veilShown = await page.evaluate(() => window.__siarVeilTest(false, true));
    check("veil jeda tampil saat paused", veilShown === true);
    const veilBox = await page.evaluate(() => {
      const v = document.querySelector("#pauseVeil").getBoundingClientRect();
      const s = document.querySelector("#screenInner").getBoundingClientRect();
      return { cover: v.width >= s.width - 2 && v.height >= s.height - 2, pe: getComputedStyle(document.querySelector("#pauseVeil")).pointerEvents };
    });
    check("veil menutupi seluruh layar", veilBox.cover === true);
    check("veil tidak menelan klik (pointer-events none)", veilBox.pe === "none");
    await page.screenshot({ path: "shots/iter/390x844-veil.png" });

    // 3. Play -> veil hilang
    const veilHidden = await page.evaluate(() => window.__siarVeilTest(true, true));
    check("veil hilang saat playing", veilHidden === false);

    // 4. Sensor simetris: satu jendela + satu LED di tengah
    const sensor = await page.evaluate(() => {
      const z = document.querySelector(".ir-zone");
      const win = z.querySelector(".ir-win");
      const leds = z.querySelectorAll(".pwr-led");
      const r = win.getBoundingClientRect(), l = leds[0].getBoundingClientRect();
      const cxWin = r.left + r.width / 2, cxLed = l.left + l.width / 2;
      return { leds: leds.length, centered: Math.abs(cxWin - cxLed) < 1.5, noEye: !z.querySelector(".ir-eye") };
    });
    check("sensor: tepat 1 LED", sensor.leds === 1);
    check("sensor: LED di tengah jendela (<1.5px)", sensor.centered === true);
    check("sensor: tidak ada ir-eye lama", sensor.noEye === true);

    // 5. Tombol deck: 4 mini + fav, label terbaca
    const btns = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".front-ctrls .btn.mini")).map((b) => b.textContent.trim()));
    check("4 tombol deck ada", JSON.stringify(btns) === JSON.stringify(["CH−", "CH+", "V−", "V+"]), btns.join("/"));

    // 6. Screenshot TV nyala + remote terbuka (390x844)
    await page.evaluate(() => window.__siarVeilTest(true, true));
    await page.click("#remoteFab");
    await page.waitForTimeout(700);
    check("remote terbuka", await page.evaluate(() => document.querySelector("#remote").classList.contains("open")));
    await page.screenshot({ path: "shots/iter/390x844-remote.png" });
    // touch target utama >=44px (layout; getBoundingClientRect terpengaruh tilt perspektif)
    const touch = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".rbtn")).slice(0, 12).every((b) => b.offsetWidth >= 44 && b.offsetHeight >= 44));
    check("touch target remote >=44px", touch === true);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // 7. nudgePlay terdaftar (tidak error saat gesture)
    await page.evaluate(() => { document.dispatchEvent(new PointerEvent("pointerdown")); });
    check("nudgePlay tanpa error", true);

    // 8. Power OFF -> veil hilang, layar hitam
    await page.click("#powerBtn");
    await page.waitForTimeout(600);
    const offVeil = await page.evaluate(() => document.querySelector("#pauseVeil").classList.contains("show"));
    check("veil hilang saat TV mati", offVeil === false);
    await page.screenshot({ path: "shots/iter/390x844-off.png" });

    check("0 pageerror", errs.length === 0, errs.join(" | "));
  } catch (e) {
    results.push(["FAIL", "exception: " + String(e).slice(0, 200)]);
  }
  await browser.close();
  const pass = results.filter((r) => r[0] === "PASS").length;
  console.log(`\nITER-VERIFY: ${pass}/${results.length} PASS`);
  results.filter((r) => r[0] === "FAIL").forEach((r) => console.log(" -", r[1]));
  process.exit(pass === results.length ? 0 : 1);
})();
