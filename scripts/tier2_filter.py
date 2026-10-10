#!/usr/bin/env python3
"""Tier-2: saring kandidat DM yang judulnya JELAS valid untuk review manusia.

Hanya MENGUSULKAN (tidak menandai YA). Output: TSV per file berisi baris
YA|OK yang lolos filter judul, untuk review manusia judul-per-judul.

Pola keep dirancang konservatif: judul harus menyebut stasiun Indonesia +
kata kunci materi (ident/station id/bumper/jingle/pembuka), ATAU untuk
iklan/kartun menyebut konten spesifik era + Indonesia.
"""
import re
import sys

ST = (r"rcti|sctv|indosiar|antv|\btpi\b|mnctv|global\s*tv|trans\s*tv|trans7|\btv7\b"
      r"|lativi|spacetoon|\brtv\b|tvri|metro\s*tv|inews|\bnet\b.{0,5}tv|b\s*channel")
MATERI_IDENT = r"ident|station.{0,5}id|bumper|pembuka|jingle|tune|logo"

RX_IDENT = re.compile(r"(%s).{0,40}(%s)|(%s).{0,40}(%s)" % (ST, MATERI_IDENT, MATERI_IDENT, ST), re.I)
# tolak yang jelas asing meski menyebut pola umum
RX_ASING = re.compile(r"gma\b|pptv|abc\b|abs.cbn|zambia|nigeria|ghana|kenya|philippin|thailand|malaysia\b|"
                      r"nickelodeon|cartoon network|disney|canal\s*\+|rai\b|bbc\b|itv\b|cnn\b|al.?jazeera", re.I)

# iklan: kompilasi iklan jadul / iklan produk spesifik era
RX_IKLAN = re.compile(r"iklan.{0,25}jadul|jadul.{0,25}iklan|iklan.{0,20}(indomie|90an|80an|tempo dulu|lawas)|"
                      r"kompilasi.{0,30}iklan|kumpulan.{0,30}iklan", re.I)
RX_IKLAN_TOLAK = re.compile(r"\bfilm\b|sinetron|episode|tutorial|review|unboxing|prank|vlog", re.I)

# kartun: opening/pembuka versi Indonesia yang spesifik
RX_KARTUN = re.compile(r"(opening|pembuka|lagu pembuka).{0,40}(indonesia|versi indo)|"
                       r"(indonesia|versi indo).{0,40}(opening|pembuka)", re.I)
RX_KARTUN_TOLAK = re.compile(r"lagu anak|islami|muslim|doong|play.?doh|spiderman|teletubbies|diva\b", re.I)


def keep_ident(t):
    if RX_ASING.search(t):
        return False
    return bool(RX_IDENT.search(t))


def keep_iklan(t):
    if RX_IKLAN_TOLAK.search(t):
        return False
    return bool(RX_IKLAN.search(t))


def keep_kartun(t):
    if RX_KARTUN_TOLAK.search(t):
        return False
    return bool(RX_KARTUN.search(t))


KEEPERS = {
    "scripts/cand/rev-ident-dm.tsv": keep_ident,
    "scripts/cand/rev-iklan-dm.tsv": keep_iklan,
    "scripts/cand/rev-kartun-dm.tsv": keep_kartun,
}


def main():
    for f, fn in KEEPERS.items():
        lines = open(f, encoding="utf-8").read().splitlines()
        out = [lines[0]]
        for ln in lines[1:]:
            cols = ln.split("\t")
            if len(cols) < 10:
                continue
            if cols[0].strip() == "YA" and cols[1].strip() == "OK":
                t = (cols[4] or "") + " " + (cols[5] or "")
                if fn(t):
                    out.append(ln)
        of = f.replace("rev-", "tier2-")
        open(of, "w", encoding="utf-8").write("\n".join(out) + "\n")
        print("%s -> %s : %d baris" % (f.split("/")[-1], of.split("/")[-1], len(out) - 1))


if __name__ == "__main__":
    main()
