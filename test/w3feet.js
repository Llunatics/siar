// w3: screenshot kaki TV per-model untuk review distinctiveness.
const { chromium } = require("playwright-core");
const path = require("path");
const { chromeExe } = require("./chrome");
const EXE = chromeExe();
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(500);
  for (const s of ["wood", "flatron", "akari", "philips", "trinitron"]) {
    await p.evaluate((sh) => {
      document.querySelectorAll("[data-shape]").forEach(b2 => {
        if (b2.getAttribute("data-shape") === sh) b2.click();
      });
    }, s);
    await p.waitForTimeout(400);
    const st = await p.$(".tv-stand");
    await st.screenshot({ path: path.join(__dirname, "..", "shots", "qa", "w3-feet-" + s + ".png") });
  }
  console.log("errs:", errs.length);
  await b.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
