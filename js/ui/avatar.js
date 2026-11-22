(function (global) {
  var DH = global.DH = global.DH || {};

  // Where each job's hand grips its weapon on the 64x64 grid (used as the swing pivot).
  var GRIP = {
    warrior: "64% 62%",
    archer:  "66% 59%",
    mage:    "66% 62%",
    priest:  "66% 62%",
    knight:  "50% 60%"
  };

  // Melee jobs dash in; ranged jobs fire a projectile from where they stand.
  var ATTACK_STYLE = { warrior: "melee", knight: "melee", archer: "ranged", mage: "ranged", priest: "ranged" };

  function palette(look) {
    var P = DH.AVATAR_PALETTES;
    var eyeP = P.eye || [[56, 86, 152]];
    return {
      skin: P.skin[look.skin % P.skin.length],
      hair: P.hair[look.hairColor % P.hair.length],
      eye:  eyeP[(look.eyeColor || 0) % eyeP.length],
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
    var race = look.race, rv = look.raceVar;
    var cls = "avatar-stack race-" + race + " job-" + job + (opts.xl ? " xl" : (opts.large ? " lg" : "")) + mode;
    var grip = "transform-origin:" + (GRIP[job] || "60% 70%");
    var wList = DH.AVATAR.weapons && DH.AVATAR.weapons[job];
    var wId = (look.weapons && look.weapons[job]) || (wList && wList[0].id) || "";
    var wKey = (wId && DH.AvatarColor.has("weapon_" + job + "_" + wId)) ? ("weapon_" + job + "_" + wId) : ("weapon_" + job);

    function walkLayer(base, pal, cls) {
      if (!opts.walking || !DH.AvatarColor.has(base + "_s1")) return img(base, pal, cls);
      return img(base, pal, cls + " step-idle") +
        img(base + "_s1", pal, cls + " step-s1") +
        img(base + "_s2", pal, cls + " step-s2");
    }
    function outfit() {
      return walkLayer("outfit_" + look.outfit, pal, "px-bob lyr-torso");
    }
    function tail() {
      if (race === "beast") return img("race_beast_tail_" + (rv || "cat"), pal, "px-bob lyr-tail");
      if (race === "demon") return img("race_demon_tail", pal, "px-bob lyr-tail");
      return "";
    }
    function cape() {
      return look.acc === "cape" ? img("acc_cape", pal, "px-bob lyr-cape") : (look.acc === "wings" ? img("acc_wings", pal, "px-bob lyr-wings") : "");
    }
    function headTop() {
      var h = "";
      if (race === "beast") h += img("race_beast_ears_" + (rv || "cat"), pal, "px-bob lyr-head");
      if (race === "demon") h += img("race_demon_horns_" + (rv || "small"), pal, "px-bob lyr-head");
      if (look.hat) h += img("hat_" + look.hat, pal, "px-bob lyr-hat");
      return h;
    }

    var html = '<div class="' + cls + '"><div class="av-scale">';
    if (opts.backView) {
      html += img(wKey, pal, "px-bob lyr-weapon", grip);
      html += walkLayer("body_back", pal, "px-bob lyr-torso");
      html += outfit();
      html += tail() + cape();
      html += img("hair_" + look.hair + "_back", pal, "px-bob lyr-head");
      if (race === "elf") html += img("race_elf_ears", pal, "px-bob lyr-head");
      html += headTop();
      html += img(wKey + "_back", pal, "px-bob lyr-torso");
    } else {
      html += cape() + tail();
      html += img(wKey + "_back", pal, "px-bob lyr-torso");
      html += img("hair_" + look.hair + "_behind", pal, "px-bob lyr-head");
      html += walkLayer("body", pal, "px-bob lyr-head");
      html += img("eyes_" + look.eyes, pal, "px-bob lyr-head");
      if (!opts.walking && !opts.still) html += img("eyes_" + look.eyes + "_blink", pal, "lyr-blink");
      html += img("mouth_" + look.mouth, pal, "px-bob lyr-head");
      if (look.blush) html += img("blush", pal, "px-bob lyr-head");
      html += outfit();
      if (look.beard) html += img("beard_" + look.beard, pal, "px-bob lyr-head");
      if (look.acc === "scarf") html += img("acc_scarf", pal, "px-bob lyr-torso");
      if (look.acc === "cape") html += img("acc_cape_front", pal, "px-bob lyr-torso");
      html += img("hair_" + look.hair, pal, "px-bob lyr-head");
      if (race === "elf") html += img("race_elf_ears", pal, "px-bob lyr-head");
      if (look.acc === "glasses" || look.acc === "eyepatch") html += img("acc_" + look.acc, pal, "px-bob lyr-head");
      if (look.acc === "flower") html += img("acc_flower", pal, "px-bob lyr-head");
      html += headTop();
      html += img(wKey, pal, "px-bob lyr-weapon", grip);
    }
    html += '</div>';
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
