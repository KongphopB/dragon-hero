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


def arm_pose(frame):
    """Arm swing offsets opposite to leg stride: (left_dx, left_dy, left_bias, right_dx, right_dy, right_bias)."""
    return {
        "":    (0.0,  0.0, 0,  0.0,  0.0, 0),
        "_s1": (0.8,  1.3, 1,  0.9, -2.0, 0),   # left leg forward -> left arm back, right arm forward/up
        "_s2": (-0.9, -2.0, 0, -0.8,  1.3, 1),  # right leg forward -> left arm forward/up, right arm back
    }[frame]


def build_body():
    out = {}
    for frame in ("", "_s1", "_s2"):
        ldx, ldy, lb, rdx, rdy, rb = arm_pose(frame)
        p = Part()
        for ex in (22.6, 2 * CX - 22.6):                           # neat small ears peeking at sides
            p.ellipse(ex, 18.6, 1.4, 2.1, "skin")
        p.poly([(29.4, 24.8), (33.6, 24.8), (33.8, 30.2), (29.2, 30.2)], "skin", bias=1)  # slim neck
        p.ellipse(*HEAD, "skin")
        p.ellipse(CX, 20.4, 7.1, 6.9, "skin", clip=Y > 18.0)       # gentle Stardew jawline taper
        p.ellipse(22.4 + ldx, 39.6 + ldy, 1.9, 2.0, "skin", bias=lb)
        p.ellipse(2 * CX - 22.4 + rdx, 39.6 + rdy, 1.9, 2.0, "skin", bias=rb)
        body = p.to_image(soft=("skin",))
        shadow = Image.new("RGBA", (HR.N, HR.N), (0, 0, 0, 0))
        for y in range(56, 62):
            for x in range(HR.N):
                if ((x + 0.5 - CX) / 8.4) ** 2 + ((y + 0.5 - 59.2) / 1.7) ** 2 <= 1:
                    shadow.putpixel((x, y), (0, 0, 0, 88))
        shadow.alpha_composite(body)
        out["body" + frame] = shadow
        out["body_back" + frame] = shadow
    return out


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


def hair_texture(p, top=7.0, part_x=CX, is_back=False, curly=False):
    hm = p.mat == p._mid("hair")
    if curly:
        base_v = 0.58 + 0.18 * (1.0 - np.clip((Y - 6.0) / 22.0, 0, 1)) - 0.14 * np.clip(np.abs(X - CX) / 13.0, 0, 1)
        fluff = 0.055 * np.sin(X * 1.4) * np.cos(Y * 1.4)
        p.val = np.where(hm, base_v + fluff, p.val)
        return
    if is_back:
        # Flatten the spherical "bowling-ball glare" dot into natural hair shading + strand grooves
        base_v = 0.62 + 0.16 * (1.0 - np.clip((Y - 8.0) / 26.0, 0, 1)) - 0.14 * np.clip(np.abs(X - CX) / 11.0, 0, 1)
        p.val = np.where(hm, base_v, p.val)
        # Distinct vertical/curved strand grooves from crown down the back of head
        ang = (X - part_x) / (0.65 + 0.04 * np.maximum(0, Y - 10.0))
        strands = np.cos(ang * 2.15) * 0.085
        p.val += hm * strands * np.clip((Y - 9.0) / 7.0, 0.2, 1.0)
        # Crisp curved Stardew crown shine arc across the upper-back hair
        arc_y = 11.6 + 0.045 * (X - CX) ** 2
        shine = np.abs(Y - arc_y) <= 1.15
        part_gap = np.abs(X - part_x) > 0.9
        p.val += hm * shine * part_gap * 0.24
        # Soft darker depth near bottom hairline/nape/hem
        p.val -= hm * np.clip((Y - 21.0) / 14.0, 0, 0.14)
        return
    # Front hair: gentle downward strand flow + curved crown highlight
    flow = np.sin((X - part_x) * 1.15) * (0.042 * np.clip((Y - 11.0) / 10.0, 0, 1))
    p.val += hm * flow
    sheen = (
        ellipse_mask(CX - 0.5, 12.6, 8.2, 5.2)
        & ~ellipse_mask(CX - 0.3, 13.5, 7.1, 4.3)
        & (Y < 13.0)
        & (np.abs(X - part_x) > 1.1)
    )
    bias_side = np.where(X <= CX, 0.24, 0.14)
    p.val += hm * sheen * bias_side


def back_head_cap(p, nape_y=23.6, rx=9.4, feathered=True, part_line=False):
    """Layered back-of-head hair dome with natural nape taper so neck & ear sides read cleanly."""
    p.ellipse(CX, 15.2, rx, 8.8, "hair")
    # Curve lower nape inward above the neck (instead of a giant lower ball!)
    if feathered:
        for lx, tip_y in [(24.4, nape_y - 0.6), (26.6, nape_y + 0.8), (29.0, nape_y + 1.2),
                          (CX, nape_y + 1.4), (34.0, nape_y + 1.2), (36.4, nape_y + 0.8), (38.6, nape_y - 0.6)]:
            p.capsule([(lx, 17.5), (lx + (CX - lx) * 0.08, tip_y)], [2.1, 0.55], "hair")
    else:
        p.ellipse(CX, 18.8, rx - 0.3, max(4.2, nape_y - 16.5), "hair")
    if part_line:
        # Crisp subtle back parting crease along part line
        p.bias = np.where((p.mat == p._mid("hair")) & (np.abs(X - CX) <= 0.55) & (Y <= nape_y), 1, p.bias)


HAIR = {}


def style(name):
    def deco(fn):
        HAIR[name] = fn
        return fn
    return deco


@style("short")
def _short(p, pb, back):
    if back:
        back_head_cap(p, nape_y=23.4, rx=9.2, feathered=True)
        return 29.2
    stardew_crown(p, cy=13.5, rx=9.4, ry=7.1, part=29.2, part_w=2.3, arch=2.8, brow_y=14.3, side_y=19.8)
    bang_lock(p, 29.0, 11.4, 26.4, 15.2, 1.35, 0.35)
    bang_lock(p, 31.4, 11.4, 30.8, 15.6, 1.25, 0.3)
    bang_lock(p, 34.4, 11.4, 36.4, 15.0, 1.35, 0.35)
    return 29.2


@style("messy")
def _messy(p, pb, back):
    if back:
        back_head_cap(p, nape_y=24.0, rx=9.5, feathered=True)
    else:
        stardew_crown(p, cy=13.6, rx=9.7, ry=7.3, part=30.0, part_w=2.2, arch=2.0, brow_y=14.2, side_y=20.8)
    for x0, y0, x1, y1 in [
        (24.2, 10.8, 21.4, 8.6), (27.4, 8.8, 25.6, 6.4),
        (31.8, 8.2, 32.8, 5.8), (35.8, 9.0, 38.4, 6.8), (38.8, 11.4, 41.6, 9.2)
    ]:
        bang_lock(p, x0, y0, x1, y1, 2.2, 0.55)
    if back:
        p.capsule([(23.2, 19.6), (21.6, 24.4)], [1.7, 0.45], "hair")
        p.capsule([(39.8, 19.6), (41.4, 24.4)], [1.7, 0.45], "hair")
        return 30.0
    for bx, tipx, ty in [(26.0, 24.8, 15.6), (29.2, 29.8, 15.6), (31.6, 31.2, 16.4), (34.4, 33.8, 15.6), (37.4, 38.4, 15.6)]:
        bang_lock(p, bx, 11.4, tipx, ty, 1.4, 0.3)
    pb.capsule([(23.2, 19.6), (21.6, 23.6)], [1.7, 0.5], "hair")
    pb.capsule([(39.8, 19.6), (41.4, 23.6)], [1.7, 0.5], "hair")
    return 30.0


@style("bob")
def _bob(p, pb, back):
    if back:
        back_head_cap(p, nape_y=26.6, rx=10.1, feathered=False, part_line=True)
        p.capsule([(22.2, 16.0), (21.6, 23.2), (24.4, 26.8)], [2.2, 2.4, 1.0], "hair")
        p.capsule([(40.8, 16.0), (41.4, 23.2), (38.6, 26.8)], [2.2, 2.4, 1.0], "hair")
        return CX
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
    if back:
        back_head_cap(p, nape_y=23.6, rx=9.4, feathered=True)
        p.ellipse(CX, 14.0, 9.65, 8.2, "trim", clip=(Y >= 10.6) & (Y <= 13.0))
        return 29.8
    stardew_crown(p, cy=13.2, rx=9.6, ry=7.4, part=29.8, part_w=2.3, arch=2.0, brow_y=14.4, side_y=20.4)
    p.ellipse(CX, 13.8, 9.75, 7.9, "trim", clip=(Y >= 10.4) & (Y <= 12.6))
    for bx, tipx, ty in [(27.6, 26.2, 15.4), (30.4, 30.8, 16.0), (33.4, 34.4, 15.6), (36.4, 37.8, 15.2)]:
        bang_lock(p, bx, 12.4, tipx, ty, 1.35, 0.3)
    return 29.8


@style("side")
def _side(p, pb, back):
    if back:
        back_head_cap(p, nape_y=23.4, rx=9.2, feathered=True)
        return 26.4
    stardew_crown(p, cy=13.4, rx=9.5, ry=7.3, part=26.4, part_w=2.0, arch=3.2, brow_y=14.2, side_y=19.6)
    p.capsule([(26.8, 10.2), (32.4, 11.6), (37.8, 14.2), (40.2, 18.8), (39.6, 22.0)], [2.2, 2.4, 2.2, 1.6, 0.55], "hair")
    bang_lock(p, 25.4, 11.6, 23.0, 17.6, 1.4, 0.4)
    return 26.4


@style("shaggy")
def _shaggy(p, pb, back):
    if back:
        back_head_cap(p, nape_y=26.2, rx=9.6, feathered=True)
        for sx, dx in [(23.2, -4.4), (26.2, -3.4), (29.2, -1.5), (33.8, 1.5), (36.8, 3.4), (39.8, 4.4)]:
            p.capsule([(sx, 20.4), (sx + dx, 30.4)], [2.1, 0.45], "hair")
        return 30.4
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
    if back:
        p.poly([
            (22.0, 13.0), (CX, 8.2), (41.0, 13.0), (42.8, 26.0),
            (43.0, 39.4), (37.4, 42.4), (CX, 41.0), (25.6, 42.4), (20.0, 39.4), (20.2, 26.0)
        ], "hair")
        p.ellipse(CX, 14.2, 9.8, 7.6, "hair")
        return CX
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
    if back:
        back_head_cap(p, nape_y=22.6, rx=9.2, feathered=True)
        p.capsule([(CX, 13.4), (CX - 0.8, 20.6), (CX + 0.5, 28.4), (CX, 35.8)], [2.4, 3.4, 2.7, 0.9], "hair")
        p.ellipse(CX, 12.8, 2.2, 1.55, "trim")
        return CX
    stardew_crown(p, cy=13.4, rx=9.4, ry=7.2, part=CX, part_w=2.4, arch=3.6, brow_y=14.2, side_y=19.8)
    bang_lock(p, 23.0, 15.6, 22.4, 22.0, 1.15, 0.35)
    bang_lock(p, 40.0, 15.6, 40.6, 22.0, 1.15, 0.35)
    pb.capsule([(38.8, 11.2), (43.2, 14.8), (45.2, 21.4), (44.4, 28.4), (42.2, 35.0)], [2.1, 2.9, 2.8, 2.1, 0.7], "hair")
    p.ellipse(39.4, 11.2, 1.75, 1.55, "trim")
    return CX


@style("twintails")
def _twintails(p, pb, back):
    if back:
        back_head_cap(p, nape_y=22.8, rx=9.3, feathered=True, part_line=True)
        for sgn in (1, -1):
            bx = CX - sgn * 9.2
            p.capsule([
                (bx, 14.0), (bx - sgn * 2.2, 20.6),
                (bx - sgn * 2.8, 28.8), (bx - sgn * 2.0, 36.8), (bx - sgn * 0.8, 39.2)
            ], [2.0, 2.7, 2.6, 1.6, 0.5], "hair")
            p.ellipse(bx - sgn * 0.2, 13.8, 1.65, 1.45, "trim")
        return CX
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
    if back:
        back_head_cap(p, nape_y=22.2, rx=9.2, feathered=True)
        p.ellipse(CX, 6.4, 4.4, 3.6, "hair")
        p.ellipse(CX, 9.2, 3.2, 0.9, "trim")
        return CX
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
    if back:
        for tri in spikes:
            p.poly(tri, "hair")
        back_head_cap(p, nape_y=23.6, rx=9.3, feathered=True)
        p.capsule([(23.0, 19.6), (20.4, 22.8)], [1.6, 0.4], "hair")
        p.capsule([(40.0, 19.6), (42.6, 22.8)], [1.6, 0.4], "hair")
        return CX
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
    if back:
        back_head_cap(p, nape_y=24.4, rx=9.5, feathered=True)
        return 25.8
    stardew_crown(p, cy=13.5, rx=9.6, ry=7.4, part=25.8, part_w=2.0, arch=3.0, brow_y=14.0, side_y=20.4)
    p.capsule([(25.8, 10.4), (32.2, 12.6), (36.6, 16.4), (38.4, 20.8)], [2.5, 2.7, 2.3, 0.55], "hair")
    bang_lock(p, 24.6, 12.2, 22.8, 19.2, 1.5, 0.4)
    pb.ellipse(CX, 20.0, 9.6, 6.8, "hair")
    return 25.8


@style("curly")
def _curly(p, pb, back):
    for cx, cy, r in [
        (24.0, 9.8, 3.4), (27.6, 7.6, 3.6), (31.5, 7.0, 3.7), (35.4, 7.6, 3.6), (39.0, 9.8, 3.4),
        (21.6, 13.8, 3.2), (41.4, 13.8, 3.2), (21.6, 18.6, 2.9), (41.4, 18.6, 2.9),
        (22.6, 22.8, 2.6), (40.4, 22.8, 2.6),
    ]:
        p.ellipse(cx, cy, r, r, "hair")
    if back:
        p.ellipse(CX, 16.4, 10.2, 8.8, "hair")
        for cx, cy, r in [(24.6, 25.2, 3.0), (28.2, 26.8, 3.0), (CX, 27.2, 3.2), (34.8, 26.8, 3.0), (38.4, 25.2, 3.0),
                          (27.0, 15.0, 2.8), (36.0, 15.0, 2.8), (CX, 19.6, 3.1)]:
            p.ellipse(cx, cy, r, r, "hair")
        return CX
    stardew_crown(p, cy=14.0, rx=9.8, ry=7.6, part=CX, part_w=2.2, arch=3.0, brow_y=14.6, side_y=21.2)
    bang_lock(p, 28.4, 11.8, 26.2, 15.6, 1.4, 0.5)
    bang_lock(p, 34.6, 11.8, 36.8, 15.6, 1.4, 0.5)
    for cx, cy, r in [(22.4, 23.8, 3.2), (25.6, 26.2, 3.0), (37.4, 26.2, 3.0), (40.6, 23.8, 3.2), (CX, 25.8, 4.0)]:
        pb.ellipse(cx, cy, r, r, "hair")
    return CX


@style("afro")
def _afro(p, pb, back):
    for ang in np.linspace(np.pi * 0.92, np.pi * 2.08, 15):
        p.ellipse(CX + 11.0 * np.cos(ang), 13.0 + 9.2 * np.sin(ang), 2.8, 2.7, "hair")
    p.ellipse(CX, 13.0, 12.2, 10.2, "hair")
    if back:
        p.ellipse(CX, 16.8, 11.8, 9.6, "hair")
        for cx, cy, r in [(23.0, 22.8, 3.2), (27.4, 24.8, 3.1), (CX, 25.2, 3.2), (35.6, 24.8, 3.1), (40.0, 22.8, 3.2)]:
            p.ellipse(cx, cy, r, r, "hair")
        return CX
    part_bump = 2.0 * np.exp(-((X - CX) / 2.4) ** 2)
    p.erase(ellipse_mask(CX, 19.2, 7.6, 8.2) & (Y >= (13.8 - part_bump)))
    pb.ellipse(CX, 16.8, 12.0, 9.8, "hair")
    return CX


@style("mohawk")
def _mohawk(p, pb, back):
    if back:
        p.ellipse(CX, 14.6, 8.3, 6.8, "hair", bias=1)
        p.poly([(24.2, 16.0), (38.8, 16.0), (36.8, 22.4), (26.2, 22.4)], "hair", bias=1)
        p.capsule([(CX, 22.8), (CX, 3.0)], [2.7, 1.2], "hair")
        p.capsule([(CX, 9.4), (CX + 0.5, 1.4)], [2.0, 0.7], "hair")
        return CX
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
    if back:
        back_head_cap(p, nape_y=23.2, rx=9.4, feathered=True, part_line=True)
        bx_base = CX
        for i in range(7):
            yy = 16.8 + i * 2.8
            w = 2.05 - i * 0.14
            p.capsule([(bx_base - 1.2, yy), (bx_base + 0.5, yy + 1.3)], [w * 0.8, w * 0.7], "hair")
            p.capsule([(bx_base + 1.2, yy + 0.8), (bx_base - 0.5, yy + 2.1)], [w * 0.8, w * 0.7], "hair")
        p.ellipse(bx_base, 36.8, 1.5, 1.1, "trim")
        p.capsule([(bx_base, 37.6), (bx_base - 0.3, 40.8), (bx_base + 0.3, 42.0)], [1.15, 0.75, 0.3], "hair")
        return CX
    stardew_crown(p, cy=13.8, rx=9.6, ry=7.4, part=28.0, part_w=2.2, arch=3.4, brow_y=14.4, side_y=20.6)
    p.capsule([(28.2, 11.0), (34.0, 12.6), (39.0, 15.8)], [2.0, 2.1, 1.6], "hair")
    bang_lock(p, 26.2, 11.4, 23.0, 18.6, 1.5, 0.45)
    pb.ellipse(CX, 20.6, 9.8, 7.0, "hair")
    bx_base = 39.2
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
    if back:
        p.ellipse(CX, 14.4, 9.8, 7.6, "hair")
        p.poly([(22.2, 15.0), (40.8, 15.0), (41.8, 40.6), (21.2, 40.6)], "hair")
        for sgn in (1, -1):
            bx = CX - sgn * 8.2
            p.capsule([
                (bx, 16.0), (bx - sgn * 2.8, 22.8), (bx - sgn * 1.4, 29.4),
                (bx - sgn * 3.0, 35.8), (bx - sgn * 1.4, 41.8)
            ], [3.2, 3.6, 3.4, 3.1, 1.6], "hair")
        return CX
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
    if back:
        p.poly([(21.4, 13.8), (CX, 8.2), (41.6, 13.8), (42.8, 41.2), (20.2, 41.2)], "hair")
        p.ellipse(CX, 14.2, 9.8, 7.6, "hair")
        return CX
    # Classic Hime: neat blunt brow fringe with soft parting notch + cheek sidelocks + straight back cascade!
    stardew_crown(p, cy=13.8, rx=9.8, ry=7.5, part=CX, part_w=0.9, arch=0.5, brow_y=14.1, side_y=20.0)
    p.poly([(24.2, 10.2), (38.8, 10.2), (39.0, 13.9), (24.0, 13.9)], "hair")
    for sx in (22.7, 2 * CX - 22.7):
        p.poly([(sx - 1.5, 13.6), (sx + 1.5, 13.6), (sx + 1.3, 25.8), (sx - 1.3, 25.8)], "hair")
    pb.poly([(21.4, 15.2), (41.6, 15.2), (42.8, 41.2), (20.2, 41.2)], "hair")
    return CX


@style("pixie")
def _pixie(p, pb, back):
    if back:
        back_head_cap(p, nape_y=22.4, rx=8.9, feathered=True)
        return 27.2
    stardew_crown(p, cy=13.2, rx=9.1, ry=7.0, part=27.2, part_w=2.0, arch=2.4, brow_y=14.2, side_y=18.2)
    bang_lock(p, 27.6, 11.0, 31.2, 14.6, 1.4, 0.35)
    bang_lock(p, 30.6, 11.2, 34.4, 14.8, 1.35, 0.3)
    bang_lock(p, 33.8, 11.4, 37.6, 14.6, 1.25, 0.3)
    bang_lock(p, 23.0, 14.0, 22.0, 20.0, 1.15, 0.35)
    return 27.2


@style("drills")
def _drills(p, pb, back):
    if back:
        back_head_cap(p, nape_y=23.2, rx=9.4, feathered=True, part_line=True)
        for sgn in (1, -1):
            bx = CX - sgn * 9.8
            for i in range(4):
                y0 = 16.8 + i * 4.4
                rx = 3.2 - i * 0.42
                p.capsule([(bx - sgn * 1.4, y0), (bx + sgn * 1.2, y0 + 2.8)], [rx, rx * 0.85], "hair", bias=i % 2)
            p.capsule([(bx, 33.6), (bx - sgn * 0.6, 38.4)], [1.8, 0.35], "hair")
            p.ellipse(CX - sgn * 9.0, 13.6, 1.75, 1.35, "trim", rot=0.35 * sgn)
        return CX
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
                hair_texture(p, part_x=part_x, is_back=True, curly=(name == "afro"))
                out["hair_" + name + "_back"] = p.to_image(soft=())
            else:
                hair_texture(p, part_x=part_x, curly=(name == "afro"))
                im = p.to_image(soft=())
                SH.cast_shadow(im, FACE, alpha=45)
                out["hair_" + name] = im
                if np.any(pb.mat >= 0):
                    behind_shadow(pb)
                    hair_texture(pb, part_x=part_x, curly=(name == "afro"))
                    out["hair_" + name + "_behind"] = pb.to_image(soft=())
    return out


# =================================================================== OUTFITS (64x64 Slim Stardew RPG!)
def legs(p, mat_pants, mat_boot, frame, boot_top=50.4, tall=False):
    # Stride kinematics: (left_dx, left_dy, left_bias, right_dx, right_dy, right_bias)
    ldx, dl, lb, rdx, dr, rb = {
        "":    (0.0,  0.0, 0, 0.0,  0.0, 0),
        "_s1": (-0.9, -3.5, 0, 0.8, 1.4, 1),   # left leg steps forward & bends up; right trails back
        "_s2": (-0.8,  1.4, 1, 0.9, -3.5, 0),  # right leg steps forward & bends up; left trails back
    }[frame]
    specs = ((27.6, ldx, dl, lb, -1.0), (2 * CX - 27.6, rdx, dr, rb, 1.0))
    for lx, dx, d, b, toe_dir in specs:
        p.capsule([(lx, 40.4), (lx + dx * 0.7, 51.4 + d)], [2.4, 2.0], mat_pants, bias=b)
    for lx, dx, d, b, toe_dir in specs:
        top = (46.8 if tall else boot_top) + d
        foot_x = lx + dx
        flare = 0.35 * toe_dir if d < -1.0 else 0.0
        p.poly([
            (foot_x - 2.25, top), (foot_x + 2.25, top),
            (foot_x + 2.55 + flare, 58.6 + d), (foot_x - 2.65 + flare, 58.6 + d)
        ], mat_boot, bias=b)


def torso(p, mat, top=29.2, bottom=41.6):
    # Slim Stardew torso: 14.2px shoulders tapering gracefully to 12.2px waist!
    p.poly([
        (24.4, top), (38.6, top), (38.8, 33.6), (37.6, 37.8),
        (38.0, bottom), (25.0, bottom), (25.4, 37.8), (24.2, 33.6)
    ], mat)
    for sx in (24.9, 2 * CX - 24.9):
        p.ellipse(sx, 31.2, 2.5, 2.1, mat)


def sleeves(p, mat, bias=0, bell=False, frame=""):
    ldx, ldy, lb, rdx, rdy, rb = arm_pose(frame)
    for sgn, dx, dy, ab in ((1, ldx, ldy, lb), (-1, rdx, rdy, rb)):
        a = (CX - sgn * 7.2, 31.0)
        b = (CX - sgn * 9.0 + dx, 37.4 + dy)
        p.capsule([a, b], [2.2, 2.9 if bell else 1.85], mat, bias=bias + ab)


def belt(p, mat="belt", buckle="trim", y0=37.6, y1=39.5):
    p.poly([(25.0, y0), (38.0, y0), (38.0, y1), (25.0, y1)], mat, flat=0.4)
    if buckle:
        p.ellipse(CX, (y0 + y1) / 2, 1.5, 1.25, buckle)


def outfit_tunic(p, frame):
    legs(p, "pants", "boot", frame)
    sleeves(p, "main", frame=frame)
    torso(p, "main")
    p.poly([(25.0, 38.4), (38.0, 38.4), (39.0, 44.6), (24.0, 44.6)], "main", bias=0)
    p.poly([(28.6, 29.2), (34.4, 29.2), (CX, 33.4)], "trim")
    belt(p)


def outfit_knight(p, frame):
    legs(p, "pants_steel", "steel", frame)
    sleeves(p, "steel", bias=1, frame=frame)
    torso(p, "steel")
    p.poly([(28.8, 30.8), (34.2, 30.8), (34.8, 45.4), (CX, 47.0), (28.2, 45.4)], "main")
    for sx in (24.2, 2 * CX - 24.2):
        p.ellipse(sx, 31.0, 3.2, 2.6, "steel")
    belt(p, buckle="gold")


def outfit_archer(p, frame):
    legs(p, "pants_leather", "leather", frame, tall=True)
    sleeves(p, "main", frame=frame)
    torso(p, "main")
    p.poly([(24.4, 29.4), (29.0, 29.4), (29.8, 41.6), (25.0, 41.6), (24.2, 33.6)], "leather")
    p.poly(mirror_pts([(24.4, 29.4), (29.0, 29.4), (29.8, 41.6), (25.0, 41.6), (24.2, 33.6)]), "leather")
    p.capsule([(25.6, 29.8), (37.4, 40.8)], [0.9, 0.9], "trim")
    belt(p, buckle="gold")


def outfit_ninja(p, frame):
    legs(p, "pants_ninja", "charcoal", frame)
    for lx, dx, dl in ((27.6, -0.6 if frame == "_s1" else (-0.5 if frame == "_s2" else 0), -3.5 if frame == "_s1" else (1.4 if frame == "_s2" else 0)),
                       (2 * CX - 27.6, 0.5 if frame == "_s1" else (0.6 if frame == "_s2" else 0), 1.4 if frame == "_s1" else (-3.5 if frame == "_s2" else 0))):
        p.ellipse(lx + dx, 48.2 + dl * 0.7, 2.35, 1.0, "trim")
    sleeves(p, "main", frame=frame)
    torso(p, "main")
    p.poly([(27.0, 29.2), (CX, 35.0), (36.0, 29.2), (34.2, 29.2), (CX, 32.8), (28.8, 29.2)], "main", bias=1)
    p.poly([(29.2, 29.2), (33.8, 29.2), (CX, 32.4)], "charcoal")
    belt(p, mat="trim", buckle=None, y0=37.0, y1=39.8)
    p.capsule([(35.6, 39.4), (37.2, 44.6)], [1.1, 0.85], "trim", bias=1)
    p.capsule([(36.6, 39.0), (39.0, 43.2)], [1.0, 0.75], "trim", bias=1)


def robe(p, mat, frame, hem="trim"):
    sway = {"": 0.0, "_s1": -1.8, "_s2": 1.8}[frame]
    fl = {"": 0.0, "_s1": 1.2, "_s2": 1.2}[frame]
    for (fx, d, b) in (
        (27.2, -1.6 if frame == "_s1" else (0.6 if frame == "_s2" else 0.0), 0 if frame == "_s1" else 1),
        (35.8, -1.6 if frame == "_s2" else (0.6 if frame == "_s1" else 0.0), 0 if frame == "_s2" else 1),
    ):
        p.ellipse(fx + sway * 0.5, 58.2 + d, 2.4, 1.4, "boot", bias=b)
    pts = [(24.4, 29.2), (38.6, 29.2), (38.8, 33.6), (37.8, 37.8), (41.4 + sway + fl, 57.6), (21.6 + sway - fl, 57.6), (25.2, 37.8), (24.2, 33.6)]
    p.poly(pts, mat)
    p.poly(pts, hem, clip=Y >= 55.4)
    sleeves(p, mat, bell=True, frame=frame)
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
    sway = {"": 0.0, "_s1": -1.5, "_s2": 1.5}[frame]
    for (fx, d, b) in (
        (27.2, -1.6 if frame == "_s1" else (0.6 if frame == "_s2" else 0.0), 0 if frame == "_s1" else 1),
        (35.8, -1.6 if frame == "_s2" else (0.6 if frame == "_s1" else 0.0), 0 if frame == "_s2" else 1),
    ):
        p.ellipse(fx + sway * 0.4, 58.2 + d, 2.4, 1.4, "charcoal", bias=b)
    hak = [(25.0, 39.0), (38.0, 39.0), (40.8 + sway, 57.2), (22.2 + sway, 57.2)]
    p.poly(hak, "trim")
    p.poly([(31.0, 39.6), (32.0, 39.6), (32.0 + sway, 57.2), (31.0 + sway, 57.2)], "trim", bias=1, flat=0.4)
    sleeves(p, "main", bell=True, frame=frame)
    torso(p, "main")
    p.poly([(27.4, 29.2), (CX, 35.6), (35.6, 29.2), (34.0, 29.2), (CX, 33.2), (29.0, 29.2)], "cloth_white")
    for sx in (24.0, 2 * CX - 24.0):
        p.poly([(sx - 2.8, 30.0), (sx + 2.6, 30.0), (sx + 2.8, 35.6), (sx - 3.0, 35.6)], "leather")
    belt(p, mat="main", buckle=None, y0=37.0, y1=39.6)


def outfit_pirate(p, frame):
    legs(p, "pants", "boot", frame, tall=True)
    sleeves(p, "main", frame=frame)
    torso(p, "main", bottom=41.8)
    sway = {"": 0.0, "_s1": -1.2, "_s2": 1.2}[frame]
    for sgn in (1, -1):
        p.poly([(CX - sgn * 7.0, 38.4), (CX - sgn * 1.9, 38.4), (CX - sgn * 2.4 + sway, 49.4), (CX - sgn * 7.8 + sway, 48.2)], "main", bias=1)
    p.poly([(28.8, 29.2), (34.2, 29.2), (33.0, 37.8), (30.0, 37.8)], "cloth_white")
    for sgn in (1, -1):
        p.poly([(CX - sgn * 2.4, 29.2), (CX - sgn * 4.8, 29.2), (CX - sgn * 3.0, 36.2)], "trim")
    belt(p, mat="belt", buckle="gold", y0=37.8, y1=40.0)
    for by in (31.8, 34.8):
        p.ellipse(27.6, by, 0.65, 0.65, "gold")
        p.ellipse(2 * CX - 27.6, by, 0.65, 0.65, "gold")


def outfit_bard(p, frame):
    legs(p, "pants_leather", "boot", frame)
    ldx, ldy, lb, rdx, rdy, rb = arm_pose(frame)
    p.ellipse(24.0 + ldx * 0.5, 32.0 + ldy * 0.4, 3.1, 2.9, "trim", bias=lb)
    p.ellipse(2 * CX - 24.0 + rdx * 0.5, 32.0 + rdy * 0.4, 3.1, 2.9, "trim", bias=rb)
    torso(p, "main")
    p.poly([(26.2, 29.8), (36.8, 29.8), (37.0, 41.2), (26.0, 41.2)], "main")
    p.poly([(29.2, 29.2), (33.8, 29.2), (32.8, 35.6), (30.2, 35.6)], "trim", bias=-1)
    p.ellipse(CX, 30.8, 2.5, 1.7, "cloth_white")
    p.ellipse(CX, 32.6, 1.9, 1.3, "cloth_white")
    belt(p, mat="belt", buckle="gold")


def outfit_rogue(p, frame):
    legs(p, "pants_ninja", "charcoal", frame)
    sleeves(p, "leather", bias=1, frame=frame)
    torso(p, "leather")
    p.capsule([(24.2, 30.8), (37.2, 40.2)], [0.85, 0.85], "belt")
    p.capsule([(38.8, 30.8), (25.8, 40.2)], [0.85, 0.85], "belt")
    p.poly([(22.8, 29.8), (40.2, 29.8), (41.0, 36.4), (CX, 38.4), (22.0, 36.4)], "main")
    p.capsule([(25.0, 30.0), (CX, 31.0), (38.0, 30.0)], [1.7, 1.95, 1.7], "main", bias=1)
    belt(p, mat="trim", buckle="gold")


def outfit_scholar(p, frame):
    legs(p, "pants", "boot", frame)
    sleeves(p, "main", frame=frame)
    sway = {"": 0.0, "_s1": -1.1, "_s2": 1.1}[frame]
    coat = [(24.4, 29.2), (38.6, 29.2), (38.8, 33.6), (40.0 + sway, 50.6), (23.0 + sway, 50.6), (24.2, 33.6)]
    p.poly(coat, "main")
    p.poly([(30.4, 30.6), (32.6, 30.6), (32.6 + sway * 0.6, 50.6), (30.4 + sway * 0.6, 50.6)], "main", bias=1, flat=0.3)
    p.poly([(28.2, 27.6), (34.8, 27.6), (34.4, 30.8), (28.6, 30.8)], "trim")
    for by in (33.0, 37.2, 41.4, 45.6):
        p.ellipse(CX, by, 0.65, 0.65, "gold")
    p.capsule([(25.8, 30.2), (37.0, 41.6)], [0.8, 0.8], "leather")
    p.poly([(35.6, 40.0), (40.2, 40.0), (40.2, 44.6), (35.6, 44.6)], "leather")


def student_top(p, frame=""):
    ldx, ldy, lb, rdx, rdy, rb = arm_pose(frame)
    for sgn, dx, dy, ab in ((1, ldx, ldy, lb), (-1, rdx, rdy, rb)):
        p.capsule([(CX - sgn * 7.6 + dx * 0.4, 33.4 + dy * 0.4), (CX - sgn * 8.8 + dx, 37.4 + dy)], [1.65, 1.5], "skin", bias=ab)
        p.capsule([(CX - sgn * 7.2, 30.8), (CX - sgn * 8.0 + dx * 0.4, 33.0 + dy * 0.4)], [2.2, 2.1], "cloth_white", bias=ab)
    torso(p, "cloth_white", bottom=40.0)
    p.poly([(28.4, 28.6), (34.6, 28.6), (CX, 32.0)], "cloth_white", bias=1)
    p.poly([(CX - 0.85, 31.0), (CX + 0.85, 31.0), (CX + 1.1, 35.4), (CX, 36.6), (CX - 1.1, 35.4)], "trim")
    p.ellipse(35.6, 32.8, 1.0, 1.0, "trim", bias=1)


def socks_shoes(p, frame):
    ldx, dl, lb, rdx, dr, rb = {
        "":    (0.0,  0.0, 0, 0.0,  0.0, 0),
        "_s1": (-0.9, -3.5, 0, 0.8, 1.4, 1),
        "_s2": (-0.8,  1.4, 1, 0.9, -3.5, 0),
    }[frame]
    for (lx, dx, d, b) in ((27.6, ldx, dl, lb), (2 * CX - 27.6, rdx, dr, rb)):
        p.capsule([(lx, 42.4), (lx + dx * 0.7, 50.6 + d)], [1.8, 1.7], "skin", bias=b)
        p.poly([(lx + dx - 1.85, 49.8 + d), (lx + dx + 1.85, 49.8 + d), (lx + dx + 1.85, 55.0 + d), (lx + dx - 1.85, 55.0 + d)], "cloth_white", bias=b)
        p.poly([(lx + dx - 2.2, 54.8 + d), (lx + dx + 2.35, 54.8 + d), (lx + dx + 2.55, 58.6 + d), (lx + dx - 2.55, 58.6 + d)], "charcoal", bias=b)


def outfit_student(p, frame):
    socks_shoes(p, frame)
    for lx in (27.6, 2 * CX - 27.6):
        p.poly([(lx - 2.8, 39.0), (lx + 2.8, 39.0), (lx + 2.8, 44.6), (lx - 2.8, 44.6)], "main")
    student_top(p, frame)
    belt(p, mat="charcoal", buckle="gold", y0=38.2, y1=40.0)


def outfit_student_skirt(p, frame):
    socks_shoes(p, frame)
    sway = {"": 0.0, "_s1": -1.3, "_s2": 1.3}[frame]
    p.poly([(25.0, 38.8), (38.0, 38.8), (40.4 + sway, 46.8), (22.6 + sway, 46.8)], "main")
    for px_ in (27.2, 29.8, 32.6, 35.4):
        p.poly([(px_, 40.0), (px_ + 0.65, 40.0), (px_ + 1.0 + sway, 46.4), (px_ + 0.35 + sway, 46.4)], "main", bias=1, flat=0.4)
    student_top(p, frame)


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

    # Customizable beards (work on every race, colour follows hair!)
    beards = {}
    p = Part()
    p.capsule([(27.2, 22.8), (29.8, 21.8), (CX, 22.3), (33.2, 21.8), (35.8, 22.8)], [0.65, 1.0, 0.85, 1.0, 0.65], "hair", bias=-1)
    hair_texture(p)
    beards["beard_mustache"] = p.to_image(soft=())

    p = Part()
    p.capsule([(29.4, 24.4), (CX, 29.0), (33.6, 24.4)], [1.1, 1.35, 1.1], "hair")
    p.capsule([(28.6, 22.2), (CX, 21.7), (34.4, 22.2)], [0.75, 0.85, 0.75], "hair", bias=-1)
    hair_texture(p)
    beards["beard_goatee"] = p.to_image(soft=())

    p = Part()
    p.ellipse(CX, 24.6, 7.0, 3.8, "hair", clip=(Y >= 22.2) & (Y <= 27.8))
    p.capsule([(28.0, 22.4), (CX, 21.7), (35.0, 22.4)], [0.95, 1.05, 0.95], "hair", bias=-1)
    hair_texture(p)
    beards["beard_short"] = p.to_image(soft=())

    p = Part()
    p.ellipse(CX, 25.0, 7.1, 6.0, "hair", clip=Y >= 22.2)
    p.capsule([(CX - 5.2, 25.2), (CX, 33.0), (CX + 5.2, 25.2)], [2.6, 1.3, 2.6], "hair")
    p.capsule([(27.6, 23.8), (CX, 22.6), (35.4, 23.8)], [1.25, 1.35, 1.25], "hair", bias=-1)
    hair_texture(p)
    beards["beard_full"] = p.to_image(soft=())
    out.update(beards)
    out["race_dwarf_beard"] = beards["beard_full"]

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


def build_weapons():
    SH.FIXED.update({
        "wood_oak": (148, 92, 46),
        "wood_dark": (72, 46, 44),
        "magic_cyan": (68, 212, 255),
        "shield_blue": (46, 108, 224),
        "sun_gold": (255, 224, 96),
        "ruby_gem": (224, 52, 76),
        "emerald_glow": (62, 214, 134),
        "amethyst": (158, 84, 232),
        "iron_dark": (84, 96, 118),
    })
    out = {}

    def add_pair(key, p_front, glossy_f, p_back=None, glossy_b=()):
        out[key] = p_front.to_image(glossy=glossy_f)
        out[key + "_back"] = p_back.to_image(glossy=glossy_b) if p_back is not None else Part().to_image()

    # ==================== 1. WARRIOR (4 weapons) ====================
    # 1a. sword: Broadsword + scabbard
    p = Part()
    p.poly([(40.6, 37.2), (50.8, 24.2), (53.8, 21.2), (52.2, 25.4), (42.8, 39.0)], "steel")
    p.capsule([(42.2, 37.0), (51.4, 24.8)], [0.45, 0.25], "cloth_white", flat=0.35)
    p.capsule([(38.8, 36.6), (41.6, 38.4), (44.0, 40.4)], [1.15, 1.45, 1.15], "gold")
    p.capsule([(39.0, 41.4), (41.4, 38.8)], [1.15, 1.15], "leather")
    p.ellipse(38.8, 41.8, 1.35, 1.35, "gold")
    pb = Part()
    pb.capsule([(23.2, 38.4), (18.6, 48.8)], [1.55, 1.05], "leather")
    pb.ellipse(18.5, 49.0, 1.05, 1.05, "gold")
    pb.ellipse(23.1, 38.6, 1.45, 0.9, "gold")
    add_pair("weapon_warrior_sword", p, ("steel", "gold"), pb, ("gold",))
    out["weapon_warrior"] = out["weapon_warrior_sword"]
    out["weapon_warrior_back"] = out["weapon_warrior_sword_back"]

    # 1b. axe: Heavy Viking Battle Axe
    p = Part()
    p.capsule([(38.6, 42.6), (48.4, 23.0)], [1.15, 1.2], "wood_dark")
    p.poly([(44.6, 25.2), (51.8, 20.6), (55.4, 26.2), (51.4, 33.0), (45.2, 29.6)], "steel")
    p.capsule([(52.0, 21.8), (54.4, 26.2), (51.2, 32.0)], [0.55, 0.7, 0.55], "cloth_white", flat=0.35)
    p.ellipse(47.0, 27.6, 1.5, 1.5, "gold")
    p.ellipse(38.4, 43.0, 1.2, 1.2, "gold")
    pb = Part()
    pb.capsule([(22.8, 37.8), (19.6, 47.4)], [1.4, 1.1], "leather")
    pb.ellipse(22.6, 38.0, 1.35, 1.0, "iron_dark")
    add_pair("weapon_warrior_axe", p, ("steel", "gold"), pb, ("iron_dark",))

    # 1c. katana: Sleek Curved Katana + dark saya sheath
    p = Part()
    p.capsule([(41.0, 38.0), (46.8, 29.6), (51.8, 23.8), (55.4, 19.6)], [1.15, 1.1, 0.95, 0.4], "steel")
    p.capsule([(42.2, 36.8), (50.8, 25.4)], [0.35, 0.2], "cloth_white", flat=0.4)
    p.ellipse(40.8, 38.2, 2.0, 1.15, "gold", rot=0.65)
    p.capsule([(38.4, 41.8), (40.8, 38.6)], [1.0, 1.0], "hat_red")
    p.ellipse(38.2, 42.0, 1.05, 1.05, "gold")
    pb = Part()
    pb.capsule([(24.2, 39.2), (16.4, 46.8)], [1.25, 0.95], "charcoal")
    pb.ellipse(23.8, 39.6, 1.2, 1.0, "gold")
    add_pair("weapon_warrior_katana", p, ("steel", "gold"), pb, ("gold",))

    # 1d. greatsword: Crimson & Obsidian Greatsword
    p = Part()
    p.poly([(40.4, 36.8), (50.6, 19.8), (54.8, 16.2), (53.2, 22.0), (43.4, 38.8)], "iron_dark")
    p.capsule([(42.2, 36.6), (52.4, 19.6)], [0.7, 0.45], "ruby_gem", flat=0.3)
    p.poly([(37.4, 34.8), (42.2, 38.2), (45.8, 41.2), (42.8, 40.6), (39.6, 37.8)], "gold")
    p.ellipse(41.6, 38.2, 1.35, 1.35, "ruby_gem")
    p.capsule([(38.4, 42.2), (41.0, 38.8)], [1.2, 1.2], "charcoal")
    p.ellipse(38.2, 42.6, 1.45, 1.45, "gold")
    pb = Part()
    pb.capsule([(23.2, 38.0), (17.8, 49.4)], [1.75, 1.15], "charcoal")
    pb.ellipse(17.7, 49.6, 1.2, 1.2, "ruby_gem")
    add_pair("weapon_warrior_greatsword", p, ("iron_dark", "gold", "ruby_gem"), pb, ("ruby_gem",))

    # ==================== 2. ARCHER (4 weapons) ====================
    # 2a. bow: Oak Recurve Bow + quiver
    p = Part()
    p.capsule([(39.4, 23.0), (42.8, 25.2), (45.2, 31.2), (45.0, 38.0), (45.2, 44.8), (42.8, 50.8), (39.4, 53.0)],
              [0.95, 1.25, 1.45, 1.55, 1.45, 1.25, 0.95], "wood_oak")
    p.ellipse(44.8, 38.0, 1.55, 2.6, "leather")
    for gy in (23.0, 53.0):
        p.ellipse(39.4, gy, 1.05, 1.05, "gold")
    p.capsule([(39.4, 23.8), (39.4, 52.2)], [0.42, 0.42], "cloth_white", flat=0.3)
    p.capsule([(37.0, 38.8), (49.2, 36.6)], [0.55, 0.55], "gold")
    p.poly([(48.2, 35.0), (52.0, 36.2), (48.8, 38.2)], "steel")
    p.poly([(35.6, 37.8), (38.0, 38.6), (35.8, 40.2)], "hat_red")
    pb = Part()
    pb.capsule([(22.2, 23.4), (25.6, 35.2)], [2.1, 1.55], "leather")
    pb.capsule([(21.6, 24.4), (24.4, 23.4)], [0.9, 0.9], "gold")
    pb.ellipse(21.2, 21.0, 1.2, 1.6, "cloth_white")
    pb.ellipse(22.8, 20.6, 1.2, 1.6, "hat_red")
    add_pair("weapon_archer_bow", p, ("steel", "gold"), pb, ("gold",))
    out["weapon_archer"] = out["weapon_archer_bow"]
    out["weapon_archer_back"] = out["weapon_archer_bow_back"]

    # 2b. elven: Golden-Green Elven Winged Bow
    p = Part()
    p.capsule([(39.0, 21.6), (43.4, 24.6), (45.6, 31.0), (45.2, 38.0), (45.6, 45.0), (43.4, 51.4), (39.0, 54.4)],
              [0.85, 1.35, 1.5, 1.6, 1.5, 1.35, 0.85], "gold")
    p.ellipse(45.0, 38.0, 1.45, 2.5, "hat_green")
    p.capsule([(39.0, 22.4), (39.0, 53.6)], [0.42, 0.42], "magic_cyan", flat=0.35)
    p.capsule([(37.2, 38.6), (49.6, 36.4)], [0.55, 0.55], "cloth_white")
    p.poly([(48.4, 34.8), (52.4, 36.2), (49.0, 38.0)], "magic_cyan")
    p.poly([(35.6, 37.6), (38.0, 38.4), (35.8, 40.0)], "emerald_glow")
    pb = Part()
    pb.capsule([(22.2, 23.4), (25.6, 35.2)], [2.0, 1.45], "hat_green")
    pb.capsule([(21.6, 24.4), (24.4, 23.4)], [0.9, 0.9], "gold")
    pb.ellipse(21.2, 21.0, 1.2, 1.6, "emerald_glow")
    pb.ellipse(22.8, 20.6, 1.2, 1.6, "cloth_white")
    add_pair("weapon_archer_elven", p, ("gold", "magic_cyan"), pb, ("gold",))

    # 2c. crossbow: Compact Steel Crossbow
    p = Part()
    p.capsule([(37.6, 40.0), (49.2, 37.0)], [1.45, 1.2], "wood_oak")
    p.capsule([(46.2, 29.0), (48.4, 37.0), (46.6, 45.4)], [1.0, 1.35, 1.0], "steel")
    p.capsule([(46.2, 29.4), (42.8, 38.4), (46.6, 44.8)], [0.4, 0.4, 0.4], "cloth_white", flat=0.3)
    p.poly([(48.6, 35.4), (52.4, 36.4), (49.0, 38.4)], "steel")
    pb = Part()
    pb.capsule([(23.2, 38.4), (19.6, 47.2)], [1.65, 1.2], "leather")
    pb.ellipse(22.4, 37.4, 1.2, 1.2, "steel")
    pb.ellipse(23.8, 38.2, 1.1, 1.1, "gold")
    add_pair("weapon_archer_crossbow", p, ("steel",), pb, ("gold", "steel"))

    # 2d. darkbow: Abyssal Violet Serpent Bow
    p = Part()
    p.capsule([(38.8, 22.0), (43.2, 25.0), (45.8, 31.2), (45.2, 38.0), (45.8, 44.8), (43.2, 51.0), (38.8, 54.0)],
              [0.9, 1.4, 1.55, 1.6, 1.55, 1.4, 0.9], "iron_dark")
    p.ellipse(45.0, 38.0, 1.5, 2.4, "amethyst")
    p.capsule([(38.8, 22.8), (38.8, 53.2)], [0.42, 0.42], "amethyst", flat=0.3)
    p.capsule([(37.0, 38.6), (49.4, 36.4)], [0.55, 0.55], "charcoal")
    p.poly([(48.4, 34.8), (52.4, 36.2), (49.0, 38.0)], "ruby_gem")
    p.poly([(35.4, 37.6), (38.0, 38.4), (35.6, 40.0)], "amethyst")
    pb = Part()
    pb.capsule([(22.2, 23.4), (25.6, 35.2)], [2.0, 1.45], "charcoal")
    pb.ellipse(21.4, 21.0, 1.2, 1.6, "amethyst")
    pb.ellipse(22.8, 20.6, 1.2, 1.6, "ruby_gem")
    add_pair("weapon_archer_darkbow", p, ("amethyst", "ruby_gem"), pb, ("amethyst",))

    # ==================== 3. MAGE (4 weapons) ====================
    # 3a. crystal: Arcane Cyan Crystal Staff
    p = Part()
    p.capsule([(42.4, 57.0), (42.4, 27.0)], [1.15, 1.3], "wood_oak")
    p.ellipse(42.4, 57.2, 1.25, 1.25, "gold")
    p.capsule([(38.8, 21.2), (40.2, 25.2), (42.4, 27.2), (44.6, 25.2), (46.0, 21.2)], [0.9, 1.3, 1.6, 1.3, 0.9], "gold")
    p.poly([(42.4, 14.6), (45.8, 19.6), (42.4, 24.4), (39.0, 19.6)], "magic_cyan")
    p.ellipse(41.6, 18.8, 1.35, 1.55, "cloth_white", flat=0.4)
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "hat_purple")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "gold")
    add_pair("weapon_mage_crystal", p, ("magic_cyan", "gold"), pb, ("gold",))
    out["weapon_mage"] = out["weapon_mage_crystal"]
    out["weapon_mage_back"] = out["weapon_mage_crystal_back"]

    # 3b. fire: Crimson Inferno Flame Staff
    p = Part()
    p.capsule([(42.4, 57.0), (42.4, 26.8)], [1.15, 1.3], "wood_dark")
    p.ellipse(42.4, 57.2, 1.25, 1.25, "gold")
    p.capsule([(38.4, 22.8), (40.2, 26.4), (44.6, 26.4), (46.4, 22.8)], [0.9, 1.4, 1.4, 0.9], "gold")
    p.ellipse(42.4, 20.6, 3.3, 3.6, "ruby_gem")
    p.ellipse(42.2, 19.8, 1.8, 2.2, "sun_gold", flat=0.35)
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "hat_red")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "sun_gold")
    add_pair("weapon_mage_fire", p, ("ruby_gem", "sun_gold", "gold"), pb, ("sun_gold",))

    # 3c. moon: Silver Crescent Moon Staff
    p = Part()
    p.capsule([(42.4, 57.0), (42.4, 26.8)], [1.1, 1.25], "steel")
    p.ellipse(42.4, 57.2, 1.25, 1.25, "gold")
    p.ellipse(41.8, 20.4, 4.4, 4.8, "steel")
    p.erase(ellipse_mask(44.2, 20.2, 3.2, 3.8))
    p.ellipse(43.8, 20.4, 1.9, 1.9, "magic_cyan", flat=0.3)
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "shield_blue")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "cloth_white")
    add_pair("weapon_mage_moon", p, ("steel", "magic_cyan"), pb, ("steel",))

    # 3d. grim: Amethyst Void Rune Staff
    p = Part()
    p.capsule([(42.4, 57.0), (42.4, 26.4)], [1.15, 1.3], "charcoal")
    p.poly([(39.4, 24.4), (45.4, 24.4), (44.0, 27.4), (40.8, 27.4)], "iron_dark")
    p.poly([(42.4, 13.6), (45.4, 19.6), (42.4, 24.8), (39.4, 19.6)], "amethyst")
    p.ellipse(41.8, 18.8, 1.1, 1.4, "cloth_white", flat=0.4)
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "charcoal")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "amethyst")
    add_pair("weapon_mage_grim", p, ("amethyst", "iron_dark"), pb, ("amethyst",))

    # ==================== 4. KNIGHT (4 weapons) ====================
    # 4a. lance: Kite Shield + Ribbon Lance
    p = Part()
    p.capsule([(43.0, 57.2), (43.0, 24.0)], [1.1, 1.25], "leather")
    p.poly([(40.4, 37.8), (45.6, 37.8), (44.4, 40.4), (41.6, 40.4)], "steel")
    p.ellipse(43.0, 24.4, 1.65, 1.2, "gold")
    p.poly([(43.2, 24.4), (48.4, 26.8), (46.8, 28.6), (43.2, 26.2)], "hat_red")
    p.poly([(41.0, 24.0), (43.0, 13.6), (45.0, 24.0)], "steel")
    p.poly([(14.8, 33.4), (25.6, 33.4), (25.2, 41.8), (20.2, 47.8), (15.2, 41.8)], "steel")
    p.poly([(16.2, 34.8), (24.2, 34.8), (23.8, 41.2), (20.2, 46.0), (16.6, 41.2)], "shield_blue")
    p.poly([(19.4, 36.2), (21.0, 36.2), (21.0, 44.0), (19.4, 44.0)], "gold")
    p.poly([(17.4, 38.6), (23.0, 38.6), (23.0, 40.2), (17.4, 40.2)], "gold")
    add_pair("weapon_knight_lance", p, ("steel", "gold"))
    out["weapon_knight"] = out["weapon_knight_lance"]
    out["weapon_knight_back"] = out["weapon_knight_lance_back"]

    # 4b. royal: Golden Royal Sword + Crimson Winged Shield
    p = Part()
    p.poly([(41.0, 37.0), (50.8, 24.4), (53.6, 21.4), (52.0, 25.6), (43.0, 38.8)], "steel")
    p.capsule([(39.2, 36.6), (41.8, 38.4), (44.0, 40.4)], [1.15, 1.4, 1.15], "gold")
    p.capsule([(39.4, 41.4), (41.6, 38.8)], [1.1, 1.1], "hat_red")
    p.poly([(14.8, 33.4), (25.6, 33.4), (25.2, 41.8), (20.2, 47.8), (15.2, 41.8)], "gold")
    p.poly([(16.2, 34.8), (24.2, 34.8), (23.8, 41.2), (20.2, 46.0), (16.6, 41.2)], "hat_red")
    p.ellipse(20.2, 39.6, 2.0, 2.4, "gold")
    add_pair("weapon_knight_royal", p, ("steel", "gold"))

    # 4c. halberd: Steel Halberd + Round Viking Shield
    p = Part()
    p.capsule([(43.0, 57.2), (43.0, 22.0)], [1.15, 1.2], "wood_dark")
    p.poly([(41.6, 23.0), (43.0, 14.0), (44.4, 23.0)], "steel")
    p.poly([(43.0, 20.6), (49.2, 18.8), (50.6, 24.8), (47.4, 28.4), (43.0, 25.8)], "steel")
    p.ellipse(20.2, 39.6, 5.4, 5.8, "steel")
    p.ellipse(20.2, 39.6, 4.0, 4.4, "wood_oak")
    p.ellipse(20.2, 39.6, 1.8, 1.9, "gold")
    add_pair("weapon_knight_halberd", p, ("steel", "gold"))

    # 4d. dragon: Amethyst Dragon Spear + Dark Kite Shield
    p = Part()
    p.capsule([(43.0, 57.2), (43.0, 24.2)], [1.15, 1.2], "iron_dark")
    p.poly([(40.6, 24.6), (43.0, 13.6), (45.4, 24.6)], "amethyst")
    p.capsule([(40.2, 25.0), (43.0, 26.4), (45.8, 25.0)], [1.0, 1.3, 1.0], "gold")
    p.poly([(14.8, 33.4), (25.6, 33.4), (25.2, 41.8), (20.2, 47.8), (15.2, 41.8)], "iron_dark")
    p.poly([(16.2, 34.8), (24.2, 34.8), (23.8, 41.2), (20.2, 46.0), (16.6, 41.2)], "hat_purple")
    p.ellipse(20.2, 39.6, 1.8, 2.2, "ruby_gem")
    add_pair("weapon_knight_dragon", p, ("gold", "amethyst", "ruby_gem"))

    # ==================== 5. PRIEST (4 weapons) ====================
    # 5a. sun: Winged Sun Crosier
    p = Part()
    p.capsule([(42.4, 57.0), (42.4, 26.8)], [1.1, 1.25], "gold")
    p.poly([(42.0, 25.0), (36.8, 20.6), (38.0, 18.2), (42.2, 22.0)], "cloth_white")
    p.poly([(42.8, 25.0), (48.0, 20.6), (46.8, 18.2), (42.6, 22.0)], "cloth_white")
    p.ellipse(42.4, 21.4, 3.2, 3.2, "gold")
    p.ellipse(42.4, 21.4, 1.85, 1.85, "sun_gold", flat=0.35)
    p.ellipse(42.4, 17.4, 1.0, 1.4, "gold")
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "cloth_white")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "gold")
    add_pair("weapon_priest_sun", p, ("gold", "sun_gold"), pb, ("gold",))
    out["weapon_priest"] = out["weapon_priest_sun"]
    out["weapon_priest_back"] = out["weapon_priest_sun_back"]

    # 5b. angel: Emerald Healing Angel Staff
    p = Part()
    p.capsule([(42.4, 57.0), (42.4, 26.8)], [1.1, 1.25], "steel")
    p.poly([(42.0, 24.4), (36.6, 19.8), (38.2, 16.8), (42.2, 21.6)], "cloth_white")
    p.poly([(42.8, 24.4), (48.2, 19.8), (46.6, 16.8), (42.6, 21.6)], "cloth_white")
    p.poly([(42.4, 16.2), (45.2, 21.0), (42.4, 25.6), (39.6, 21.0)], "emerald_glow")
    p.ellipse(41.8, 20.2, 1.1, 1.3, "cloth_white", flat=0.4)
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "shield_blue")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "cloth_white")
    add_pair("weapon_priest_angel", p, ("steel", "emerald_glow"), pb, ("steel",))

    # 5c. mace: Golden Cleric Holy Mace
    p = Part()
    p.capsule([(40.6, 40.6), (48.6, 24.8)], [1.15, 1.35], "wood_oak")
    p.ellipse(48.8, 24.2, 3.1, 3.1, "gold")
    for fx, fy in [(45.8, 22.8), (51.8, 25.6), (47.4, 20.8), (50.4, 27.4)]:
        p.ellipse(fx, fy, 1.25, 1.25, "sun_gold")
    p.ellipse(40.2, 41.2, 1.3, 1.3, "gold")
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "cloth_white")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "gold")
    add_pair("weapon_priest_mace", p, ("gold", "sun_gold"), pb, ("gold",))

    # 5d. lantern: Warm Sun-Lantern Shepherd's Crosier
    p = Part()
    p.capsule([(42.0, 57.0), (42.0, 24.0), (43.8, 19.6), (47.2, 20.0), (48.2, 23.0)], [1.15, 1.2, 1.15, 1.0, 0.85], "wood_oak")
    p.poly([(46.2, 24.2), (50.2, 24.2), (49.6, 30.2), (46.8, 30.2)], "sun_gold", flat=0.35)
    p.ellipse(48.2, 23.8, 2.2, 0.9, "gold")
    p.ellipse(48.2, 30.4, 1.8, 0.8, "gold")
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "cloth_white")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "gold")
    add_pair("weapon_priest_lantern", p, ("gold", "sun_gold"), pb, ("gold",))

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
    parts.update(build_weapons())
    return parts
