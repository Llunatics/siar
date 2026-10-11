// w3: uji peredup ruangan imersif saat TV mati/menyala.
const { chromium } = require("playwright-core");
const path = require("path");
const EXE = path.join(process.env.HOME, ".cache/ms-playwright/chromium-1243/chrome-linux64/chrome");
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(500);
  await p.evaluate(() => { const c = document.querySelector("#setImmersive");
    c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); });
  await p.waitForTimeout(300);
  const off0 = await p.evaluate(() => document.body.classList.contains("tv-off"));
  const op0 = await p.evaluate(() => getComputedStyle(document.body, "::before").opacity);
  await p.screenshot({ path: path.join(__dirname, "..", "shots", "qa", "w3-dim-off.png") });
  await p.click("#powerBtn"); await p.waitForTimeout(1200);
  const off1 = await p.evaluate(() => document.body.classList.contains("tv-off"));
  const op1 = await p.evaluate(() => getComputedStyle(document.body, "::before").opacity);
  await p.screenshot({ path: path.join(__dirname, "..", "shots", "qa", "w3-dim-on.png") });
  await p.click("#powerBtn"); await p.waitForTimeout(1200);
  const off2 = await p.evaluate(() => document.body.classList.contains("tv-off"));
  console.log(JSON.stringify({ off0, op0, off1, op1, off2, errs: errs.length }));
  await b.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
