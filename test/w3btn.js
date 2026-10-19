// w3: uji tombol fisik TV — struck class muncul & hilang, power tetap toggle.
const { chromium } = require("playwright-core");
const path = require("path");
const { chromeExe } = require("./chrome");
const EXE = chromeExe();
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(500);
  const hasStrikeFn = await p.evaluate(() => typeof window.__siarStrike === "function");
  const hasWell = await p.evaluate(() => !!document.querySelector(".btn-well > #powerBtn"));
  // klik power: struck harus muncul lalu hilang <300ms
  await p.click("#powerBtn");
  const struckNow = await p.evaluate(() => document.querySelector("#powerBtn").classList.contains("struck"));
  await p.waitForTimeout(400);
  const struckGone = await p.evaluate(() => !document.querySelector("#powerBtn").classList.contains("struck"));
  const powered = await p.evaluate(() => document.querySelector("#tv").classList.contains("on"));
  // aktivasi keyboard: fokus + Enter
  await p.evaluate(() => document.querySelector("#powerBtn").focus());
  await p.keyboard.press("Enter");
  await p.waitForTimeout(120);
  const struckKb = await p.evaluate(() => document.querySelector("#powerBtn").classList.contains("struck"));
  await p.waitForTimeout(400);
  const powered2 = await p.evaluate(() => document.querySelector("#tv").classList.contains("on"));
  console.log(JSON.stringify({ hasStrikeFn, hasWell, struckNow, struckGone, powered, struckKb, powered2, errs: errs.length }));
  await b.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
