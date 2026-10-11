// w3watch.js — penanda sudah-ditonton & progres koleksi
const { chromium } = require("playwright-core");
const path = require("path");
const EXE = path.join(process.env.HOME, ".cache/ms-playwright/chromium-1243/chrome-linux64/chrome");
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(500);
  await p.click("#powerBtn"); await p.waitForTimeout(600);
  const c0 = await p.evaluate(() => document.querySelector("#guideProgress").textContent);
  // putar channel 3 via numpad
  await p.keyboard.press("3"); await p.waitForTimeout(1500);
  const marked = await p.evaluate(() => {
    const key = "3";
    return (JSON.parse(localStorage.getItem("pn-watched-v1") || "[]")).length;
  });
  await p.keyboard.press("g"); await p.waitForTimeout(900);
  const c1 = await p.evaluate(() => document.querySelector("#guideProgress").textContent);
  const tick = await p.evaluate(() => {
    const items = [...document.querySelectorAll("#guideList li")];
    return items.filter((li) => li.querySelector(".watched")).length;
  });
  // reload: progres bertahan
  await p.reload({ waitUntil: "load" }); await p.waitForTimeout(500);
  await p.keyboard.press("g"); await p.waitForTimeout(900);
  const c2 = await p.evaluate(() => document.querySelector("#guideProgress").textContent);
  console.log(JSON.stringify({ c0, watchedCount: marked, c1, tickInChunk: tick, c2, errs: errs.length }));
  await b.close();
})();
