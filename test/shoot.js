// Screenshot QA via headless Chromium (playwright-core).
// Penggunaan: node test/shoot.js [tag]
// Menghasilkan shots/<tag>/<viewport>-<state>.png
// Viewport: 1920x1080, 1366x768, 390x844, 844x390
// State: tv (power nyala), settings, remote, guide
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const { chromeExe } = require("./chrome");
const EXE = chromeExe();
const URL = "http://localhost:8777/index.html";
// Chromium headless di sandbox ini butuh proxy egress eksplisit (env) agar
// bisa memuat thumbnail/embed eksternal — tanpa ini screenshot menyesatkan.
function netOpts() {
  const p = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!p) return {};
  try {
    const u = new URL(p);
    return { proxy: { server: u.protocol + "//" + u.host,
      username: decodeURIComponent(u.username), password: decodeURIComponent(u.password) } };
  } catch (e) { return {}; }
}
const VIEWPORTS = [
  ["1920x1080", 1920, 1080],
  ["1366x768", 1366, 768],
  ["390x844", 390, 844],
  ["844x390", 844, 390],
];

(async () => {
  const tag = process.argv[2] || "qa";
  const outdir = path.join(__dirname, "..", "shots", tag);
  fs.mkdirSync(outdir, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const errors = [];
  for (const [name, w, h] of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, ...netOpts() });
    page.on("pageerror", e => errors.push(name + ": " + e.message));
    await page.goto(URL, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(800);
    // 1) TV menyala
    await page.click("#powerBtn");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outdir, name + "-tv.png") });
    // 2) remote terbuka
    await page.click("#remoteFab");
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outdir, name + "-remote.png") });
    await page.keyboard.press("Escape");
    // 3) settings
    await page.keyboard.press("s");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outdir, name + "-settings.png") });
    await page.keyboard.press("Escape");
    // 4) guide
    await page.keyboard.press("g");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outdir, name + "-guide.png") });
    await page.keyboard.press("Escape");
    await page.close();
    console.log("OK " + name);
  }
  await browser.close();
  console.log("pageerrors:", errors.length ? errors : "tidak ada");
  console.log("shots -> " + outdir);
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
