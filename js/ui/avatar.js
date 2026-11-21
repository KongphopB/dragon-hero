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

  function layer(src, cls, style) {
    return '<img class="px-layer ' + cls + '" src="' + src + '" alt=""' + (style ? ' style="' + style + '"' : '') + '>';
  }

  /**
   * opts.large / opts.xl  bigger stack
   * opts.walking          walk cycle (cutscenes, lobby patrol)
   * opts.backView         seen from behind
   * opts.still            no idle motion (tiny thumbnails)
   */
  function renderAvatar(look, job, opts) {
    opts = opts || {};
    look = look || {};
    job = job || "warrior";
    var sk = (look.skin || 0) % 4;
    var hr = (look.hair || 0) % 6;
    var hc = (look.hairColor || 0) % 6;
    var oc = (look.outfit || 0) % 8;
    var ht = (look.hat || 0) % 6;
    var mode = opts.walking ? " is-walking" : (opts.still ? "" : " is-idle");
    var cls = "avatar-stack job-" + job + (opts.xl ? " xl" : (opts.large ? " lg" : "")) + mode;
    var base = "assets/characters/parts/";
    var grip = "transform-origin:" + (GRIP[job] || "60% 70%");

    function outfitLayers() {
      if (!opts.walking) return layer(base + "outfits/outfit_" + oc + ".png", "lyr-torso");
      return layer(base + "outfits/outfit_" + oc + ".png", "step-idle") +
        layer(base + "outfits/outfit_" + oc + "_s1.png", "step-s1") +
        layer(base + "outfits/outfit_" + oc + "_s2.png", "step-s2");
    }

    var html = '<div class="' + cls + '">';
    if (opts.backView) {
      html += layer(base + "weapons/" + job + ".png", "px-bob lyr-torso");
      html += layer(base + "body/skin_" + sk + "_back.png", "px-bob lyr-torso");
      html += outfitLayers();
      html += layer(base + "hair/h" + hr + "_c" + hc + "_back.png", "px-bob lyr-head");
      if (ht > 0) html += layer(base + "hats/hat_" + ht + ".png", "px-bob lyr-hat");
      html += layer(base + "weapons/" + job + "_back.png", "px-bob lyr-torso");
    } else {
      html += layer(base + "weapons/" + job + "_back.png", "px-bob lyr-torso");
      html += layer(base + "body/skin_" + sk + ".png", "px-bob lyr-torso");
      if (!opts.walking && !opts.still) html += layer(base + "body/blink_" + sk + ".png", "lyr-blink");
      html += outfitLayers();
      html += layer(base + "hair/h" + hr + "_c" + hc + ".png", "px-bob lyr-head");
      if (ht > 0) html += layer(base + "hats/hat_" + ht + ".png", "px-bob lyr-hat");
      html += layer(base + "weapons/" + job + ".png", "px-bob lyr-weapon", grip);
    }
    html += '</div>';
    return html;
  }

  DH.Avatar = {
    render: renderAvatar,
    attackStyle: function (job) { return ATTACK_STYLE[job] || "melee"; }
  };
})(window);
