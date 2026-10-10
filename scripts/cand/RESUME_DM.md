# Resume verifikasi Dailymotion

**Status:** DITUNDA 2026-10-11 ~06:30 WIB — `www.dailymotion.com` & `api.dailymotion.com`
tidak bisa dijangkau dari VM (curl timeout 25 dtk; YouTube oEmbed normal 0,7 dtk).
Terverifikasi parsial tersimpan di `scripts/.cache/verify.json` (1.705 kunci)
dan TSV output (baris yang sudah ditulis aman).

**Cek konektivitas dulu:**

```bash
curl -s --max-time 15 -o /dev/null -w "%{http_code}\n" \
  "https://www.dailymotion.com/services/oembed?url=https%3A%2F%2Fwww.dailymotion.com%2Fvideo%2Fx8u8y9a&format=json"
# lanjutkan hanya jika HTTP 200
```

**Resume (cache membuat entri lama dilewati cepat):**

```bash
cd ~/workspace/repos/siar
python3 scripts/review.py verify --in scripts/cand/cand-iklan-dm.jsonl  --out scripts/cand/rev-iklan-dm.tsv  > /tmp/siar-rev-iklan.log  2>&1 &
python3 scripts/review.py verify --in scripts/cand/cand-ident-dm.jsonl  --out scripts/cand/rev-ident-dm.tsv  > /tmp/siar-rev-ident.log  2>&1 &
python3 scripts/review.py verify --in scripts/cand/cand-kartun-dm.jsonl --out scripts/cand/rev-kartun-dm.tsv > /tmp/siar-rev-kartun.log 2>&1 &
```

**Langkah setelah verify selesai:** `review.py verify` (JSONL→TSV review, merge putusan manual)
→ review manusia judul-per-judul → `review.py append` → `channels.js`.
Aturan review: SKIP cover/remix/episode/remake AI/judul kosong/near-duplikat.
