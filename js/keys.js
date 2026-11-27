/* ============================================================
   Звук механической клавиатуры при печати. Звуки собираются
   кодом (Web Audio), аудиофайлы не нужны.
   Громкость: VOLUME.
   ============================================================ */
(() => {
  const VOLUME = 0.5;

  /* Один удар. Клавиша звучит не тоном, а коротким глухим «ток»:
     тихий щелчок переключателя, через несколько миллисекунд удар
     о дно и быстро затухающий отклик пластика и корпуса. */
  const KINDS = {
    //        длина  щелчок  удар: яркость, затухание, сила;  отклики: [Гц, затухание, сила]
    press:   { len: 0.085, tick: 0.16, cut: 2100, decay: 0.0075, hit: 1.0, peak: 0.62,
               modes: [[165, 0.014, 0.55], [430, 0.009, 0.34], [1150, 0.0045, 0.16], [2600, 0.002, 0.05]] },
    // пробел, Enter, Backspace: ниже, длиннее и с лёгким дребезгом стабилизатора
    big:     { len: 0.12, tick: 0.12, cut: 1500, decay: 0.012, hit: 1.0, peak: 0.72, rattle: 0.22,
               modes: [[112, 0.022, 0.7], [290, 0.014, 0.38], [820, 0.006, 0.15], [1900, 0.0025, 0.05]] },
    // клавиша возвращается вверх: тише и чуть звонче
    release: { len: 0.05, tick: 0.1, cut: 3000, decay: 0.0035, hit: 0.7, peak: 0.2,
               modes: [[310, 0.006, 0.25], [1500, 0.003, 0.18], [3100, 0.0015, 0.06]] }
  };

  function synth(kind, rate, random = Math.random) {
    const k = KINDS[kind];
    const out = new Float32Array(Math.floor(rate * k.len));
    const vary = amount => 1 - amount + random() * amount * 2;

    // шумовой удар, начиная с момента at
    function hit(at, level, cut, decay) {
      const a = 1 - Math.exp(-2 * Math.PI * cut / rate);
      let low = 0, lower = 0;
      for (let i = Math.floor(at * rate); i < out.length; i++) {
        const t = i / rate - at;
        low += a * (random() * 2 - 1 - low);
        lower += a * (low - lower); // два фильтра подряд убирают шипение
        out[i] += lower * level * 2.6 * Math.exp(-t / decay) * Math.min(1, t / 0.0004);
      }
    }

    // щелчок переключателя: совсем короткий и тихий
    let previous = 0;
    for (let i = 0; i < Math.min(out.length, rate * 0.006); i++) {
      const white = random() * 2 - 1;
      out[i] += (white - previous) * 0.5 * k.tick * Math.exp(-i / rate / 0.0009);
      previous = white;
    }

    const bottom = 0.006 * vary(0.3); // удар о дно
    hit(bottom, k.hit, k.cut * vary(0.12), k.decay * vary(0.15));
    if (k.rattle) hit(bottom + 0.016 * vary(0.25), k.rattle, 2400, 0.004);

    k.modes.forEach(([freq, decay, level]) => {
      const f = freq * vary(0.07), amp = level * vary(0.2);
      for (let i = Math.floor(bottom * rate); i < out.length; i++) {
        const t = i / rate - bottom;
        out[i] += Math.sin(2 * Math.PI * f * t) * amp * Math.exp(-t / decay) * Math.min(1, t / 0.0006);
      }
    });

    // общая громкость и мягкий хвост без щелчка в конце
    let max = 0;
    for (const v of out) max = Math.max(max, Math.abs(v));
    const fade = Math.floor(rate * 0.008);
    for (let i = 0; i < out.length; i++) out[i] *= (k.peak / max) * Math.min(1, (out.length - 1 - i) / fade);
    return out;
  }

  window.KeySound = { synth };

  const AC = window.AudioContext || window.webkitAudioContext;
  const input = typeof document !== "undefined" && document.getElementById("cmd");
  if (!AC || !input) return;

  let ctx, output, bank, last = -1;

  // браузер разрешает звук только после действия человека
  function ready() {
    if (!ctx) {
      ctx = new AC();
      output = ctx.createGain();
      output.gain.value = VOLUME;
      output.connect(ctx.destination);
      bank = {};
      Object.keys(KINDS).forEach(kind => { // по несколько вариантов каждого звука
        bank[kind] = Array.from({ length: kind === "big" ? 4 : 7 }, () => {
          const data = synth(kind, ctx.sampleRate);
          const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
          buffer.getChannelData(0).set(data);
          return buffer;
        });
      });
    }
    if (ctx.state !== "running") ctx.resume();
  }

  function play(kind, delay) {
    const list = bank[kind];
    let i = Math.floor(Math.random() * list.length);
    if (kind === "press" && i === last) i = (i + 1) % list.length; // не повторяем подряд
    if (kind === "press") last = i;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = list[i];
    source.playbackRate.value = 0.96 + Math.random() * 0.08;
    gain.gain.value = 0.82 + Math.random() * 0.18; // жмут не всегда с одной силой
    source.connect(gain).connect(output);
    source.start(ctx.currentTime + delay);
  }

  function stroke(big) {
    ready();
    play(big ? "big" : "press", 0);
    play("release", 0.075 + Math.random() * 0.05);
  }

  // событие input срабатывает и на экранной клавиатуре телефона
  input.addEventListener("input", e => {
    stroke(e.data === " " || String(e.inputType).startsWith("delete"));
  });
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.repeat) stroke(true); });
  ["pointerup", "touchend", "keydown"].forEach(n => document.addEventListener(n, ready, { capture: true, passive: true }));
})();
