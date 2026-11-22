"""
Pixel-drawn parts: things too small to draw as smooth shapes (eyes, mouths, blush,
glasses, eyepatch, flower, pets). Drawn as ASCII rows with the letters in CHARS, then
lit by shade.py. Also holds the colour classifiers shade_all() uses for every pixel part.
"""
import colorsys

from PIL import Image

import shade as SH

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


# =========================================================== FACES (2x Stardew Valley eye style)
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


# =========================================================== SMALL ACCESSORIES
def build_face_accessories():
    """Glasses, eyepatch and flower: small enough to look best hand-pixelled."""
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

    flower = blank()
    draw(flower, 38, 9, [
        ".pp.",
        "pPPp",
        "pPgp",
        ".pp.",
    ])
    out["acc_flower"] = flower

    return out


# =========================================================== PETS (16x16)
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
