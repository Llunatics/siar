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

Chromium: `~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`
via `playwright-core`.

## Suite inti (regression tiap ~5 siklus)

| File | Uji |
| --- | --- |
| `baseline-smoke.js` | Smoke test dasar (18–19 cek) |
| `remote-click.js` | Semua fungsi remote (18 cek) |
| `hold-repeat.js` | Tahan CH±/VOL± (3/3) |
| `guide-chunk.js` | Render bertahap panduan |

## Helper w3 (wave-3)

| File | Uji |
| --- | --- |
| `w3shot.js <w> <h> <nama> [normal\|immersive]` | Screenshot QA |
| `w3btn.js` | Tombol power & strike |
| `w3dim.js` | Peredup imersif saat TV mati |
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
