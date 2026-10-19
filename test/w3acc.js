// w3acc.js — akordeon settings: collapse, persistensi reload, expand
const { chromium } = require("playwright-core");
const path = require("path");
const { chromeExe } = require("./chrome");
const EXE = chromeExe();
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector("#remoteFab").click());
  await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector("#remSet").click());
  await p.waitForTimeout(700);
  const grp = () => "[...document.querySelectorAll('#settingsSheet .set-group')]" +
    ".find(g => g.querySelector('h3').textContent.trim() === 'Remote')";
  await p.evaluate(() => {
    [...document.querySelectorAll("#settingsSheet .set-group h3")]
      .find((h) => h.textContent.trim() === "Remote").click();
  });
  await p.waitForTimeout(400);
  const closed1 = await p.evaluate(new Function("return " + grp() + ".classList.contains('closed')"));
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(500);
  await p.keyboard.press("s");
  await p.waitForTimeout(700);
  const closed2 = await p.evaluate(new Function("return " + grp() + ".classList.contains('closed')"));
  await p.evaluate(() => {
    [...document.querySelectorAll("#settingsSheet .set-group h3")]
      .find((h) => h.textContent.trim() === "Remote").click();
  });
  await p.waitForTimeout(400);
  const closed3 = await p.evaluate(new Function("return " + grp() + ".classList.contains('closed')"));
  console.log(JSON.stringify({ closed1, closed2, closed3, errs: errs.length }));
  await b.close();
})();
