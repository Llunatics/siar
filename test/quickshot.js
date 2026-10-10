// Screenshot cepat satu viewport TANPA proxy (hanya localhost) — untuk QA layout.
const { chromium } = require("playwright-core");
const path = require("path");
const EXE = path.join(process.env.HOME, ".cache/ms-playwright/chromium-1243/chrome-linux64/chrome");
(async () => {
  const [w, h, tag, act] = [ +process.argv[2] || 390, +process.argv[3] || 844,
    process.argv[4] || "tmp", process.argv[5] || "tv" ];
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(600);
  if (act !== "off") { await p.click("#powerBtn"); await p.waitForTimeout(900); }
  if (act === "immersive") {
    await p.keyboard.press("s"); await p.waitForTimeout(300);
    await p.evaluate(() => { const c = document.querySelector("#setImmersive");
      c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); });
    await p.keyboard.press("Escape"); await p.waitForTimeout(700);
  }
  // info layout statusbar untuk QA
  const info = await p.evaluate(() => {
    const sb = document.querySelector(".statusbar");
    const kids = [...sb.children].map(e => e.id || e.className);
    const r = sb.getBoundingClientRect();
    const rows = {};
    [...sb.children].forEach(e => { const t = Math.round(e.getBoundingClientRect().top); rows[t] = (rows[t] || 0) + 1; });
    return { kids, rows: Object.keys(rows).length, width: Math.round(r.width) };
  });
  console.log("statusbar:", JSON.stringify(info));
  await p.screenshot({ path: path.join(__dirname, "..", "shots", "tmp-" + tag + ".png") });
  console.log("pageerrors:", errs.length ? errs : "tidak ada");
  await b.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
