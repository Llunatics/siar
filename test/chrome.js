// Resolves the headless Chromium executable for the Siar test suite.
// Prefers $SIAR_CHROME, then the newest chromium-* build in the Playwright
// cache (the suite used to hardcode chromium-1243, which broke as soon as
// the installed build moved to chromium-1248).
const fs = require("fs");
const path = require("path");

function chromeExe() {
  if (process.env.SIAR_CHROME && fs.existsSync(process.env.SIAR_CHROME)) {
    return process.env.SIAR_CHROME;
  }
  const cache = path.join(process.env.HOME || "~", ".cache", "ms-playwright");
  try {
    const vers = fs
      .readdirSync(cache)
      .filter((d) => d.startsWith("chromium-"))
      .sort()
      .reverse();
    for (const v of vers) {
      for (const sub of ["chrome-linux64", "chrome-linux"]) {
        const exe = path.join(cache, v, sub, "chrome");
        if (fs.existsSync(exe)) return exe;
      }
    }
  } catch (e) {
    /* cache unreadable — fall through to legacy path */
  }
  // Legacy fallback (original hardcoded path).
  return path.join(
    process.env.HOME,
    ".cache/ms-playwright/chromium-1243/chrome-linux64/chrome"
  );
}

module.exports = { chromeExe };
