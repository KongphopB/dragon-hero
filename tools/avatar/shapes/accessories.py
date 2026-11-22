"""Accessories: scarf, cape, wings (glasses, eyepatch and flower are pixel-drawn in build_parts.py)."""
from .common import *  # noqa: F401,F403  (CX, FACE, HEAD, Part, X, Y, masks, HR, SH, np, Image, mirror_pts, arm_pose)


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
