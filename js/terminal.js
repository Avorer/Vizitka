/* ============================================================
   Терминал. Тексты и контакты лежат в js/config.js.
   Новая команда: добавь объект в COMMANDS.
   ============================================================ */
(() => {
  const SITE = window.SITE;
  const screen = document.getElementById("screen");
  const out = document.getElementById("out");
  const form = document.getElementById("form");
  const input = document.getElementById("cmd");
  const promptEl = document.getElementById("prompt");
  const modal = document.getElementById("modal");
  const windowEl = document.getElementById("window");
  const before = document.getElementById("before");
  const at = document.getElementById("at");
  const after = document.getElementById("after");
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const PROMPT = "гость@avorer:~$";
  const THEMES = ["green", "amber", "white", "synth"];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- вывод (текст пользователя всегда идёт как текст, не как HTML) ---------- */
  function el(tag, props = {}, ...kids) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids.filter(k => k !== null && k !== undefined));
    return node;
  }
  let block = out;
  const print = (...nodes) => { block.append(...nodes); };
  const line = (text, cls) => print(el("p", { className: cls || "", textContent: text }));
  const link = (url, text) => el("a", { href: url, textContent: text || url, target: url.startsWith("mailto:") ? "" : "_blank", rel: "noopener" });
  // подсказка с названием команды: это просто текст, набирать нужно руками
  const kbd = text => el("b", { className: "kbd", textContent: text });
  const table = (rows, cls) => el("div", { className: "table " + (cls || "") }, ...rows.map(cells =>
    el("p", {}, ...cells.map(text => el("span", { textContent: text })))));
  const title = text => line("── " + text + " ──", "title");

  /* ---------- крупная надпись из символов ---------- */
  function banner() {
    const glyphs = {
      A: [" ███ ", "█   █", "█████", "█   █", "█   █"],
      V: ["█   █", "█   █", "█   █", " █ █ ", "  █  "],
      O: [" ███ ", "█   █", "█   █", "█   █", " ███ "],
      R: ["████ ", "█   █", "████ ", "█  █ ", "█   █"],
      E: ["█████", "█    ", "████ ", "█    ", "█████"]
    };
    const rows = [0, 1, 2, 3, 4].map(i => [..."AVORER"].map(c => glyphs[c][i]).join(" "));
    const pre = el("pre", { className: "banner", textContent: rows.join("\n") });
    pre.setAttribute("aria-label", "AVORER");
    pre.setAttribute("role", "img");
    return pre;
  }

  /* ---------- команды ---------- */
  const COMMANDS = [
    { name: "about", ru: "обо мне", alias: ["bio", "био", "осебе"], run() {
      title("ОБО МНЕ");
      SITE.bio.forEach(t => line(t));
      print(el("p", { className: "dim" }, "Мои работы: ", kbd("portfolio"), ". Нужен сайт: ", kbd("order"), "."));
    } },
    { name: "portfolio", ru: "портфолио", alias: ["work", "projects", "ls", "работы", "проекты"], run() {
      title("ПОРТФОЛИО");
      print(el("ol", { className: "projects" }, ...SITE.projects.map(p =>
        el("li", {}, link(p.url, p.name + " ↗"), el("span", { textContent: p.about })))));
      print(el("p", { className: "dim" }, "Хочешь так же? Набери ", kbd("order"), "."));
    } },
    { name: "order", ru: "заказать вёрстку", alias: ["заказ", "заказать", "верстка", "сайт", "buy"], run: startOrder },
    { name: "contacts", ru: "контакты", alias: ["contact", "связь"], run() {
      title("КОНТАКТЫ");
      const list = el("ul", { className: "contacts" });
      contactList().forEach(c => list.append(el("li", {}, el("span", { textContent: c.label }), link(c.url, c.text))));
      print(list);
    } },
    { name: "creative", ru: "про творчество", alias: ["творить", "творчество", "cat", "кот"], run() {
      title("ТВОРИ");
      print(el("pre", { className: "cat", textContent: " /\\_/\\\n( o.o )\n > ^ <" }));
      line("Хочешь творить — твори! Твоя фантазия безгранична! А если перегорел, то займись делом, которое тебе нравится: например, построй своему пушистому другу картонный замок или котокафешку. Только не мучай пушистика ;)", "note");
    } },
    { name: "snake", ru: "игра «змейка»", alias: ["game", "play", "игра", "играть", "змейка"], run: openGame },
    { name: "music", ru: "музыка on / off", alias: ["музыка"], run(arg) {
      const music = window.SynthMusic;
      if (!music.set) return line("Этот браузер не умеет играть такую музыку.", "error");
      const want = /^(on|вкл)/.test(arg) ? true : /^(off|stop|выкл|стоп)/.test(arg) ? false : !music.isOn();
      music.set(want);
      print(want ? el("p", {}, "♫ играет synthwave… выключить: ", kbd("music off")) : el("p", { textContent: "музыка выключена" }));
    } },
    { name: "theme", ru: "цвет терминала", alias: ["тема", "цвет", "color"], run(arg) {
      const current = document.documentElement.dataset.theme || "green";
      const next = THEMES.includes(arg) ? arg : THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
      setTheme(next);
      line("тема: " + next);
      line("доступные: " + THEMES.join(", ") + " (пример: theme amber)", "dim");
    } },
    { name: "copy", ru: "скопировать заявку", alias: ["копировать", "скопировать"], run: copyMessage },
    { name: "clear", ru: "очистить экран", alias: ["cls", "очистить"], run() { out.textContent = ""; block = out; } },
    { name: "help", ru: "список команд", alias: ["помощь", "команды", "меню", "menu", "?"], run: help }
  ];

  function help() {
    line("Доступные команды:");
    print(table(COMMANDS.map((c, i) => [String(i + 1), c.name, c.ru]), "commands"));
    line("Набери команду и нажми Enter. Можно по-английски, по-русски или номером.", "dim");
    if (finePointer) line("Tab — дописать, ↑ ↓ — история, Ctrl+L — очистить.", "dim");
  }

  function contactList() {
    const c = SITE.contacts, list = [];
    const short = url => url.replace(/^https?:\/\//, "");
    if (c.telegram) list.push({ label: "Telegram", url: c.telegram, text: short(c.telegram), order: true });
    if (c.email) list.push({ label: "Почта", url: "mailto:" + c.email, text: c.email, order: true });
    if (c.github) list.push({ label: "GitHub", url: c.github, text: short(c.github) });
    if (c.team) list.push({ label: "Канал РАСХОД", url: c.team, text: short(c.team) });
    return list;
  }

  /* ---------- заказ: три вопроса, на выходе готовое сообщение ---------- */
  let order = null;
  let message = "";

  function copyMessage() {
    if (!message) return print(el("p", {}, "Копировать пока нечего. Сначала оформи заявку: ", kbd("order")));
    const target = block; // ответ придёт позже, пишем его под этой же командой
    const done = ok => target.append(el("p", { className: ok ? "ok" : "error",
      textContent: ok ? "заявка скопирована в буфер обмена" : "не получилось скопировать: выдели текст заявки вручную" }));
    if (navigator.clipboard) navigator.clipboard.writeText(message).then(() => done(true), () => done(false));
    else done(false);
  }

  function startOrder() {
    order = { step: 0 };
    title("ЗАКАЗ ВЕБ-ВЁРСТКИ");
    line("Три коротких вопроса — и получишь готовую заявку. Выйти: cancel (отмена).");
    ask();
  }

  function ask() {
    if (order.step === 0) {
      line("1/3. Что нужно? Введи номер или напиши своими словами:");
      print(table(SITE.services.map((s, i) => [String(i + 1), s]), "options"));
    } else if (order.step === 1) line("2/3. Опиши задачу в паре предложений:");
    else line("3/3. Как тебя зовут и куда тебе ответить?");
    setMode();
  }

  function answer(text) {
    if (order.step === 0) order.type = /^\d+$/.test(text) ? SITE.services[Number(text) - 1] : text;
    else if (order.step === 1) order.task = text;
    else order.who = text;
    if (!order.type) return line("Такого номера нет. Выбери из списка или напиши словами.", "error");
    order.step++;
    if (order.step < 3) return ask();

    message = "Привет! Хочу заказать вёрстку.\nЧто нужно: " + order.type + "\nЗадача: " + order.task + "\nОтветить: " + order.who;
    order = null;
    setMode();
    line("Готово! Вот твоя заявка:", "ok");
    print(el("pre", { className: "message", textContent: message }));
    print(el("p", {}, "Набери ", kbd("copy"), ", чтобы скопировать её."));
    const direct = contactList().filter(c => c.order);
    direct.forEach(c => {
      const url = c.url.startsWith("mailto:") ? c.url + "?subject=" + encodeURIComponent("Заказ вёрстки") + "&body=" + encodeURIComponent(message) : c.url;
      print(el("p", {}, "Отправить (" + c.label + "): ", link(url, c.text)));
    });
    line(direct.length
      ? "Заявка сама никуда не отправляется: скопируй её и пришли мне."
      : "Заявка сама никуда не отправляется. Личный контакт для заказов скоро появится здесь.", "dim");
  }

  /* ---------- разбор ввода ---------- */
  // если забыли переключить раскладку: «рудз» → help, «gjhnajkbj» → портфолио
  const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.";
  const RU = "йцукенгшщзхъфывапролджэячсмитьбю";
  const swap = (s, from, to) => [...s].map(ch => { const i = from.indexOf(ch); return i < 0 ? ch : to[i]; }).join("");
  const normalize = s => s.toLowerCase().replace(/ё/g, "е").replace(/^[\/.]+/, "").trim();

  function findOne(word) {
    return COMMANDS.find((c, i) => word === c.name || word === String(i + 1) ||
      c.alias.includes(word) || normalize(c.ru).replace(/\s/g, "") === word);
  }

  function parse(text) {
    const clean = normalize(text);
    const variants = [clean, swap(clean, RU, EN), swap(clean, EN, RU)];
    for (const v of variants) {
      const whole = findOne(v.replace(/\s/g, ""));
      if (whole) return { command: whole, arg: "" };
      const [first, ...rest] = v.split(/\s+/);
      const command = findOne(first);
      if (command) return { command, arg: rest.join(" ") };
    }
    return null;
  }

  function execute(text) {
    text = text.trim();
    if (!text) return;
    const entry = el("div", { className: "entry" });
    entry.append(el("p", { className: "echo" }, el("span", { textContent: order ? "заказ >" : PROMPT }), " " + text));
    out.append(entry);
    block = entry;
    const word = normalize(text);
    if (order) {
      if (["cancel", "отмена", "exit", "выход", "q"].includes(word) || swap(word, RU, EN) === "cancel") {
        order = null;
        setMode();
        line("Заказ отменён.");
      } else answer(text);
    } else {
      const found = parse(text);
      if (found) found.command.run(found.arg);
      else {
        line("avorer: " + text + ": команда не найдена", "error");
        print(el("p", {}, "Набери ", kbd("help"), ", чтобы увидеть список команд."));
      }
    }
    settle(entry);
  }

  // как в консоли, едем вниз; но если ответ выше экрана, показываем его начало
  function settle(entry) {
    if (!entry.isConnected) { screen.scrollTop = 0; return; }
    const top = screen.scrollTop + entry.getBoundingClientRect().top - screen.getBoundingClientRect().top - 12;
    screen.scrollTop = Math.min(top, screen.scrollHeight);
    if (entry.offsetHeight + form.offsetHeight + 40 < screen.clientHeight) screen.scrollTop = screen.scrollHeight;
  }

  /* ---------- строка ввода с блочным курсором ---------- */
  function paint() {
    const v = input.value;
    const pos = document.activeElement === input ? (input.selectionStart ?? v.length) : v.length;
    before.textContent = v.slice(0, pos);
    at.textContent = v.charAt(pos) || " ";
    after.textContent = v.slice(pos + 1);
    form.classList.toggle("focus", document.activeElement === input);
  }
  ["input", "keyup", "click", "focus", "blur"].forEach(n => input.addEventListener(n, paint));
  document.addEventListener("selectionchange", paint);
  input.addEventListener("input", () => { screen.scrollTop = screen.scrollHeight; });

  function setValue(v) {
    input.value = v;
    input.setSelectionRange(v.length, v.length);
    paint();
  }

  function setMode() {
    promptEl.textContent = order ? "заказ >" : PROMPT;
  }

  const history = [];
  let cursor = 0;

  function submit(text) {
    if (!order && text.trim()) { history.push(text.trim()); cursor = history.length; }
    execute(text);
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    const text = input.value;
    setValue("");
    if (!text.trim()) { // пустой Enter, как в консоли, даёт новую строку приглашения
      out.append(el("p", { className: "echo" }, el("span", { textContent: promptEl.textContent })));
      screen.scrollTop = screen.scrollHeight;
      return;
    }
    submit(text);
  });

  // нажатие в любом месте ставит курсор в строку; на телефоне так открывается клавиатура
  screen.addEventListener("click", e => {
    if (!e.target.closest("a, input") && !String(getSelection())) input.focus({ preventScroll: true });
  });

  input.addEventListener("keydown", e => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      cursor = Math.max(0, Math.min(history.length, cursor + (e.key === "ArrowUp" ? -1 : 1)));
      setValue(history[cursor] || "");
    } else if (e.ctrlKey && e.code === "KeyL") {
      e.preventDefault();
      out.textContent = "";
      block = out;
    } else if (e.ctrlKey && e.code === "KeyC" && input.selectionStart === input.selectionEnd) {
      e.preventDefault();
      out.append(el("p", { className: "echo" }, el("span", { textContent: promptEl.textContent }), " " + input.value + "^C"));
      order = null;
      setMode();
      setValue("");
      screen.scrollTop = screen.scrollHeight;
    } else if (e.key === "Tab" && input.value && !e.shiftKey && !order) {
      const start = normalize(input.value);
      const match = COMMANDS.find(c => c.name.startsWith(start)) || COMMANDS.find(c => normalize(c.ru).startsWith(start));
      if (match && match.name !== start) { e.preventDefault(); setValue(match.name); }
    }
  });

  // печатать можно сразу, даже если курсор не в строке
  document.addEventListener("keydown", e => {
    if (!modal.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && e.key !== " " && !e.target.closest("input, a")) input.focus();
  });

  /* ---------- «программа» snake ---------- */
  function openGame() {
    line("запуск ./snake …");
    modal.hidden = false;
    windowEl.inert = true;
    document.body.classList.add("game-open");
    input.blur(); // убираем клавиатуру телефона
    modal.focus({ preventScroll: true });
  }

  function closeGame() {
    modal.hidden = true;
    windowEl.inert = false;
    document.body.classList.remove("game-open");
    document.dispatchEvent(new Event("game:close"));
    out.append(el("p", { className: "dim", textContent: "snake: выход, счёт " + document.getElementById("score").textContent }));
    screen.scrollTop = screen.scrollHeight;
    if (finePointer) input.focus({ preventScroll: true });
  }

  // тап мимо поля закрывает игру на телефоне
  modal.addEventListener("click", e => {
    if (!finePointer && !e.target.closest(".field")) closeGame();
  });
  document.addEventListener("keydown", e => {
    if (modal.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape" || e.code === "KeyQ") { e.preventDefault(); closeGame(); }
  });

  // клавиатура телефона не должна закрывать строку ввода
  if (window.visualViewport) {
    const fit = () => {
      if (visualViewport.scale > 1.01) return;
      const typing = document.activeElement === input;
      windowEl.style.height = visualViewport.height + "px";
      window.scrollTo(0, 0);
      if (typing) screen.scrollTop = screen.scrollHeight;
    };
    visualViewport.addEventListener("resize", fit);
  }

  function setTheme(name) {
    document.documentElement.dataset.theme = name;
    store.set("theme", name);
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    document.querySelector('meta[name="theme-color"]').content = bg;
  }

  /* ---------- приветствие ---------- */
  setTheme(THEMES.includes(store.get("theme")) ? store.get("theme") : "green");
  print(banner());
  line("AvorerInc :: портфолио и веб-вёрстка", "sub");
  const now = new Date();
  line("Сеанс открыт: " + now.toLocaleDateString("ru-RU") + " " + now.toLocaleTimeString("ru-RU"), "dim");
  print(el("p", { className: "hello" }, "Добро пожаловать! Набери ", kbd("help"), " (или «помощь») и нажми Enter."));
  if (!finePointer) line("Чтобы открыть клавиатуру, коснись экрана.", "dim");
  setMode();
  paint();
  if (finePointer) input.focus({ preventScroll: true });
})();
