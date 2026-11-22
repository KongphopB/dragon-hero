"""Bare body (head, neck, hands, ground shadow) with its two walk frames."""
from .common import *  # noqa: F401,F403  (CX, FACE, HEAD, Part, X, Y, masks, HR, SH, np, Image, mirror_pts, arm_pose)


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
