// w3: uji persistensi localStorage + migrasi skema lama + reset.
const { chromium } = require("playwright-core");
const path = require("path");
const { chromeExe } = require("./chrome");
const EXE = chromeExe();
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const errs = [];
  // 1. Migrasi skema lama {model:"silver"} -> shape+finish
  const c1 = await b.newContext();
  await c1.addInitScript(() => {
    localStorage.setItem("pn-settings-v2", JSON.stringify({ model: "silver", volume: 42 }));
  });
  const p1 = await c1.newPage();
  p1.on("pageerror", e => errs.push(e.message));
  await p1.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p1.waitForTimeout(600);
  const mig = await p1.evaluate(() => ({
    shape: document.querySelector("#tv").classList.contains("shape-philips"),
    finish: document.querySelector("#tv").classList.contains("finish-silver"),
    vol: document.querySelector("#volSlider").value === "42",
  }));
  await c1.close();
  // 2. Persistensi: ubah shape -> reload -> tetap
  const c2 = await b.newContext();
  const p2 = await c2.newPage();
  p2.on("pageerror", e => errs.push(e.message));
  await p2.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p2.waitForTimeout(500);
  await p2.evaluate(() => { document.querySelector("#remSet").click(); });
  await p2.waitForTimeout(500);
  await p2.evaluate(() => document.querySelector('[data-shape="panasonic"]').click());
  await p2.waitForTimeout(300);
  await p2.reload({ waitUntil: "load" });
  await p2.waitForTimeout(600);
  const persist = await p2.evaluate(() => document.querySelector("#tv").classList.contains("shape-panasonic"));
  // 3. Reset: tambah favorit dulu, lalu reset via confirm
  await p2.evaluate(() => document.querySelector("#remSet").click());
  await p2.waitForTimeout(400);
  p2.on("dialog", d => d.accept());
  await p2.evaluate(() => document.querySelector("#resetBtn").click());
  await p2.waitForTimeout(600);
  const reset = await p2.evaluate(() => ({
    shape: document.querySelector("#tv").classList.contains("shape-trinitron"),
    ls: localStorage.getItem("pn-settings-v2") !== null, // disimpan ulang sbg default
    def: JSON.parse(localStorage.getItem("pn-settings-v2") || "{}").finish === "hitam",
  }));
  await c2.close();
  console.log(JSON.stringify({ mig, persist, reset, errs: errs.length }));
  await b.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
