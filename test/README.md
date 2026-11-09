# Test Suite Siar

Suite uji headless (Playwright + Chromium) untuk verifikasi nyata —
klik sungguhan, bukan cek statis.

## Prasyarat

```bash
# server lokal (dari root repo)
python3 -m http.server 8777
# dependensi (sekali saja)
cd test && npm install
```

Chromium: otomatis terdeteksi dari `~/.cache/ms-playwright/chromium-*/`
(helper `test/chrome.js`; bisa dioverride via env `SIAR_CHROME`).

## Suite inti (regression tiap ~5 siklus)

| File | Uji |
| --- | --- |
| `baseline-smoke.js` | Smoke test dasar & invarian katalog (21 cek) |
| `hold-repeat.js` | Tahan CH±/VOL± (3/3) |
| `guide-chunk.js` | Render bertahap panduan (7/7) |
| `power-pause.js` | State TV, power, jeda, OSD, error cleanup (28 cek) |
| `remote-click.js` | Semua fungsi remote (18 cek) |
| `verify-iter.js` | Verifikasi iterasi visual & responsif 390x844 (14 cek) |
| `fuzz-xss.js` | Fuzzing keamanan & sanitasi HTML (10 cek) |

## Helper w3 (wave-3)

| File | Uji |
| --- | --- |
| `w3shot.js <w> <h> <nama> [normal\|immersive]` | Screenshot QA |
| `w3btn.js` | Tombol power & strike |
| `w3set.js` | Live preview settings (6/6) |
| `w3persist.js` | Persistensi + migrasi + reset (3/3) |
| `w3feet.js` | Kaki TV per model |
| `w3finbtn.js` | Tombol depan di semua finishing |
| `w3acc.js` | Akordeon settings |
| `w3kbd.js` | Jelajah keyboard penuh |
| `w3watch.js` | Riwayat tontonan |
| `w3journey.js` | Sesi nonton end-to-end |
| `shapes.js` | Screenshot 10 model chassis |

## Konvensi

- Semua test: 0 `pageerror` = syarat lolos.
- Screenshot QA → `shots/qa/`; screenshot model → `shots/shape-*.png`.
- Jangan `git reset --hard`; commit lokal per siklus bermakna.
