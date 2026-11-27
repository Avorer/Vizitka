/* ============================================================
   Звук клавиш при печати. Играется кодом (Web Audio),
   аудиофайлы не нужны. Громкость: VOLUME.
   ============================================================ */
(() => {
  const VOLUME = 0.35;
  const AC = window.AudioContext || window.webkitAudioContext;
  const input = document.getElementById("cmd");
  if (!AC || !input) return;

  let ctx, noise;

  // браузер разрешает звук только после действия человека
  function ready() {
    if (!ctx) {
      ctx = new AC();
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state !== "running") ctx.resume();
    return ctx;
  }

  // щелчок: короткий шум (удар клавиши) и глухой стук корпуса
  function click(heavy) {
    ready();
    const t = ctx.currentTime + 0.002;
    const vary = 0.85 + Math.random() * 0.3; // каждое нажатие чуть отличается

    const src = ctx.createBufferSource(), band = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = noise;
    band.type = "bandpass";
    band.frequency.value = (heavy ? 1500 : 2900) * vary;
    band.Q.value = 1.1;
    gain.gain.setValueAtTime(VOLUME * (heavy ? 1.1 : 0.8), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (heavy ? 0.055 : 0.03));
    src.connect(band).connect(gain).connect(ctx.destination);
    src.start(t);

    const osc = ctx.createOscillator(), body = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime((heavy ? 140 : 220) * vary, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.04);
    body.gain.setValueAtTime(VOLUME * (heavy ? 0.5 : 0.28), t);
    body.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    osc.connect(body).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // событие input срабатывает и на экранной клавиатуре телефона
  input.addEventListener("input", e => {
    const heavy = e.data === " " || String(e.inputType).startsWith("delete");
    click(heavy);
  });
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.repeat) click(true); });
  ["pointerup", "touchend", "keydown"].forEach(n => document.addEventListener(n, ready, { capture: true, passive: true }));
})();
