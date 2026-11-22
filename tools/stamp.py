"""
Cache-busting stamper: run before every push.

    python tools/stamp.py          rewrite every ?v=... in the pages listed in PAGES
    python tools/stamp.py --check  only report; exits 1 if a stamp is stale or a file is missing

Each css/ and js/ link (also ../css/, ../js/ from the classroom pages) gets
?v=<first 8 hex of the file's content hash>, so a file's stamp changes exactly when the file
changes and phones that already opened the page fetch the new copy. Line endings are
normalised first, so Windows (CRLF) and the published copy (LF) give the same stamp.

It also warns about:
  - a link pointing at a file that does not exist
  - a .js / .css file that no page loads (forgot to add the tag):
      js/ and css/            must be loaded by index.html (single-player)
      classroom/js, /css      must be loaded by one of the classroom pages
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ["index.html", "preview.html", "classroom/index.html", "classroom/host.html", "classroom/play.html"]
LINK = re.compile(r'((?:href|src)=")((?:\.\./)*(?:css|js)/[^"?]+)(\?v=[^"]*)?(")')
# folder -> pages that must load every .js/.css inside it
COVERAGE = {
    "js": ["index.html"],
    "css": ["index.html"],
    "classroom/js": ["classroom/index.html", "classroom/host.html", "classroom/play.html"],
    "classroom/css": ["classroom/index.html", "classroom/host.html", "classroom/play.html"],
    "classroom/js/host": ["classroom/host.html"],
    "classroom/js/play": ["classroom/play.html"],
}


def stamp_of(path):
    data = path.read_bytes().replace(b"\r\n", b"\n")
    return hashlib.sha1(data).hexdigest()[:8]


def targets(page):
    """Files (relative to ROOT) that a page links to."""
    base = (ROOT / page).parent
    html = (ROOT / page).read_text(encoding="utf-8")
    out = set()
    for m in LINK.finditer(html):
        t = (base / m.group(2)).resolve()
        if t.exists():
            out.add(t.relative_to(ROOT).as_posix())
    return out


def main():
    check = "--check" in sys.argv
    problems, changed = [], {}

    for page in PAGES:
        p = ROOT / page
        base = p.parent
        html = p.read_text(encoding="utf-8")

        def fix(m):
            target = (base / m.group(2)).resolve()
            if not target.exists():
                problems.append("%s links %s, which does not exist" % (page, m.group(2)))
                return m.group(0)
            new = "?v=" + stamp_of(target)
            if m.group(3) != new:
                changed.setdefault(target.relative_to(ROOT).as_posix(), new)
            return m.group(1) + m.group(2) + new + m.group(4)

        out = LINK.sub(fix, html)
        if out != html and not check:
            p.write_bytes(out.encode("utf-8"))

    for folder, pages in COVERAGE.items():
        loaded = set().union(*(targets(pg) for pg in pages))
        files = sorted(list((ROOT / folder).glob("*.js")) + list((ROOT / folder).glob("*.css")))
        if folder == "js":   # js/ includes sub-folders (data, core, ui, ui/screens)
            files = sorted((ROOT / folder).rglob("*.js"))
        for f in files:
            rel = f.relative_to(ROOT).as_posix()
            if rel not in loaded:
                problems.append("%s never loads %s" % (" / ".join(pages), rel))

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
