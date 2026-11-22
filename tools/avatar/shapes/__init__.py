"""
Character parts drawn as smooth shapes (see hires.py) on a crisp 64x64 grid
with slim, well-proportioned Stardew Valley RPG silhouettes.

One file per kind of part:
  common.py       grid constants and helpers shared by the files below
  body.py         bare body + walk frames
  hair.py         20 hairstyles (@style decorator)
  outfits.py      13 outfits + walk frames
  races.py        elf ears, beards, beast ears/tails, demon horns/tail
  accessories.py  scarf, cape, wings
  hats.py         hats and the dragon crown
  weapons.py      4 weapons per job
"""
import shade as SH

from .accessories import build_accessories
from .body import build_body
from .hair import HAIR, build_hair
from .hats import build_hats
from .outfits import OUTFITS, build_outfits
from .races import build_race
from .weapons import build_weapons

__all__ = ["HAIR", "OUTFITS", "build_all"]


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
