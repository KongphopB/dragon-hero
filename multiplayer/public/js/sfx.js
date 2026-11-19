// Retro 8-bit Web Audio SFX Synthesizer (zero external audio files)
(function (global) {
  var ctx = null;
  var enabled = true;

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume().catch(function () {});
    return ctx;
  }

  function tone(freq, dur, type, vol, delay, slideTo) {
    var c = ensure();
    if (!c) return;
    var now = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);
    gain.gain.setValueAtTime(vol || 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  var SFX = {
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; },
    join: function () { tone(523, 0.08, "triangle", 0.09, 0); tone(659, 0.12, "triangle", 0.09, 0.07); },
    tick: function () { tone(880, 0.05, "square", 0.04, 0); },
    card: function () { tone(440, 0.08, "sine", 0.1, 0, 880); tone(880, 0.14, "triangle", 0.09, 0.08, 1320); },
    hit: function () { tone(260, 0.09, "sawtooth", 0.12, 0, 90); tone(520, 0.12, "square", 0.08, 0.05, 780); },
    hurt: function () { tone(180, 0.18, "sawtooth", 0.13, 0, 75); tone(120, 0.2, "square", 0.09, 0.08, 55); },
    roar: function () { tone(140, 0.35, "sawtooth", 0.14, 0, 55); tone(105, 0.4, "square", 0.1, 0.1, 45); },
    win: function () {
      [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.18, "triangle", 0.11, i * 0.11); });
    },
    lose: function () {
      [392, 349, 311, 261].forEach(function (f, i) { tone(f, 0.25, "sawtooth", 0.09, i * 0.16); });
    }
  };
  global.SFX = SFX;
})(window);
