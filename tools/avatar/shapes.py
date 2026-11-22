"""
Character parts drawn as smooth shapes (see hires.py) on a crisp 64x64 grid
with slim, well-proportioned Stardew Valley RPG silhouettes.
"""
import numpy as np
from PIL import Image

import hires as HR
import shade as SH
from hires import Part, X, Y, ellipse_mask, rect_mask, poly_mask

CX = 31.5
FACE = {(x, y) for y in range(8, 28) for x in range(22, 42)}


def mirror_pts(pts):
    return [(2 * CX - x, y) for x, y in pts]


# =================================================================== BODY (64x64 Slim Stardew Proportions)
# Head: ~16.2px interior wide (18.2px w/ outline), ~18.5px tall -> slim tapered oval!
# Neck: y=25..29, Torso: y=28.5..41, Legs & Boots: y=40.5..58.6 (18px tall slim legs!)
HEAD = (CX, 16.8, 8.1, 8.8)


def build_body():
    p = Part()
    for ex in (22.6, 2 * CX - 22.6):                           # neat small ears peeking at sides
        p.ellipse(ex, 18.6, 1.4, 2.1, "skin")
    p.poly([(29.4, 24.8), (33.6, 24.8), (33.8, 30.2), (29.2, 30.2)], "skin", bias=1)  # slim neck
    p.ellipse(*HEAD, "skin")
    p.ellipse(CX, 20.4, 7.1, 6.9, "skin", clip=Y > 18.0)       # gentle Stardew jawline taper (no puffy cheeks!)
    for hx in (22.4, 2 * CX - 22.4):                           # slim hands hanging neatly at sides
        p.ellipse(hx, 39.6, 1.9, 2.0, "skin")
    body = p.to_image(soft=("skin",))
    shadow = Image.new("RGBA", (HR.N, HR.N), (0, 0, 0, 0))
    for y in range(56, 62):
        for x in range(HR.N):
            if ((x + 0.5 - CX) / 8.4) ** 2 + ((y + 0.5 - 59.2) / 1.7) ** 2 <= 1:
                shadow.putpixel((x, y), (0, 0, 0, 88))
    shadow.alpha_composite(body)
    return {"body": shadow, "body_back": shadow}


# =================================================================== HAIR (64x64 Stardew RPG Layers!)
def stardew_crown(p, cy=13.6, rx=9.6, ry=7.4, part=CX, part_w=2.4, arch=3.8, brow_y=14.4, side_y=20.2):
    """Voluminous Stardew top crown with a natural arched hairline/parting & soft side locks."""
    p.ellipse(CX, cy, rx, ry, "hair")
    for sx in (22.6, 2 * CX - 22.6):
        p.capsule([(sx, 14.0), (sx + 0.15 * np.sign(CX - sx), side_y)], [1.65, 1.05], "hair")
    # Natural arched forehead opening (inverted U/V at parting, clean browline over eyes!)
    part_bump = arch * np.exp(-((X - part) / max(0.8, part_w)) ** 2)
    face_open = ellipse_mask(CX, 19.2, 7.6, 8.2) & (Y >= (brow_y - part_bump))
    p.erase(face_open)


def bang_lock(p, x0, y0, x1, y1, w0=1.55, w1=0.35, bias=0):
    """Tapered pointed foreground bang/cheek lock."""
    p.capsule([(x0, y0), (x1, y1)], [w0, w1], "hair", bias=bias)


def behind_shadow(p):
    """Slightly deepen behind-torso hair under head/shoulders for natural Stardew depth."""
    hm = p.mat == p._mid("hair")
    under = (Y >= 20.0) & (np.abs(X - CX) < 9.5)
    p.bias = np.where(hm & under, np.minimum(1, p.bias + 1), p.bias)


def hair_texture(p, top=7.0, part_x=CX):
    hm = p.mat == p._mid("hair")
    # Gentle downward strand flow (no diagonal barber-pole stripes!)
    flow = np.sin((X - part_x) * 1.15) * (0.032 * np.clip((Y - 11.0) / 10.0, 0, 1))
    p.val += hm * flow
    # Crisp Stardew arched crown sheen across upper hair dome, softly broken at hair part
    sheen = (
        ellipse_mask(CX - 0.5, 12.6, 8.2, 5.2)
        & ~ellipse_mask(CX - 0.3, 13.5, 7.1, 4.3)
        & (Y < 13.0)
        & (np.abs(X - part_x) > 1.1)
    )
    bias_side = np.where(X <= CX, 0.24, 0.14)
    p.val += hm * sheen * bias_side


HAIR = {}


def style(name):
    def deco(fn):
        HAIR[name] = fn
        return fn
    return deco


@style("short")
def _short(p, pb, back):
    stardew_crown(p, cy=13.5, rx=9.4, ry=7.1, part=29.2, part_w=2.3, arch=2.8, brow_y=14.3, side_y=19.8)
    bang_lock(p, 29.0, 11.4, 26.4, 15.2, 1.35, 0.35)
    bang_lock(p, 31.4, 11.4, 30.8, 15.6, 1.25, 0.3)
    bang_lock(p, 34.4, 11.4, 36.4, 15.0, 1.35, 0.35)
    return 29.2


@style("messy")
def _messy(p, pb, back):
    stardew_crown(p, cy=13.6, rx=9.7, ry=7.3, part=30.0, part_w=2.2, arch=2.0, brow_y=14.2, side_y=20.8)
    for x0, y0, x1, y1 in [
        (24.2, 10.8, 21.4, 8.6), (27.4, 8.8, 25.6, 6.4),
        (31.8, 8.2, 32.8, 5.8), (35.8, 9.0, 38.4, 6.8), (38.8, 11.4, 41.6, 9.2)
    ]:
        bang_lock(p, x0, y0, x1, y1, 2.2, 0.55)
    for bx, tipx, ty in [(26.0, 24.8, 15.6), (29.2, 29.8, 15.6), (31.6, 31.2, 16.4), (34.4, 33.8, 15.6), (37.4, 38.4, 15.6)]:
        bang_lock(p, bx, 11.4, tipx, ty, 1.4, 0.3)
    pb.capsule([(23.2, 19.6), (21.6, 23.6)], [1.7, 0.5], "hair")
    pb.capsule([(39.8, 19.6), (41.4, 23.6)], [1.7, 0.5], "hair")
    return 30.0


@style("bob")
def _bob(p, pb, back):
    stardew_crown(p, cy=13.8, rx=9.8, ry=7.5, part=CX, part_w=2.6, arch=3.8, brow_y=14.6, side_y=21.2)
    # Soft curved cheek locks tapering gently inward around jawline (classic Stardew bob)
    p.capsule([(22.8, 14.0), (21.6, 19.8), (22.6, 24.6), (25.2, 26.2)], [2.0, 2.2, 1.85, 0.7], "hair")
    p.capsule([(40.2, 14.0), (41.4, 19.8), (40.4, 24.6), (37.8, 26.2)], [2.0, 2.2, 1.85, 0.7], "hair")
    bang_lock(p, 29.4, 11.6, 25.8, 15.6, 1.4, 0.45)
    bang_lock(p, 33.6, 11.6, 37.2, 15.6, 1.4, 0.45)
    pb.ellipse(CX, 20.6, 10.6, 7.6, "hair")
    return CX


@style("band")
def _band(p, pb, back):
    stardew_crown(p, cy=13.2, rx=9.6, ry=7.4, part=29.8, part_w=2.3, arch=2.0, brow_y=14.4, side_y=20.4)
    p.ellipse(CX, 13.8, 9.75, 7.9, "trim", clip=(Y >= 10.4) & (Y <= 12.6))
    for bx, tipx, ty in [(27.6, 26.2, 15.4), (30.4, 30.8, 16.0), (33.4, 34.4, 15.6), (36.4, 37.8, 15.2)]:
        bang_lock(p, bx, 12.4, tipx, ty, 1.35, 0.3)
    return 29.8


@style("side")
def _side(p, pb, back):
    stardew_crown(p, cy=13.4, rx=9.5, ry=7.3, part=26.4, part_w=2.0, arch=3.2, brow_y=14.2, side_y=19.6)
    p.capsule([(26.8, 10.2), (32.4, 11.6), (37.8, 14.2), (40.2, 18.8), (39.6, 22.0)], [2.2, 2.4, 2.2, 1.6, 0.55], "hair")
    bang_lock(p, 25.4, 11.6, 23.0, 17.6, 1.4, 0.4)
    return 26.4


@style("shaggy")
def _shaggy(p, pb, back):
    stardew_crown(p, cy=13.6, rx=9.7, ry=7.5, part=30.4, part_w=2.2, arch=2.8, brow_y=14.4, side_y=22.0)
    bang_lock(p, 28.8, 11.4, 26.4, 15.6, 1.3, 0.35)
    bang_lock(p, 32.0, 11.4, 31.2, 16.0, 1.25, 0.3)
    bang_lock(p, 34.8, 11.4, 37.2, 15.6, 1.3, 0.35)
    p.capsule([(22.8, 15.0), (22.0, 21.8), (23.6, 26.6)], [1.9, 1.6, 0.45], "hair")
    p.capsule([(40.2, 15.0), (41.0, 21.8), (39.4, 26.6)], [1.9, 1.6, 0.45], "hair")
    # Layered wolf-cut mullet tips behind neck & shoulders
    pb.ellipse(CX, 21.6, 10.4, 7.6, "hair")
    pb.capsule([(23.2, 21.0), (20.2, 27.2), (18.8, 30.8)], [2.2, 1.6, 0.45], "hair")
    pb.capsule([(39.8, 21.0), (42.8, 27.2), (44.2, 30.8)], [2.2, 1.6, 0.45], "hair")
    return 30.4


@style("long")
def _long(p, pb, back):
    # Authentic Stardew long straight silky hair: center arch part + slender cheek locks + full back drape
    stardew_crown(p, cy=13.8, rx=9.8, ry=7.5, part=CX, part_w=2.5, arch=4.0, brow_y=14.6, side_y=22.4)
    p.capsule([(22.6, 14.0), (22.0, 21.0), (23.4, 25.8)], [1.85, 1.7, 0.55], "hair")
    p.capsule([(40.4, 14.0), (41.0, 21.0), (39.6, 25.8)], [1.85, 1.7, 0.55], "hair")
    bang_lock(p, 29.2, 11.4, 25.6, 15.6, 1.35, 0.4)
    bang_lock(p, 33.8, 11.4, 37.4, 15.6, 1.35, 0.4)
    pb.poly([
        (22.2, 15.0), (40.8, 15.0), (42.6, 26.0), (43.0, 39.2),
        (37.4, 42.4), (CX, 41.0), (25.6, 42.4), (20.0, 39.2), (20.4, 26.0)
    ], "hair")
    return CX


@style("ponytail")
def _ponytail(p, pb, back):
    stardew_crown(p, cy=13.4, rx=9.4, ry=7.2, part=CX, part_w=2.4, arch=3.6, brow_y=14.2, side_y=19.8)
    bang_lock(p, 23.0, 15.6, 22.4, 22.0, 1.15, 0.35)
    bang_lock(p, 40.0, 15.6, 40.6, 22.0, 1.15, 0.35)
    if back:
        p.capsule([(CX, 11.4), (CX - 0.6, 18.6), (CX + 0.4, 26.4), (CX, 34.4)], [2.4, 3.2, 2.7, 1.1], "hair")
        p.ellipse(CX, 10.8, 2.1, 1.5, "trim")
    else:
        pb.capsule([(38.8, 11.2), (43.2, 14.8), (45.2, 21.4), (44.4, 28.4), (42.2, 35.0)], [2.1, 2.9, 2.8, 2.1, 0.7], "hair")
        p.ellipse(39.4, 11.2, 1.75, 1.55, "trim")
    return CX


@style("twintails")
def _twintails(p, pb, back):
    stardew_crown(p, cy=13.6, rx=9.5, ry=7.2, part=CX, part_w=2.3, arch=3.4, brow_y=14.4, side_y=20.6)
    bang_lock(p, 29.2, 11.4, 25.8, 15.6, 1.35, 0.35)
    bang_lock(p, 33.8, 11.4, 37.2, 15.6, 1.35, 0.35)
    for sgn in (1, -1):
        bx = CX - sgn * 9.2
        pb.capsule([
            (bx, 14.0), (bx - sgn * 2.2, 20.6),
            (bx - sgn * 2.8, 28.8), (bx - sgn * 2.0, 36.8), (bx - sgn * 0.8, 39.2)
        ], [2.0, 2.7, 2.6, 1.6, 0.5], "hair")
        p.ellipse(bx - sgn * 0.2, 13.8, 1.65, 1.45, "trim")
    return CX


@style("bun")
def _bun(p, pb, back):
    p.ellipse(CX, 6.4, 4.4, 3.6, "hair")
    p.ellipse(CX, 9.2, 3.2, 0.9, "trim")
    stardew_crown(p, cy=13.4, rx=9.4, ry=7.1, part=CX, part_w=2.4, arch=3.8, brow_y=14.2, side_y=20.2)
    bang_lock(p, 23.0, 16.0, 22.4, 22.0, 1.1, 0.3)
    bang_lock(p, 40.0, 16.0, 40.6, 22.0, 1.1, 0.3)
    pb.ellipse(CX, 17.6, 9.2, 7.6, "hair")
    return CX


@style("spiky")
def _spiky(p, pb, back):
    spikes = [
        [(23.6, 14.4), (17.8, 9.6), (25.2, 10.6)],
        [(24.8, 11.2), (21.6, 3.6), (29.2, 8.6)],
        [(28.4, 9.2), (30.8, 1.2), (34.4, 8.8)],
        [(33.2, 8.8), (40.2, 3.2), (38.2, 11.4)],
        [(37.8, 10.8), (45.2, 9.4), (39.4, 14.6)],
    ]
    for tri in spikes:
        p.poly(tri, "hair")
    stardew_crown(p, cy=13.4, rx=9.5, ry=6.8, part=CX, part_w=1.8, arch=1.2, brow_y=14.0, side_y=20.4)
    for bx, tipx, ty in [(26.2, 24.8, 15.8), (29.4, 29.8, 15.6), (31.5, 31.5, 17.0), (33.6, 33.2, 15.6), (36.8, 38.2, 15.8)]:
        bang_lock(p, bx, 11.0, tipx, ty, 1.4, 0.25)
    pb.capsule([(23.0, 19.6), (20.4, 22.8)], [1.6, 0.4], "hair")
    pb.capsule([(40.0, 19.6), (42.6, 22.8)], [1.6, 0.4], "hair")
    return CX


@style("sweep")
def _sweep(p, pb, back):
    stardew_crown(p, cy=13.5, rx=9.6, ry=7.4, part=25.8, part_w=2.0, arch=3.0, brow_y=14.0, side_y=20.4)
    p.capsule([(25.8, 10.4), (32.2, 12.6), (36.6, 16.4), (38.4, 20.8)], [2.5, 2.7, 2.3, 0.55], "hair")
    bang_lock(p, 24.6, 12.2, 22.8, 19.2, 1.5, 0.4)
    pb.ellipse(CX, 20.0, 9.6, 6.8, "hair")
    return 25.8


@style("curly")
def _curly(p, pb, back):
    # Soft billowing cloud curls instead of separated marbles
    for cx, cy, r in [
        (24.0, 9.8, 3.4), (27.6, 7.6, 3.6), (31.5, 7.0, 3.7), (35.4, 7.6, 3.6), (39.0, 9.8, 3.4),
        (21.6, 13.8, 3.2), (41.4, 13.8, 3.2), (21.6, 18.6, 2.9), (41.4, 18.6, 2.9),
        (22.6, 22.8, 2.6), (40.4, 22.8, 2.6),
    ]:
        p.ellipse(cx, cy, r, r, "hair")
    stardew_crown(p, cy=14.0, rx=9.8, ry=7.6, part=CX, part_w=2.2, arch=3.0, brow_y=14.6, side_y=21.2)
    bang_lock(p, 28.4, 11.8, 26.2, 15.6, 1.4, 0.5)
    bang_lock(p, 34.6, 11.8, 36.8, 15.6, 1.4, 0.5)
    for cx, cy, r in [(22.4, 23.8, 3.2), (25.6, 26.2, 3.0), (37.4, 26.2, 3.0), (40.6, 23.8, 3.2), (CX, 25.8, 4.0)]:
        pb.ellipse(cx, cy, r, r, "hair")
    return CX


@style("afro")
def _afro(p, pb, back):
    # Single cohesive dome first, soft scalloped perimeter under-cut so no internal seam ring appears
    for ang in np.linspace(np.pi * 0.92, np.pi * 2.08, 15):
        p.ellipse(CX + 11.0 * np.cos(ang), 13.0 + 9.2 * np.sin(ang), 2.8, 2.7, "hair")
    p.ellipse(CX, 13.0, 12.2, 10.2, "hair")
    part_bump = 2.0 * np.exp(-((X - CX) / 2.4) ** 2)
    p.erase(ellipse_mask(CX, 19.2, 7.6, 8.2) & (Y >= (13.8 - part_bump)))
    pb.ellipse(CX, 16.8, 12.0, 9.8, "hair")
    return CX


@style("mohawk")
def _mohawk(p, pb, back):
    p.ellipse(CX, 15.0, 8.5, 7.0, "hair", bias=1)
    p.erase(ellipse_mask(CX, 19.2, 7.7, 8.2) & (Y >= 12.6))
    for x0, y0, x1, y1, r0, r1 in [
        (CX, 12.6, CX - 0.3, 3.6, 2.3, 1.1),
        (CX, 9.4, CX + 0.5, 1.4, 2.0, 0.7),
        (CX, 11.4, CX - 0.4, 6.2, 2.2, 0.9),
    ]:
        p.capsule([(x0, y0), (x1, y1)], [r0, r1], "hair")
    return CX


@style("braid")
def _braid(p, pb, back):
    stardew_crown(p, cy=13.8, rx=9.6, ry=7.4, part=28.0, part_w=2.2, arch=3.4, brow_y=14.4, side_y=20.6)
    p.capsule([(28.2, 11.0), (34.0, 12.6), (39.0, 15.8)], [2.0, 2.1, 1.6], "hair")
    bang_lock(p, 26.2, 11.4, 23.0, 18.6, 1.5, 0.45)
    pb.ellipse(CX, 20.6, 9.8, 7.0, "hair")
    bx_base = CX if back else 39.2
    for i in range(6):
        yy = 19.6 + i * 2.7
        w = 1.85 - i * 0.14
        p.capsule([(bx_base - 1.1, yy), (bx_base + 0.5, yy + 1.3)], [w * 0.75, w * 0.65], "hair")
        p.capsule([(bx_base + 1.1, yy + 0.8), (bx_base - 0.5, yy + 2.1)], [w * 0.75, w * 0.65], "hair")
    p.ellipse(bx_base, 36.6, 1.4, 1.05, "trim")
    p.capsule([(bx_base, 37.4), (bx_base - 0.4, 40.6), (bx_base + 0.4, 41.8)], [1.1, 0.75, 0.3], "hair")
    return 28.0


@style("wavy")
def _wavy(p, pb, back):
    stardew_crown(p, cy=13.8, rx=9.8, ry=7.5, part=CX, part_w=2.6, arch=3.8, brow_y=14.4, side_y=21.0)
    p.capsule([(22.6, 14.0), (21.2, 19.8), (22.6, 25.0), (21.6, 28.2)], [1.9, 2.1, 1.8, 0.6], "hair")
    p.capsule([(40.4, 14.0), (41.8, 19.8), (40.4, 25.0), (41.4, 28.2)], [1.9, 2.1, 1.8, 0.6], "hair")
    bang_lock(p, 29.2, 11.4, 25.4, 15.6, 1.35, 0.4)
    bang_lock(p, 33.8, 11.4, 37.6, 15.6, 1.35, 0.4)
    for sgn in (1, -1):
        bx = CX - sgn * 8.2
        pb.capsule([
            (bx, 16.0), (bx - sgn * 2.8, 22.8), (bx - sgn * 1.4, 29.4),
            (bx - sgn * 3.0, 35.8), (bx - sgn * 1.4, 41.8)
        ], [3.2, 3.6, 3.4, 3.1, 1.6], "hair")
    pb.poly([(22.4, 16.0), (40.6, 16.0), (41.6, 40.6), (21.4, 40.6)], "hair")
    return CX


@style("hime")
def _hime(p, pb, back):
    # Classic Hime: neat blunt brow fringe with soft parting notch + cheek sidelocks + straight back cascade!
    stardew_crown(p, cy=13.8, rx=9.8, ry=7.5, part=CX, part_w=0.9, arch=0.5, brow_y=14.1, side_y=20.0)
    p.poly([(24.2, 10.2), (38.8, 10.2), (39.0, 13.9), (24.0, 13.9)], "hair")
    for sx in (22.7, 2 * CX - 22.7):
        p.poly([(sx - 1.5, 13.6), (sx + 1.5, 13.6), (sx + 1.3, 25.8), (sx - 1.3, 25.8)], "hair")
    pb.poly([(21.4, 15.2), (41.6, 15.2), (42.8, 41.2), (20.2, 41.2)], "hair")
    return CX


@style("pixie")
def _pixie(p, pb, back):
    stardew_crown(p, cy=13.2, rx=9.1, ry=7.0, part=27.2, part_w=2.0, arch=2.4, brow_y=14.2, side_y=18.2)
    bang_lock(p, 27.6, 11.0, 31.2, 14.6, 1.4, 0.35)
    bang_lock(p, 30.6, 11.2, 34.4, 14.8, 1.35, 0.3)
    bang_lock(p, 33.8, 11.4, 37.6, 14.6, 1.25, 0.3)
    bang_lock(p, 23.0, 14.0, 22.0, 20.0, 1.15, 0.35)
    return 27.2


@style("drills")
def _drills(p, pb, back):
    stardew_crown(p, cy=13.6, rx=9.6, ry=7.3, part=CX, part_w=2.5, arch=3.6, brow_y=14.4, side_y=20.8)
    bang_lock(p, 29.2, 11.4, 25.8, 15.6, 1.35, 0.35)
    bang_lock(p, 33.8, 11.4, 37.2, 15.6, 1.35, 0.35)
    for sgn in (1, -1):
        bx = CX - sgn * 9.8
        for i in range(4):
            y0 = 16.8 + i * 4.4
            rx = 3.2 - i * 0.42
            pb.capsule([(bx - sgn * 1.4, y0), (bx + sgn * 1.2, y0 + 2.8)], [rx, rx * 0.85], "hair", bias=i % 2)
        pb.capsule([(bx, 33.6), (bx - sgn * 0.6, 38.4)], [1.8, 0.35], "hair")
        p.ellipse(CX - sgn * 9.0, 13.6, 1.75, 1.35, "trim", rot=0.35 * sgn)
    return CX


def build_hair():
    out = {}
    for name, fn in HAIR.items():
        for back in (False, True):
            p = Part()
            pb = Part()
            part_x = fn(p, pb, back)
            if back:
                # Merge behind layer + back skull dome for rear view
                mask_pb = pb.mat >= 0
                p.ellipse(CX, 17.6, 9.2, 9.4, "hair")
                p.mat = np.where(mask_pb & (p.mat < 0), pb.mat, p.mat)
                p.val = np.where(mask_pb & (p.val == 0), pb.val, p.val)
                hair_texture(p, part_x=part_x)
                out["hair_" + name + "_back"] = p.to_image(soft=())
            else:
                hair_texture(p, part_x=part_x)
                im = p.to_image(soft=())
                SH.cast_shadow(im, FACE, alpha=45)
                out["hair_" + name] = im
                if np.any(pb.mat >= 0):
                    behind_shadow(pb)
                    hair_texture(pb, part_x=part_x)
                    out["hair_" + name + "_behind"] = pb.to_image(soft=())
    return out


# =================================================================== OUTFITS (64x64 Slim Stardew RPG!)
def legs(p, mat_pants, mat_boot, frame, boot_top=50.4, tall=False):
    dl, dr = {"": (0, 0), "_s1": (-2.2, 0.7), "_s2": (0.7, -2.2)}[frame]
    for (lx, d) in ((27.6, dl), (2 * CX - 27.6, dr)):
        p.capsule([(lx, 40.4), (lx, 51.4 + d)], [2.4, 2.0], mat_pants)
    for (lx, d) in ((27.5, dl), (2 * CX - 27.5, dr)):
        top = (46.8 if tall else boot_top) + d
        p.poly([(lx - 2.25, top), (lx + 2.25, top), (lx + 2.5, 58.6 + d), (lx - 2.65, 58.6 + d)], mat_boot)


def torso(p, mat, top=29.2, bottom=41.6):
    # Slim Stardew torso: 14.2px shoulders tapering gracefully to 12.2px waist!
    p.poly([
        (24.4, top), (38.6, top), (38.8, 33.6), (37.6, 37.8),
        (38.0, bottom), (25.0, bottom), (25.4, 37.8), (24.2, 33.6)
    ], mat)
    for sx in (24.9, 2 * CX - 24.9):
        p.ellipse(sx, 31.2, 2.5, 2.1, mat)


def sleeves(p, mat, bias=0, bell=False):
    for sgn in (1, -1):
        a = (CX - sgn * 7.2, 31.0)
        b = (CX - sgn * 9.0, 37.4)
        p.capsule([a, b], [2.2, 2.9 if bell else 1.85], mat, bias=bias)


def belt(p, mat="belt", buckle="trim", y0=37.6, y1=39.5):
    p.poly([(25.0, y0), (38.0, y0), (38.0, y1), (25.0, y1)], mat, flat=0.4)
    if buckle:
        p.ellipse(CX, (y0 + y1) / 2, 1.5, 1.25, buckle)


def outfit_tunic(p, frame):
    legs(p, "pants", "boot", frame)
    sleeves(p, "main")
    torso(p, "main")
    p.poly([(25.0, 38.4), (38.0, 38.4), (39.0, 44.6), (24.0, 44.6)], "main", bias=0)
    p.poly([(28.6, 29.2), (34.4, 29.2), (CX, 33.4)], "trim")
    belt(p)


def outfit_knight(p, frame):
    legs(p, "pants_steel", "steel", frame)
    sleeves(p, "steel", bias=1)
    torso(p, "steel")
    p.poly([(28.8, 30.8), (34.2, 30.8), (34.8, 45.4), (CX, 47.0), (28.2, 45.4)], "main")
    for sx in (24.2, 2 * CX - 24.2):
        p.ellipse(sx, 31.0, 3.2, 2.6, "steel")
    belt(p, buckle="gold")


def outfit_archer(p, frame):
    legs(p, "pants_leather", "leather", frame, tall=True)
    sleeves(p, "main")
    torso(p, "main")
    p.poly([(24.4, 29.4), (29.0, 29.4), (29.8, 41.6), (25.0, 41.6), (24.2, 33.6)], "leather")
    p.poly(mirror_pts([(24.4, 29.4), (29.0, 29.4), (29.8, 41.6), (25.0, 41.6), (24.2, 33.6)]), "leather")
    p.capsule([(25.6, 29.8), (37.4, 40.8)], [0.9, 0.9], "trim")
    belt(p, buckle="gold")


def outfit_ninja(p, frame):
    legs(p, "pants_ninja", "charcoal", frame)
    for lx in (27.6, 2 * CX - 27.6):
        p.ellipse(lx, 48.2, 2.35, 1.0, "trim")
    sleeves(p, "main")
    torso(p, "main")
    p.poly([(27.0, 29.2), (CX, 35.0), (36.0, 29.2), (34.2, 29.2), (CX, 32.8), (28.8, 29.2)], "main", bias=1)
    p.poly([(29.2, 29.2), (33.8, 29.2), (CX, 32.4)], "charcoal")
    belt(p, mat="trim", buckle=None, y0=37.0, y1=39.8)
    p.capsule([(35.6, 39.4), (37.2, 44.6)], [1.1, 0.85], "trim", bias=1)
    p.capsule([(36.6, 39.0), (39.0, 43.2)], [1.0, 0.75], "trim", bias=1)


def robe(p, mat, frame, hem="trim"):
    sway = {"": 0.0, "_s1": -0.9, "_s2": 0.9}[frame]
    for (fx, d) in ((27.6, 0.7 if frame == "_s1" else 0.0), (35.4, 0.7 if frame == "_s2" else 0.0)):
        p.ellipse(fx + sway * 0.4, 58.0 + d, 2.3, 1.3, "boot")
    pts = [(24.4, 29.2), (38.6, 29.2), (38.8, 33.6), (37.8, 37.8), (41.0 + sway, 57.6), (22.0 + sway, 57.6), (25.2, 37.8), (24.2, 33.6)]
    p.poly(pts, mat)
    p.poly(pts, hem, clip=Y >= 55.4)
    sleeves(p, mat, bell=True)
    return pts


def outfit_mage(p, frame):
    robe(p, "main", frame)
    p.poly([(28.2, 29.2), (34.8, 29.2), (CX, 34.0)], "trim")
    p.poly([(25.2, 37.8), (37.8, 37.8), (37.8, 39.0), (25.2, 39.0)], "gold", flat=0.3)
    for (sx, sy) in ((27.0, 47.0), (35.8, 49.4), (30.8, 52.0)):
        p.ellipse(sx, sy, 0.8, 0.8, "gold")


def outfit_priest(p, frame):
    robe(p, "cloth_white", frame)
    for sx in (28.4, 2 * CX - 28.4):
        p.capsule([(sx, 29.8), (sx - 0.2 * np.sign(CX - sx), 55.2)], [1.1, 1.25], "main")
    p.poly([(30.6, 33.8), (32.4, 33.8), (32.4, 38.8), (30.6, 38.8)], "gold", flat=0.3)
    p.poly([(29.2, 35.2), (33.8, 35.2), (33.8, 36.4), (29.2, 36.4)], "gold", flat=0.3)


def outfit_samurai(p, frame):
    sway = {"": 0.0, "_s1": -0.7, "_s2": 0.7}[frame]
    for (fx, d) in ((27.6, 0.7 if frame == "_s1" else 0.0), (35.4, 0.7 if frame == "_s2" else 0.0)):
        p.ellipse(fx, 58.0 + d, 2.3, 1.3, "charcoal")
    hak = [(25.0, 39.0), (38.0, 39.0), (40.2 + sway, 57.2), (22.8 + sway, 57.2)]
    p.poly(hak, "trim")
    p.poly([(31.0, 39.6), (32.0, 39.6), (32.0 + sway, 57.2), (31.0 + sway, 57.2)], "trim", bias=1, flat=0.4)
    sleeves(p, "main", bell=True)
    torso(p, "main")
    p.poly([(27.4, 29.2), (CX, 35.6), (35.6, 29.2), (34.0, 29.2), (CX, 33.2), (29.0, 29.2)], "cloth_white")
    for sx in (24.0, 2 * CX - 24.0):
        p.poly([(sx - 2.8, 30.0), (sx + 2.6, 30.0), (sx + 2.8, 35.6), (sx - 3.0, 35.6)], "leather")
    belt(p, mat="main", buckle=None, y0=37.0, y1=39.6)


def outfit_pirate(p, frame):
    legs(p, "pants", "boot", frame, tall=True)
    sleeves(p, "main")
    torso(p, "main", bottom=41.8)
    for sgn in (1, -1):
        p.poly([(CX - sgn * 7.0, 38.4), (CX - sgn * 1.9, 38.4), (CX - sgn * 2.4, 49.4), (CX - sgn * 7.8, 48.2)], "main", bias=1)
    p.poly([(28.8, 29.2), (34.2, 29.2), (33.0, 37.8), (30.0, 37.8)], "cloth_white")
    for sgn in (1, -1):
        p.poly([(CX - sgn * 2.4, 29.2), (CX - sgn * 4.8, 29.2), (CX - sgn * 3.0, 36.2)], "trim")
    belt(p, mat="belt", buckle="gold", y0=37.8, y1=40.0)
    for by in (31.8, 34.8):
        p.ellipse(27.6, by, 0.65, 0.65, "gold")
        p.ellipse(2 * CX - 27.6, by, 0.65, 0.65, "gold")


def outfit_bard(p, frame):
    legs(p, "pants_leather", "boot", frame)
    for sx in (24.0, 2 * CX - 24.0):
        p.ellipse(sx, 32.0, 3.1, 2.9, "trim")
    torso(p, "main")
    p.poly([(26.2, 29.8), (36.8, 29.8), (37.0, 41.2), (26.0, 41.2)], "main")
    p.poly([(29.2, 29.2), (33.8, 29.2), (32.8, 35.6), (30.2, 35.6)], "trim", bias=-1)
    p.ellipse(CX, 30.8, 2.5, 1.7, "cloth_white")
    p.ellipse(CX, 32.6, 1.9, 1.3, "cloth_white")
    belt(p, mat="belt", buckle="gold")


def outfit_rogue(p, frame):
    legs(p, "pants_ninja", "charcoal", frame)
    sleeves(p, "leather", bias=1)
    torso(p, "leather")
    p.capsule([(24.2, 30.8), (37.2, 40.2)], [0.85, 0.85], "belt")
    p.capsule([(38.8, 30.8), (25.8, 40.2)], [0.85, 0.85], "belt")
    p.poly([(22.8, 29.8), (40.2, 29.8), (41.0, 36.4), (CX, 38.4), (22.0, 36.4)], "main")
    p.capsule([(25.0, 30.0), (CX, 31.0), (38.0, 30.0)], [1.7, 1.95, 1.7], "main", bias=1)
    belt(p, mat="trim", buckle="gold")


def outfit_scholar(p, frame):
    legs(p, "pants", "boot", frame)
    sleeves(p, "main")
    coat = [(24.4, 29.2), (38.6, 29.2), (38.8, 33.6), (39.8, 50.6), (23.2, 50.6), (24.2, 33.6)]
    p.poly(coat, "main")
    p.poly([(30.4, 30.6), (32.6, 30.6), (32.6, 50.6), (30.4, 50.6)], "main", bias=1, flat=0.3)
    p.poly([(28.2, 27.6), (34.8, 27.6), (34.4, 30.8), (28.6, 30.8)], "trim")
    for by in (33.0, 37.2, 41.4, 45.6):
        p.ellipse(CX, by, 0.65, 0.65, "gold")
    p.capsule([(25.8, 30.2), (37.0, 41.6)], [0.8, 0.8], "leather")
    p.poly([(35.6, 40.0), (40.2, 40.0), (40.2, 44.6), (35.6, 44.6)], "leather")


def student_top(p):
    for sgn in (1, -1):
        p.capsule([(CX - sgn * 7.6, 33.4), (CX - sgn * 8.8, 37.4)], [1.65, 1.5], "skin")
        p.capsule([(CX - sgn * 7.2, 30.8), (CX - sgn * 8.0, 33.0)], [2.2, 2.1], "cloth_white")
    torso(p, "cloth_white", bottom=40.0)
    p.poly([(28.4, 28.6), (34.6, 28.6), (CX, 32.0)], "cloth_white", bias=1)
    p.poly([(CX - 0.85, 31.0), (CX + 0.85, 31.0), (CX + 1.1, 35.4), (CX, 36.6), (CX - 1.1, 35.4)], "trim")
    p.ellipse(35.6, 32.8, 1.0, 1.0, "trim", bias=1)


def socks_shoes(p, frame):
    dl, dr = {"": (0, 0), "_s1": (-2.2, 0.7), "_s2": (0.7, -2.2)}[frame]
    for (lx, d) in ((27.6, dl), (2 * CX - 27.6, dr)):
        p.capsule([(lx, 42.4), (lx, 50.6 + d)], [1.8, 1.7], "skin")
        p.poly([(lx - 1.85, 49.8 + d), (lx + 1.85, 49.8 + d), (lx + 1.85, 55.0 + d), (lx - 1.85, 55.0 + d)], "cloth_white")
        p.poly([(lx - 2.2, 54.8 + d), (lx + 2.35, 54.8 + d), (lx + 2.55, 58.6 + d), (lx - 2.55, 58.6 + d)], "charcoal")


def outfit_student(p, frame):
    socks_shoes(p, frame)
    for lx in (27.6, 2 * CX - 27.6):
        p.poly([(lx - 2.8, 39.0), (lx + 2.8, 39.0), (lx + 2.8, 44.6), (lx - 2.8, 44.6)], "main")
    student_top(p)
    belt(p, mat="charcoal", buckle="gold", y0=38.2, y1=40.0)


def outfit_student_skirt(p, frame):
    socks_shoes(p, frame)
    sway = {"": 0.0, "_s1": -0.6, "_s2": 0.6}[frame]
    p.poly([(25.0, 38.8), (38.0, 38.8), (40.0 + sway, 46.8), (23.0 + sway, 46.8)], "main")
    for px_ in (27.2, 29.8, 32.6, 35.4):
        p.poly([(px_, 40.0), (px_ + 0.65, 40.0), (px_ + 1.0 + sway, 46.4), (px_ + 0.35 + sway, 46.4)], "main", bias=1, flat=0.4)
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


# =================================================================== RACES (64x64)
def build_race():
    out = {}
    p = Part()
    for sgn in (1, -1):
        pts = [(CX - sgn * 8.0, 18.6), (CX - sgn * 12.0, 15.8), (CX - sgn * 14.2, 13.0)]
        p.capsule(pts, [1.85, 1.15, 0.35], "skin")
    out["race_elf_ears"] = p.to_image(soft=("skin",))

    p = Part()
    p.ellipse(CX, 25.0, 7.1, 6.0, "hair", clip=Y >= 22.2)
    p.capsule([(CX - 5.2, 25.2), (CX, 33.0), (CX + 5.2, 25.2)], [2.6, 1.3, 2.6], "hair")
    p.capsule([(27.6, 23.8), (CX, 22.6), (35.4, 23.8)], [1.25, 1.35, 1.25], "hair", bias=-1)
    hair_texture(p)
    out["race_dwarf_beard"] = p.to_image(soft=())

    ears = {
        "cat": [(23.6, 12.0), (24.6, 4.4), (29.2, 9.6)],
        "fox": [(23.0, 12.2), (23.2, 2.6), (29.6, 9.4)],
        "wolf": [(23.8, 11.8), (26.0, 3.4), (29.0, 10.2)],
    }
    for n, tri in ears.items():
        p = Part()
        for t in (tri, mirror_pts(tri)):
            p.poly(t, "hair")
            cxm = sum(x for x, _ in t) / 3
            cym = sum(y for _, y in t) / 3
            inner = [(cxm + (x - cxm) * 0.5, cym + (y - cym) * 0.5 + 0.45) for x, y in t]
            p.poly(inner, "inner_ear", flat=0.5)
        hair_texture(p)
        out["race_beast_ears_" + n] = p.to_image(soft=())

    tails = {
        "cat": ([(37.4, 43.2), (43.0, 42.6), (46.8, 38.8), (48.4, 33.4), (47.6, 28.2)], [1.5, 1.4, 1.3, 1.15, 1.0], None),
        "fox": ([(37.4, 43.2), (43.6, 43.8), (48.2, 40.0), (50.0, 34.4), (49.0, 29.2)], [1.8, 3.2, 3.7, 3.2, 2.0], 32.8),
        "wolf": ([(37.4, 43.2), (43.6, 44.2), (48.2, 40.6), (50.2, 35.6), (49.8, 31.4)], [1.6, 2.7, 2.9, 2.4, 1.35], None),
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
        p.capsule([(CX - sgn * 5.0, 10.2), (CX - sgn * 6.0, 6.4), (CX - sgn * 4.8, 3.8)], [1.6, 1.05, 0.35], "horn")
    out["race_demon_horns_small"] = p.to_image(glossy=("horn",))
    p = Part()
    for sgn in (1, -1):
        p.capsule([(CX - sgn * 6.0, 10.6), (CX - sgn * 9.4, 8.6), (CX - sgn * 11.8, 11.4), (CX - sgn * 11.0, 14.6), (CX - sgn * 8.8, 15.2)],
                  [1.75, 1.65, 1.45, 1.05, 0.5], "horn")
    out["race_demon_horns_ram"] = p.to_image(glossy=("horn",))
    p = Part()
    p.capsule([(37.4, 43.2), (43.6, 44.8), (47.6, 41.2), (49.2, 35.2), (48.8, 31.4)], [1.05, 1.05, 0.9, 0.8, 0.65], "skin", bias=1)
    p.poly([(48.8, 26.2), (51.6, 30.8), (48.8, 32.8), (46.0, 30.8)], "skin", bias=1)
    out["race_demon_tail"] = p.to_image(soft=())
    return out


# =================================================================== ACCESSORIES & HATS (64x64)
def build_accessories(ascii_parts):
    out = {}
    out["acc_glasses"] = ascii_parts["acc_glasses"]
    out["acc_eyepatch"] = ascii_parts["acc_eyepatch"]
    out["acc_flower"] = ascii_parts["acc_flower"]

    p = Part()
    p.capsule([(24.4, 29.2), (CX, 31.0), (38.6, 29.2)], [2.1, 2.35, 2.1], "trim")
    p.capsule([(35.6, 30.8), (37.0, 35.6), (36.4, 40.0)], [1.6, 1.5, 1.05], "trim", bias=1)
    out["acc_scarf"] = p.to_image()

    p = Part()
    p.poly([(23.6, 28.6), (39.4, 28.6), (44.0, 58.6), (19.0, 58.6)], "trim")
    p.poly([(23.6, 28.6), (39.4, 28.6), (44.0, 58.6), (19.0, 58.6)], "trim", bias=1, clip=Y >= 57.0)
    out["acc_cape"] = p.to_image()
    p = Part()
    for sx in (25.0, 2 * CX - 25.0):
        p.ellipse(sx, 29.8, 1.3, 1.3, "gold")
    out["acc_cape_front"] = p.to_image(glossy=("gold",))

    p = Part()
    for sgn in (1, -1):
        for (cx, cy, rx, ry, rot) in [(20.2, 31.4, 5.8, 3.2, -0.55), (18.6, 35.4, 5.0, 2.7, -0.3), (19.6, 38.6, 3.5, 2.0, -0.1)]:
            x = cx if sgn > 0 else 2 * CX - cx
            p.ellipse(x, cy, rx, ry, "cloth_white", rot=rot * sgn)
    out["acc_wings"] = p.to_image()
    return out


def build_hats():
    SH.FIXED.update({"hat_purple": (112, 64, 176), "hat_red": (206, 52, 52), "hat_green": (78, 120, 74), "gem": (220, 40, 60)})
    out = {}
    # 1 witch hat
    p = Part()
    p.poly([(24.2, 11.0), (38.8, 11.0), (35.2, 3.8), (38.4, 0.6), (32.0, 1.6)], "hat_purple")
    p.poly([(25.0, 8.6), (38.0, 8.6), (38.4, 10.6), (24.6, 10.6)], "gold", flat=0.3)
    p.ellipse(CX, 11.4, 12.6, 2.4, "hat_purple")
    out["hat_1"] = p.to_image(glossy=("gold",))
    # 2 small crown
    p = Part()
    p.poly([(25.4, 10.0), (37.6, 10.0), (37.8, 4.4), (35.4, 7.2), (33.6, 3.0), (CX, 6.4), (29.4, 3.0), (27.6, 7.2), (25.2, 4.4)], "gold")
    p.ellipse(CX, 8.2, 1.2, 1.2, "gem")
    out["hat_2"] = p.to_image(glossy=("gold", "gem"))
    # 3 headband with ties
    p = Part()
    p.capsule([(39.4, 12.2), (43.0, 14.4), (44.6, 18.6)], [1.2, 1.05, 0.75], "hat_red", bias=1)
    p.capsule([(39.4, 12.4), (44.0, 13.2), (46.6, 15.8)], [1.1, 1.0, 0.65], "hat_red", bias=1)
    p.ellipse(CX, 14.8, 9.3, 8.1, "hat_red", clip=(Y >= 10.8) & (Y <= 13.4))
    out["hat_3"] = p.to_image()
    # 4 travel hood
    p = Part()
    p.poly([(22.2, 22.4), (40.8, 22.4), (42.2, 30.0), (20.8, 30.0)], "hat_green", bias=1)
    p.ellipse(CX, 15.8, 10.4, 10.2, "hat_green")
    p.erase(ellipse_mask(CX, 19.2, 7.5, 7.8) & (Y >= 12.0))
    out["hat_4"] = p.to_image()
    # 5 steel helmet with plume
    p = Part()
    p.capsule([(CX, 5.4), (CX + 2.6, 2.2), (CX + 5.8, 2.4)], [1.65, 1.45, 0.85], "hat_red")
    p.ellipse(CX, 14.6, 9.9, 8.6, "steel", clip=Y <= 15.8)
    p.poly([(21.2, 14.2), (41.8, 14.2), (41.8, 16.0), (21.2, 16.0)], "steel", bias=1)
    p.poly([(30.6, 15.0), (32.4, 15.0), (32.2, 20.0), (30.8, 20.0)], "steel")
    out["hat_5"] = p.to_image(glossy=("steel",))
    # dragon crown (unlock)
    p = Part()
    for sgn in (1, -1):
        p.capsule([(CX - sgn * 6.4, 8.8), (CX - sgn * 8.6, 3.8), (CX - sgn * 8.0, 1.0)], [1.3, 0.9, 0.35], "horn")
    p.poly([(24.6, 11.0), (38.4, 11.0), (38.6, 4.4), (36.0, 7.4), (34.2, 2.4), (CX, 6.0), (28.8, 2.4), (27.0, 7.4), (24.4, 4.4)], "gold")
    p.ellipse(CX, 8.6, 1.55, 1.45, "gem")
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
