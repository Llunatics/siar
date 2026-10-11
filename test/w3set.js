// w3: uji live preview settings — kartu bentuk mengikuti finish aktif,
// perubahan shape/finish langsung tercermin di TV.
const { chromium } = require("playwright-core");
const path = require("path");
const EXE = path.join(process.env.HOME, ".cache/ms-playwright/chromium-1243/chrome-linux64/chrome");
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector("#remSet").click());
  await p.waitForTimeout(700);
  // 1. pilih finish silver -> semua preview .pv harus finish-silver
  await p.evaluate(() => document.querySelector('[data-finish="silver"]').click());
  await p.waitForTimeout(400);
  const pvOk = await p.evaluate(() => {
    const pvs = [...document.querySelectorAll("#shapeRow .pv")];
    return pvs.length === 10 && pvs.every(pv => pv.classList.contains("finish-silver"));
  });
  const tvFinish = await p.evaluate(() => document.querySelector("#tv").classList.contains("finish-silver"));
  // 2. pilih shape flatron -> TV berubah, kartu marked
  await p.evaluate(() => document.querySelector('[data-shape="flatron"]').click());
  await p.waitForTimeout(400);
  const tvShape = await p.evaluate(() => document.querySelector("#tv").classList.contains("shape-flatron"));
  const cardSel = await p.evaluate(() => document.querySelector('[data-shape="flatron"]').classList.contains("sel")
    && document.querySelector('[data-shape="flatron"]').getAttribute("aria-pressed") === "true");
  // 3. finish terlarang untuk wood: pilih wood -> finish non-kayu disabled
  await p.evaluate(() => document.querySelector('[data-shape="wood"]').click());
  await p.waitForTimeout(400);
  const tvWood = await p.evaluate(() => document.querySelector("#tv").classList.contains("shape-wood")
    && document.querySelector("#tv").classList.contains("finish-kayu"));
  const disOk = await p.evaluate(() => document.querySelector('[data-finish="silver"]').classList.contains("disabled"));
  await p.screenshot({ path: path.join(__dirname, "..", "shots", "qa", "w3-set-silver.png") });
  console.log(JSON.stringify({ pvOk, tvFinish, tvShape, cardSel, tvWood, disOk, errs: errs.length }));
  await b.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
