"""
Character parts drawn as smooth shapes (see hires.py) instead of hand-placed pixels.
Every function returns finished 48x48 RGBA parts in KEYS6 colours.
"""
import numpy as np
from PIL import Image

import hires as HR
import shade as SH
from hires import Part, X, Y, ellipse_mask, rect_mask, poly_mask

CX = 23.5
FACE = {(x, y) for y in range(10, 27) for x in range(15, 33)}


def mirror_pts(pts):
    return [(2 * CX - x, y) for x, y in pts]


# =================================================================== BODY
HEAD = (CX, 17.6, 8.9, 8.3)


def build_body():
    p = Part()
    for ex in (14.9, 2 * CX - 14.9):                       # ears peek out at the sides
        p.ellipse(ex, 19.2, 1.5, 2.0, "skin")
    p.poly([(21.4, 24.0), (25.6, 24.0), (25.8, 28.0), (21.2, 28.0)], "skin", bias=1)   # neck, in shadow
    p.ellipse(*HEAD, "skin")
    p.ellipse(CX, 20.6, 8.5, 6.2, "skin", clip=Y > 18.5)  # fuller cheeks / jaw
    for hx in (15.3, 2 * CX - 15.3):
        p.ellipse(hx, 33.0, 2.0, 2.0, "skin")
    body = p.to_image(soft=("skin",))
    shadow = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    for y in range(42, 47):
        for x in range(48):
            if ((x + 0.5 - CX) / 9.0) ** 2 + ((y + 0.5 - 44.4) / 1.6) ** 2 <= 1:
                shadow.putpixel((x, y), (0, 0, 0, 90))
    shadow.alpha_composite(body)
    return {"body": shadow, "body_back": shadow}


# =================================================================== HAIR
def face_window(fringe):
    """Where the face shows through: inside the face oval and below the fringe line."""
    return ellipse_mask(CX, 19.3, 8.5, 7.9) & (Y >= fringe(X))


def hair_texture(p, top=7.5):
    hm = p.mat == p._mid("hair")
    p.val += hm * (0.07 * np.sin(X * 2.4 + Y * 0.7))
    ring = ellipse_mask(CX - 0.8, 15.0, 8.4, 6.6) & ~ellipse_mask(CX - 0.6, 15.6, 7.4, 5.7) & (Y < 13.0) & (X < 27)
    p.val += hm * ring * 0.2


def cap(p, cy=15.0, rx=9.7, ry=7.8):
    p.ellipse(CX, cy, rx, ry, "hair")


def side_locks(p, length, x_off=0.0, r=1.4):
    for sx in (14.7 + x_off, 2 * CX - 14.7 - x_off):
        p.capsule([(sx, 13.5), (sx - 0.2 * np.sign(CX - sx), length)], [r, r * 0.8], "hair")


HAIR = {}


def style(name):
    def deco(fn):
        HAIR[name] = fn
        return fn
    return deco


@style("short")
def _short(p, back):
    cap(p)
    side_locks(p, 20.5)
    return lambda x: 14.4 + 0.9 * np.abs(np.sin(x * 1.7))


@style("messy")
def _messy(p, back):
    for (cx, cy, rot) in [(15.6, 10.6, 0.9), (19.2, 7.9, 0.4), (23.8, 7.0, 0.0), (28.4, 7.8, -0.4), (31.8, 10.4, -0.9)]:
        p.ellipse(cx, cy, 1.8, 3.0, "hair", rot=rot)
    cap(p)
    side_locks(p, 21.0)
    return lambda x: 13.8 + 1.8 * (np.sin(x * 2.3) > 0)


@style("bob")
def _bob(p, back):
    p.ellipse(CX, 16.4, 10.7, 9.8, "hair")
    return lambda x: 14.0 + 0.4 * np.cos((x - CX) * 0.3)


@style("band")
def _band(p, back):
    cap(p)
    side_locks(p, 20.5)
    p.ellipse(CX, 15.0, 10.15, 8.15, "trim", clip=(Y >= 11.4) & (Y <= 13.4))
    return lambda x: 14.6 + 0.8 * np.abs(np.sin(x * 1.5))


@style("side")
def _side(p, back):
    cap(p)
    side_locks(p, 19.0)
    p.ellipse(28.6, 14.2, 4.8, 3.6, "hair", rot=-0.35)
    return lambda x: 12.6 + (x - 15.0) * 0.32


@style("shaggy")
def _shaggy(p, back):
    cap(p, cy=15.6, rx=10.3, ry=8.6)
    for (cx, cy) in [(15.0, 21.0), (2 * CX - 15.0, 21.0), (14.6, 24.0), (2 * CX - 14.6, 24.0)]:
        p.ellipse(cx, cy, 2.0, 3.2, "hair")
    return lambda x: 15.0 + 1.3 * np.sin(x * 1.35)


@style("long")
def _long(p, back):
    for sx in (14.2, 2 * CX - 14.2):
        d = 1 if sx < CX else -1
        p.capsule([(sx, 14.0), (sx - 0.6 * d, 25.0), (sx - 1.0 * d, 36.0)], [2.6, 2.7, 2.0], "hair")
    p.ellipse(CX, 16.0, 10.5, 9.0, "hair")
    return lambda x: 14.2 + 0.5 * np.abs(np.sin(x * 1.2))


@style("ponytail")
def _ponytail(p, back):
    p.capsule([(32.0, 10.6), (35.8, 13.4), (37.6, 18.4), (37.0, 25.0), (35.4, 31.0)], [2.2, 2.8, 2.6, 2.1, 1.2], "hair", bias=0)
    cap(p)
    side_locks(p, 19.0)
    p.ellipse(32.0, 10.8, 1.6, 1.5, "trim")
    return lambda x: 14.2 + 0.8 * np.abs(np.sin(x * 1.9))


@style("twintails")
def _twintails(p, back):
    for sgn in (1, -1):
        bx = CX - sgn * 9.8
        pts = [(bx, 15.0), (bx - sgn * 3.0, 22.0), (bx - sgn * 3.6, 29.5), (bx - sgn * 2.8, 35.0)]
        p.capsule(pts, [2.0, 2.8, 2.6, 1.4], "hair")
    cap(p)
    side_locks(p, 19.0)
    for sgn in (1, -1):
        p.ellipse(CX - sgn * 9.9, 14.8, 1.6, 1.6, "trim")
    return lambda x: 14.4 + 0.8 * np.abs(np.sin(x * 1.6))


@style("bun")
def _bun(p, back):
    cap(p)
    side_locks(p, 19.5)
    p.ellipse(CX, 6.6, 3.7, 3.1, "hair")
    p.ellipse(CX, 9.0, 2.6, 0.8, "trim")
    return lambda x: 14.4 + 0.6 * np.abs(np.sin(x * 1.4))


@style("spiky")
def _spiky(p, back):
    spikes = [
        [(13.6, 15.0), (10.6, 8.0), (17.0, 11.0)],
        [(16.0, 11.0), (15.0, 3.2), (21.0, 8.6)],
        [(20.0, 9.0), (22.6, 1.8), (25.8, 8.4)],
        [(24.8, 8.6), (31.0, 3.0), (30.4, 11.0)],
        [(29.6, 10.6), (36.6, 7.8), (33.6, 15.6)],
    ]
    for tri in spikes:
        p.poly(tri, "hair")
    cap(p)
    side_locks(p, 20.0)
    return lambda x: 13.4 + 2.2 * np.abs(((x * 0.55) % 2) - 1)


@style("sweep")
def _sweep(p, back):
    cap(p)
    side_locks(p, 20.0)
    p.capsule([(18.0, 11.0), (25.0, 13.4), (29.6, 17.4), (30.8, 21.0)], [2.6, 2.8, 2.4, 1.4], "hair")
    return lambda x: np.minimum(12.6 + np.maximum(0, x - 17.0) * 0.62, 20.8)


@style("curly")
def _curly(p, back):
    for i, ang in enumerate(np.linspace(np.pi * 1.05, np.pi * 1.95, 9)):
        p.ellipse(CX + 10.0 * np.cos(ang), 15.6 + 8.2 * np.sin(ang), 2.4, 2.4, "hair")
    for (cx, cy) in [(14.0, 17.0), (13.6, 20.4), (2 * CX - 14.0, 17.0), (2 * CX - 13.6, 20.4)]:
        p.ellipse(cx, cy, 2.2, 2.2, "hair")
    cap(p, cy=15.2, rx=10.2, ry=8.2)
    return lambda x: 13.8 + 1.4 * np.abs(np.sin(x * 1.25))


@style("afro")
def _afro(p, back):
    for ang in np.linspace(0, 2 * np.pi, 14, endpoint=False):
        p.ellipse(CX + 12.0 * np.cos(ang), 13.4 + 9.6 * np.sin(ang), 3.0, 3.0, "hair")
    p.ellipse(CX, 13.4, 12.6, 10.2, "hair")
    return lambda x: 13.0 + 0.8 * np.abs(np.sin(x * 1.1))


@style("mohawk")
def _mohawk(p, back):
    crest = [(20.6, 11.0), (21.4, 4.0), (23.0, 6.8), (CX, 0.8), (24.0, 6.8), (25.6, 4.0), (26.4, 11.0)]
    p.poly(crest, "hair")
    p.ellipse(CX, 9.6, 3.2, 2.6, "hair")
    for sx in (15.6, 2 * CX - 15.6):
        p.ellipse(sx, 15.6, 1.4, 2.8, "hair", bias=1)      # shaved sides
    return lambda x: np.where(np.abs(x - CX) < 3.0, 11.2, 9.0)


@style("braid")
def _braid(p, back):
    cap(p)
    side_locks(p, 19.0)
    for i in range(7):
        bx = 31.6 + (0.9 if i % 2 else -0.4)
        p.ellipse(bx, 19.0 + i * 2.6, 2.0 - i * 0.12, 1.6, "hair")
    p.ellipse(31.6, 37.0, 1.3, 1.0, "trim")
    p.capsule([(31.6, 37.6), (31.0, 40.0), (32.4, 40.4)], [0.9, 0.7, 0.4], "hair")
    return lambda x: 13.6 + (x > CX) * 1.6 + 0.5 * np.abs(np.sin(x * 1.8))


@style("wavy")
def _wavy(p, back):
    for sgn in (1, -1):
        bx = CX - sgn * 9.6
        pts = [(bx, 14.0), (bx - sgn * 1.4, 19.0), (bx - sgn * 0.2, 24.0), (bx - sgn * 1.8, 29.0), (bx - sgn * 0.6, 34.0)]
        p.capsule(pts, [2.6, 2.8, 2.6, 2.6, 2.0], "hair")
        p.ellipse(bx - sgn * 0.2, 36.0, 2.0, 1.8, "hair")
    p.ellipse(CX, 15.6, 10.4, 8.6, "hair")
    return lambda x: 13.4 + 1.6 * np.abs(np.sin((x - CX) * 0.42))


@style("hime")
def _hime(p, back):
    p.poly([(13.2, 16.0), (33.8, 16.0), (35.0, 37.0), (12.0, 37.0)], "hair", bias=1)   # long hair behind
    cap(p, cy=15.2, rx=10.2, ry=8.2)
    for sx in (14.4, 2 * CX - 14.4):
        p.poly([(sx - 1.6, 14.0), (sx + 1.8, 14.0), (sx + 1.8, 25.4), (sx - 1.6, 25.4)], "hair")
    return lambda x: 14.6 + 0.0 * x


@style("pixie")
def _pixie(p, back):
    p.ellipse(CX + 0.6, 14.4, 9.4, 7.4, "hair")
    for (cx, cy, rot) in [(17.6, 13.8, 0.9), (20.4, 14.6, 0.7), (23.4, 14.8, 0.5)]:
        p.ellipse(cx, cy, 1.4, 2.6, "hair", rot=rot)
    side_locks(p, 17.6, r=1.2)
    return lambda x: 13.2 + np.maximum(0, 19.0 - x) * 0.18


@style("drills")
def _drills(p, back):
    for sgn in (1, -1):
        bx = CX - sgn * 10.6
        for i in range(5):
            p.ellipse(bx + (0.7 if i % 2 else -0.5) * sgn, 18.0 + i * 3.6, 2.9 - i * 0.35, 2.0, "hair", bias=(i % 2))
        p.ellipse(CX - sgn * 9.4, 12.8, 2.2, 1.4, "trim", rot=0.4 * sgn)
    cap(p)
    side_locks(p, 18.0)
    return lambda x: 14.0 + 0.9 * np.abs(np.sin(x * 1.6))


def build_hair():
    out = {}
    for name, fn in HAIR.items():
        for back in (False, True):
            p = Part()
            fringe = fn(p, back)
            if back:
                p.ellipse(CX, 17.8, 9.6, 9.0, "hair")      # whole back of the head
            else:
                p.erase(face_window(fringe))
            hair_texture(p)
            im = p.to_image(soft=())
            if not back:
                SH.cast_shadow(im, FACE, alpha=80)
            out["hair_" + name + ("_back" if back else "")] = im
    return out


# =================================================================== OUTFITS
def legs(p, mat_pants, mat_boot, frame, boot_top=39.4, tall=False):
    dl, dr = {"": (0, 0), "_s1": (-1.3, 0.4), "_s2": (0.4, -1.3)}[frame]
    for (lx, d) in ((20.4, dl), (2 * CX - 20.4, dr)):
        p.capsule([(lx, 34.6), (lx, 40.0 + d)], [2.4, 2.0], mat_pants)
    for (lx, d) in ((20.2, dl), (2 * CX - 20.2, dr)):
        top = (36.6 if tall else boot_top) + d
        p.poly([(lx - 2.5, top), (lx + 2.5, top), (lx + 2.7, 43.4 + d), (lx - 3.0, 43.4 + d)], mat_boot)


def torso(p, mat, top=26.0, bottom=35.8):
    p.poly([(16.4, top), (30.6, top), (31.2, 30.0), (30.4, bottom), (16.6, bottom), (15.8, 30.0)], mat)
    for sx in (16.8, 2 * CX - 16.8):
        p.ellipse(sx, 27.8, 2.7, 2.2, mat)


def sleeves(p, mat, bias=0, bell=False):
    for sgn in (1, -1):
        a = (CX - sgn * 6.9, 27.6)
        b = (CX - sgn * 8.0, 30.6)
        p.capsule([a, b], [2.4, 3.0 if bell else 2.1], mat, bias=bias)


def belt(p, mat="belt", buckle="trim", y0=32.6, y1=34.1):
    p.poly([(16.4, y0), (30.6, y0), (30.6, y1), (16.4, y1)], mat, flat=0.4)
    if buckle:
        p.ellipse(CX, (y0 + y1) / 2, 1.4, 1.1, buckle)


def outfit_tunic(p, frame):
    legs(p, "pants", "boot", frame)
    sleeves(p, "main")
    torso(p, "main")
    p.poly([(16.4, 33.0), (30.6, 33.0), (31.6, 37.8), (15.4, 37.8)], "main", bias=0)   # skirt
    p.poly([(20.8, 26.0), (26.2, 26.0), (CX, 29.6)], "trim")                         # collar
    belt(p)


def outfit_knight(p, frame):
    legs(p, "pants_steel", "steel", frame)
    sleeves(p, "steel", bias=1)
    torso(p, "steel")
    p.poly([(21.0, 27.4), (26.0, 27.4), (26.4, 38.4), (CX, 39.6), (20.6, 38.4)], "main")   # tabard
    for sx in (16.4, 2 * CX - 16.4):
        p.ellipse(sx, 27.4, 3.4, 2.7, "steel")                                            # pauldrons
    belt(p, buckle="gold")


def outfit_archer(p, frame):
    legs(p, "pants_leather", "leather", frame, tall=True)
    sleeves(p, "main")
    torso(p, "main")
    p.poly([(16.4, 26.2), (21.4, 26.2), (22.2, 35.8), (16.6, 35.8), (15.8, 30.0)], "leather")
    p.poly(mirror_pts([(16.4, 26.2), (21.4, 26.2), (22.2, 35.8), (16.6, 35.8), (15.8, 30.0)]), "leather")
    p.capsule([(17.6, 26.4), (29.4, 35.2)], [0.85, 0.85], "trim")                     # quiver strap
    belt(p, buckle="gold")


def outfit_ninja(p, frame):
    legs(p, "pants_ninja", "charcoal", frame)
    for (lx, d) in ((20.4, 0), (2 * CX - 20.4, 0)):
        p.ellipse(lx, 37.6, 2.4, 0.9, "trim")                                            # shin wraps
    sleeves(p, "main")
    torso(p, "main")
    p.poly([(19.0, 26.0), (CX, 31.0), (28.0, 26.0), (26.0, 26.0), (CX, 29.0), (21.0, 26.0)], "main", bias=1)
    p.poly([(21.4, 26.0), (25.6, 26.0), (CX, 28.6)], "charcoal")
    belt(p, mat="trim", buckle=None, y0=32.2, y1=34.8)
    p.capsule([(27.8, 34.2), (29.4, 38.4)], [1.0, 0.8], "trim", bias=1)
    p.capsule([(28.6, 34.0), (31.0, 37.4)], [0.9, 0.7], "trim", bias=1)


def robe(p, mat, frame, hem="trim"):
    sway = {"": 0.0, "_s1": -0.8, "_s2": 0.8}[frame]
    for (fx, d) in ((20.0, 0.6 if frame == "_s1" else 0.0), (27.0, 0.6 if frame == "_s2" else 0.0)):
        p.ellipse(fx + sway * 0.5, 42.8 + d, 2.3, 1.2, "boot")
    pts = [(16.4, 26.0), (30.6, 26.0), (31.2, 30.0), (33.2 + sway, 42.8), (13.8 + sway, 42.8), (15.8, 30.0)]
    p.poly(pts, mat)
    p.poly(pts, hem, clip=Y >= 41.2)
    sleeves(p, mat, bell=True)
    return pts


def outfit_mage(p, frame):
    robe(p, "main", frame)
    p.poly([(20.6, 26.0), (26.4, 26.0), (CX, 30.0)], "trim")
    p.poly([(16.6, 33.0), (30.4, 33.0), (30.4, 33.9), (16.6, 33.9)], "gold", flat=0.3)
    for (sx, sy) in ((19.0, 37.5), (27.6, 39.0), (22.6, 40.2)):
        p.ellipse(sx, sy, 0.7, 0.7, "gold")


def outfit_priest(p, frame):
    robe(p, "cloth_white", frame)
    for sx in (20.8, 2 * CX - 20.8):
        p.capsule([(sx, 26.4), (sx - 0.2 * np.sign(CX - sx), 41.0)], [1.0, 1.1], "main")
    p.poly([(22.6, 29.2), (24.4, 29.2), (24.4, 33.4), (22.6, 33.4)], "gold", flat=0.3)
    p.poly([(21.4, 30.4), (25.6, 30.4), (25.6, 31.4), (21.4, 31.4)], "gold", flat=0.3)


def outfit_samurai(p, frame):
    sway = {"": 0.0, "_s1": -0.6, "_s2": 0.6}[frame]
    for (fx, d) in ((20.0, 0.6 if frame == "_s1" else 0.0), (27.0, 0.6 if frame == "_s2" else 0.0)):
        p.ellipse(fx, 42.9 + d, 2.2, 1.1, "charcoal")
    hak = [(16.6, 33.4), (30.4, 33.4), (32.4 + sway, 42.6), (14.6 + sway, 42.6)]
    p.poly(hak, "trim")
    p.poly([(23.1, 34.0), (23.9, 34.0), (23.9 + sway, 42.6), (23.1 + sway, 42.6)], "trim", bias=1, flat=0.4)
    sleeves(p, "main", bell=True)
    torso(p, "main")
    p.poly([(19.6, 26.0), (CX, 31.4), (27.4, 26.0), (25.8, 26.0), (CX, 29.2), (21.2, 26.0)], "cloth_white")
    for sx in (16.0, 2 * CX - 16.0):
        p.poly([(sx - 3.0, 26.6), (sx + 2.6, 26.6), (sx + 2.8, 31.2), (sx - 3.2, 31.2)], "leather")
    belt(p, mat="main", buckle=None, y0=32.2, y1=34.4)


def outfit_pirate(p, frame):
    legs(p, "pants", "boot", frame, tall=True)
    sleeves(p, "main")
    torso(p, "main", bottom=36.0)
    for sgn in (1, -1):
        p.poly([(CX - sgn * 7.0, 33.0), (CX - sgn * 2.0, 33.0), (CX - sgn * 2.4, 40.4), (CX - sgn * 7.8, 39.6)], "main", bias=1)
    p.poly([(21.0, 26.0), (26.0, 26.0), (25.0, 33.0), (22.0, 33.0)], "cloth_white")
    for sgn in (1, -1):
        p.poly([(CX - sgn * 2.4, 26.0), (CX - sgn * 4.6, 26.0), (CX - sgn * 3.0, 31.6)], "trim")
    belt(p, mat="belt", buckle="gold", y0=33.0, y1=34.8)
    for by in (28.0, 30.4):
        p.ellipse(19.8, by, 0.6, 0.6, "gold")
        p.ellipse(2 * CX - 19.8, by, 0.6, 0.6, "gold")


def outfit_bard(p, frame):
    legs(p, "pants_leather", "boot", frame)
    for sx in (16.2, 2 * CX - 16.2):
        p.ellipse(sx, 28.6, 3.2, 3.0, "trim")                                   # puffy sleeves
    torso(p, "main")
    p.poly([(18.0, 26.4), (29.0, 26.4), (29.4, 35.4), (17.6, 35.4)], "main")
    p.poly([(21.4, 26.0), (25.6, 26.0), (24.6, 31.0), (22.4, 31.0)], "trim", bias=-1)
    p.ellipse(CX, 27.4, 2.4, 1.6, "cloth_white")                               # frill
    p.ellipse(CX, 29.0, 1.8, 1.2, "cloth_white")
    belt(p, mat="belt", buckle="gold")


def outfit_rogue(p, frame):
    legs(p, "pants_ninja", "charcoal", frame)
    sleeves(p, "leather", bias=1)
    torso(p, "leather")
    p.capsule([(16.0, 27.2), (29.6, 34.8)], [0.8, 0.8], "belt")
    p.capsule([(31.0, 27.2), (17.4, 34.8)], [0.8, 0.8], "belt")
    p.poly([(14.8, 26.4), (32.2, 26.4), (33.2, 31.8), (CX, 33.4), (13.8, 31.8)], "main")   # short hooded cape
    p.capsule([(16.8, 26.6), (CX, 27.4), (30.2, 26.6)], [1.6, 1.8, 1.6], "main", bias=1)      # cowl around the neck
    belt(p, mat="trim", buckle="gold")


def outfit_scholar(p, frame):
    legs(p, "pants", "boot", frame)
    sleeves(p, "main")
    coat = [(16.4, 26.0), (30.6, 26.0), (31.2, 30.0), (32.2, 40.6), (14.8, 40.6), (15.8, 30.0)]
    p.poly(coat, "main")
    p.poly([(22.4, 27.0), (24.6, 27.0), (24.6, 40.6), (22.4, 40.6)], "main", bias=1, flat=0.3)
    p.poly([(20.4, 24.8), (26.6, 24.8), (26.2, 27.4), (20.8, 27.4)], "trim")      # high collar
    for by in (29.0, 32.0, 35.0, 38.0):
        p.ellipse(CX, by, 0.6, 0.6, "gold")
    p.capsule([(17.6, 26.8), (29.4, 35.8)], [0.7, 0.7], "leather")               # satchel strap
    p.poly([(28.0, 34.6), (32.4, 34.6), (32.4, 38.4), (28.0, 38.4)], "leather")


def student_top(p):
    for sgn in (1, -1):
        p.capsule([(CX - sgn * 7.4, 29.4), (CX - sgn * 8.0, 31.6)], [1.6, 1.5], "skin")   # bare forearms
        p.capsule([(CX - sgn * 6.9, 27.4), (CX - sgn * 7.6, 29.0)], [2.3, 2.2], "cloth_white")
    torso(p, "cloth_white", bottom=34.4)
    p.poly([(20.6, 25.6), (26.4, 25.6), (CX, 28.4)], "cloth_white", bias=1)
    p.poly([(CX - 0.8, 27.6), (CX + 0.8, 27.6), (CX + 1.0, 31.0), (CX, 32.0), (CX - 1.0, 31.0)], "trim")  # tie
    p.ellipse(27.6, 29.0, 0.9, 0.9, "trim", bias=1)                                   # badge


def socks_shoes(p, frame):
    dl, dr = {"": (0, 0), "_s1": (-1.3, 0.4), "_s2": (0.4, -1.3)}[frame]
    for (lx, d) in ((20.3, dl), (2 * CX - 20.3, dr)):
        p.capsule([(lx, 36.0), (lx, 39.6 + d)], [1.7, 1.6], "skin")
        p.poly([(lx - 1.8, 39.0 + d), (lx + 1.8, 39.0 + d), (lx + 1.8, 41.6 + d), (lx - 1.8, 41.6 + d)], "cloth_white")
        p.poly([(lx - 2.2, 41.4 + d), (lx + 2.4, 41.4 + d), (lx + 2.6, 43.4 + d), (lx - 2.6, 43.4 + d)], "charcoal")


def outfit_student(p, frame):
    socks_shoes(p, frame)
    for lx in (20.3, 2 * CX - 20.3):
        p.poly([(lx - 2.9, 33.6), (lx + 2.9, 33.6), (lx + 2.9, 37.6), (lx - 2.9, 37.6)], "main")   # shorts
    student_top(p)
    belt(p, mat="charcoal", buckle="gold", y0=33.2, y1=34.6)


def outfit_student_skirt(p, frame):
    socks_shoes(p, frame)
    sway = {"": 0.0, "_s1": -0.5, "_s2": 0.5}[frame]
    p.poly([(16.8, 33.4), (30.2, 33.4), (32.0 + sway, 38.6), (15.0 + sway, 38.6)], "main")
    for px_ in (19.4, 22.2, 25.0, 27.8):
        p.poly([(px_, 34.6), (px_ + 0.6, 34.6), (px_ + 0.9 + sway, 38.4), (px_ + 0.3 + sway, 38.4)], "main", bias=1, flat=0.4)
    student_top(p)


OUTFITS = {"tunic": outfit_tunic, "knight": outfit_knight, "archer": outfit_archer,
           "ninja": outfit_ninja, "mage": outfit_mage, "priest": outfit_priest,
           "samurai": outfit_samurai, "pirate": outfit_pirate, "bard": outfit_bard, "rogue": outfit_rogue,
           "scholar": outfit_scholar, "student": outfit_student, "student_skirt": outfit_student_skirt}


def build_outfits():
    out = {}
    for name, fn in OUTFITS.items():
        for frame in ("", "_s1", "_s2"):
            p = Part()
            fn(p, frame)
            out["outfit_" + name + frame] = p.to_image(glossy=("steel", "gold", "pants_steel"))
    return out


# =================================================================== RACES
def build_race():
    out = {}
    p = Part()
    for sgn in (1, -1):
        pts = [(CX - sgn * 8.4, 19.4), (CX - sgn * 11.6, 16.8), (CX - sgn * 13.4, 14.2)]
        p.capsule(pts, [1.8, 1.1, 0.35], "skin")
    out["race_elf_ears"] = p.to_image(soft=("skin",))

    p = Part()
    p.ellipse(CX, 24.8, 7.4, 6.0, "hair", clip=Y >= 21.6)
    p.capsule([(CX - 5.6, 25.0), (CX, 31.6), (CX + 5.6, 25.0)], [2.6, 1.2, 2.6], "hair")
    p.capsule([(19.8, 23.2), (CX, 22.0), (27.2, 23.2)], [1.2, 1.3, 1.2], "hair", bias=-1)
    hair_texture(p)
    out["race_dwarf_beard"] = p.to_image(soft=())

    ears = {
        "cat": [(16.4, 12.2), (17.4, 4.8), (22.0, 10.2)],
        "fox": [(15.8, 12.6), (16.0, 3.0), (22.4, 10.0)],
        "wolf": [(16.6, 12.0), (18.8, 3.6), (21.8, 10.8)],
    }
    for n, tri in ears.items():
        p = Part()
        for t in (tri, mirror_pts(tri)):
            p.poly(t, "hair")
            cxm = sum(x for x, _ in t) / 3
            cym = sum(y for _, y in t) / 3
            inner = [(cxm + (x - cxm) * 0.5, cym + (y - cym) * 0.5 + 0.4) for x, y in t]
            p.poly(inner, "inner_ear", flat=0.5)
        hair_texture(p)
        out["race_beast_ears_" + n] = p.to_image(soft=())

    tails = {
        "cat": ([(30.0, 38.0), (34.4, 37.6), (37.6, 34.4), (38.8, 30.0), (38.2, 25.8)], [1.3, 1.2, 1.1, 1.0, 0.9], None),
        "fox": ([(30.0, 38.0), (35.0, 38.6), (39.0, 35.4), (40.4, 31.0), (39.6, 26.6)], [1.6, 3.0, 3.4, 3.0, 1.8], 29.4),
        "wolf": ([(30.0, 38.0), (35.0, 39.0), (39.0, 36.0), (40.6, 32.0), (40.4, 28.6)], [1.4, 2.4, 2.6, 2.2, 1.2], None),
    }
    for n, (pts, rad, tip) in tails.items():
        p = Part()
        p.capsule(pts, rad, "hair")
        if tip:
            p.capsule(pts, rad, "cloth_white", clip=Y < tip)
        hair_texture(p)
        out["race_beast_tail_" + n] = p.to_image(soft=())

    p = Part()
    for sgn in (1, -1):
        p.capsule([(CX - sgn * 5.2, 10.2), (CX - sgn * 6.2, 6.8), (CX - sgn * 5.0, 4.4)], [1.5, 1.0, 0.35], "horn")
    out["race_demon_horns_small"] = p.to_image(glossy=("horn",))
    p = Part()
    for sgn in (1, -1):
        p.capsule([(CX - sgn * 6.4, 10.6), (CX - sgn * 9.6, 8.6), (CX - sgn * 11.8, 11.2), (CX - sgn * 11.0, 14.2), (CX - sgn * 9.0, 14.6)],
                  [1.7, 1.6, 1.4, 1.0, 0.5], "horn")
    out["race_demon_horns_ram"] = p.to_image(glossy=("horn",))
    p = Part()
    p.capsule([(30.0, 38.0), (35.0, 39.4), (38.4, 36.4), (39.6, 31.6), (39.4, 28.6)], [0.9, 0.9, 0.8, 0.7, 0.6], "skin", bias=1)
    p.poly([(39.4, 24.0), (41.9, 28.2), (39.4, 29.8), (36.9, 28.2)], "skin", bias=1)
    out["race_demon_tail"] = p.to_image(soft=())
    return out


# =================================================================== ACCESSORIES
def build_accessories(ascii_parts):
    out = {}
    out["acc_glasses"] = ascii_parts["acc_glasses"]
    out["acc_eyepatch"] = ascii_parts["acc_eyepatch"]
    out["acc_flower"] = ascii_parts["acc_flower"]

    p = Part()
    p.capsule([(16.8, 26.2), (CX, 27.8), (30.2, 26.2)], [2.0, 2.2, 2.0], "trim")
    p.capsule([(27.4, 27.6), (28.6, 31.6), (28.2, 35.0)], [1.5, 1.4, 1.0], "trim", bias=1)
    out["acc_scarf"] = p.to_image()

    p = Part()
    p.poly([(15.4, 25.4), (31.6, 25.4), (36.0, 44.8), (11.0, 44.8)], "trim", )
    p.poly([(15.4, 25.4), (31.6, 25.4), (36.0, 44.8), (11.0, 44.8)], "trim", bias=1, clip=Y >= 43.6)
    out["acc_cape"] = p.to_image()
    p = Part()
    for sx in (17.0, 2 * CX - 17.0):
        p.ellipse(sx, 26.4, 1.2, 1.2, "gold")
    out["acc_cape_front"] = p.to_image(glossy=("gold",))

    p = Part()
    for sgn in (1, -1):
        for (cx, cy, rx, ry, rot) in [(13.2, 27.8, 5.4, 3.0, -0.55), (11.8, 31.0, 4.6, 2.4, -0.3), (12.8, 33.6, 3.2, 1.8, -0.1)]:
            x = cx if sgn > 0 else 2 * CX - cx
            p.ellipse(x, cy, rx, ry, "cloth_white", rot=rot * sgn)
    out["acc_wings"] = p.to_image()
    return out


def build_hats():
    SH.FIXED.update({"hat_purple": (112, 64, 176), "hat_red": (206, 52, 52), "hat_green": (78, 120, 74), "gem": (220, 40, 60)})
    out = {}
    # 1 witch hat
    p = Part()
    p.poly([(16.6, 11.2), (30.4, 11.2), (27.2, 4.2), (30.2, 0.8), (24.2, 2.0)], "hat_purple")
    p.poly([(17.4, 8.8), (29.6, 8.8), (30.0, 10.8), (17.0, 10.8)], "gold", flat=0.3)
    p.ellipse(CX, 11.6, 12.6, 2.3, "hat_purple")
    out["hat_1"] = p.to_image(glossy=("gold",))
    # 2 small crown
    p = Part()
    p.poly([(17.8, 10.2), (29.2, 10.2), (29.6, 5.0), (27.2, 7.6), (25.6, 3.6), (CX, 6.8), (21.4, 3.6), (19.8, 7.6), (17.4, 5.0)], "gold")
    p.ellipse(CX, 8.6, 1.1, 1.1, "gem")
    out["hat_2"] = p.to_image(glossy=("gold", "gem"))
    # 3 headband with ties
    p = Part()
    p.capsule([(31.4, 12.6), (34.6, 14.6), (36.0, 18.4)], [1.1, 1.0, 0.7], "hat_red", bias=1)
    p.capsule([(31.4, 12.8), (35.6, 13.4), (38.0, 15.8)], [1.0, 0.9, 0.6], "hat_red", bias=1)
    p.ellipse(CX, 15.0, 9.95, 7.95, "hat_red", clip=(Y >= 11.0) & (Y <= 13.4))
    out["hat_3"] = p.to_image()
    # 4 travel hood
    p = Part()
    p.poly([(14.2, 22.0), (32.8, 22.0), (34.0, 29.0), (13.0, 29.0)], "hat_green", bias=1)
    p.ellipse(CX, 15.6, 11.0, 10.2, "hat_green")
    p.erase(ellipse_mask(CX, 19.6, 8.0, 7.4) & (Y >= 12.6))
    out["hat_4"] = p.to_image()
    # 5 steel helmet with plume
    p = Part()
    p.capsule([(CX, 5.6), (CX + 2.6, 2.6), (CX + 5.8, 2.8)], [1.6, 1.4, 0.8], "hat_red")
    p.ellipse(CX, 14.4, 10.4, 8.4, "steel", clip=Y <= 15.6)
    p.poly([(13.2, 14.0), (33.8, 14.0), (33.8, 15.8), (13.2, 15.8)], "steel", bias=1)
    p.poly([(22.6, 15.0), (24.4, 15.0), (24.2, 19.6), (22.8, 19.6)], "steel")
    out["hat_5"] = p.to_image(glossy=("steel",))
    # dragon crown (unlock): taller crown with horns and a ruby
    p = Part()
    for sgn in (1, -1):
        p.capsule([(CX - sgn * 6.4, 8.6), (CX - sgn * 8.6, 4.2), (CX - sgn * 8.0, 1.4)], [1.3, 0.9, 0.3], "horn")
    p.poly([(16.8, 11.0), (30.2, 11.0), (30.6, 4.8), (28.0, 7.6), (26.4, 2.8), (CX, 6.4), (20.6, 2.8), (19.0, 7.6), (16.4, 4.8)], "gold")
    p.ellipse(CX, 8.8, 1.5, 1.4, "gem")
    out["hat_dragon"] = p.to_image(glossy=("gold", "gem", "horn"))
    return out


def build_all(ascii_parts):
    SH.FIXED.setdefault("inner_ear", (240, 150, 160))
    parts = {}
    parts.update(build_body())
    parts.update(build_hair())
    parts.update(build_outfits())
    parts.update(build_race())
    parts.update(build_accessories(ascii_parts))
    parts.update(build_hats())
    return parts
