// Screenshot tiap bentuk chassis untuk review distinctiveness.
const { chromium } = require("playwright-core");
const path = require("path");
const EXE = path.join(process.env.HOME, ".cache/ms-playwright/chromium-1243/chrome-linux64/chrome");
const SHAPES = ["trinitron", "toshiba", "polytron", "flatron", "philips", "sharp", "jvc", "panasonic", "akari", "wood"];
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(600);
  await p.click("#powerBtn");
  for (const s of SHAPES) {
    await p.evaluate((sh) => {
      document.querySelectorAll("[data-shape]").forEach(b2 => {
        if (b2.getAttribute("data-shape") === sh) b2.click();
      });
      // Flatron otomatis menyetel finish silver (by design) — kembalikan
      // ke hitam supaya screenshot QA antar-bentuk konsisten.
      if (sh === "flatron") document.querySelector('[data-finish="hitam"]').click();
    }, s);
    await p.waitForTimeout(450);
    const tv = await p.$("#tv");
    await tv.screenshot({ path: path.join(__dirname, "..", "shots", "shape-" + s + ".png") });
    console.log("OK", s);
  }
  console.log("pageerrors:", errs.length ? errs : "tidak ada");
  await b.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
