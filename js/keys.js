/* ============================================================
   Звук клавиш при печати: записи настоящей клавиатуры (Topre).
   Файлы и лицензия: sounds/keys/ (проект kbsim, MIT).
   Громкость: VOLUME.
   ============================================================ */
(() => {
  const VOLUME = 0.5;
  const AC = window.AudioContext || window.webkitAudioContext;
  const Decoder = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const input = document.getElementById("cmd");
  if (!AC || !Decoder || !input) return;

  const NAMES = ["press0", "press1", "press2", "press3", "press4", "space", "enter", "backspace",
    "release", "release-space", "release-enter", "release-backspace"];
  const bank = {};
  let ctx, output, last = -1;

  // файлы грузим заранее, чтобы уже первая буква прозвучала
  const decoder = new Decoder(1, 1, 44100);
  NAMES.forEach(name => {
    fetch("sounds/keys/" + name + ".wav?v1")
      .then(r => r.ok ? r.arrayBuffer() : Promise.reject())
      .then(data => new Promise((ok, fail) => decoder.decodeAudioData(data, ok, fail)))
      .then(buffer => { bank[name] = buffer; })
      .catch(() => {});
  });

  // браузер разрешает звук только после действия человека
  function ready() {
    if (!ctx) {
      ctx = new AC();
      const soft = ctx.createBiquadFilter(); // чуть приглушаем верха
      soft.type = "lowpass";
      soft.frequency.value = 3000;
      output = ctx.createGain();
      output.gain.value = VOLUME;
      output.connect(soft).connect(ctx.destination);
    }
    if (ctx.state !== "running") ctx.resume();
  }

  function play(name, delay) {
    if (!bank[name]) return;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = bank[name];
    source.playbackRate.value = 0.97 + Math.random() * 0.06;
    gain.gain.value = 0.85 + Math.random() * 0.15; // жмут не всегда с одной силой
    source.connect(gain).connect(output);
    source.start(ctx.currentTime + delay);
  }

  // kind: "key" — обычная клавиша, "space", "enter", "backspace"
  function stroke(kind) {
    ready();
    let press = kind, release = "release-" + kind;
    if (kind === "key") {
      let i = Math.floor(Math.random() * 5);
      if (i === last) i = (i + 1) % 5; // не повторяем запись подряд
      last = i;
      press = "press" + i;
      release = "release";
    }
    play(press, 0);
    play(release, 0.085 + Math.random() * 0.05);
  }

  // событие input срабатывает и на экранной клавиатуре телефона
  input.addEventListener("input", e => {
    stroke(String(e.inputType).startsWith("delete") ? "backspace" : e.data === " " ? "space" : "key");
  });
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.repeat) stroke("enter"); });
  ["pointerup", "touchend", "keydown"].forEach(n => document.addEventListener(n, ready, { capture: true, passive: true }));
})();
