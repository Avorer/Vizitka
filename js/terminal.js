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
  const chips = document.getElementById("chips");
  const modal = document.getElementById("modal");
  const windowEl = document.getElementById("window");
  const musicButton = document.getElementById("music");
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
  const run = (text, label, cls) => {
    const b = el("button", { type: "button", className: cls || "run", textContent: label ?? text });
    b.dataset.run = text;
    return b;
  };
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
      print(el("p", {}, "Мои работы: ", run("portfolio"), "   Нужен сайт: ", run("order")));
    } },
    { name: "portfolio", ru: "портфолио", alias: ["work", "projects", "ls", "работы", "проекты"], run() {
      title("ПОРТФОЛИО");
      print(el("ol", { className: "projects" }, ...SITE.projects.map(p =>
        el("li", {}, link(p.url, p.name + " ↗"), el("span", { textContent: p.about })))));
      print(el("p", {}, "Хочешь так же? ", run("order")));
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
    { name: "music", ru: "музыка вкл / выкл", alias: ["музыка"], run(arg) {
      if (musicButton.hidden) return line("Этот браузер не умеет играть такую музыку.", "error");
      const on = musicButton.getAttribute("aria-pressed") === "true";
      const want = /^(on|вкл)/.test(arg) ? true : /^(off|stop|выкл|стоп)/.test(arg) ? false : !on;
      if (want !== on) musicButton.click();
      line(want ? "♫ Музыка включена. Выключить: music off" : "Музыка выключена.");
    } },
    { name: "theme", ru: "цвет терминала", alias: ["тема", "цвет", "color"], run(arg) {
      const current = document.documentElement.dataset.theme || "green";
      const next = THEMES.includes(arg) ? arg : THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
      setTheme(next);
      print(el("p", {}, "Тема: " + next + ". Все темы: ", ...THEMES.flatMap(t => [run("theme " + t, t), " "])));
    } },
    { name: "clear", ru: "очистить экран", alias: ["cls", "очистить"], run() { out.textContent = ""; block = out; } },
    { name: "help", ru: "список команд", alias: ["помощь", "команды", "меню", "menu", "?"], run: help }
  ];

  function help() {
    line("Нажми на команду или напиши её: по-английски, по-русски или номером.");
    print(el("div", { className: "menu" }, ...COMMANDS.map((c, i) => {
      const b = run(c.name, "", "item");
      b.append(el("i", { textContent: String(i + 1).padStart(2, " ") }), el("b", { textContent: c.name }), el("span", { textContent: c.ru }));
      return b;
    })));
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

  function startOrder() {
    order = { step: 0 };
    title("ЗАКАЗ ВЕБ-ВЁРСТКИ");
    line("Три коротких вопроса — и получишь готовое сообщение. Выйти: cancel (отмена).");
    ask();
  }

  function ask() {
    if (order.step === 0) {
      line("1/3. Что нужно? Выбери номер или напиши своими словами:");
      print(el("div", { className: "menu menu-options" }, ...SITE.services.map((s, i) => {
        const b = run(String(i + 1), "", "item");
        b.append(el("i", { textContent: String(i + 1) }), el("span", { textContent: s }));
        return b;
      })));
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

    const message = "Привет! Хочу заказать вёрстку.\nЧто нужно: " + order.type + "\nЗадача: " + order.task + "\nОтветить: " + order.who;
    order = null;
    setMode();
    line("Готово! Вот твоё сообщение:", "ok");
    print(el("pre", { className: "message", textContent: message }));
    const copy = el("button", { type: "button", className: "action", textContent: "Скопировать" });
    copy.addEventListener("click", () => {
      const done = ok => { copy.textContent = ok ? "Скопировано ✓" : "Выдели текст и скопируй вручную"; };
      if (navigator.clipboard) navigator.clipboard.writeText(message).then(() => done(true), () => done(false));
      else done(false);
    });
    const row = el("div", { className: "actions" }, copy);
    const direct = contactList().filter(c => c.order);
    direct.forEach(c => {
      const url = c.url.startsWith("mailto:") ? c.url + "?subject=" + encodeURIComponent("Заказ вёрстки") + "&body=" + encodeURIComponent(message) : c.url;
      const a = link(url, "Открыть: " + c.label);
      a.className = "action";
      row.append(a);
    });
    print(row);
    line(direct.length
      ? "Сообщение само никуда не отправляется: скопируй его и пришли мне."
      : "Сообщение само никуда не отправляется. Личный контакт для заказов скоро появится здесь.", "dim");
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
        line("Команда не найдена: " + text, "error");
        print(el("p", {}, "Список команд: ", run("help")));
      }
    }
    // показываем начало ответа, а не его хвост
    if (entry.isConnected) screen.scrollTop += entry.getBoundingClientRect().top - screen.getBoundingClientRect().top - 12;
    else screen.scrollTop = 0;
  }

  /* ---------- кнопки внизу и строка ввода ---------- */
  function setMode() {
    promptEl.textContent = order ? "заказ >" : PROMPT;
    input.placeholder = order ? "твой ответ" : "напиши help";
    const items = order
      ? [["cancel", "✕ отмена"]]
      : [["help", "помощь"], ["about", "обо мне"], ["portfolio", "портфолио"], ["order", "заказать"], ["contacts", "контакты"], ["snake", "змейка"]];
    chips.replaceChildren(...items.map(([cmd, label]) => run(cmd, label, "chip")));
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
    input.value = "";
    submit(text);
  });

  document.addEventListener("click", e => {
    const target = e.target.closest("[data-run]");
    if (!target) return;
    submit(target.dataset.run);
    if (finePointer && modal.hidden) input.focus({ preventScroll: true });
  });

  // клик по пустому месту ставит курсор в строку (на телефоне не трогаем: выскочит клавиатура)
  screen.addEventListener("click", e => {
    if (finePointer && !e.target.closest("a, button, input") && !String(getSelection())) input.focus({ preventScroll: true });
  });

  input.addEventListener("keydown", e => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      cursor = Math.max(0, Math.min(history.length, cursor + (e.key === "ArrowUp" ? -1 : 1)));
      input.value = history[cursor] || "";
    } else if (e.key === "Tab" && input.value && !e.shiftKey && !order) {
      const start = normalize(input.value);
      const match = COMMANDS.find(c => c.name.startsWith(start)) || COMMANDS.find(c => normalize(c.ru).startsWith(start));
      if (match && match.name !== start) { e.preventDefault(); input.value = match.name; }
    }
  });

  // печатать можно сразу, даже если курсор не в строке
  document.addEventListener("keydown", e => {
    if (!modal.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && e.key !== " " && !e.target.closest("input, button, a")) input.focus();
  });

  /* ---------- окно игры ---------- */
  function openGame() {
    line("Запускаю ./snake … выйти: Esc или кнопка «выйти».");
    modal.hidden = false;
    windowEl.inert = true;
    document.body.classList.add("game-open");
    input.blur();
    document.getElementById("close").focus();
    document.getElementById("close").blur();
  }

  function closeGame() {
    modal.hidden = true;
    windowEl.inert = false;
    document.body.classList.remove("game-open");
    document.dispatchEvent(new Event("game:close"));
    if (finePointer) input.focus({ preventScroll: true });
  }

  document.getElementById("close").addEventListener("click", closeGame);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeGame(); });

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
  line("Добро пожаловать! Это сайт-терминал.", "ok");
  help();
  setMode();
  if (finePointer) input.focus({ preventScroll: true });
})();
