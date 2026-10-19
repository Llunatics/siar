// w3kbd.js — navigasi keyboard penuh tanpa mouse
const { chromium } = require("playwright-core");
const path = require("path");
const { chromeExe } = require("./chrome");
const EXE = chromeExe();
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:8777/index.html", { waitUntil: "load" });
  await p.waitForTimeout(500);
  const out = {};
  // Tab dari body: urutan fokus pertama
  await p.keyboard.press("Tab");
  out.firstFocus = await p.evaluate(() => document.activeElement.id || document.activeElement.className);
  // G: buka panduan, Escape: tutup
  await p.keyboard.press("g"); await p.waitForTimeout(800);
  out.guideOpen = await p.evaluate(() => !document.querySelector("#guideSheet").hidden);
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  out.guideClosed = await p.evaluate(() => document.querySelector("#guideSheet").hidden);
  // S: settings, Escape tutup
  await p.keyboard.press("s"); await p.waitForTimeout(700);
  out.setOpen = await p.evaluate(() => !document.querySelector("#settingsSheet").hidden);
  out.setFocus = await p.evaluate(() => {
    const a = document.activeElement;
    return a && a.closest("#settingsSheet") ? "inside" : "outside";
  });
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  out.setClosed = await p.evaluate(() => document.querySelector("#settingsSheet").hidden);
  // remote via fab (fokus keyboard): buka, fokus pindah ke dalam remote
  await p.evaluate(() => document.querySelector("#remoteFab").focus());
  await p.keyboard.press("Enter"); await p.waitForTimeout(700);
  out.remOpen = await p.evaluate(() => document.querySelector("#remote").classList.contains("open"));
  out.remFocus = await p.evaluate(() => {
    const a = document.activeElement;
    return a && document.querySelector("#remote").contains(a) ? "inside:" + (a.id || a.className) : "outside";
  });
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  out.remClosed = await p.evaluate(() => !document.querySelector("#remote").classList.contains("open"));
  out.fabFocus = await p.evaluate(() => document.activeElement.id);
  // power via keyboard: Enter di tombol power
  await p.keyboard.press("Tab"); // pastikan di power
  await p.evaluate(() => document.querySelector("#powerBtn").focus());
  await p.keyboard.press("Enter"); await p.waitForTimeout(600);
  out.powered = await p.evaluate(() => document.querySelector("#tv").classList.contains("on"));
  // panah: ganti channel
  const ch0 = await p.evaluate(() => document.querySelector("#chNum").textContent);
  await p.keyboard.press("ArrowUp"); await p.waitForTimeout(500);
  const ch1 = await p.evaluate(() => document.querySelector("#chNum").textContent);
  // M: mute toggle
  await p.keyboard.press("m"); await p.waitForTimeout(300);
  const mu1 = await p.evaluate(() => document.querySelector("#muteBtn").classList.contains("on"));
  await p.keyboard.press("m"); await p.waitForTimeout(300);
  const mu2 = await p.evaluate(() => document.querySelector("#muteBtn").classList.contains("on"));
  // J: blok jam toggle
  await p.keyboard.press("j"); await p.waitForTimeout(600);
  const jb = await p.evaluate(() => document.querySelector("#blockBadge").textContent);
  await p.keyboard.press("j"); await p.waitForTimeout(500);
  console.log(JSON.stringify({ ...out, ch0, ch1, mu1, mu2, jb, errs: errs.length }));
  await b.close();
})();
