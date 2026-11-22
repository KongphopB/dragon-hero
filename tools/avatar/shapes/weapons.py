"""
The 4 weapons per job (20 total). Each is drawn twice: in the hand (weapon_<job>_<id>)
and slung on the back (weapon_<job>_<id>_back). List new ids in js/data/avatar-catalog.js.
"""
from .common import *  # noqa: F401,F403  (CX, FACE, HEAD, Part, X, Y, masks, HR, SH, np, Image, mirror_pts, arm_pose)


def build_weapons():
    SH.FIXED.update({
        "wood_oak": (148, 92, 46),
        "wood_dark": (72, 46, 44),
        "magic_cyan": (68, 212, 255),
        "shield_blue": (46, 108, 224),
        "sun_gold": (255, 224, 96),
        "ruby_gem": (224, 52, 76),
        "emerald_glow": (62, 214, 134),
        "amethyst": (158, 84, 232),
        "iron_dark": (84, 96, 118),
    })
    out = {}

    def add_pair(key, p_front, glossy_f, p_back=None, glossy_b=()):
        out[key] = p_front.to_image(glossy=glossy_f)
        out[key + "_back"] = p_back.to_image(glossy=glossy_b) if p_back is not None else Part().to_image()

    # ==================== 1. WARRIOR (4 weapons) ====================
    # 1a. sword: Broadsword + scabbard
    p = Part()
    p.poly([(40.6, 37.2), (50.8, 24.2), (53.8, 21.2), (52.2, 25.4), (42.8, 39.0)], "steel")
    p.capsule([(42.2, 37.0), (51.4, 24.8)], [0.45, 0.25], "cloth_white", flat=0.35)
    p.capsule([(38.8, 36.6), (41.6, 38.4), (44.0, 40.4)], [1.15, 1.45, 1.15], "gold")
    p.capsule([(39.0, 41.4), (41.4, 38.8)], [1.15, 1.15], "leather")
    p.ellipse(38.8, 41.8, 1.35, 1.35, "gold")
    pb = Part()
    pb.capsule([(23.2, 38.4), (18.6, 48.8)], [1.55, 1.05], "leather")
    pb.ellipse(18.5, 49.0, 1.05, 1.05, "gold")
    pb.ellipse(23.1, 38.6, 1.45, 0.9, "gold")
    add_pair("weapon_warrior_sword", p, ("steel", "gold"), pb, ("gold",))
    out["weapon_warrior"] = out["weapon_warrior_sword"]
    out["weapon_warrior_back"] = out["weapon_warrior_sword_back"]

    # 1b. axe: Heavy Viking Battle Axe
    p = Part()
    p.capsule([(38.6, 42.6), (48.4, 23.0)], [1.15, 1.2], "wood_dark")
    p.poly([(44.6, 25.2), (51.8, 20.6), (55.4, 26.2), (51.4, 33.0), (45.2, 29.6)], "steel")
    p.capsule([(52.0, 21.8), (54.4, 26.2), (51.2, 32.0)], [0.55, 0.7, 0.55], "cloth_white", flat=0.35)
    p.ellipse(47.0, 27.6, 1.5, 1.5, "gold")
    p.ellipse(38.4, 43.0, 1.2, 1.2, "gold")
    pb = Part()
    pb.capsule([(22.8, 37.8), (19.6, 47.4)], [1.4, 1.1], "leather")
    pb.ellipse(22.6, 38.0, 1.35, 1.0, "iron_dark")
    add_pair("weapon_warrior_axe", p, ("steel", "gold"), pb, ("iron_dark",))

    # 1c. katana: Sleek Curved Katana + dark saya sheath
    p = Part()
    p.capsule([(41.0, 38.0), (46.8, 29.6), (51.8, 23.8), (55.4, 19.6)], [1.15, 1.1, 0.95, 0.4], "steel")
    p.capsule([(42.2, 36.8), (50.8, 25.4)], [0.35, 0.2], "cloth_white", flat=0.4)
    p.ellipse(40.8, 38.2, 2.0, 1.15, "gold", rot=0.65)
    p.capsule([(38.4, 41.8), (40.8, 38.6)], [1.0, 1.0], "hat_red")
    p.ellipse(38.2, 42.0, 1.05, 1.05, "gold")
    pb = Part()
    pb.capsule([(24.2, 39.2), (16.4, 46.8)], [1.25, 0.95], "charcoal")
    pb.ellipse(23.8, 39.6, 1.2, 1.0, "gold")
    add_pair("weapon_warrior_katana", p, ("steel", "gold"), pb, ("gold",))

    # 1d. greatsword: Crimson & Obsidian Greatsword
    p = Part()
    p.poly([(40.4, 36.8), (50.6, 19.8), (54.8, 16.2), (53.2, 22.0), (43.4, 38.8)], "iron_dark")
    p.capsule([(42.2, 36.6), (52.4, 19.6)], [0.7, 0.45], "ruby_gem", flat=0.3)
    p.poly([(37.4, 34.8), (42.2, 38.2), (45.8, 41.2), (42.8, 40.6), (39.6, 37.8)], "gold")
    p.ellipse(41.6, 38.2, 1.35, 1.35, "ruby_gem")
    p.capsule([(38.4, 42.2), (41.0, 38.8)], [1.2, 1.2], "charcoal")
    p.ellipse(38.2, 42.6, 1.45, 1.45, "gold")
    pb = Part()
    pb.capsule([(23.2, 38.0), (17.8, 49.4)], [1.75, 1.15], "charcoal")
    pb.ellipse(17.7, 49.6, 1.2, 1.2, "ruby_gem")
    add_pair("weapon_warrior_greatsword", p, ("iron_dark", "gold", "ruby_gem"), pb, ("ruby_gem",))

    # ==================== 2. ARCHER (4 weapons) ====================
    # 2a. bow: Oak Recurve Bow + quiver
    p = Part()
    p.capsule([(39.4, 23.0), (42.8, 25.2), (45.2, 31.2), (45.0, 38.0), (45.2, 44.8), (42.8, 50.8), (39.4, 53.0)],
              [0.95, 1.25, 1.45, 1.55, 1.45, 1.25, 0.95], "wood_oak")
    p.ellipse(44.8, 38.0, 1.55, 2.6, "leather")
    for gy in (23.0, 53.0):
        p.ellipse(39.4, gy, 1.05, 1.05, "gold")
    p.capsule([(39.4, 23.8), (39.4, 52.2)], [0.42, 0.42], "cloth_white", flat=0.3)
    p.capsule([(37.0, 38.8), (49.2, 36.6)], [0.55, 0.55], "gold")
    p.poly([(48.2, 35.0), (52.0, 36.2), (48.8, 38.2)], "steel")
    p.poly([(35.6, 37.8), (38.0, 38.6), (35.8, 40.2)], "hat_red")
    pb = Part()
    pb.capsule([(22.2, 23.4), (25.6, 35.2)], [2.1, 1.55], "leather")
    pb.capsule([(21.6, 24.4), (24.4, 23.4)], [0.9, 0.9], "gold")
    pb.ellipse(21.2, 21.0, 1.2, 1.6, "cloth_white")
    pb.ellipse(22.8, 20.6, 1.2, 1.6, "hat_red")
    add_pair("weapon_archer_bow", p, ("steel", "gold"), pb, ("gold",))
    out["weapon_archer"] = out["weapon_archer_bow"]
    out["weapon_archer_back"] = out["weapon_archer_bow_back"]

    # 2b. elven: Golden-Green Elven Winged Bow
    p = Part()
    p.capsule([(39.0, 21.6), (43.4, 24.6), (45.6, 31.0), (45.2, 38.0), (45.6, 45.0), (43.4, 51.4), (39.0, 54.4)],
              [0.85, 1.35, 1.5, 1.6, 1.5, 1.35, 0.85], "gold")
    p.ellipse(45.0, 38.0, 1.45, 2.5, "hat_green")
    p.capsule([(39.0, 22.4), (39.0, 53.6)], [0.42, 0.42], "magic_cyan", flat=0.35)
    p.capsule([(37.2, 38.6), (49.6, 36.4)], [0.55, 0.55], "cloth_white")
    p.poly([(48.4, 34.8), (52.4, 36.2), (49.0, 38.0)], "magic_cyan")
    p.poly([(35.6, 37.6), (38.0, 38.4), (35.8, 40.0)], "emerald_glow")
    pb = Part()
    pb.capsule([(22.2, 23.4), (25.6, 35.2)], [2.0, 1.45], "hat_green")
    pb.capsule([(21.6, 24.4), (24.4, 23.4)], [0.9, 0.9], "gold")
    pb.ellipse(21.2, 21.0, 1.2, 1.6, "emerald_glow")
    pb.ellipse(22.8, 20.6, 1.2, 1.6, "cloth_white")
    add_pair("weapon_archer_elven", p, ("gold", "magic_cyan"), pb, ("gold",))

    # 2c. crossbow: Compact Steel Crossbow
    p = Part()
    p.capsule([(37.6, 40.0), (49.2, 37.0)], [1.45, 1.2], "wood_oak")
    p.capsule([(46.2, 29.0), (48.4, 37.0), (46.6, 45.4)], [1.0, 1.35, 1.0], "steel")
    p.capsule([(46.2, 29.4), (42.8, 38.4), (46.6, 44.8)], [0.4, 0.4, 0.4], "cloth_white", flat=0.3)
    p.poly([(48.6, 35.4), (52.4, 36.4), (49.0, 38.4)], "steel")
    pb = Part()
    pb.capsule([(23.2, 38.4), (19.6, 47.2)], [1.65, 1.2], "leather")
    pb.ellipse(22.4, 37.4, 1.2, 1.2, "steel")
    pb.ellipse(23.8, 38.2, 1.1, 1.1, "gold")
    add_pair("weapon_archer_crossbow", p, ("steel",), pb, ("gold", "steel"))

    # 2d. darkbow: Abyssal Violet Serpent Bow
    p = Part()
    p.capsule([(38.8, 22.0), (43.2, 25.0), (45.8, 31.2), (45.2, 38.0), (45.8, 44.8), (43.2, 51.0), (38.8, 54.0)],
              [0.9, 1.4, 1.55, 1.6, 1.55, 1.4, 0.9], "iron_dark")
    p.ellipse(45.0, 38.0, 1.5, 2.4, "amethyst")
    p.capsule([(38.8, 22.8), (38.8, 53.2)], [0.42, 0.42], "amethyst", flat=0.3)
    p.capsule([(37.0, 38.6), (49.4, 36.4)], [0.55, 0.55], "charcoal")
    p.poly([(48.4, 34.8), (52.4, 36.2), (49.0, 38.0)], "ruby_gem")
    p.poly([(35.4, 37.6), (38.0, 38.4), (35.6, 40.0)], "amethyst")
    pb = Part()
    pb.capsule([(22.2, 23.4), (25.6, 35.2)], [2.0, 1.45], "charcoal")
    pb.ellipse(21.4, 21.0, 1.2, 1.6, "amethyst")
    pb.ellipse(22.8, 20.6, 1.2, 1.6, "ruby_gem")
    add_pair("weapon_archer_darkbow", p, ("amethyst", "ruby_gem"), pb, ("amethyst",))

    # ==================== 3. MAGE (4 weapons) ====================
    # 3a. crystal: Arcane Cyan Crystal Staff
    p = Part()
    p.capsule([(42.4, 57.0), (42.4, 27.0)], [1.15, 1.3], "wood_oak")
    p.ellipse(42.4, 57.2, 1.25, 1.25, "gold")
    p.capsule([(38.8, 21.2), (40.2, 25.2), (42.4, 27.2), (44.6, 25.2), (46.0, 21.2)], [0.9, 1.3, 1.6, 1.3, 0.9], "gold")
    p.poly([(42.4, 14.6), (45.8, 19.6), (42.4, 24.4), (39.0, 19.6)], "magic_cyan")
    p.ellipse(41.6, 18.8, 1.35, 1.55, "cloth_white", flat=0.4)
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "hat_purple")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "gold")
    add_pair("weapon_mage_crystal", p, ("magic_cyan", "gold"), pb, ("gold",))
    out["weapon_mage"] = out["weapon_mage_crystal"]
    out["weapon_mage_back"] = out["weapon_mage_crystal_back"]

    # 3b. fire: Crimson Inferno Flame Staff
    p = Part()
    p.capsule([(42.4, 57.0), (42.4, 26.8)], [1.15, 1.3], "wood_dark")
    p.ellipse(42.4, 57.2, 1.25, 1.25, "gold")
    p.capsule([(38.4, 22.8), (40.2, 26.4), (44.6, 26.4), (46.4, 22.8)], [0.9, 1.4, 1.4, 0.9], "gold")
    p.ellipse(42.4, 20.6, 3.3, 3.6, "ruby_gem")
    p.ellipse(42.2, 19.8, 1.8, 2.2, "sun_gold", flat=0.35)
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "hat_red")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "sun_gold")
    add_pair("weapon_mage_fire", p, ("ruby_gem", "sun_gold", "gold"), pb, ("sun_gold",))

    # 3c. moon: Silver Crescent Moon Staff
    p = Part()
    p.capsule([(42.4, 57.0), (42.4, 26.8)], [1.1, 1.25], "steel")
    p.ellipse(42.4, 57.2, 1.25, 1.25, "gold")
    p.ellipse(41.8, 20.4, 4.4, 4.8, "steel")
    p.erase(ellipse_mask(44.2, 20.2, 3.2, 3.8))
    p.ellipse(43.8, 20.4, 1.9, 1.9, "magic_cyan", flat=0.3)
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "shield_blue")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "cloth_white")
    add_pair("weapon_mage_moon", p, ("steel", "magic_cyan"), pb, ("steel",))

    # 3d. grim: Amethyst Void Rune Staff
    p = Part()
    p.capsule([(42.4, 57.0), (42.4, 26.4)], [1.15, 1.3], "charcoal")
    p.poly([(39.4, 24.4), (45.4, 24.4), (44.0, 27.4), (40.8, 27.4)], "iron_dark")
    p.poly([(42.4, 13.6), (45.4, 19.6), (42.4, 24.8), (39.4, 19.6)], "amethyst")
    p.ellipse(41.8, 18.8, 1.1, 1.4, "cloth_white", flat=0.4)
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "charcoal")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "amethyst")
    add_pair("weapon_mage_grim", p, ("amethyst", "iron_dark"), pb, ("amethyst",))

    # ==================== 4. KNIGHT (4 weapons) ====================
    # 4a. lance: Kite Shield + Ribbon Lance
    p = Part()
    p.capsule([(43.0, 57.2), (43.0, 24.0)], [1.1, 1.25], "leather")
    p.poly([(40.4, 37.8), (45.6, 37.8), (44.4, 40.4), (41.6, 40.4)], "steel")
    p.ellipse(43.0, 24.4, 1.65, 1.2, "gold")
    p.poly([(43.2, 24.4), (48.4, 26.8), (46.8, 28.6), (43.2, 26.2)], "hat_red")
    p.poly([(41.0, 24.0), (43.0, 13.6), (45.0, 24.0)], "steel")
    p.poly([(14.8, 33.4), (25.6, 33.4), (25.2, 41.8), (20.2, 47.8), (15.2, 41.8)], "steel")
    p.poly([(16.2, 34.8), (24.2, 34.8), (23.8, 41.2), (20.2, 46.0), (16.6, 41.2)], "shield_blue")
    p.poly([(19.4, 36.2), (21.0, 36.2), (21.0, 44.0), (19.4, 44.0)], "gold")
    p.poly([(17.4, 38.6), (23.0, 38.6), (23.0, 40.2), (17.4, 40.2)], "gold")
    add_pair("weapon_knight_lance", p, ("steel", "gold"))
    out["weapon_knight"] = out["weapon_knight_lance"]
    out["weapon_knight_back"] = out["weapon_knight_lance_back"]

    # 4b. royal: Golden Royal Sword + Crimson Winged Shield
    p = Part()
    p.poly([(41.0, 37.0), (50.8, 24.4), (53.6, 21.4), (52.0, 25.6), (43.0, 38.8)], "steel")
    p.capsule([(39.2, 36.6), (41.8, 38.4), (44.0, 40.4)], [1.15, 1.4, 1.15], "gold")
    p.capsule([(39.4, 41.4), (41.6, 38.8)], [1.1, 1.1], "hat_red")
    p.poly([(14.8, 33.4), (25.6, 33.4), (25.2, 41.8), (20.2, 47.8), (15.2, 41.8)], "gold")
    p.poly([(16.2, 34.8), (24.2, 34.8), (23.8, 41.2), (20.2, 46.0), (16.6, 41.2)], "hat_red")
    p.ellipse(20.2, 39.6, 2.0, 2.4, "gold")
    add_pair("weapon_knight_royal", p, ("steel", "gold"))

    # 4c. halberd: Steel Halberd + Round Viking Shield
    p = Part()
    p.capsule([(43.0, 57.2), (43.0, 22.0)], [1.15, 1.2], "wood_dark")
    p.poly([(41.6, 23.0), (43.0, 14.0), (44.4, 23.0)], "steel")
    p.poly([(43.0, 20.6), (49.2, 18.8), (50.6, 24.8), (47.4, 28.4), (43.0, 25.8)], "steel")
    p.ellipse(20.2, 39.6, 5.4, 5.8, "steel")
    p.ellipse(20.2, 39.6, 4.0, 4.4, "wood_oak")
    p.ellipse(20.2, 39.6, 1.8, 1.9, "gold")
    add_pair("weapon_knight_halberd", p, ("steel", "gold"))

    # 4d. dragon: Amethyst Dragon Spear + Dark Kite Shield
    p = Part()
    p.capsule([(43.0, 57.2), (43.0, 24.2)], [1.15, 1.2], "iron_dark")
    p.poly([(40.6, 24.6), (43.0, 13.6), (45.4, 24.6)], "amethyst")
    p.capsule([(40.2, 25.0), (43.0, 26.4), (45.8, 25.0)], [1.0, 1.3, 1.0], "gold")
    p.poly([(14.8, 33.4), (25.6, 33.4), (25.2, 41.8), (20.2, 47.8), (15.2, 41.8)], "iron_dark")
    p.poly([(16.2, 34.8), (24.2, 34.8), (23.8, 41.2), (20.2, 46.0), (16.6, 41.2)], "hat_purple")
    p.ellipse(20.2, 39.6, 1.8, 2.2, "ruby_gem")
    add_pair("weapon_knight_dragon", p, ("gold", "amethyst", "ruby_gem"))

    # ==================== 5. PRIEST (4 weapons) ====================
    # 5a. sun: Winged Sun Crosier
    p = Part()
    p.capsule([(42.4, 57.0), (42.4, 26.8)], [1.1, 1.25], "gold")
    p.poly([(42.0, 25.0), (36.8, 20.6), (38.0, 18.2), (42.2, 22.0)], "cloth_white")
    p.poly([(42.8, 25.0), (48.0, 20.6), (46.8, 18.2), (42.6, 22.0)], "cloth_white")
    p.ellipse(42.4, 21.4, 3.2, 3.2, "gold")
    p.ellipse(42.4, 21.4, 1.85, 1.85, "sun_gold", flat=0.35)
    p.ellipse(42.4, 17.4, 1.0, 1.4, "gold")
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "cloth_white")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "gold")
    add_pair("weapon_priest_sun", p, ("gold", "sun_gold"), pb, ("gold",))
    out["weapon_priest"] = out["weapon_priest_sun"]
    out["weapon_priest_back"] = out["weapon_priest_sun_back"]

    # 5b. angel: Emerald Healing Angel Staff
    p = Part()
    p.capsule([(42.4, 57.0), (42.4, 26.8)], [1.1, 1.25], "steel")
    p.poly([(42.0, 24.4), (36.6, 19.8), (38.2, 16.8), (42.2, 21.6)], "cloth_white")
    p.poly([(42.8, 24.4), (48.2, 19.8), (46.6, 16.8), (42.6, 21.6)], "cloth_white")
    p.poly([(42.4, 16.2), (45.2, 21.0), (42.4, 25.6), (39.6, 21.0)], "emerald_glow")
    p.ellipse(41.8, 20.2, 1.1, 1.3, "cloth_white", flat=0.4)
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "shield_blue")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "cloth_white")
    add_pair("weapon_priest_angel", p, ("steel", "emerald_glow"), pb, ("steel",))

    # 5c. mace: Golden Cleric Holy Mace
    p = Part()
    p.capsule([(40.6, 40.6), (48.6, 24.8)], [1.15, 1.35], "wood_oak")
    p.ellipse(48.8, 24.2, 3.1, 3.1, "gold")
    for fx, fy in [(45.8, 22.8), (51.8, 25.6), (47.4, 20.8), (50.4, 27.4)]:
        p.ellipse(fx, fy, 1.25, 1.25, "sun_gold")
    p.ellipse(40.2, 41.2, 1.3, 1.3, "gold")
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "cloth_white")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "gold")
    add_pair("weapon_priest_mace", p, ("gold", "sun_gold"), pb, ("gold",))

    # 5d. lantern: Warm Sun-Lantern Shepherd's Crosier
    p = Part()
    p.capsule([(42.0, 57.0), (42.0, 24.0), (43.8, 19.6), (47.2, 20.0), (48.2, 23.0)], [1.15, 1.2, 1.15, 1.0, 0.85], "wood_oak")
    p.poly([(46.2, 24.2), (50.2, 24.2), (49.6, 30.2), (46.8, 30.2)], "sun_gold", flat=0.35)
    p.ellipse(48.2, 23.8, 2.2, 0.9, "gold")
    p.ellipse(48.2, 30.4, 1.8, 0.8, "gold")
    pb = Part()
    pb.poly([(17.6, 38.6), (23.8, 37.6), (24.4, 46.8), (18.2, 47.8)], "cloth_white")
    pb.ellipse(21.0, 42.6, 1.25, 1.45, "gold")
    add_pair("weapon_priest_lantern", p, ("gold", "sun_gold"), pb, ("gold",))

    return out
