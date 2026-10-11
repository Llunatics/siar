// w3 helper: screenshot skenario umum untuk QA gelombang 3.
const { chromium } = require("playwright-core");
const path = require("path");
const EXE = path.join(process.env.HOME, ".cache/ms-playwright/chromium-1243/chrome-linux64/chrome");
(async () => {
  const [w, h, tag, mode] = [+process.argv[2] || 1920, +process.argv[3] || 1080,
    process.argv[4] || "w3", process.argv[5] || "normal"];
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(600);
  await p.click("#powerBtn"); await p.waitForTimeout(900);
  if (mode === "remote" || mode === "settings") {
    await p.waitForTimeout(400);
  }
  if (mode === "remote") {
    await p.evaluate(() => { document.querySelector("#remoteFab").click(); });
    await p.waitForTimeout(900);
  }
  if (mode === "settings") {
    await p.evaluate(() => { document.querySelector("#remSet").click(); });
    await p.waitForTimeout(900);
  }
  await p.screenshot({ path: path.join(__dirname, "..", "shots", "qa", `w3-${tag}-${mode}-${w}x${h}.png`) });
  console.log("pageerrors:", errs.length ? errs : "tidak ada");
  await b.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
