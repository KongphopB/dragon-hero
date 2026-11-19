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
    var cls = "avatar-stack" + (opts.large ? " lg" : "") + (opts.walking ? " is-walking" : "");
    var base = "assets/characters/parts/";

    var html = '<div class="' + cls + '">';
    if (opts.backView) {
      // Back-view layer order: weapon -> skin_back -> outfit -> hair_back -> hat -> cape on back
      html += '<img class="px-layer px-bob" src="' + base + 'weapons/' + job + '.png" alt="">';
      html += '<img class="px-layer px-bob" src="' + base + 'body/skin_' + sk + '_back.png" alt="">';
      if (opts.walking) {
        html += '<img class="px-layer step-idle" src="' + base + 'outfits/outfit_' + oc + '.png" alt="">';
        html += '<img class="px-layer step-s1" src="' + base + 'outfits/outfit_' + oc + '_s1.png" alt="">';
        html += '<img class="px-layer step-s2" src="' + base + 'outfits/outfit_' + oc + '_s2.png" alt="">';
      } else {
        html += '<img class="px-layer" src="' + base + 'outfits/outfit_' + oc + '.png" alt="">';
      }
      html += '<img class="px-layer px-bob" src="' + base + 'hair/h' + hr + '_c' + hc + '_back.png" alt="">';
      if (ht > 0) html += '<img class="px-layer px-bob" src="' + base + 'hats/hat_' + ht + '.png" alt="">';
      html += '<img class="px-layer px-bob" src="' + base + 'weapons/' + job + '_back.png" alt="">';
    } else {
      html += '<img class="px-layer px-bob" src="' + base + 'weapons/' + job + '_back.png" alt="">';
      html += '<img class="px-layer px-bob" src="' + base + 'body/skin_' + sk + '.png" alt="">';
      if (opts.walking) {
        html += '<img class="px-layer step-idle" src="' + base + 'outfits/outfit_' + oc + '.png" alt="">';
        html += '<img class="px-layer step-s1" src="' + base + 'outfits/outfit_' + oc + '_s1.png" alt="">';
        html += '<img class="px-layer step-s2" src="' + base + 'outfits/outfit_' + oc + '_s2.png" alt="">';
      } else {
        html += '<img class="px-layer" src="' + base + 'outfits/outfit_' + oc + '.png" alt="">';
      }
      html += '<img class="px-layer px-bob" src="' + base + 'hair/h' + hr + '_c' + hc + '.png" alt="">';
      if (ht > 0) html += '<img class="px-layer px-bob" src="' + base + 'hats/hat_' + ht + '.png" alt="">';
      html += '<img class="px-layer px-bob" src="' + base + 'weapons/' + job + '.png" alt="">';
    }
    html += '</div>';
    return html;
  }

  DH.Avatar = {
    render: renderAvatar
  };
})(window);
