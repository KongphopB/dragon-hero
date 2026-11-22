"""
Contact sheet of finished characters for eyeballing the art: python build_parts.py --preview
writes tools/avatar/preview.png (showcase row, eyes, mouths, 20 hairstyles, outfits, races,
accessories, skin and cloth swatches, pets).
"""
from PIL import Image

import shade as SH
import shapes as SHP
from pixel_parts import EYES, MOUTHS, PETS, blank


def apply(im, pal):
    """Swap the 6 key colours of each material for the ramp built from the chosen base colour."""
    im = im.copy()
    px = im.load()
    lut = {}
    for k, base in pal.items():
        r = SH.ramp(tuple(base), k)
        for i in range(6):
            lut[SH.KEYS6[k][i]] = r[i]
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            if p[3] == 255 and p[:3] in lut:
                px[x, y] = lut[p[:3]] + (255,)
    return im


def compose(parts, spec, pal):
    """spec keys: race, eyes, mouth, blush, hair, outfit, hat, acc, job, beast, horns, frame"""
    layers = []
    back = []
    if spec.get("acc") in ("cape", "wings"):
        back.append("acc_" + spec["acc"])
    if spec.get("race") == "beast":
        back.append("race_beast_tail_" + spec.get("beast", "cat"))
    if spec.get("race") == "demon":
        back.append("race_demon_tail")
    layers += back
    layers += ["body", "eyes_" + spec.get("eyes", "normal"), "mouth_" + spec.get("mouth", "smile")]
    if spec.get("blush"):
        layers.append("blush")
    layers.append("outfit_" + spec.get("outfit", "tunic") + spec.get("frame", ""))
    if spec.get("beard"):
        layers.append("beard_" + spec["beard"])
    elif spec.get("race") == "dwarf" and spec.get("beard") is None:
        pass
    if spec.get("acc") == "scarf":
        layers.append("acc_scarf")
    if spec.get("acc") == "cape":
        layers.append("acc_cape_front")
    layers.append("hair_" + spec.get("hair", "short"))
    if spec.get("race") == "elf":
        layers.append("race_elf_ears")
    if spec.get("race") == "beast":
        layers.append("race_beast_ears_" + spec.get("beast", "cat"))
    if spec.get("race") == "demon":
        layers.append("race_demon_horns_" + spec.get("horns", "small"))
    if spec.get("acc") in ("glasses", "eyepatch", "flower"):
        layers.append("acc_" + spec["acc"])
    if spec.get("hat"):
        layers.append("hat_" + str(spec["hat"]))
    im = blank()
    job = spec.get("job", "warrior")
    w_back = parts["weapon_" + job + "_back"]
    w_front = parts["weapon_" + job]
    behind_name = "hair_" + spec.get("hair", "short") + "_behind"
    first_front = len(back)
    for i, name in enumerate(layers):
        if i == first_front:
            im.alpha_composite(w_back)
            if behind_name in parts:
                im.alpha_composite(apply(parts[behind_name], pal))
        im.alpha_composite(apply(parts[name], pal))
    im.alpha_composite(w_front)
    return im


def preview(parts, pals):
    S, C, H, E = pals["skin"], pals["cloth"], pals["hair"], pals["eye"]
    def P(skin=1, hair=0, main=0, trim=2, eye=0):
        return {"skin": S[skin], "hair": H[hair], "eye": E[eye], "main": C[main], "trim": C[trim]}

    showcase = [
        ({"race": "human", "outfit": "tunic", "hair": "messy", "eyes": "normal", "mouth": "smile", "job": "warrior", "blush": True}, P(1, 1, 0, 2, 0)),
        ({"race": "elf", "outfit": "archer", "hair": "long", "eyes": "big", "mouth": "smile", "job": "archer"}, P(4, 2, 4, 1, 3)),
        ({"race": "dwarf", "beard": "full", "outfit": "knight", "hair": "shaggy", "eyes": "sharp", "mouth": "flat", "job": "knight", "hat": 5}, P(2, 3, 7, 2, 1)),
        ({"race": "beast", "beast": "cat", "outfit": "ninja", "hair": "spiky", "eyes": "happy", "mouth": "cat", "job": "archer", "acc": "scarf"}, P(0, 8, 11, 0, 7)),
        ({"race": "demon", "horns": "small", "outfit": "mage", "hair": "twintails", "eyes": "angry", "mouth": "grin", "job": "mage", "acc": "cape"}, P(6, 9, 9, 10, 6)),
        ({"race": "beast", "beast": "fox", "outfit": "priest", "hair": "bun", "eyes": "sleepy", "mouth": "o", "job": "priest", "acc": "flower", "blush": True}, P(1, 1, 3, 2, 2)),
        ({"race": "demon", "horns": "ram", "outfit": "knight", "hair": "sweep", "eyes": "sharp", "mouth": "smile", "job": "warrior", "acc": "wings"}, P(7, 7, 10, 2, 5)),
        ({"race": "human", "outfit": "archer", "hair": "ponytail", "eyes": "big", "mouth": "grin", "job": "archer", "acc": "glasses", "blush": True}, P(3, 2, 5, 6, 4)),
        ({"race": "beast", "beast": "wolf", "outfit": "tunic", "hair": "band", "eyes": "angry", "mouth": "flat", "job": "warrior", "acc": "eyepatch"}, P(2, 0, 1, 11, 6)),
        ({"race": "elf", "outfit": "mage", "hair": "bob", "eyes": "normal", "mouth": "o", "job": "mage", "hat": "dragon"}, P(5, 9, 8, 2, 8)),
    ]
    scale, cell = 3, 68
    sheet_rows = []

    def row(images, label_h=0):
        sheet_rows.append(images)

    row([compose(parts, s, p) for s, p in showcase])
    base_spec = {"race": "human", "outfit": "tunic", "hair": "short", "job": "warrior"}
    row([compose(parts, dict(base_spec, eyes=e), P()) for e in EYES])
    row([compose(parts, dict(base_spec, mouth=m, blush=(i % 2 == 0)), P()) for i, m in enumerate(MOUTHS)])
    hair_names = list(SHP.HAIR.keys())
    row([compose(parts, dict(base_spec, hair=h), P(1, i % len(H))) for i, h in enumerate(hair_names)])
    outfits = ["tunic", "knight", "archer", "ninja", "mage", "priest"]
    row([compose(parts, dict(base_spec, outfit=o), P(1, 0, (i * 2) % 12, (i * 2 + 5) % 12)) for i, o in enumerate(outfits)])
    races = [
        {"race": "human"}, {"race": "elf"}, {"race": "dwarf", "beard": "full"},
        {"race": "beast", "beast": "cat"}, {"race": "beast", "beast": "fox"}, {"race": "beast", "beast": "wolf"},
        {"race": "demon", "horns": "small"}, {"race": "demon", "horns": "ram"},
    ]
    row([compose(parts, dict(base_spec, **r), P(1 if r["race"] != "demon" else 5 + i % 3, 1)) for i, r in enumerate(races)])
    accs = [None, "glasses", "eyepatch", "scarf", "cape", "flower", "wings"]
    row([compose(parts, dict(base_spec, acc=a), P(1, 0, 7, 0)) for a in accs])
    # skin and cloth swatches drawn as tiny characters
    row([compose(parts, dict(base_spec), P(i, 0, 0, 2)) for i in range(len(S))])
    row([compose(parts, dict(base_spec), P(1, 0, i, (i + 6) % 12)) for i in range(12)])

    cols = max(len(r) for r in sheet_rows)
    pets = [parts["pet_" + n] for n in PETS]
    sheet = Image.new("RGBA", (cols * cell * scale, (len(sheet_rows) + 1) * cell * scale), (52, 63, 86, 255))
    for ry, imgs in enumerate(sheet_rows):
        for cx, im in enumerate(imgs):
            sheet.alpha_composite(im.resize((64 * scale, 64 * scale), Image.NEAREST), (cx * cell * scale + 2 * scale, ry * cell * scale + 2 * scale))
    for cx, im in enumerate(pets):
        pal = {}
        sheet.alpha_composite(apply(im, pal).resize((16 * scale * 2, 16 * scale * 2), Image.NEAREST),
                              (cx * cell * scale + 6 * scale, len(sheet_rows) * cell * scale + 8 * scale))
    return sheet
