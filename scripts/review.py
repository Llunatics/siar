#!/usr/bin/env python3
"""Verifikasi kandidat discovery -> TSV review manusia -> append ke channels.js.

Tahap 1 (verify): baca JSONL kandidat, cek tiap id via oEmbed resmi,
tulis TSV: putusan | status | src | id | title_oembed | title_discovery | cat | st | note.
Tahap 2 (append): baca TSV yang SUDAH direview (putusan=YA, cat+st terisi),
append ke assets/js/channels.js dengan dedupe src:id.

Penggunaan:
  python3 scripts/review.py verify --in scripts/cand/cand-iklan-dm.jsonl --out scripts/cand/rev-iklan-dm.tsv
  # edit TSV: isi putusan/cat/st, perbaiki title bila perlu
  python3 scripts/review.py append --in scripts/cand/rev-iklan-dm.tsv
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(REPO, "scripts", ".cache", "verify.json")
UA = {"User-Agent": "SiarCatalogAudit/1.0"}
SUSPICIOUS = re.compile(
    r"lirik|lyric|cover|reaction|review|unboxing|gameplay|trailer|full\s+movie"
    r"|podcast|vlog|episode|live\s+streaming",
    re.I,
)
CATS = {
    "Iklan Jadul",
    "Opening Kartun",
    "Opening Tokusatsu",
    "Sinetron & Acara TV",
    "Jingle & Ident",
}


def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""
    except Exception as e:
        return -1, str(e).encode()


_oembed_cache = (
    json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
)


def save_cache():
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump(_oembed_cache, open(CACHE, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)


def oembed(src, vid):
    if src == "yt":
        url = "https://www.youtube.com/oembed?url=" + urllib.parse.quote(
            "https://www.youtube.com/watch?v=" + vid, safe="") + "&format=json"
    elif src == "dm":
        url = "https://www.dailymotion.com/services/oembed?url=" + urllib.parse.quote(
            "https://www.dailymotion.com/video/" + vid, safe="") + "&format=json"
    elif src == "vimeo":
        url = "https://vimeo.com/api/oembed.json?url=" + urllib.parse.quote(
            "https://vimeo.com/" + vid, safe="")
    elif src == "ia":
        url = "https://archive.org/metadata/" + urllib.parse.quote(vid, safe="")
    else:
        return {"status": "UNKNOWN_SRC"}
    key = src + ":" + vid
    if key in _oembed_cache:
        # Normalisasi format cache verify.py ("oembed_title") ke format review.py ("title")
        res = dict(_oembed_cache[key])
        if "title" not in res and "oembed_title" in res:
            res["title"] = res["oembed_title"]
        return res
    code, body = fetch(url)
    time.sleep(0.5)
    res = {"status": "FAIL", "code": code}
    if code == 200 and body:
        try:
            data = json.loads(body)
            title = data.get("title", "") or data.get("metadata", {}).get("title", "")
            if isinstance(title, list):
                title = title[0] if title else ""
            res = {"status": "OK", "title": str(title)[:200]}
            if SUSPICIOUS.search(str(title)):
                res["status"] = "REVIEW"
        except Exception:
            res = {"status": "FAIL", "code": code, "note": "bukan JSON"}
    elif code in (401, 403, 404):
        res["note"] = "privat/dihapus"
    elif code == -1:
        res["note"] = "network: " + body.decode()[:60]
    _oembed_cache[key] = res
    return res


def cmd_verify(fin, fout):
    rows = [json.loads(l) for l in open(fin, encoding="utf-8") if l.strip()]
    # MERGE: pertahankan putusan/cat/st/title manual dari TSV lama (berdasarkan id)
    prev = {}
    if os.path.exists(fout):
        for ln in open(fout, encoding="utf-8").read().splitlines()[1:]:
            cols = ln.split("\t")
            if len(cols) >= 8:
                prev[cols[3]] = cols  # key = id
    stats = {}
    with open(fout, "w", encoding="utf-8") as f:
        f.write("putusan\tstatus\tsrc\tid\ttitle_oembed\ttitle_discovery\t"
                "cat\tst\tnote\tquery\n")
        for i, c in enumerate(rows):
            r = oembed(c["src"], c["id"])
            stats[r["status"]] = stats.get(r["status"], 0) + 1
            auto = "YA" if r["status"] == "OK" else ""
            old = prev.get(c["id"])
            if old:
                # pertahankan review manusia; status & judul oEmbed tetap di-refresh
                cols = [old[0], r["status"], c["src"], c["id"],
                        r.get("title", "").replace("\t", " ") or old[4],
                        c.get("title", "").replace("\t", " ")[:160],
                        old[6] if len(old) > 6 else "",
                        old[7] if len(old) > 7 else "",
                        (old[8] if len(old) > 8 else "") or r.get("note", ""),
                        c.get("q", "")]
            else:
                cols = [
                    auto,
                    r["status"],
                    c["src"],
                    c["id"],
                    r.get("title", "").replace("\t", " "),
                    c.get("title", "").replace("\t", " ")[:160],
                    "",
                    "",
                    r.get("note", ""),
                    c.get("q", ""),
                ]
            f.write("\t".join(cols) + "\n")
            if (i + 1) % 50 == 0:
                print("  ...%d/%d" % (i + 1, len(rows)), flush=True)
                save_cache()
    save_cache()
    print("verify:", stats, "->", fout)


def js_escape(s):
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")


def cmd_append(fin):
    lines = [l.rstrip("\n") for l in open(fin, encoding="utf-8")]
    head = lines[0].split("\t")
    idx = {h: i for i, h in enumerate(head)}
    js = (
        "const fs=require('fs');"
        "const src=fs.readFileSync(" + repr(os.path.join(REPO, "assets", "js", "channels.js")) + ",'utf8');"
        "const arr=eval(src.slice(src.indexOf('['),src.lastIndexOf(']')+1));"
        "process.stdout.write(JSON.stringify(arr));"
    )
    existing = json.loads(
        subprocess.run(["node", "-e", js], capture_output=True, text=True,
                       check=True).stdout
    )
    have = set((c.get("src", "yt") + ":" + c["id"]) for c in existing)
    added = 0
    skipped = []
    new_entries = []
    for ln in lines[1:]:
        cols = ln.split("\t")
        if len(cols) < len(head):
            continue
        if cols[idx["putusan"]].strip().upper() != "YA":
            continue
        src = cols[idx["src"]].strip()
        vid = cols[idx["id"]].strip()
        title = cols[idx["title_oembed"]].strip() or cols[idx["title_discovery"]].strip()
        cat = cols[idx["cat"]].strip()
        st = cols[idx["st"]].strip()
        if not (src and vid and title and cat and st):
            skipped.append((vid, "kolom kosong"))
            continue
        if cat not in CATS:
            skipped.append((vid, "cat tidak dikenal: " + cat))
            continue
        key = src + ":" + vid
        if key in have:
            skipped.append((vid, "duplikat"))
            continue
        have.add(key)
        tail = "" if src == "yt" else ', src: "%s"' % src
        ent = '  { id: "%s", title: "%s", cat: "%s", st: "%s"%s },' % (
            js_escape(vid), js_escape(title), cat, st, tail)
        new_entries.append(ent)
        added += 1
    if new_entries:
        chpath = os.path.join(REPO, "assets", "js", "channels.js")
        s = open(chpath, encoding="utf-8").read().rstrip()
        assert s.endswith("];"), "format channels.js tak dikenal"
        s = s[: -len("];")].rstrip() + "\n" + "\n".join(new_entries) + "\n];\n"
        open(chpath, "w", encoding="utf-8").write(s)
    print("append: %d entri baru, %d dilewati" % (added, len(skipped)))
    for v, why in skipped[:20]:
        print("  skip", v, "-", why)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("pakai: verify | append")
    if sys.argv[1] == "verify":
        fi = sys.argv[sys.argv.index("--in") + 1]
        fo = sys.argv[sys.argv.index("--out") + 1]
        cmd_verify(fi, fo)
    elif sys.argv[1] == "append":
        fi = sys.argv[sys.argv.index("--in") + 1]
        cmd_append(fi)
