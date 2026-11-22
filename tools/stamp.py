"""
Cache-busting stamper: run before every push.

    python tools/stamp.py          rewrite every ?v=... in index.html and preview.html
    python tools/stamp.py --check  only report; exits 1 if a stamp is stale or a file is missing

Each css/ and js/ link gets ?v=<first 8 hex of the file's content hash>, so a file's stamp
changes exactly when the file changes and phones that already opened the GitHub Pages link
fetch the new copy. Line endings are normalised first, so Windows (CRLF) and the published
copy (LF) give the same stamp.

It also warns about:
  - a link pointing at a file that does not exist
  - a .js / .css file in js/ or css/ that index.html never loads (forgot to add the tag)
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ["index.html", "preview.html"]
LINK = re.compile(r'((?:href|src)=")((?:css|js)/[^"?]+)(\?v=[^"]*)?(")')


def stamp_of(path):
    data = path.read_bytes().replace(b"\r\n", b"\n")
    return hashlib.sha1(data).hexdigest()[:8]


def main():
    check = "--check" in sys.argv
    problems, changed = [], {}

    for page in PAGES:
        p = ROOT / page
        html = p.read_text(encoding="utf-8")

        def fix(m):
            target = ROOT / m.group(2)
            if not target.exists():
                problems.append("%s links %s, which does not exist" % (page, m.group(2)))
                return m.group(0)
            new = "?v=" + stamp_of(target)
            if m.group(3) != new:
                changed.setdefault(m.group(2), new)
            return m.group(1) + m.group(2) + new + m.group(4)

        out = LINK.sub(fix, html)
        if out != html and not check:
            p.write_bytes(out.encode("utf-8"))

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    loaded = set(m.group(2) for m in LINK.finditer(index))
    for f in sorted(list((ROOT / "js").rglob("*.js")) + list((ROOT / "css").rglob("*.css"))):
        rel = f.relative_to(ROOT).as_posix()
        if rel not in loaded:
            problems.append("index.html never loads %s" % rel)

    for f, new in sorted(changed.items()):
        print("%s %s%s" % ("stale  " if check else "stamped", f, new))
    for line in problems:
        print("WARNING " + line)
    if not changed and not problems:
        print("all stamps up to date")
    if check and (changed or problems):
        sys.exit(1)


if __name__ == "__main__":
    main()
