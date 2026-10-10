#!/usr/bin/env python3
"""Tier-1 auto-SKIP konservatif untuk kandidat Dailymotion.

Hanya menandai SKIP bila judul JELAS junk menurut aturan validitas:
- klip film jadul (bukan iklan/ident/opening siaran TV)
- ident stasiun asing (bukan siaran Indonesia)
- konten anak modern (lagu anak/Islami 2010-an, bukan opening era 1990-2015)
- judul generik yang tidak bisa diverifikasi isinya ("ident", "IDENT 03")
- iklan modern di luar cakupan era

Tidak pernah menandai YA. Keputusan YA + cat/st tetap review manusia.
Jalankan dengan --dry-run dulu, lalu tanpa flag untuk menerapkan.

Penggunaan:
  python3 scripts/tier1_skip.py --dry-run
  python3 scripts/tier1_skip.py
"""
import re
import sys

FILES = [
    "scripts/cand/rev-iklan-dm.tsv",
    "scripts/cand/rev-ident-dm.tsv",
    "scripts/cand/rev-kartun-dm.tsv",
]

# (pola regex, alasan) — semua case-insensitive, dicocokkan ke title_oembed + title_discovery
SKIP_RULES = [
    # --- klip film jadul: bukan materi siaran TV ---
    (r"film.{0,25}jadul|jadul.{0,25}\bfilm\b", "klip film jadul, bukan iklan/siaran TV"),
    (r"\bcuplikan\b", "cuplikan film, bukan materi siaran"),
    (r"\btrailer\b.*\bfilm\b|\bfilm\b.*\btrailer\b", "trailer film"),
    # --- ident stasiun asing ---
    (r"nickelodeon|cartoon network|disney channel|\bcanal\s*\+|\be4\b.{0,10}ident|ident.{0,10}\be4\b|sky.{0,10}ident|ident.{0,10}sky|five.{0,10}idents?|carlton|noggin|\bosn\b|surfersvillage|astrion|owl.ident|speed\.fm|newsone|central.{0,10}ident|brahal|ident.{0,10}house",
     "ident stasiun asing, bukan siaran Indonesia"),
    # --- judul generik tak terverifikasi ---
    (r"^(ident|idents?|pin\s*ident|trthaber\s*ident)\s*\d*$", "judul generik, isi tak terverifikasi"),
    # --- konten anak modern (bukan opening era 1990-2015) ---
    (r"lagu anak|kartun anak islami|video anak muslim|anak muslim|doong doong|play.?doh|senam anak|kisah teladan|dalam kartun\b|kartun.{0,15}ramadhan|islami.{0,15}kartun",
     "konten anak modern, bukan opening siaran era"),
    (r"\bspiderman\b.{0,30}kartun|\bkartun\b.{0,15}spiderman", "kartun spiderman modern/play-doh"),
    # --- iklan modern di luar cakupan ---
    (r"mobile legends|iklan terbaru|iklan.{0,15}202[0-9]", "iklan modern, di luar era 1990-2015"),
    # --- episode full / film full ---
    (r"\bfull\s*(episode|movie|film)\b|episode\s*\d+\s*(full|lengkap)|\bpart\s*\d+\b.*\bfilm\b",
     "episode/film full, bukan cuplikan siaran"),
]

COMPILED = [(re.compile(p, re.I), why) for p, why in SKIP_RULES]


def decide(title_oembed, title_disc):
    text = (title_oembed or "") + " \u0000 " + (title_disc or "")
    for rx, why in COMPILED:
        if rx.search(text):
            return why
    return None


def main():
    dry = "--dry-run" in sys.argv
    total_skip = 0
    for f in FILES:
        lines = open(f, encoding="utf-8").read().splitlines()
        head = lines[0]
        out = [head]
        n_skip = 0
        skipped_samples = []
        for ln in lines[1:]:
            cols = ln.split("\t")
            if len(cols) < 10:
                out.append(ln)
                continue
            putusan, status = cols[0].strip(), cols[1].strip()
            # hanya sentuh baris YA|OK yang belum direview manusia (cat/st kosong)
            if putusan == "YA" and status == "OK" and not cols[6].strip() and not cols[7].strip():
                why = decide(cols[4], cols[5])
                if why:
                    cols[0] = "SKIP"
                    cols[8] = (cols[8] + "; " if cols[8] else "") + "tier1: " + why
                    n_skip += 1
                    if len(skipped_samples) < 8:
                        skipped_samples.append((cols[3], cols[4][:70], why))
            out.append("\t".join(cols))
        if not dry:
            open(f, "w", encoding="utf-8").write("\n".join(out) + "\n")
        total_skip += n_skip
        print("%s: SKIP %d baris%s" % (f.split("/")[-1], n_skip, " (dry-run)" if dry else ""))
        for vid, t, why in skipped_samples:
            print("    - %s | %s | %s" % (vid, t, why))
    print("TOTAL SKIP: %d%s" % (total_skip, " (dry-run)" if dry else ""))


if __name__ == "__main__":
    main()
