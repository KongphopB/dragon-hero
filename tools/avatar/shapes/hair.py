"""
The 20 hairstyles. Each @style("id") function draws the front layer on p and the
behind-the-head layer on pb (back=True for the walking-away view). Add a style here,
rerun build_parts.py, then list the id in js/data/avatar-catalog.js.
"""
from .common import *  # noqa: F401,F403  (CX, FACE, HEAD, Part, X, Y, masks, HR, SH, np, Image, mirror_pts, arm_pose)


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
