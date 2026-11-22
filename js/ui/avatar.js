(function (global) {
  var DH = global.DH = global.DH || {};

  // Where each job's hand grips its weapon on the 48x48 grid (used as the swing pivot).
  var GRIP = {
    warrior: "66% 74%",
    archer:  "68% 62%",
    mage:    "75% 66%",
    priest:  "75% 66%",
    knight:  "50% 60%"
  };

  // Melee jobs dash in; ranged jobs fire a projectile from where they stand.
  var ATTACK_STYLE = { warrior: "melee", knight: "melee", archer: "ranged", mage: "ranged", priest: "ranged" };

  function palette(look) {
    var P = DH.AVATAR_PALETTES;
    return {
      skin: P.skin[look.skin % P.skin.length],
      hair: P.hair[look.hairColor % P.hair.length],
      main: P.cloth[look.main % P.cloth.length],
      trim: P.cloth[look.trim % P.cloth.length]
    };
  }

  function img(name, pal, cls, style) {
    if (!DH.AvatarColor.has(name)) return "";
    return '<img class="px-layer ' + cls + '" src="' + DH.AvatarColor.url(name, pal) + '" alt=""' + (style ? ' style="' + style + '"' : '') + '>';
  }

  /**
   * look: the saved look (old v1 looks are upgraded on the fly)
   * opts.large / opts.xl  bigger stack
   * opts.walking          walk cycle (cutscenes, lobby patrol)
   * opts.backView         seen from behind
   * opts.still            no idle motion and no pet (thumbnails)
   * opts.noPet            hide the pet
   */
  function renderAvatar(look, job, opts) {
    opts = opts || {};
    job = job || "warrior";
    look = DH.AVATAR.normalize(look, job);
    var pal = palette(look);
    var mode = opts.walking ? " is-walking" : (opts.still ? "" : " is-idle");
    var cls = "avatar-stack job-" + job + (opts.xl ? " xl" : (opts.large ? " lg" : "")) + mode;
    var grip = "transform-origin:" + (GRIP[job] || "60% 70%");
    var race = look.race, rv = look.raceVar;

    function outfit() {
      var base = "outfit_" + look.outfit;
      if (!opts.walking) return img(base, pal, "lyr-torso");
      return img(base, pal, "step-idle") + img(base + "_s1", pal, "step-s1") + img(base + "_s2", pal, "step-s2");
    }
    function tail() {
      if (race === "beast") return img("race_beast_tail_" + (rv || "cat"), pal, "lyr-tail");
      if (race === "demon") return img("race_demon_tail", pal, "lyr-tail");
      return "";
    }
    function cape() {
      return look.acc === "cape" ? img("acc_cape", pal, "lyr-cape") : (look.acc === "wings" ? img("acc_wings", pal, "lyr-wings") : "");
    }
    function headTop() {
      var h = "";
      if (race === "beast") h += img("race_beast_ears_" + (rv || "cat"), pal, "lyr-head");
      if (race === "demon") h += img("race_demon_horns_" + (rv || "small"), pal, "lyr-head");
      if (look.hat) h += img("hat_" + look.hat, pal, "lyr-hat");
      return h;
    }

    var html = '<div class="' + cls + '">';
    if (opts.backView) {
      html += img("weapon_" + job, pal, "px-bob lyr-torso");
      html += img("body_back", pal, "px-bob lyr-torso");
      html += outfit();
      html += tail() + cape();
      html += img("hair_" + look.hair + "_back", pal, "px-bob lyr-head");
      if (race === "elf") html += img("race_elf_ears", pal, "px-bob lyr-torso");
      html += headTop();
      html += img("weapon_" + job + "_back", pal, "px-bob lyr-torso");
    } else {
      html += cape() + tail();
      html += img("weapon_" + job + "_back", pal, "px-bob lyr-torso");
      html += img("body", pal, "px-bob lyr-torso");
      html += img("eyes_" + look.eyes, pal, "lyr-torso");
      if (!opts.walking && !opts.still) html += img("eyes_" + look.eyes + "_blink", pal, "lyr-blink");
      html += img("mouth_" + look.mouth, pal, "lyr-torso");
      if (look.blush) html += img("blush", pal, "lyr-torso");
      html += outfit();
      if (race === "dwarf") html += img("race_dwarf_beard", pal, "lyr-torso");
      if (look.acc === "scarf") html += img("acc_scarf", pal, "lyr-torso");
      if (look.acc === "cape") html += img("acc_cape_front", pal, "lyr-torso");
      html += img("hair_" + look.hair, pal, "px-bob lyr-head");
      if (race === "elf") html += img("race_elf_ears", pal, "lyr-torso");
      if (look.acc === "glasses" || look.acc === "eyepatch") html += img("acc_" + look.acc, pal, "lyr-torso");
      if (look.acc === "flower") html += img("acc_flower", pal, "lyr-head");
      html += headTop();
      html += img("weapon_" + job, pal, "px-bob lyr-weapon", grip);
    }
    if (look.pet && !opts.still && !opts.noPet) {
      html += '<img class="av-pet pet-' + look.pet + '" src="' + DH.AvatarColor.url("pet_" + look.pet, pal) + '" alt="">';
    }
    html += '</div>';
    return html;
  }

  DH.Avatar = {
    render: renderAvatar,
    palette: function (look, job) { return palette(DH.AVATAR.normalize(look, job)); },
    attackStyle: function (job) { return ATTACK_STYLE[job] || "melee"; }
  };
})(window);
