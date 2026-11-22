"""Hats 1-5 and the dragon crown unlock."""
from .common import *  # noqa: F401,F403  (CX, FACE, HEAD, Part, X, Y, masks, HR, SH, np, Image, mirror_pts, arm_pose)


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
