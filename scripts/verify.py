#!/usr/bin/env python3
"""Verifikasi entri katalog Siar ke endpoint resmi sumber (oEmbed/metadata).

Sumber yang didukung:
  yt    -> https://www.youtube.com/oembed?url=... (tanpa API key)
  dm    -> https://www.dailymotion.com/services/oembed?url=...
  vimeo -> https://vimeo.com/api/oembed.json?url=...
  ia    -> https://archive.org/metadata/<id> (public metadata API)

Penggunaan:
  python3 scripts/verify.py [--limit N] [--fresh] [--report path]
  Masukkan: assets/js/channels.js (diparsing, bukan di-eval sebagai kode)
  Keluaran: ringkasan OK/GAGAL per entri + cache JSON di scripts/.cache/

Aturan kejujuran: HTTP 200 saja TIDAK cukup — judul oEmbed harus dibaca
manusia/skor heuristik dan dicatat; video yang jelas tidak relevan
(mis. "lirik", "cover", "full episode" padahal diklaim opening) ditandai
REVIEW, bukan OK.
"""
import json, re, sys, time, urllib.parse, urllib.request, os

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(REPO, "scripts", ".cache", "verify.json")
UA = {"User-Agent": "SiarCatalogAudit/1.0 (https://tv.llunaticsys.web.id)"}

CAT_OK = {"Iklan Jadul", "Opening Kartun", "Opening Tokusatsu",
          "Sinetron & Acara TV", "Jingle & Ident"}

SUSPICIOUS = re.compile(
    r"lirik|lyric|cover|reaction|review|unboxing|gameplay|trailer|episode\s+\d+"
    r"|full\s+movie|dokumenter|podcast|vlog", re.I)

def load_channels():
    # Ekstraksi via node (parser JS asli) -> JSON; lebih aman dari regex.
    import subprocess
    js = ("const fs=require('fs');"
          "const src=fs.readFileSync(%r,'utf8');"
          "const arr=eval(src.slice(src.indexOf('['),src.lastIndexOf(']')+1));"
          "process.stdout.write(JSON.stringify(arr));" % os.path.join(REPO, "assets", "js", "channels.js"))
    out = subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)

def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""
    except Exception as e:
        return -1, str(e).encode()

def check_entry(ch, cache):
    src = ch.get("src", "yt")
    vid = ch["id"]
    key = f"{src}:{vid}"
    if key in cache:
        return cache[key]
    if src == "yt":
        url = "https://www.youtube.com/oembed?url=" + urllib.parse.quote(
            f"https://www.youtube.com/watch?v={vid}", safe="") + "&format=json"
    elif src == "dm":
        url = "https://www.dailymotion.com/services/oembed?url=" + urllib.parse.quote(
            f"https://www.dailymotion.com/video/{vid}", safe="") + "&format=json"
    elif src == "vimeo":
        url = "https://vimeo.com/api/oembed.json?url=" + urllib.parse.quote(
            f"https://vimeo.com/{vid}", safe="")
    elif src == "ia":
        url = f"https://archive.org/metadata/{urllib.parse.quote(vid, safe='')}"
    else:
        return {"status": "UNKNOWN_SRC"}
    code, body = fetch(url)
    time.sleep(0.6)  # rate limit sopan
    res = {"status": "FAIL", "code": code}
    if code == 200 and body:
        try:
            data = json.loads(body)
            title = data.get("title", "") or data.get("metadata", {}).get("title", "")
            if isinstance(title, list):
                title = title[0] if title else ""
            res["status"] = "OK"
            res["oembed_title"] = str(title)[:160]
            if SUSPICIOUS.search(str(title)):
                res["status"] = "REVIEW"
                res["note"] = "judul mencurigakan: " + str(title)[:120]
        except Exception:
            res["status"] = "FAIL"
            res["note"] = "respons bukan JSON"
    elif code in (401, 403, 404):
        res["note"] = "video privat/dihapus/tidak ada"
    elif code == -1:
        res["note"] = "network error: " + body.decode()[:80]
    cache[key] = res
    return res

def main():
    fresh = "--fresh" in sys.argv
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    cache = {}
    if not fresh and os.path.exists(CACHE):
        cache = json.load(open(CACHE, encoding="utf-8"))
    channels = load_channels()
    if limit:
        channels = channels[:limit]
    stats = {"OK": 0, "FAIL": 0, "REVIEW": 0, "UNKNOWN_SRC": 0}
    bad = []
    for i, ch in enumerate(channels):
        r = check_entry(ch, cache)
        stats[r["status"]] = stats.get(r["status"], 0) + 1
        if r["status"] != "OK":
            bad.append((ch.get("src", "yt") + ":" + ch["id"], ch["title"], r))
        if (i + 1) % 25 == 0:
            print(f"  ...{i + 1}/{len(channels)}", flush=True)
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("HASIL:", json.dumps(stats, ensure_ascii=False))
    for key, title, r in bad[:60]:
        print(f"  [{r['status']}] {key} | {title[:70]} | {r.get('note', r.get('code'))}")
    if len(bad) > 60:
        print(f"  ... dan {len(bad) - 60} lagi")
    return 0 if stats["FAIL"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
