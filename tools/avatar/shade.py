"""
Pixel shading engine for the avatar parts.

Takes flat parts (one material per area, optional hand-drawn light/dark hints) and repaints them
with 5-step hue-shifted ramps lit from the top-left, coloured outlines (sel-out), hair strands,
metal shine and cast shadows. Keyed materials (skin/hair/main/trim) are written as 6 key colours
(5 shades + outline tint) so the game can recolour them at runtime with the same ramp() maths
(mirrored in js/ui/avatar-color.js).
"""
import colorsys
from collections import deque

# ------------------------------------------------------------------ ramps
LEVELS = 5  # 0 highlight .. 4 deep shadow; index 5 = outline tint


def _shift_hue(h, target, amount):
    d = ((target - h + 0.5) % 1.0) - 0.5
    return (h + d * amount) % 1.0


def ramp(rgb, kind=None):
    """Base colour -> [hi, light, mid(base), shade, deep, outline] with warm highlights / cool shadows.
    kind="skin" keeps shadows warm (toward red) so faces never turn grey."""
    r, g, b = [c / 255 for c in rgb]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    warm, cool = 0.13, 0.70   # ~47deg (gold) / ~252deg (blue-violet)
    if kind == "skin":
        warm, cool = 0.11, 0.97
    grey = s < 0.08
    steps = [
        # (hue pull toward warm(+)/cool(-), sat mult, val mult)
        (0.22, 0.55, 1.30),
        (0.10, 0.80, 1.14),
        (0.00, 1.00, 1.00),
        (-0.12, 1.10, 0.78),
        (-0.24, 1.18, 0.58),
        (-0.30, 1.10, 0.34),
    ]
    out = []
    for pull, sm, vm in steps:
        hh = h
        if not grey:
            hh = _shift_hue(h, warm if pull > 0 else cool, abs(pull))
        ss = min(1.0, s * sm + (0.06 if (grey and pull < 0) else 0))
        if grey and pull < 0:
            hh = cool  # neutral greys get a slightly blue shadow
        vv = max(0.0, min(1.0, v * vm + (0.04 if pull > 0.15 else 0)))
        rr, gg, bb = colorsys.hsv_to_rgb(hh, ss, vv)
        out.append((round(rr * 255), round(gg * 255), round(bb * 255)))
    return out


# ------------------------------------------------------------------ keys
KEY_MATS = ("skin", "hair", "main", "trim", "eye")
KEYS6 = {
    "skin": [(255, 0, 16 + i) for i in range(6)],
    "hair": [(0, 255, 16 + i) for i in range(6)],
    "main": [(16 + i, 0, 255) for i in range(6)],
    "trim": [(255, 255, 16 + i) for i in range(6)],
    "eye":  [(0, 16 + i, 255) for i in range(6)],
}

# fixed materials: base colour of each
FIXED = {
    "steel": (150, 165, 186),
    "leather": (146, 90, 50),
    "cloth_white": (232, 232, 238),
    "gold": (240, 190, 30),
    "charcoal": (56, 56, 72),
    "horn": (130, 96, 128),
    "belt": (112, 66, 32),
    "boot": (78, 50, 34),
    "pants": (52, 62, 82),
    "pants_steel": (140, 155, 176),
    "pants_leather": (96, 74, 52),
    "pants_ninja": (44, 44, 58),
}

# material classes for texture rules
METAL = {"steel", "gold", "pants_steel"}
CLOTH = {"main", "trim", "cloth_white", "pants", "pants_leather", "pants_ninja", "leather"}


# ------------------------------------------------------------------ geometry helpers
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


def regions(labels, w, h):
    """Connected regions of the same material. labels[(x,y)] = (mat, bias)."""
    seen, out = set(), []
    for p, (mat, _) in labels.items():
        if p in seen:
            continue
        comp, q = [], deque([p])
        seen.add(p)
        while q:
            c = q.popleft()
            comp.append(c)
            for dx, dy in N4:
                n = (c[0] + dx, c[1] + dy)
                if n not in seen and n in labels and labels[n][0] == mat:
                    seen.add(n)
                    q.append(n)
        out.append((mat, comp))
    return out


def dist_field(comp):
    """Manhattan distance from each pixel to the region's edge (1 = on the edge)."""
    cs = set(comp)
    d = {}
    q = deque()
    for p in comp:
        if any((p[0] + dx, p[1] + dy) not in cs for dx, dy in N4):
            d[p] = 1
            q.append(p)
    while q:
        c = q.popleft()
        for dx, dy in N4:
            n = (c[0] + dx, c[1] + dy)
            if n in cs and n not in d:
                d[n] = d[c] + 1
                q.append(n)
    return d


def light_level(comp, mat):
    """Lambert-ish level per pixel: normal from the distance field, light from top-left-front."""
    d = dist_field(comp)
    lx, ly, lz = -0.62, -0.78, 0.9
    ln = (lx * lx + ly * ly + lz * lz) ** 0.5
    lx, ly, lz = lx / ln, ly / ln, lz / ln
    xs = [p[0] for p in comp]
    ys = [p[1] for p in comp]
    top, bottom = min(ys), max(ys)
    hgt = max(1, bottom - top)
    out = {}
    for (x, y), dv in d.items():
        gx = d.get((x - 1, y), 0) - d.get((x + 1, y), 0)
        gy = d.get((x, y - 1), 0) - d.get((x, y + 1), 0)
        nz = 0.55 + 0.45 * min(dv, 4) / 4
        nl = (gx * gx + gy * gy + nz * nz) ** 0.5 or 1
        lam = (gx * lx + gy * ly + nz * lz) / nl
        lam -= 0.18 * (y - top) / hgt          # ambient falloff toward the bottom
        if mat in METAL:
            lam = lam * 1.35 - 0.05             # punchier metal
        if lam > 0.92 and dv >= 2:
            lv = 0
        elif lam > 0.70:
            lv = 1
        elif lam > 0.38:
            lv = 2
        elif lam > 0.10:
            lv = 3
        else:
            lv = 4
        out[(x, y)] = lv
    return out, d, top


# ------------------------------------------------------------------ main pass
def shade(im, classify, outline_rgb, shadow_alpha_rgba=None):
    """
    im: RGBA part. classify(rgba) -> None (keep pixel as-is), "outline", or (material, bias).
    Returns a new image: keyed materials painted with KEYS6, fixed ones with real ramp colours.
    """
    w, h = im.size
    px = im.load()
    labels, keep, outline = {}, {}, set()
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if p[3] == 0:
                continue
            c = classify(p)
            if c is None:
                keep[(x, y)] = p
            elif c == "outline":
                outline.add((x, y))
            else:
                labels[(x, y)] = c

    level = {}
    for mat, comp in regions(labels, w, h):
        lv, d, top = light_level(comp, mat)
        for p in comp:
            v = lv[p] + labels[p][1]
            x, y = p
            if mat == "hair":
                # subtle curved sheen near crown + clean strand shading
                if d[p] >= 2 and (x + (y // 3)) % 4 == 0 and v == 2:
                    v += 1
                if top + 2 <= y <= top + 3 and d[p] >= 2 and v <= 2:
                    v = 0
            if mat in CLOTH and v == 3 and d[p] >= 3 and (x + y) % 3 == 0:
                v = 2  # soft clean cloth shading without heavy noise
            if mat == "skin":
                v = max(1, min(3, v - 1))  # skin stays soft and mostly lit
            level[p] = max(0, min(4, v))

    out = im.copy()
    opx = out.load()
    for y in range(h):
        for x in range(w):
            opx[x, y] = (0, 0, 0, 0)
    for p, rgba in keep.items():
        opx[p] = rgba
    for p, lv in level.items():
        mat = labels[p][0]
        opx[p] = (KEYS6[mat][lv] if mat in KEYS6 else ramp(FIXED[mat])[lv]) + (255,)

    # sel-out: interior lines take the darkest tone of the material they border;
    # the outer silhouette stays dark but tinted by the material beside it.
    for (x, y) in outline:
        mats = [labels[(x + dx, y + dy)][0] for dx, dy in N4 if (x + dx, y + dy) in labels]
        silhouette = any(not (0 <= x + dx < w and 0 <= y + dy < h) or px[x + dx, y + dy][3] == 0 for dx, dy in N4)
        if mats:
            mat = max(sorted(set(mats)), key=mats.count)  # sorted: ties pick the same material every run
            col = KEYS6[mat][5] if mat in KEYS6 else ramp(FIXED[mat])[5]
            if silhouette and mat not in KEYS6:
                col = tuple(int(c * 0.65 + o * 0.35) for c, o in zip(col, outline_rgb))
            opx[x, y] = col + (255,)
        else:
            opx[x, y] = outline_rgb + (255,)
    return out


def cast_shadow(part, region, alpha=70):
    """Add a soft 1px shadow under the part's lower edge inside `region` (e.g. hair onto the face)."""
    px = part.load()
    w, h = part.size
    add = []
    for y in range(h - 1):
        for x in range(w):
            if px[x, y][3] == 255 and px[x, y + 1][3] == 0 and (x, y + 1) in region:
                add.append((x, y + 1))
    for p in add:
        px[p] = (40, 20, 60, alpha)
    return part
