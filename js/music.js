/* ============================================================
   Фоновый синтвейв. Мелодия своя и играется кодом (Web Audio),
   аудиофайлы не нужны.
   Громкость: VOLUME, темп: BPM, ноты: CHORDS и LEAD.
   ============================================================ */
(() => {
  const VOLUME = 0.32;
  const BPM = 84;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

  // аккорды по тактам: бас и ноты аккорда (номера MIDI)
  const CHORDS = [
    { bass: 45, notes: [57, 60, 64, 71] }, // Am(add9)
    { bass: 41, notes: [57, 60, 64, 65] }, // Fmaj7
    { bass: 48, notes: [55, 59, 60, 64] }, // Cmaj7
    { bass: 43, notes: [55, 59, 62, 64] }  // G6
  ];
  // мелодия на 8 тактов: [доля такта, нота, длина в долях]
  const LEAD = [
    [[0, 76, 1.5], [2, 74, 1], [3, 72, 1]],
    [[0, 69, 3]],
    [[0, 72, 1], [1, 74, 1], [2, 76, 2]],
    [[0, 74, 3]],
    [[0, 76, 1.5], [2, 79, 1], [3, 76, 1]],
    [[0, 77, 1], [1, 76, 1], [2, 72, 2]],
    [[0, 76, 2], [2, 72, 2]],
    [[0, 74, 1.5], [1.5, 71, 2.5]]
  ];

  // собирает инструменты; возвращает функцию, которая ставит в очередь один такт
  function createBand(ctx) {
    const master = ctx.createGain();
    master.gain.value = 0;
    const soft = ctx.createBiquadFilter(); // срезаем резкие верха
    soft.type = "lowpass";
    soft.frequency.value = 4200;
    soft.connect(master).connect(ctx.destination);

    // мягкое эхо для мелодии и арпеджио
    const echo = ctx.createDelay(2), feedback = ctx.createGain(), wet = ctx.createGain();
    echo.delayTime.value = BEAT * 0.75;
    feedback.gain.value = 0.34;
    wet.gain.value = 0.35;
    echo.connect(feedback).connect(echo);
    echo.connect(wet).connect(soft);

    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    noise.getChannelData(0).forEach((_, i, d) => { d[i] = Math.random() * 2 - 1; });

    function tone(t, midi, len, o) {
      const osc = ctx.createOscillator(), gain = ctx.createGain(), lp = ctx.createBiquadFilter();
      osc.type = o.type;
      osc.frequency.value = hz(midi);
      osc.detune.value = o.detune || 0;
      lp.type = "lowpass";
      lp.frequency.value = o.cut;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(o.vol, t + o.attack);
      gain.gain.setValueAtTime(o.vol, t + Math.max(o.attack, len - o.release));
      gain.gain.linearRampToValueAtTime(0, t + len);
      osc.connect(lp).connect(gain).connect(soft);
      if (o.echo) gain.connect(echo);
      osc.start(t);
      osc.stop(t + len + 0.05);
    }

    function kick(t) {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      gain.gain.setValueAtTime(0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain).connect(soft);
      osc.start(t);
      osc.stop(t + 0.25);
    }

    function hat(t) {
      const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), gain = ctx.createGain();
      src.buffer = noise;
      hp.type = "highpass";
      hp.frequency.value = 6500;
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      src.connect(hp).connect(gain).connect(soft);
      src.start(t);
    }

    // круг из 16 тактов: 8 тактов фона, затем 8 тактов с мелодией
    function scheduleBar(n, t) {
      const chord = CHORDS[n % 4];
      chord.notes.forEach(m => [-7, 7].forEach(detune =>
        tone(t, m, BAR + 0.5, { type: "sawtooth", detune, vol: 0.035, cut: 900, attack: 0.7, release: 0.9 })));
      for (let i = 0; i < 8; i++) {
        tone(t + i * BEAT / 2, chord.bass, BEAT * 0.45, { type: "triangle", vol: i % 2 ? 0.13 : 0.19, cut: 600, attack: 0.02, release: 0.12 });
        const order = [0, 1, 2, 3, 2, 1, 2, 3];
        tone(t + i * BEAT / 2, chord.notes[order[i]] + 12, BEAT * 0.4, { type: "square", vol: 0.022, cut: 2200, attack: 0.01, release: 0.25, echo: true });
      }
      if (n % 16 >= 2) { // первые такты без ударных
        kick(t);
        kick(t + BEAT * 2);
        for (let i = 1; i < 8; i += 2) hat(t + i * BEAT / 2);
      }
      if (n % 16 >= 8) LEAD[n % 8].forEach(([beat, m, len]) =>
        tone(t + beat * BEAT, m, len * BEAT, { type: "triangle", vol: 0.13, cut: 3000, attack: 0.06, release: 0.3, echo: true }));
    }

    return { master, scheduleBar };
  }

  window.SynthMusic = { createBand, BAR, VOLUME };

  /* ---------- включение командой music ---------- */
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  let ctx, band, timer, bar = 0, nextTime = 0, on = false;

  function tick() { // заранее ставим в очередь ближайшие такты
    while (nextTime < ctx.currentTime + 1.5) {
      band.scheduleBar(bar++, Math.max(nextTime, ctx.currentTime + 0.05));
      nextTime = Math.max(nextTime, ctx.currentTime + 0.05) + BAR;
    }
  }

  function setMusic(value) {
    if (value === on) return;
    on = value;
    clearInterval(timer);
    if (on) {
      ctx = new AC();
      band = createBand(ctx);
      band.master.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + 1.2);
      bar = 0;
      nextTime = 0;
      ctx.resume();
      tick();
      timer = setInterval(tick, 300);
    } else if (ctx) {
      const old = ctx;
      band.master.gain.cancelScheduledValues(old.currentTime);
      band.master.gain.setTargetAtTime(0, old.currentTime, 0.08);
      setTimeout(() => old.close(), 400);
      ctx = null;
    }
  }

  window.SynthMusic.set = setMusic;
  window.SynthMusic.isOn = () => on;

  // свёрнутая вкладка не играет
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
})();
