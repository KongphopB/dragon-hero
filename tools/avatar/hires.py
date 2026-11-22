"""
High-resolution shape renderer for pixel-art avatar parts.

Parts are built from smooth primitives (ellipses, tapered capsules, polygons) on an 8x grid,
lit with real surface normals (light from top-left-front), then reduced to 48x48 pixels:
majority material per pixel, 5 shade levels with ordered dithering, coloured outlines.
Coordinates are in 48-px units (floats); (23.5, y) is the body's centre line.
"""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

import shade as SH

K = 8                       # supersampling factor
N = 48
G = N * K
_ys, _xs = np.mgrid[0:G, 0:G]
X = (_xs + 0.5) / K         # sub-pixel centres in 48-px units
Y = (_ys + 0.5) / K

LIGHT = np.array([-0.55, -0.72, 0.80])
LIGHT = LIGHT / np.linalg.norm(LIGHT)

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 - 0.47


class Part:
    """One output sprite. Primitives are painted in order; later ones cover earlier ones."""

    def __init__(self):
        self.mat = np.full((G, G), -1, dtype=np.int16)     # material index
        self.val = np.zeros((G, G), dtype=np.float32)      # lit value 0..1
        self.bias = np.zeros((G, G), dtype=np.int8)
        self.z = np.zeros((G, G), dtype=np.int16)
        self.mats = []
        self._z = 0

    # ---------------------------------------------------------------- helpers
    def _mid(self, name):
        if name not in self.mats:
            self.mats.append(name)
        return self.mats.index(name)

    def _paint(self, mask, normal, mat, bias=0, flat=0.0, glow=0.0):
        nx, ny, nz = normal
        lam = np.clip(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2], 0, 1)
        v = 0.22 + 0.78 * lam
        v = v * (1 - flat) + 0.78 * flat + glow
        self._z += 1
        m = mask
        self.mat[m] = self._mid(mat)
        self.val[m] = v[m]
        self.bias[m] = bias
        self.z[m] = self._z

    def erase(self, mask):
        self.mat[mask] = -1

    # ---------------------------------------------------------------- primitives
    def ellipse(self, cx, cy, rx, ry, mat, rot=0.0, bias=0, flat=0.0, clip=None, dome=1.0):
        dx, dy = X - cx, Y - cy
        if rot:
            c, s = np.cos(rot), np.sin(rot)
            dx, dy = dx * c + dy * s, -dx * s + dy * c
        u, w = dx / rx, dy / ry
        r2 = u * u + w * w
        mask = r2 <= 1
        if clip is not None:
            mask &= clip
        nz = np.sqrt(np.clip(1 - r2, 0, 1)) * dome + (1 - dome) * 0.8
        nx, ny = u, w
        if rot:
            c, s = np.cos(-rot), np.sin(-rot)
            nx, ny = nx * c + ny * s, -nx * s + ny * c
        nrm = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-6
        self._paint(mask, (nx / nrm, ny / nrm, nz / nrm), mat, bias, flat)
        return mask

    def capsule(self, pts, radii, mat, bias=0, flat=0.0, clip=None):
        """Tapered tube through pts (list of (x,y)) with matching radii."""
        best_d = np.full((G, G), 1e9)
        best_n = (np.zeros((G, G)), np.zeros((G, G)))
        best_r = np.ones((G, G))
        for i in range(len(pts) - 1):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            r0, r1 = radii[i], radii[i + 1]
            vx, vy = x1 - x0, y1 - y0
            L2 = vx * vx + vy * vy or 1e-6
            t = np.clip(((X - x0) * vx + (Y - y0) * vy) / L2, 0, 1)
            px, py = x0 + t * vx, y0 + t * vy
            ddx, ddy = X - px, Y - py
            d = np.sqrt(ddx * ddx + ddy * ddy)
            r = r0 + (r1 - r0) * t
            rel = d / r
            better = rel < best_d
            best_d = np.where(better, rel, best_d)
            best_r = np.where(better, r, best_r)
            best_n = (np.where(better, ddx / (d + 1e-6), best_n[0]), np.where(better, ddy / (d + 1e-6), best_n[1]))
        mask = best_d <= 1
        if clip is not None:
            mask &= clip
        rel = np.clip(best_d, 0, 1)
        nz = np.sqrt(1 - rel * rel)
        nx, ny = best_n[0] * rel, best_n[1] * rel
        self._paint(mask, (nx, ny, nz), mat, bias, flat)
        return mask

    def poly(self, pts, mat, bias=0, flat=0.0, clip=None, round_=1.0):
        """Filled polygon lit like a vertical cylinder (good for torsos, robes, boots)."""
        img = Image.new("L", (G, G), 0)
        ImageDraw.Draw(img).polygon([(x * K, y * K) for x, y in pts], fill=255)
        mask = np.array(img) > 0
        if clip is not None:
            mask &= clip
        nx = np.zeros((G, G))
        rows = np.where(mask.any(axis=1))[0]
        for r in rows:
            cols = np.where(mask[r])[0]
            l, rr = cols[0], cols[-1]
            mid, half = (l + rr) / 2, max(1, (rr - l) / 2)
            nx[r, l:rr + 1] = (np.arange(l, rr + 1) - mid) / half * round_
        nx = np.clip(nx, -0.95, 0.95)
        # soften the top edge so shoulders/hems read as rounded
        dist = ndimage.distance_transform_edt(mask) / K
        top = np.zeros((G, G))
        edge_above = np.roll(~mask, 1, axis=0)
        top = np.where(dist < 1.2, -0.5 * (1.2 - dist), 0) * (edge_above | (dist < 1.2))
        ny = np.clip(top * 0.6 + 0.12, -0.9, 0.9)
        nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0.05, 1))
        self._paint(mask, (nx, ny, nz), mat, bias, flat)
        return mask

    def stamp(self, mask, mat, bias=0, flat=1.0):
        """Paint a flat-lit mask (for details: bands, buckles, stripes)."""
        self._paint(mask, (np.zeros((G, G)), np.zeros((G, G)), np.ones((G, G))), mat, bias, flat)

    # ---------------------------------------------------------------- output
    def to_image(self, outline=True, sep=True, glossy=(), soft=("skin",)):
        """Reduce to 48x48. Returns RGBA with KEYS6 colours for keyed materials."""
        img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
        px = img.load()
        mat_lo = np.full((N, N), -1, dtype=int)
        lvl_lo = np.zeros((N, N), dtype=int)
        z_lo = np.zeros((N, N), dtype=int)
        thresh = 0.42 * K * K
        for y in range(N):
            for x in range(N):
                blk = self.mat[y * K:(y + 1) * K, x * K:(x + 1) * K]
                ids, counts = np.unique(blk[blk >= 0], return_counts=True)
                if not len(ids) or counts.sum() < thresh:
                    continue
                mi = ids[np.argmax(counts)]
                sel = blk == mi
                v = float(self.val[y * K:(y + 1) * K, x * K:(x + 1) * K][sel].mean())
                b = int(np.round(self.bias[y * K:(y + 1) * K, x * K:(x + 1) * K][sel].mean()))
                name = self.mats[mi]
                v += BAYER[y % 4, x % 4] * 0.05
                if name in glossy:
                    v = (v - 0.5) * 1.35 + 0.52
                if v > 0.93:
                    lv = 0
                elif v > 0.77:
                    lv = 1
                elif v > 0.56:
                    lv = 2
                elif v > 0.37:
                    lv = 3
                else:
                    lv = 4
                if name in soft:
                    lv = max(1, min(3, lv))
                lv = max(0, min(4, lv + b))
                mat_lo[y, x] = mi
                lvl_lo[y, x] = lv
                z_lo[y, x] = int(np.median(self.z[y * K:(y + 1) * K, x * K:(x + 1) * K][sel]))

        # soft separation where two materials of this part meet: the lower one darkens
        if sep:
            for y in range(N):
                for x in range(N):
                    if mat_lo[y, x] < 0:
                        continue
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx_, ny_ = x + dx, y + dy
                        if 0 <= nx_ < N and 0 <= ny_ < N and mat_lo[ny_, nx_] >= 0 and mat_lo[ny_, nx_] != mat_lo[y, x] and z_lo[ny_, nx_] > z_lo[y, x]:
                            lvl_lo[y, x] = max(lvl_lo[y, x], 4 if self.mats[mat_lo[y, x]] not in soft else 3)

        def colour(name, lv):
            if name in SH.KEYS6:
                return SH.KEYS6[name][lv]
            return SH.ramp(SH.FIXED[name], "skin" if name == "skin" else None)[lv]

        for y in range(N):
            for x in range(N):
                if mat_lo[y, x] >= 0:
                    px[x, y] = colour(self.mats[mat_lo[y, x]], lvl_lo[y, x]) + (255,)

        if outline:
            for y in range(N):
                for x in range(N):
                    if mat_lo[y, x] >= 0:
                        continue
                    nb = [(x + dx, y + dy, dx, dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                          if 0 <= x + dx < N and 0 <= y + dy < N and mat_lo[y + dy, x + dx] >= 0]
                    if not nb:
                        continue
                    # lit side (outline sits left/above the shape) gets a softer line
                    lit = any(dx > 0 or dy > 0 for _, _, dx, dy in nb)
                    nx_, ny_, _, _ = nb[0]
                    name = self.mats[mat_lo[ny_, nx_]]
                    px[x, y] = colour(name, 5 if not lit else 5) + (255,)
                    if lit:
                        r, g, b, a = px[x, y]
                        hi = colour(name, 4)
                        px[x, y] = (int(r * 0.55 + hi[0] * 0.45), int(g * 0.55 + hi[1] * 0.45), int(b * 0.55 + hi[2] * 0.45), 255)
        return img


def circle_mask(cx, cy, r):
    return (X - cx) ** 2 + (Y - cy) ** 2 <= r * r


def rect_mask(x0, y0, x1, y1):
    return (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)


def ellipse_mask(cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def poly_mask(pts):
    img = Image.new("L", (G, G), 0)
    ImageDraw.Draw(img).polygon([(x * K, y * K) for x, y in pts], fill=255)
    return np.array(img) > 0
