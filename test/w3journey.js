// w3journey.js — simulasi satu sesi nonton malam yang realistis
const { chromium } = require("playwright-core");
const path = require("path");
const { chromeExe } = require("./chrome");
const EXE = chromeExe();
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const step = {};
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(600);
  // 1. nyalakan TV
  await p.click("#powerBtn"); await p.waitForTimeout(900);
  step.on = await p.evaluate(() => document.querySelector("#tv").classList.contains("on"));
  // 2. pindah channel 3x via keyboard
  for (let i = 0; i < 3; i++) { await p.keyboard.press("ArrowUp"); await p.waitForTimeout(450); }
  step.ch = await p.evaluate(() => document.querySelector("#chNum").textContent);
  // 3. buka panduan, pilih satu siaran
  await p.keyboard.press("g"); await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelector("#guideList li").click());
  await p.waitForTimeout(900);
  step.guidePlay = await p.evaluate(() => document.querySelector("#guideSheet").hidden);
  // 4. volume via remote
  await p.evaluate(() => document.querySelector("#remoteFab").click());
  await p.waitForTimeout(700);
  await p.evaluate(() => { document.querySelector("#remVolUp").click(); document.querySelector("#remVolUp").click(); });
  await p.waitForTimeout(400);
  step.vol = await p.evaluate(() => document.querySelector("#volSlider").value);
  await p.evaluate(() => document.querySelector("#remoteVeil").click());
  await p.waitForTimeout(400);
  // 5. settings: ganti model ke philips
  await p.keyboard.press("s"); await p.waitForTimeout(700);
  await p.evaluate(() => {
    [...document.querySelectorAll("[data-shape]")].find((b2) => b2.getAttribute("data-shape") === "philips").click();
  });
  await p.waitForTimeout(500);
  step.shape = await p.evaluate(() => document.querySelector("#tv").className);
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  // 6. matikan TV, reload: state bertahan
  await p.click("#powerBtn"); await p.waitForTimeout(700);
  await p.reload({ waitUntil: "load" }); await p.waitForTimeout(600);
  step.persist = await p.evaluate(() => ({
    shape: document.querySelector("#tv").className,
    vol: document.querySelector("#volSlider").value,
  }));
  console.log(JSON.stringify({ ...step, errs: errs.length }));
  await b.close();
})();
