(function (global) {
  var DH = global.DH = global.DH || {};

  function renderAvatar(look, job, opts) {
    opts = opts || {};
    look = look || {};
    job = job || "warrior";
    var sk = (look.skin || 0) % 4;
    var hr = (look.hair || 0) % 6;
    var hc = (look.hairColor || 0) % 6;
    var oc = (look.outfit || 0) % 8;
    var ht = (look.hat || 0) % 6;
    var cls = "avatar-stack" + (opts.large ? " lg" : "");
    var base = "assets/characters/parts/";

    var layers = [
      base + "weapons/" + job + "_back.png",
      base + "body/skin_" + sk + ".png",
      base + "outfits/outfit_" + oc + ".png",
      base + "hair/h" + hr + "_c" + hc + ".png"
    ];
    if (ht > 0) layers.push(base + "hats/hat_" + ht + ".png");
    layers.push(base + "weapons/" + job + ".png");

    return '<div class="' + cls + '">' +
      layers.map(function (src) {
        return '<img class="px-layer" src="' + src + '" alt="">';
      }).join("") +
    '</div>';
  }

  DH.Avatar = {
    render: renderAvatar
  };
})(window);
