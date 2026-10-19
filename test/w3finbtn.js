// w3finbtn.js — tombol depan TV di semua finishing
const { chromium } = require("playwright-core");
const path = require("path");
const { chromeExe } = require("./chrome");
const EXE = chromeExe();
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(500);
  await p.click("#powerBtn");
  await p.waitForTimeout(500);
  const res = {};
  for (const f of ["silver", "kayu", "marun"]) {
    await p.evaluate((ff) => {
      document.querySelector('[data-finish="' + ff + '"]').click();
    }, f);
    await p.waitForTimeout(400);
    res[f] = await p.evaluate(() => {
      const b2 = document.querySelector("#tvChUp");
      const r = b2.getBoundingClientRect();
      const cs = getComputedStyle(b2);
      return {
        vis: r.width > 30 && r.height > 30,
        btnBg: cs.backgroundImage.slice(0, 60),
      };
    });
  }
  // fungsi tetap jalan di finish silver
  await p.evaluate(() => { document.querySelector('[data-finish="silver"]').click(); });
  await p.waitForTimeout(300);
  const ch0 = await p.evaluate(() => document.querySelector("#chNum").textContent);
  await p.click("#tvChUp");
  await p.waitForTimeout(500);
  const ch1 = await p.evaluate(() => document.querySelector("#chNum").textContent);
  console.log(JSON.stringify({ ...res, ch0, ch1, errs: errs.length }));
  await b.close();
})();
