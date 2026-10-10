#!/usr/bin/env python3
"""Discovery kandidat katalog Siar dari API publik tanpa key.

Sumber:
  dm  Dailymotion  https://api.dailymotion.com/videos?search=... (publik, tanpa key)
  ia  Internet Archive advancedsearch.php (publik, tanpa key)

Alur: query matrix -> kandidat JSONL -> scripts/verify.py -> review manusia -> append.

Penggunaan:
  python3 scripts/discover.py --source dm --queries-file scripts/queries-iklan.txt --out scripts/cand/cand-iklan-dm.jsonl
  python3 scripts/discover.py --source ia --query "iklan tv indonesia" --out scripts/cand/cand-iklan-ia.jsonl --limit 200
"""
import json, os, sys, time, urllib.parse, urllib.request, argparse

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {"User-Agent": "SiarCatalogAudit/1.0 (https://tv.llunaticsys.web.id)"}

def get(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except Exception as e:
        print("  [err]", url[:90], str(e)[:100], flush=True)
        return None

def dm_search(query, limit):
    out, page = [], 1
    while len(out) < limit:
        url = ("https://api.dailymotion.com/videos?search=" + urllib.parse.quote(query) +
               "&fields=id,title,duration,created_time,views_total&limit=100&page=" + str(page) +
               "&sort=relevance&private=0")
        data = get(url)
        if not data or not data.get("list"):
            break
        for v in data["list"]:
            out.append({"src": "dm", "id": v["id"], "title": v.get("title", ""),
                        "q": query, "dur": v.get("duration"), "views": v.get("views_total")})
            if len(out) >= limit:
                break
        if not data.get("has_more"):
            break
        page += 1
        time.sleep(0.5)
    return out

def ia_search(query, limit):
    out, page = [], 0
    while len(out) < limit:
        url = ("https://archive.org/advancedsearch.php?q=" + urllib.parse.quote(query) +
               "&fl[]=identifier&fl[]=title&fl[]=date&fl[]=mediatype&rows=100&page=" + str(page + 1) +
               "&output=json")
        data = get(url)
        docs = (data or {}).get("response", {}).get("docs", [])
        if not docs:
            break
        for d in docs:
            if d.get("mediatype") not in ("movies", "audio"):
                continue
            title = d.get("title", "")
            if isinstance(title, list):
                title = title[0] if title else ""
            out.append({"src": "ia", "id": d["identifier"], "title": str(title),
                        "q": query, "date": d.get("date")})
            if len(out) >= limit:
                break
        page += 1
        time.sleep(0.5)
    return out

def existing_keys():
    import subprocess
    js = ("const fs=require('fs');"
          "const src=fs.readFileSync(%r,'utf8');"
          "const arr=eval(src.slice(src.indexOf('['),src.lastIndexOf(']')+1));"
          "process.stdout.write(JSON.stringify(arr.map(c=>((c.src||'yt')+':'+c.id))));"
          % os.path.join(REPO, "assets", "js", "channels.js"))
    out = subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True)
    return set(json.loads(out.stdout))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=["dm", "ia"], required=True)
    ap.add_argument("--query")
    ap.add_argument("--queries-file")
    ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int, default=150)
    a = ap.parse_args()

    queries = []
    if a.queries_file:
        queries = [l.strip() for l in open(a.queries_file, encoding="utf-8")
                   if l.strip() and not l.strip().startswith("#")]
    elif a.query:
        queries = [a.query]
    else:
        ap.error("butuh --query atau --queries-file")

    have = existing_keys()
    seen, kept = set(), []
    for q in queries:
        print("query:", q, flush=True)
        res = dm_search(q, a.limit) if a.source == "dm" else ia_search(q, a.limit)
        for c in res:
            key = c["src"] + ":" + c["id"]
            if key in have or key in seen:
                continue
            seen.add(key)
            kept.append(c)
        time.sleep(0.8)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        for c in kept:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    print(f"kandidat baru: {len(kept)} -> {a.out}")

if __name__ == "__main__":
    main()
