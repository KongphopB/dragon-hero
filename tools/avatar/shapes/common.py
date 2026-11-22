"""
Shared by every part file: drawing engine imports, the 64x64 grid centre line, face box,
head ellipse and the arm swing used by the body and the outfits' walk frames.
"""
import numpy as np
from PIL import Image

import hires as HR
import shade as SH
from hires import Part, X, Y, ellipse_mask, rect_mask, poly_mask

# Everything below is what part files get from `from .common import *`.
__all__ = ["np", "Image", "HR", "SH", "Part", "X", "Y", "ellipse_mask", "rect_mask", "poly_mask",
           "CX", "FACE", "HEAD", "mirror_pts", "arm_pose"]

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
