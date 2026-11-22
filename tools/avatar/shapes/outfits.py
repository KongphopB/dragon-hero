"""
Outfits: shared pieces (legs, torso, sleeves, belt, robe) and one outfit_<id>(p, frame)
per outfit; frame is "", "_s1" or "_s2" (walk). Register new ones in OUTFITS at the bottom.
"""
from .common import *  # noqa: F401,F403  (CX, FACE, HEAD, Part, X, Y, masks, HR, SH, np, Image, mirror_pts, arm_pose)


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
