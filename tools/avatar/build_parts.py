"""
Character parts v2 generator.

Draws every avatar part as a 48x48 template whose recolourable pixels use "key colours"
(see KEYS). The game swaps those keys for the player's chosen skin / hair / main / trim
colours at runtime, so one template covers every colour.

Run:  python tools/avatar/build_parts.py            -> writes assets/characters/v2/*.png
      python tools/avatar/build_parts.py --preview  -> also writes tools/avatar/preview.png

Grid reference (matches the v1 sprites): head outline x15..32 / y10..27, eyes x19-20 & x26-27,
mouth y22, hands x14-16 & x31-33 / y31-35, outfit y25..43, boots end y43, shadow y42-45.
"""
import colorsys
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import shade as SH  # noqa: E402
import shapes as SHP  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
V1 = ROOT / "assets" / "characters" / "parts"
OUT = Path(__file__).resolve().parent / "out"          # loose PNGs for inspection (gitignored)
BUNDLE = ROOT / "js" / "data" / "avatar-sprites.js"     # what the game loads

# ---------------------------------------------------------------- key colours
KEYS = {
    "skin": [(255, 0, 1), (254, 0, 2), (253, 0, 3)],   # light, mid, shade
    "hair": [(1, 255, 0), (2, 254, 0), (3, 253, 0)],
    "main": [(0, 1, 255), (0, 2, 254), (0, 3, 253)],
    "trim": [(255, 255, 1), (254, 254, 2), (253, 253, 3)],
    "eye":  [(1, 1, 254), (1, 2, 253), (1, 3, 252)],
}
OUTLINE = (20, 16, 32)

# Characters usable in ASCII art. Upper/lower/digit sets map to key ramps; others are fixed colours.
CHARS = {
    "o": OUTLINE + (255,),
    "S": KEYS["skin"][0] + (255,), "s": KEYS["skin"][1] + (255,), "Z": KEYS["skin"][2] + (255,),
    "H": KEYS["hair"][0] + (255,), "h": KEYS["hair"][1] + (255,), "X": KEYS["hair"][2] + (255,),
    "L": KEYS["main"][0] + (255,), "M": KEYS["main"][1] + (255,), "D": KEYS["main"][2] + (255,),
    "1": KEYS["trim"][0] + (255,), "2": KEYS["trim"][1] + (255,), "3": KEYS["trim"][2] + (255,),
    "w": (245, 248, 255, 255),  # white / eye shine
    "e": (24, 24, 42, 255),     # eye dark
    "i": KEYS["eye"][1] + (255,),  # eye iris (recolourable)
    "I": KEYS["eye"][2] + (255,),  # eye iris upper shade (recolourable)
    "p": (255, 150, 160, 255),  # pink (blush, inner ear)
    "P": (226, 96, 120, 255),   # deep pink (tongue, flower)
    "r": (200, 40, 50, 255),    # mouth red
    "b": (110, 62, 28, 255),    # belt brown
    "g": (250, 204, 21, 255),   # gold
    "G": (180, 130, 10, 255),   # gold shade
    "t": (203, 213, 225, 255),  # steel light
    "u": (148, 163, 184, 255),  # steel mid
    "v": (100, 116, 139, 255),  # steel dark
    "k": (146, 90, 50, 255),    # leather
    "j": (101, 60, 32, 255),    # leather dark
    "W": (236, 236, 240, 255),  # cloth white
    "V": (196, 200, 214, 255),  # cloth white shade
    "n": (40, 40, 52, 255),     # charcoal
    "N": (26, 26, 36, 255),     # charcoal dark
    "c": (120, 180, 255, 255),  # glass shine
    "y": (90, 60, 90, 255),     # horn dark
    "Y": (150, 115, 150, 255),  # horn light
    "f": (255, 170, 60, 255),   # fire
    "F": (255, 230, 140, 255),  # fire core
    "R": (230, 70, 50, 255),    # red (pets)
    "q": (60, 180, 90, 255),    # green (pets)
    "Q": (30, 120, 60, 255),
    "x": (0, 0, 0, 95),         # soft shadow
}


def blank(w=64, h=64):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def draw(im, x0, y0, rows, mirror=False):
    """Paint ASCII rows at (x0, y0). '.' is transparent. mirror=True treats rows as the left
    half and appends its mirror image (for symmetric parts)."""
    for dy, row in enumerate(rows):
        if mirror:
            row = row + row[::-1]
        for dx, ch in enumerate(row):
            if ch in ". ":
                continue
            if ch not in CHARS:
                raise ValueError("unknown pixel char %r in row %r" % (ch, row))
            im.putpixel((x0 + dx, y0 + dy), CHARS[ch])
    return im


def recolor_from(path, mapping):
    """Load a v1 sprite and replace exact colours with key colours."""
    im = Image.open(path).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            if p[3] and p[:3] in mapping:
                px[x, y] = mapping[p[:3]] + (255,)
    return im


def ranked_tones(im, n=3):
    """Distinct opaque non-outline colours sorted light -> dark."""
    cols = {p[:3] for p in im.getdata() if p[3] == 255 and p[:3] != OUTLINE}
    return sorted(cols, key=lambda c: -(0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]))[:n]


# =========================================================== BODY (no face)
def build_body():
    base = Image.open(V1 / "body" / "skin_1.png").convert("RGBA")
    px = base.load()
    mid = (240, 190, 147)
    # wipe the painted face so faces can be layered separately
    for (x, y) in [(19, 17), (20, 17), (26, 17), (27, 17)] + [(x, y) for y in (18, 19, 20) for x in (19, 20, 26, 27)] + [(18, 21), (28, 21), (22, 22), (23, 22)]:
        px[x, y] = mid + (255,)
    m = {(255, 212, 164): KEYS["skin"][0], (240, 190, 147): KEYS["skin"][1], (192, 152, 117): KEYS["skin"][2]}
    body = recolor_from(V1 / "body" / "skin_1.png", {})  # placeholder to keep API symmetrical
    body = base
    bpx = body.load()
    for y in range(48):
        for x in range(48):
            p = bpx[x, y]
            if p[3] == 255 and p[:3] in m:
                bpx[x, y] = m[p[:3]] + (255,)
    back = recolor_from(V1 / "body" / "skin_1_back.png", m)
    return {"body": body, "body_back": back}


# =========================================================== FACES (True 2x Stardew Valley Eye Style!)
EYES = {
    # Exact 2x Stardew geometry: dark upper lid + 2px outer white sclera + 2px inner vertical iris (4px center bridge!)
    "normal": (["eeee", "wwIi", "wwii", "wwIi", "...."], ["....", "....", "....", "eeee", "...."]),
    "big":    ([".eee", "wwIi", "wwii", "wwie", ".wii"], ["....", "....", "....", "eeee", "...."]),
    "sharp":  (["ee..", ".eee", "wwIi", "wwii", "...."], ["ee..", "....", "....", "eeee", "...."]),
    "happy":  (["....", ".ee.", "e..e", "....", "...."], ["....", "....", "....", "eeee", "...."]),
    "sleepy": (["....", "eeee", "wwIi", "wwii", "...."], ["....", "....", "....", "eeee", "...."]),
    "angry":  (["e...", "eeee", "wwIi", "wwii", "...."], ["e...", "....", "....", "eeee", "...."]),
}
MOUTHS = {
    "smile": ["....", "....", ".ZZ."],
    "grin":  [".ee.", "eeee", ".rr."],
    "cat":   ["....", "Z.Z.", ".Z.Z"],
    "flat":  ["....", "....", "ZZZZ"],
    "o":     ["....", ".ee.", ".ee."],
}


def build_faces():
    out = {}
    for name, (opened, closed) in EYES.items():
        for tag, rows in (("", opened), ("_blink", closed)):
            im = blank()
            left = rows
            right = [r[::-1] for r in rows]
            draw(im, 26, 16, left)
            draw(im, 34, 16, right)
            if tag == "_blink":
                cover = blank()
                for y in range(16, 21):
                    for x in list(range(26, 30)) + list(range(34, 38)):
                        cover.putpixel((x, y), CHARS["s"])
                cover.alpha_composite(im)
                im = cover
            out["eyes_" + name + tag] = im
    for name, rows in MOUTHS.items():
        im = blank()
        draw(im, 30, 21, rows)
        out["mouth_" + name] = im
    blush = blank()
    draw(blush, 24, 20, ["pp"])
    draw(blush, 38, 20, ["pp"])
    out["blush"] = blush
    return out


# =========================================================== HAIR
HAIR_STYLES = ["short", "messy", "bob", "band", "side", "shaggy", "long", "ponytail", "twintails", "bun", "spiky", "sweep"]
NEW_HAIR = {
    # front view rows (left half x13..23 mirrored -> x13..34 unless 'full'), starting y
    "bun": (1, [
        ".......oooo",
        "......ohhHH",
        "......ohhhh",
        "......oXhhh",
        ".....oooooo",
        "...oohhHHHH",
        "..ohhhHHHHH",
        ".ohhhhhhhhh",
        "ohhhhhhhhhh",
        "ohhhhoooooo",
        "ohhho......",
        ".oo........",
    ], True),
    "spiky": (2, [
        "...o......o",
        "...oo....oh",
        "o..oho..ohh",
        "oo.ohhoohHH",
        "ohoohhhhHHH",
        ".ohhhhhhHHH",
        "..ohhhhhhhh",
        ".ohhhhhhhhh",
        "ohhhhhhhhhh",
        "ohhhhoooooo",
        "ohho.......",
        ".oo........",
    ], True),
    "sweep": (5, [
        "....oooooooooooooo....",
        "..oohhHHHHHHHHHHhhoo..",
        ".ohhhHHHHHHHHHHhhhhho.",
        ".ohhhhhhhhhhhhhhhhhhho",
        "ohhhhhhhhhhhhhhhhhhhho",
        "ohhhhhhhhhhhhhhooohhho",
        "ohhhhhhhhhhhoo...ohhho",
        "ohhhhhhhhhoo......ohho",
        "ohhhhhhhoo.........oho",
        "ohhXXXoo...........oo.",
        "ohhXoo................",
        "ohXo..................",
        ".oo...................",
    ], False),
}


def hair_from_v1(i):
    im = Image.open(V1 / "hair" / ("h%d_c0.png" % i)).convert("RGBA")
    tones = ranked_tones(im)
    m = {tones[k]: KEYS["hair"][min(k, 2)] for k in range(len(tones))}
    front = recolor_from(V1 / "hair" / ("h%d_c0.png" % i), m)
    back_im = Image.open(V1 / "hair" / ("h%d_c0_back.png" % i)).convert("RGBA")
    tb = ranked_tones(back_im)
    back = recolor_from(V1 / "hair" / ("h%d_c0_back.png" % i), {tb[k]: KEYS["hair"][min(k, 2)] for k in range(len(tb))})
    return front, back


def back_from_front(front):
    """Back view: the front silhouette plus the whole back of the head filled with hair."""
    im = blank()
    head = [(x, y) for y in range(10, 27) for x in range(16, 32)]
    for (x, y) in head:
        im.putpixel((x, y), CHARS["h"])
    im.alpha_composite(front)
    px = im.load()
    # outline anything hair-coloured that touches transparency
    for y in range(48):
        for x in range(48):
            if px[x, y][3] == 255 and px[x, y][:3] != OUTLINE:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < 48 and 0 <= ny < 48 and px[nx, ny][3] == 0:
                        px[nx, ny] = CHARS["o"]
    return im


def build_hair():
    out = {}
    names = ["short", "messy", "bob", "band", "side", "shaggy"]
    for i, n in enumerate(names):
        f, b = hair_from_v1(i)
        out["hair_" + n] = f
        out["hair_" + n + "_back"] = b
    for n, (y0, rows, mirrored) in NEW_HAIR.items():
        im = blank()
        draw(im, 13, y0, rows, mirror=mirrored)
        out["hair_" + n] = im
        out["hair_" + n + "_back"] = back_from_front(im)
    out.update(procedural_hair(out))
    return out


# ---------------------------------------------------------------- procedural shapes
def merge_shape(base, extra, fill="h", shade_cols=None, ties=None):
    """Union a base sprite with extra pixel coords; re-outline the union so seams vanish.
    Base colours are kept inside; new pixels get `fill` (or shade on shade_cols)."""
    bpx = base.load()
    mask = {(x, y) for y in range(48) for x in range(48) if bpx[x, y][3] == 255}
    mask |= set(extra)
    im = blank()
    for (x, y) in mask:
        edge = any((x + dx, y + dy) not in mask for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if edge:
            im.putpixel((x, y), CHARS["o"])
        elif (x, y) in extra or bpx[x, y][:3] == OUTLINE:
            ch = fill
            if shade_cols and x in shade_cols:
                ch = "X"
            im.putpixel((x, y), CHARS[ch])
        else:
            im.putpixel((x, y), bpx[x, y])
    for (x, y, ch) in ties or []:
        im.putpixel((x, y), CHARS[ch])
    return im


def mirror_pts(pts):
    return pts + [(47 - x, y) for (x, y) in pts]


def procedural_hair(existing):
    out = {}
    short = existing["hair_short"]
    bob = existing["hair_bob"]

    # Long: bob strands continue over the shoulders to mid-chest, flaring slightly
    long_pts = []
    for y in range(24, 38):
        flare = 1 if y > 30 else 0
        for x in range(11 - flare, 17):
            long_pts.append((x, y))
    long_pts = mirror_pts(long_pts)
    long_ = merge_shape(bob, long_pts, shade_cols={11, 12, 10, 35, 36, 37})
    out["hair_long"] = long_
    out["hair_long_back"] = back_from_front(long_)

    # Twin tails: short hair + two tails tied at the temples, hanging outward
    tail = []
    for y in range(14, 36):
        cx = 10 - (y - 14) // 7          # drifts outward as it falls
        half = 2 if y < 18 or y > 32 else 3
        for x in range(cx - half, cx + half + 1):
            tail.append((x, y))
    tail += [(x, y) for y in (13, 14) for x in range(12, 16)]  # joins the tail to the head
    tail = mirror_pts(tail)
    ties = [(x, y, "2") for y in (15, 16) for x in (9, 10, 11, 12)]
    ties += [(47 - x, y, c) for (x, y, c) in ties]
    tw = merge_shape(short, tail, shade_cols={6, 7, 41, 40}, ties=ties)
    out["hair_twintails"] = tw
    out["hair_twintails_back"] = back_from_front(tw)

    # Ponytail: high tail from the top-right sweeping behind the right shoulder
    pony = []
    path = [(33, 7), (35, 8), (37, 10), (38, 13), (38, 16), (38, 19), (37, 22), (37, 25), (36, 28), (35, 31)]
    for i, (px_, py_) in enumerate(path):
        r = 2 if i < 7 else 1
        for y in range(py_ - r, py_ + r + 1):
            for x in range(px_ - r, px_ + r + 1):
                pony.append((x, y))
    pony += [(x, y) for y in range(6, 10) for x in range(29, 34)]
    po = merge_shape(short, pony, shade_cols={39, 40, 38}, ties=[(33, 8, "2"), (34, 8, "2"), (33, 9, "2"), (34, 9, "2")])
    out["hair_ponytail"] = po
    out["hair_ponytail_back"] = back_from_front(po)
    return out


def thick_path(path, radius):
    pts = set()
    for (cx, cy) in path:
        for y in range(cy - radius, cy + radius + 1):
            for x in range(cx - radius, cx + radius + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius + 1:
                    pts.add((x, y))
    return pts


def solid(pts, fill="h", shade=None, tip=None):
    """Outlined blob from a point set; `shade` = set of pts to shade, `tip` = {pt: char}."""
    im = blank()
    for (x, y) in pts:
        edge = any((x + dx, y + dy) not in pts for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        ch = "o" if edge else ((tip or {}).get((x, y)) or ("X" if shade and (x, y) in shade else fill))
        if 0 <= x < 48 and 0 <= y < 48:
            im.putpixel((x, y), CHARS[ch])
    return im


# =========================================================== OUTFITS
# Torso rows y25..35 as left halves (x13..23), mirrored to x13..34.
TORSO = {
    "knight": [
        "....ooooooo",
        ".ooottttoMM",
        "ottttuuuoML",
        "otuuuvvvoML",
        "ouvvvvvvoMM",
        ".ooooo.uoMM",
        "ottto.ouoMM",
        ".ooo.obbbbg",
        "...obbbbbgg",
        "...otuvtuvt",
        "...ouvvuvvu",
    ],
    "archer": [
        "....ooooooo",
        ".ooojkkkoLL",
        "oMLLjkkkoLL",
        "oMMMjkkkkoL",
        "oMMMjkkkkkk",
        "oMMMjjkkkkk",
        "oDDDojjjkkk",
        ".ooo.objjjj",
        "...objjjjjj",
        "...oDDDDDDD",
        "...oDDDDDDD",
    ],
    "ninja": [
        "....ooooooo",
        ".oooMMMMnLL",
        "oLMMMMMMnnL",
        "oMMMMMMMMnn",
        "oMMMMMMMMMn",
        "o22MMMMMMMM",
        "o22MMMMMMMM",
        ".ooo.o11111",
        "...o1111111",
        "...oDDDDDDD",
        "...oDDDDDDD",
    ],
}
ROBE = {
    # rows y25..41 as left halves x13..23 (mirrored); frames swap the hem rows
    "mage": [
        "....ooooooo",
        ".oooMMMMoL1",
        "oLLMMMMMo1L",
        "oLMMMMMMoLL",
        "oMMMMMMMMLL",
        "oMMMMMMMMML",
        "oDDDMMMMMMM",
        ".ooooMMMMMM",
        "....oMMMMMM",
        "....oMMMMMM",
        "...oMMMMMMM",
        "...oMMMMMMM",
        "..oDMMMMMMM",
        "..oDMMMMMMM",
        "..oDDMMMMMM",
        "..o3333333",
        "...ooooooo",
    ],
    "priest": [
        "....ooooooo",
        ".oooWWWW1WW",
        "oWWWWWWW1WW",
        "oWWWWWWWM1W",
        "oWWWWWWWMWW",
        "oVVWWWWWMWW",
        "oVVVWWWWMWW",
        ".ooooWWWMWW",
        "....oWWWMWW",
        "....oWWWMWW",
        "...oVWWWMWW",
        "...oVWWWMWW",
        "..oVVWWWMWW",
        "..oVVWWWDWW",
        "..oVVVWWWWW",
        "..o2222222",
        "...ooooooo",
    ],
}


def tunic_outfits():
    """The v1 tunic in key colours (3 frames)."""
    m = {(220, 38, 38): KEYS["main"][1], (255, 46, 46): KEYS["main"][0], (158, 27, 27): KEYS["main"][2],
         (250, 204, 21): KEYS["trim"][1]}
    out = {}
    for tag in ("", "_s1", "_s2"):
        out["outfit_tunic" + tag] = recolor_from(V1 / "outfits" / ("outfit_0%s.png" % tag), m)
    return out


def legs_frames(pants, boots, boots_dark):
    """Legs (y36..43) taken from the v1 tunic frames, recoloured per outfit."""
    m = {(45, 55, 72): pants, (72, 46, 32): boots, (48, 30, 20): boots_dark}
    frames = {}
    for tag in ("", "_s1", "_s2"):
        src = Image.open(V1 / "outfits" / ("outfit_0%s.png" % tag)).convert("RGBA")
        legs = blank()
        for y in range(36, 44):
            for x in range(48):
                p = src.getpixel((x, y))
                if p[3]:
                    legs.putpixel((x, y), (m.get(p[:3], p[:3])) + (255,))
        frames[tag] = legs
    return frames


def build_outfits():
    out = tunic_outfits()
    legs = {
        "knight": legs_frames((148, 163, 184), (100, 116, 139), (71, 85, 105)),
        "archer": legs_frames((90, 70, 50), (101, 60, 32), (70, 40, 20)),
        "ninja": legs_frames((40, 40, 52), (26, 26, 36), (15, 15, 22)),
    }
    for name, rows in TORSO.items():
        for tag in ("", "_s1", "_s2"):
            im = blank()
            draw(im, 13, 25, rows, mirror=True)
            im.alpha_composite(legs[name][tag])
            if name == "archer":  # quiver strap across the chest
                for i in range(7):
                    im.putpixel((19 + i, 26 + i), CHARS["1"])
                    im.putpixel((20 + i, 26 + i), CHARS["2"])
            out["outfit_" + name + tag] = im
    for name, rows in ROBE.items():
        for tag, shift in (("", 0), ("_s1", -1), ("_s2", 1)):
            im = blank()
            draw(im, 13, 25, rows, mirror=True)
            # feet peeking out under the hem, alternating while walking
            fl, fr = (18 + shift, 27 + shift) if tag else (18, 27)
            draw(im, fl, 42, ["oooo", "ojjo"][:1] + ["ojjo"])
            draw(im, fr, 42, ["oooo", "ojjo"][:1] + ["ojjo"])
            if tag:
                # sway the hem one pixel
                hem = im.crop((13, 38, 35, 42))
                clear = Image.new("RGBA", hem.size, (0, 0, 0, 0))
                im.paste(clear, (13, 38))
                im.alpha_composite(hem, (13 + shift, 38))
            out["outfit_" + name + tag] = im
    return out


# =========================================================== RACE FEATURES
def build_race():
    out = {}
    # Elf: pointed ears (skin keys), drawn above hair
    ear = blank()
    draw(ear, 10, 12, [
        "o.......",
        "oo......",
        "oSo.....",
        "osSo....",
        ".osSoo..",
        ".ossss..",
        "..oZss..",
        "...ooo..",
    ])
    right = ear.transpose(Image.FLIP_LEFT_RIGHT)
    ear.alpha_composite(right)
    out["race_elf_ears"] = ear

    # Dwarf: full beard + mustache (hair keys), drawn above the outfit
    beard = blank()
    draw(beard, 15, 19, [
        "oh.......",
        "ohh......",
        "ohhh.....",
        "ohhhhoooo",
        "ohhhHHHHH",
        ".ohhhHhHh",
        ".ohhhhhhh",
        "..oXhhhhh",
        "..oXhhhhh",
        "...oXhhhh",
        "....oXhhh",
        ".....ooXX",
        ".......oo",
    ], mirror=True)
    out["race_dwarf_beard"] = beard

    # Beastkin ears (hair keys, pink inside) and tails (back layer)
    ears = {
        "cat": [
            "o.......",
            "oo......",
            "oho.....",
            "ohpo....",
            "ohppo...",
            "ohhhho..",
        ],
        "fox": [
            "o........",
            "oo.......",
            "oHo......",
            "ohpo.....",
            "ohppo....",
            "ohpppo...",
            "ohhhhho..",
        ],
        "wolf": [
            ".o......",
            ".oo.....",
            "ohho....",
            "ohpho...",
            "ohppho..",
            "ohhhhho.",
        ],
    }
    for n, rows in ears.items():
        im = blank()
        draw(im, 15, 10 - len(rows) + 1, rows)
        im.alpha_composite(im.transpose(Image.FLIP_LEFT_RIGHT))
        out["race_beast_ears_" + n] = im
    tails = {
        "cat": [
            ".......oo",
            "......oho",
            "......oho",
            ".....oho.",
            ".....oho.",
            "....oho..",
            "...ohho..",
            "..ohho...",
            ".ohho....",
            "ohho.....",
            "oo.......",
        ],
        "fox": [
            "....ooo..",
            "...owwwo.",
            "..ohwwwo.",
            "..ohhhho.",
            ".ohhhhho.",
            ".ohhHhho.",
            "ohhhHho..",
            "ohhhhho..",
            "ohhhho...",
            ".oooo....",
        ],
        "wolf": [
            "......oo.",
            ".....oXo.",
            "....ohXo.",
            "...ohhXo.",
            "..ohhhXo.",
            ".ohhhXo..",
            "ohhhXo...",
            "ohhXo....",
            ".oo......",
        ],
    }
    tail_paths = {
        "cat":  ([(33, 40), (36, 39), (38, 37), (40, 34), (41, 31), (41, 28), (40, 25), (39, 23)], 1, None),
        "fox":  ([(33, 40), (36, 39), (39, 37), (41, 34), (42, 31), (42, 28), (41, 25)], 3, "w"),
        "wolf": ([(33, 40), (36, 40), (39, 38), (41, 36), (42, 33), (42, 30)], 2, None),
    }
    for n, (path, rad, tipc) in tail_paths.items():
        pts = thick_path(path, rad)
        shade = {(x, y) for (x, y) in pts if y >= max(py for _, py in path) - 2}
        tip = {}
        if tipc:
            tip = {(x, y): tipc for (x, y) in pts if y <= min(py for _, py in path) + 2}
        out["race_beast_tail_" + n] = solid(pts, "h", shade, tip)

    # Demon: horns (fixed colours) and a spade tail (skin shade)
    horns = {
        "small": [
            ".o.....",
            "oYo....",
            "oyYo...",
            ".oyYo..",
            "..oyo..",
        ],
        "ram": [
            "..ooo..",
            ".oYYYo.",
            "oYyyyYo",
            "oyo..oy",
            "oyo....",
            ".oyo...",
            "..oo...",
        ],
    }
    im = blank()
    draw(im, 15, 5, horns["small"])
    im.alpha_composite(im.transpose(Image.FLIP_LEFT_RIGHT))
    out["race_demon_horns_small"] = im
    im = blank()
    draw(im, 10, 8, horns["ram"])
    im.alpha_composite(im.transpose(Image.FLIP_LEFT_RIGHT))
    out["race_demon_horns_ram"] = im
    spade = thick_path([(33, 41), (36, 40), (38, 38), (39, 35), (40, 32), (40, 29)], 1)
    spade |= {(x, y) for y in range(25, 29) for x in range(39 - (28 - y) // 1 + 1, 42 + (28 - y) // 1 - 1) if abs(x - 40) <= (y - 24)}
    out["race_demon_tail"] = solid(spade, "Z")
    tail = blank()
    draw(tail, 31, 31, [
        "........o..",
        ".......oZo.",
        "......oZZZo",
        ".......oZo.",
        "......oZo..",
        ".....oZo...",
        "....oZo....",
        "...oZo.....",
        "..oZo......",
        ".oZo.......",
        "oZo........",
        "oo.........",
    ])
    return out


# =========================================================== ACCESSORIES
def build_accessories():
    out = {}
    g = blank()
    draw(g, 25, 16, [
        "ooooo..ooooo",
        "ocwwo..ocwwo",
        "o...oooo...o",
        "o...o..o...o",
        "ooooo..ooooo",
    ])
    px = g.load()
    for (x, y) in [(26, 18), (27, 18), (28, 18), (26, 19), (27, 19), (28, 19), (33, 18), (34, 18), (35, 18), (33, 19), (34, 19), (35, 19)]:
        px[x, y] = (0, 0, 0, 0)
    out["acc_glasses"] = g

    patch = blank()
    draw(patch, 23, 15, [
        "o...........oo.",
        ".o.........onno",
        "..oooooooooonno",
        "...........onno",
        "............oo.",
    ])
    out["acc_eyepatch"] = patch

    scarf = blank()
    draw(scarf, 15, 24, [
        "..oooooooooooooo..",
        ".o11111111111111o.",
        "o1222222222222221o",
        ".o33333333o2222o..",
        "..........o2222o..",
        "..........o2332o..",
        "..........o3oo3o..",
        "...........o..o...",
    ])
    out["acc_scarf"] = scarf

    cape = blank()  # back layer
    draw(cape, 11, 26, [
        "..ooooooooooooooooooooo..",
        ".o22222222222222222222o.",
        "o2222222222222222222222o",
        "o2222222222222222222222o",
        "o2222222222222222222222o",
        "o3222222222222222222223o",
        "o3222222222222222222223o",
        "o3322222222222222222233o",
        "o3322222222222222222233o",
        "o3332222222222222222333o",
        "o3332222222222222222333o",
        "o3333222222222222223333o",
        "o3333322222222222233333o",
        "o3333333333333333333333o",
        ".o333o333o3333o333o333o.",
        "..ooo.ooo.oooo.ooo.ooo..",
    ])
    # wider cape that shows past the arms and below the knees, plus clasps worn at the front
    cape_pts = set()
    for y in range(25, 46):
        half = 9 + min(8, (y - 25) // 2)
        for x in range(23 - half, 24 + half + 1):
            cape_pts.add((x, y))
    shade = {(x, y) for (x, y) in cape_pts if abs(x - 23.5) > 11}
    hem = {(x, y): "3" for (x, y) in cape_pts if y >= 44}
    cape = solid(cape_pts, "2", None, hem)
    cpx = cape.load()
    for (x, y) in shade:
        if cpx[x, y][:3] != OUTLINE:
            cpx[x, y] = CHARS["3"]
    out["acc_cape"] = cape
    clasp = blank()
    draw(clasp, 16, 25, ["ogo"])
    draw(clasp, 29, 25, ["ogo"])
    out["acc_cape_front"] = clasp

    flower = blank()
    draw(flower, 38, 9, [
        ".pp.",
        "pPPp",
        "pPgp",
        ".pp.",
    ])
    out["acc_flower"] = flower

    wings = blank()  # back layer (unlock)
    draw(wings, 4, 20, [
        "......ooo",
        "....ooWWo",
        "..ooWWWWo",
        ".oWWWWVWo",
        "oWWWWVVWo",
        "oWWWVVWWo",
        ".oWVVWWo.",
        "..oVWWo..",
        "...ooo...",
    ])
    wings.alpha_composite(wings.transpose(Image.FLIP_LEFT_RIGHT))
    out["acc_wings"] = wings
    return out


# =========================================================== HATS (v1 + dragon crown)
def build_hats():
    out = {}
    for i in range(1, 6):
        out["hat_%d" % i] = Image.open(V1 / "hats" / ("hat_%d.png" % i)).convert("RGBA")
    crown = blank()
    draw(crown, 14, 3, [
        "o..o..o..o..o..o..o.",
        "oRo.ogo.oRo.ogo.oRo.",
        "oGgoogoogGgoogoogGo.",
        "oGgggggggggggggggGo.",
        "oGGGGgRgGGGGgRgGGGo.",
        ".oooooooooooooooooo.",
    ])
    out["hat_dragon"] = crown
    return out


# =========================================================== PETS (16x16, 2 frames)
PETS = {
    "slime": [
        "................",
        "................",
        "................",
        "......oooo......",
        "....oo2222oo....",
        "...o21122222o...",
        "..o2112222222o..",
        "..o2222222222o..",
        ".o222ew22ew222o.",
        ".o222ee22ee222o.",
        ".o22222222p222o.",
        ".o3222222222223o",
        "..o33333333333o.",
        "...ooooooooooo..",
        "................",
        "................",
    ],
    "owl": [
        "................",
        "...o........o...",
        "...oko....oko...",
        "...okkooooojko..",
        "...okkkkkkkkko..",
        "..okwwkkkkwwko..",
        "..okwekkkkewko..",
        "..okwwkggkwwko..",
        "..okkkkGGkkkko..",
        "..okjkkkkkkjko..",
        "..okjjWWWWjjko..",
        "...okjWVVWjko...",
        "...okkWWWWkko...",
        "....oogoogoo....",
        "................",
        "................",
    ],
    "cat": [
        "................",
        "..o.......o.....",
        "..ono....ono....",
        "..onnooooonno...",
        "..onnnnnnnnnno..",
        "..onwennnnweno..",
        "..onnnnpnnnnno..",
        "...onnnnnnnno...",
        "....onnnnnnno...",
        "...onnnnnnnnno..",
        "...onnnnnnnnnoo.",
        "...onnnnnnnnnono",
        "...onno..onnoono",
        "....oo....oo..oo",
        "................",
        "................",
    ],
    "dragon": [
        "................",
        "..o...o.........",
        "..oo.oo.........",
        "..oRRRo...oo....",
        ".oRRRRRo.oRRo...",
        ".oRwRRRo.oRRRo..",
        ".oReRRRRoRRRRo..",
        "..oRRRRRRRRRRo..",
        "..ogRRRRRRRRo...",
        "...ogggRRRRRo...",
        "...oggggRRRo.oo.",
        "....oRRoRRRooRo.",
        "....oRo.oRRRRo..",
        ".....o...oooo...",
        "................",
        "................",
    ],
    "wisp": [
        "................",
        ".......o........",
        "......ofo.......",
        "......offo......",
        ".....offfo......",
        "....offFffo.....",
        "....ofFFFfo.....",
        "...ofFFFFFfo....",
        "...ofFewFeFfo...",
        "...ofFeeFeFfo...",
        "...ofFFFFFFfo...",
        "....ofFFFFfo....",
        ".....offffo.....",
        "......oooo......",
        "................",
        "................",
    ],
}


def build_pets():
    out = {}
    for n, rows in PETS.items():
        im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        draw(im, 0, 0, rows)
        # the slime pet is drawn with trim letters; give it its own fixed greens
        green = {KEYS["trim"][0]: (150, 232, 120), KEYS["trim"][1]: (76, 196, 92), KEYS["trim"][2]: (40, 138, 70)}
        ppx = im.load()
        for yy in range(16):
            for xx in range(16):
                q = ppx[xx, yy]
                if q[3] == 255 and q[:3] in green:
                    ppx[xx, yy] = green[q[:3]] + (255,)
        out["pet_" + n] = im
    return out


# =========================================================== PALETTES (written to JSON for the game)
def ramp(hex_or_rgb, light=1.18, shade=0.72):
    r, g, b = hex_or_rgb
    hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    def mk(v_mult, s_mult):
        rr, gg, bb = colorsys.hsv_to_rgb(hh, min(1, ss * s_mult), min(1, vv * v_mult))
        return [round(rr * 255), round(gg * 255), round(bb * 255)]
    return [mk(light, 0.85), [r, g, b], mk(shade, 1.05)]


def v1_skin_tones():
    tones = []
    for i in range(4):
        im = Image.open(V1 / "body" / ("skin_%d.png" % i)).convert("RGBA")
        tones.append([list(im.getpixel((20, 12))[:3]), list(im.getpixel((20, 15))[:3]), list(im.getpixel((22, 25))[:3])])
    return tones


def build_palettes():
    skin = [t[1] for t in v1_skin_tones()] + [[236, 214, 204], [212, 88, 88], [150, 112, 212], [94, 140, 212]]
    hair = [[44, 52, 74], [128, 74, 36], [226, 178, 40], [200, 48, 44], [86, 80, 210], [222, 226, 236],
            [236, 112, 168], [64, 168, 98], [168, 176, 194], [60, 184, 216]]
    eye = [
        [56, 86, 152],   # Stardew slate blue
        [96, 56, 36],    # warm brown
        [186, 118, 34],  # honey amber
        [44, 152, 86],   # emerald green
        [44, 172, 218],  # sky blue
        [134, 72, 206],  # violet
        [204, 48, 62],   # ruby red
        [228, 178, 36],  # gold
        [230, 102, 160], # rose pink
        [48, 52, 68],    # obsidian dark slate
    ]
    cloth = [(214, 44, 44), (232, 96, 24), (222, 168, 20), (106, 166, 28), (32, 160, 84), (20, 148, 136),
             (20, 142, 186), (44, 104, 226), (88, 78, 222), (146, 60, 220), (214, 52, 128), (84, 96, 120)]
    return {"skin": skin, "hair": hair, "eye": eye, "cloth": [list(c) for c in cloth]}


# =========================================================== recolour + preview
def apply(im, pal):
    """Swap the 6 key colours of each material for the ramp built from the chosen base colour."""
    im = im.copy()
    px = im.load()
    lut = {}
    for k, base in pal.items():
        r = SH.ramp(tuple(base), k)
        for i in range(6):
            lut[SH.KEYS6[k][i]] = r[i]
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            if p[3] == 255 and p[:3] in lut:
                px[x, y] = lut[p[:3]] + (255,)
    return im


def compose(parts, spec, pal):
    """spec keys: race, eyes, mouth, blush, hair, outfit, hat, acc, job, beast, horns, frame"""
    layers = []
    back = []
    if spec.get("acc") in ("cape", "wings"):
        back.append("acc_" + spec["acc"])
    if spec.get("race") == "beast":
        back.append("race_beast_tail_" + spec.get("beast", "cat"))
    if spec.get("race") == "demon":
        back.append("race_demon_tail")
    layers += back
    layers += ["body", "eyes_" + spec.get("eyes", "normal"), "mouth_" + spec.get("mouth", "smile")]
    if spec.get("blush"):
        layers.append("blush")
    layers.append("outfit_" + spec.get("outfit", "tunic") + spec.get("frame", ""))
    if spec.get("race") == "dwarf":
        layers.append("race_dwarf_beard")
    if spec.get("acc") == "scarf":
        layers.append("acc_scarf")
    if spec.get("acc") == "cape":
        layers.append("acc_cape_front")
    layers.append("hair_" + spec.get("hair", "short"))
    if spec.get("race") == "elf":
        layers.append("race_elf_ears")
    if spec.get("race") == "beast":
        layers.append("race_beast_ears_" + spec.get("beast", "cat"))
    if spec.get("race") == "demon":
        layers.append("race_demon_horns_" + spec.get("horns", "small"))
    if spec.get("acc") in ("glasses", "eyepatch", "flower"):
        layers.append("acc_" + spec["acc"])
    if spec.get("hat"):
        layers.append("hat_" + str(spec["hat"]))
    im = blank()
    job = spec.get("job", "warrior")
    w_back = parts["weapon_" + job + "_back"]
    w_front = parts["weapon_" + job]
    behind_name = "hair_" + spec.get("hair", "short") + "_behind"
    first_front = len(back)
    for i, name in enumerate(layers):
        if i == first_front:
            im.alpha_composite(w_back)
            if behind_name in parts:
                im.alpha_composite(apply(parts[behind_name], pal))
        im.alpha_composite(apply(parts[name], pal))
    im.alpha_composite(w_front)
    return im


def preview(parts, pals):
    S, C, H, E = pals["skin"], pals["cloth"], pals["hair"], pals["eye"]
    def P(skin=1, hair=0, main=0, trim=2, eye=0):
        return {"skin": S[skin], "hair": H[hair], "eye": E[eye], "main": C[main], "trim": C[trim]}

    showcase = [
        ({"race": "human", "outfit": "tunic", "hair": "messy", "eyes": "normal", "mouth": "smile", "job": "warrior", "blush": True}, P(1, 1, 0, 2, 0)),
        ({"race": "elf", "outfit": "archer", "hair": "long", "eyes": "big", "mouth": "smile", "job": "archer"}, P(4, 2, 4, 1, 3)),
        ({"race": "dwarf", "outfit": "knight", "hair": "shaggy", "eyes": "sharp", "mouth": "flat", "job": "knight", "hat": 5}, P(2, 3, 7, 2, 1)),
        ({"race": "beast", "beast": "cat", "outfit": "ninja", "hair": "spiky", "eyes": "happy", "mouth": "cat", "job": "archer", "acc": "scarf"}, P(0, 8, 11, 0, 7)),
        ({"race": "demon", "horns": "small", "outfit": "mage", "hair": "twintails", "eyes": "angry", "mouth": "grin", "job": "mage", "acc": "cape"}, P(6, 9, 9, 10, 6)),
        ({"race": "beast", "beast": "fox", "outfit": "priest", "hair": "bun", "eyes": "sleepy", "mouth": "o", "job": "priest", "acc": "flower", "blush": True}, P(1, 1, 3, 2, 2)),
        ({"race": "demon", "horns": "ram", "outfit": "knight", "hair": "sweep", "eyes": "sharp", "mouth": "smile", "job": "warrior", "acc": "wings"}, P(7, 7, 10, 2, 5)),
        ({"race": "human", "outfit": "archer", "hair": "ponytail", "eyes": "big", "mouth": "grin", "job": "archer", "acc": "glasses", "blush": True}, P(3, 2, 5, 6, 4)),
        ({"race": "beast", "beast": "wolf", "outfit": "tunic", "hair": "band", "eyes": "angry", "mouth": "flat", "job": "warrior", "acc": "eyepatch"}, P(2, 0, 1, 11, 6)),
        ({"race": "elf", "outfit": "mage", "hair": "bob", "eyes": "normal", "mouth": "o", "job": "mage", "hat": "dragon"}, P(5, 9, 8, 2, 8)),
    ]
    scale, cell = 3, 68
    sheet_rows = []

    def row(images, label_h=0):
        sheet_rows.append(images)

    row([compose(parts, s, p) for s, p in showcase])
    base_spec = {"race": "human", "outfit": "tunic", "hair": "short", "job": "warrior"}
    row([compose(parts, dict(base_spec, eyes=e), P()) for e in EYES])
    row([compose(parts, dict(base_spec, mouth=m, blush=(i % 2 == 0)), P()) for i, m in enumerate(MOUTHS)])
    hair_names = list(SHP.HAIR.keys())
    row([compose(parts, dict(base_spec, hair=h), P(1, i % len(H))) for i, h in enumerate(hair_names)])
    outfits = ["tunic", "knight", "archer", "ninja", "mage", "priest"]
    row([compose(parts, dict(base_spec, outfit=o), P(1, 0, (i * 2) % 12, (i * 2 + 5) % 12)) for i, o in enumerate(outfits)])
    races = [
        {"race": "human"}, {"race": "elf"}, {"race": "dwarf"},
        {"race": "beast", "beast": "cat"}, {"race": "beast", "beast": "fox"}, {"race": "beast", "beast": "wolf"},
        {"race": "demon", "horns": "small"}, {"race": "demon", "horns": "ram"},
    ]
    row([compose(parts, dict(base_spec, **r), P(1 if r["race"] != "demon" else 5 + i % 3, 1)) for i, r in enumerate(races)])
    accs = [None, "glasses", "eyepatch", "scarf", "cape", "flower", "wings"]
    row([compose(parts, dict(base_spec, acc=a), P(1, 0, 7, 0)) for a in accs])
    # skin and cloth swatches drawn as tiny characters
    row([compose(parts, dict(base_spec), P(i, 0, 0, 2)) for i in range(len(S))])
    row([compose(parts, dict(base_spec), P(1, 0, i, (i + 6) % 12)) for i in range(12)])

    cols = max(len(r) for r in sheet_rows)
    pets = [parts["pet_" + n] for n in PETS]
    sheet = Image.new("RGBA", (cols * cell * scale, (len(sheet_rows) + 1) * cell * scale), (52, 63, 86, 255))
    for ry, imgs in enumerate(sheet_rows):
        for cx, im in enumerate(imgs):
            sheet.alpha_composite(im.resize((64 * scale, 64 * scale), Image.NEAREST), (cx * cell * scale + 2 * scale, ry * cell * scale + 2 * scale))
    for cx, im in enumerate(pets):
        pal = {}
        sheet.alpha_composite(apply(im, pal).resize((16 * scale * 2, 16 * scale * 2), Image.NEAREST),
                              (cx * cell * scale + 6 * scale, len(sheet_rows) * cell * scale + 8 * scale))
    return sheet


# =========================================================== SHADING
KEY3 = {}
for _m, _cols in KEYS.items():
    for _i, _c in enumerate(_cols):
        KEY3[_c] = (_m, _i - 1)          # light -> -1, mid -> 0, dark -> +1
FIXED_CHARS = {
    "t": ("steel", -1), "u": ("steel", 0), "v": ("steel", 1),
    "k": ("leather", 0), "j": ("leather", 1),
    "W": ("cloth_white", 0), "V": ("cloth_white", 1),
    "n": ("charcoal", 0), "N": ("charcoal", 1),
    "g": ("gold", 0), "G": ("gold", 1), "b": ("belt", 0),
    "Y": ("horn", -1), "y": ("horn", 1),
}
FIXED_RGB = {CHARS[k][:3]: v for k, v in FIXED_CHARS.items()}
FIXED_RGB.update({
    (45, 55, 72): ("pants", 0), (72, 46, 32): ("boot", 0), (48, 30, 20): ("boot", 1),
    (148, 163, 184): ("pants_steel", 0), (100, 116, 139): ("steel", 1), (71, 85, 105): ("steel", 2),
    (90, 70, 50): ("pants_leather", 0), (101, 60, 32): ("leather", 1), (70, 40, 20): ("leather", 2),
    (40, 40, 52): ("pants_ninja", 0), (26, 26, 36): ("charcoal", 1), (15, 15, 22): ("charcoal", 2),
    (110, 62, 28): ("belt", 0),
})


def classify_known(p):
    rgb = p[:3]
    if p[3] < 255:
        return None
    if rgb == OUTLINE:
        return "outline"
    if rgb in KEY3:
        return KEY3[rgb]
    if rgb in FIXED_RGB:
        return FIXED_RGB[rgb]
    return None


def generic_classifier(im, tag):
    """For hand-made sprites (weapons, hats, pets): group colours by hue into materials."""
    cols = {p[:3] for p in im.getdata() if p[3] == 255}
    groups = {}
    for c in cols:
        h, s_, v = colorsys.rgb_to_hsv(*[x / 255 for x in c])
        if v < 0.2:
            continue                      # outline-ish
        if v > 0.9 and s_ < 0.12:
            continue                      # eye whites / glints stay as drawn
        key = "grey" if s_ < 0.15 else "h%d" % int(((h * 12) + 0.5) % 12)
        groups.setdefault(key, []).append(c)
    lut = {}
    for key, cs in groups.items():
        cs.sort(key=lambda c: -sum(c))
        base = cs[len(cs) // 2]
        name = "%s_%s" % (tag, key)
        SH.FIXED[name] = base
        bi = cs.index(base)
        for i, c in enumerate(cs):
            lut[c] = (name, max(-2, min(2, i - bi)))

    def classify(p):
        if p[3] < 255:
            return None
        rgb = p[:3]
        if rgb in lut:
            return lut[rgb]
        h, s_, v = colorsys.rgb_to_hsv(*[x / 255 for x in rgb])
        return "outline" if v < 0.2 else None
    return classify


FACE_REGION = {(x, y) for y in range(8, 28) for x in range(22, 42)}


def shade_all(parts):
    out = {}
    for name, im in parts.items():
        if name.startswith(("eyes_", "mouth_", "blush")):
            # tiny face marks stay crisp: just move skin & eye keys onto their 6-step ramps
            face = im.copy()
            fpx = face.load()
            to6 = {
                KEYS["skin"][0]: SH.KEYS6["skin"][1], KEYS["skin"][1]: SH.KEYS6["skin"][2], KEYS["skin"][2]: SH.KEYS6["skin"][4],
                KEYS["eye"][0]: SH.KEYS6["eye"][1],   KEYS["eye"][1]: SH.KEYS6["eye"][2],   KEYS["eye"][2]: SH.KEYS6["eye"][3],
            }
            for yy in range(face.height):
                for xx in range(face.width):
                    q = fpx[xx, yy]
                    if q[3] == 255 and q[:3] in to6:
                        fpx[xx, yy] = to6[q[:3]] + (255,)
            out[name] = face
            continue
        if name.startswith(("hat_", "weapon_", "pet_")):
            cls = generic_classifier(im, name)
        else:
            cls = classify_known
        sh = SH.shade(im, cls, OUTLINE)
        if (name.startswith("hair_") and not name.endswith("_back")) or name.startswith("hat_"):
            SH.cast_shadow(sh, FACE_REGION, alpha=45)
        out[name] = sh
    return out


def shift_im(im, dx, dy):
    res = blank()
    res.alpha_composite(im, (dx, dy))
    return res


def build_weapons():
    out = {}
    for job in ("warrior", "archer", "mage", "knight", "priest"):
        fw = Image.open(V1 / "weapons" / (job + ".png")).convert("RGBA")
        bw = Image.open(V1 / "weapons" / (job + "_back.png")).convert("RGBA")
        # 64x64 hands sit at left (22.4, 39.6) and right (40.4, 39.6) vs old 48x48 (15, 33) and (32, 33)
        if job == "knight":
            sh = blank()
            sh.alpha_composite(fw.crop((0, 0, 24, 48)), (7, 7))
            sh.alpha_composite(fw.crop((24, 0, 48, 48)), (32, 7))
            out["weapon_" + job] = sh
        elif job in ("mage", "priest"):
            out["weapon_" + job] = shift_im(fw, 7, 7)
        else:
            out["weapon_" + job] = shift_im(fw, 8, 7)
        out["weapon_" + job + "_back"] = shift_im(bw, 7, 7)
    return out


def main():
    # pixel-drawn pieces (faces, small accessories, hats, pets, weapons) go through the 2D shader;
    # bodies, hair, outfits, races and larger accessories are built as smooth shapes (shapes.py)
    pixel = {}
    for fn in (build_faces, build_pets, build_weapons):
        pixel.update(fn())
    acc = build_accessories()
    for k in ("acc_glasses", "acc_eyepatch", "acc_flower"):
        pixel[k] = acc[k]
    parts = shade_all(pixel)
    parts.update(SHP.build_all(parts))
    pals = build_palettes()
    OUT.mkdir(parents=True, exist_ok=True)
    import base64
    import io
    sprites = {}
    for name, im in sorted(parts.items()):
        im.save(OUT / (name + ".png"), optimize=True)
        buf = io.BytesIO()
        im.save(buf, "PNG", optimize=True)
        sprites[name] = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    js = ("// GENERATED by tools/avatar/build_parts.py: do not edit by hand.\n"
          "window.DH = window.DH || {};\n"
          "window.DH.AVATAR_KEYS = " + json.dumps(SH.KEYS6) + ";\n"
          "window.DH.AVATAR_PALETTES = " + json.dumps(pals) + ";\n"
          "window.DH.AVATAR_SPRITES = " + json.dumps(sprites, indent=0) + ";\n")
    BUNDLE.write_text(js, encoding="utf-8")
    print("wrote %d parts to %s (%d KB)" % (len(parts), BUNDLE, len(js) // 1024))
    if "--preview" in sys.argv:
        p = Path(__file__).with_name("preview.png")
        preview(parts, pals).save(p)
        print("preview:", p)


if __name__ == "__main__":
    main()
