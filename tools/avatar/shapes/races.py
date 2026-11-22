"""Race extras: elf ears, beards, beast ears/tails, demon horns/tail."""
from .common import *  # noqa: F401,F403  (CX, FACE, HEAD, Part, X, Y, masks, HR, SH, np, Image, mirror_pts, arm_pose)
from .hair import hair_texture


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
