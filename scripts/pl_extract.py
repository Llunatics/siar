#!/usr/bin/env python3
"""Ekstrak pasangan (videoId, judul) berurutan dari halaman playlist YouTube.

Tanpa API key: unduh HTML playlist, parse blok playlistVideoRenderer.
Keluaran: JSONL kandidat {src:yt, id, title, q: <playlist title>}.

Penggunaan:
  python3 scripts/pl_extract.py "https://www.youtube.com/playlist?list=XXX" --out scripts/cand/cand-pl-XXX.jsonl
"""
import json
import os
import re
import subprocess
import sys
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "replace")


def extract_pairs(html):
    # Tiap item: "playlistVideoRenderer":{"videoId":"...","thumbnail":...,"title":{"runs":[{"text":"..."}]}
    pat = re.compile(
        r'"playlistVideoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})".{0,4000}?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"',
        re.S,
    )
    pairs = []
    for m in pat.finditer(html):
        vid = m.group(1)
        title = m.group(2).encode().decode("unicode_escape", "replace")
        title = title.replace('\\"', '"')
        pairs.append((vid, title))
    return pairs


def existing_keys():
    js = (
        "const fs=require('fs');"
        "const src=fs.readFileSync(" + repr(os.path.join(REPO, "assets", "js", "channels.js")) + ",'utf8');"
        "const arr=eval(src.slice(src.indexOf('['),src.lastIndexOf(']')+1));"
        "process.stdout.write(JSON.stringify(arr.map(c=>((c.src||'yt')+':'+c.id))));"
    )
    out = subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True)
    return set(json.loads(out.stdout))


def main():
    url = sys.argv[1]
    out = sys.argv[sys.argv.index("--out") + 1]
    html = fetch(url)
    m = re.search(r'"title":"((?:[^"\\]|\\.)*)","playlistId"', html)
    pl_title = m.group(1).encode().decode("unicode_escape") if m else url
    pairs = extract_pairs(html)
    have = existing_keys()
    seen, kept = set(), []
    for vid, title in pairs:
        key = "yt:" + vid
        if key in have or key in seen:
            continue
        seen.add(key)
        kept.append({"src": "yt", "id": vid, "title": title, "q": "pl:" + pl_title[:80]})
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        for c in kept:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    print("playlist: %s" % pl_title[:80])
    print("video berurutan: %d, kandidat baru: %d -> %s" % (len(pairs), len(kept), out))


if __name__ == "__main__":
    main()
