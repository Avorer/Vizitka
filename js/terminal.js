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
  let user = "гость"; // вместо него подставится IP посетителя
  const prompt = () => user + "@avorer:~$";
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
  const hl = text => el("b", { className: "hl", textContent: text }); // яркая подсветка выхода
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
      E: ["█████", "█    ", "████ ", "█    ", "█████"],
      X: ["█   █", " █ █ ", "  █  ", " █ █ ", "█   █"]
    };
    const pre = el("pre", { className: "banner" });
    [0, 1, 2, 3, 4].forEach(i => { // X красится отдельно и от темы не зависит
      pre.append([..."AVORER"].map(c => glyphs[c][i]).join(" ") + " ",
        el("span", { className: "banner-x", textContent: glyphs.X[i] }), i < 4 ? "\n" : "");
    });
    pre.setAttribute("aria-label", "AVORERX");
    pre.setAttribute("role", "img");
    return pre;
  }

  /* ---------- команды ---------- */
  const COMMANDS = [
    { name: "about", load: "Загрузка информации обо мне", ru: "обо мне", alias: ["bio", "био", "осебе"], run() {
      title("ОБО МНЕ");
      SITE.bio.forEach(t => line(t));
      print(el("p", {}, link(SITE.passport.url, SITE.passport.name + " ↗")));
      print(el("p", { className: "dim" }, "Мои работы: ", kbd("portfolio"), ". Нужен сайт: ", kbd("order"), "."));
    } },
    { name: "portfolio", load: "Загрузка портфолио", ru: "портфолио", alias: ["work", "projects", "ls", "работы", "проекты"], run() {
      title("ПОРТФОЛИО");
      print(el("ol", { className: "projects" }, ...SITE.projects.map(p =>
        el("li", {}, link(p.url, p.name + " ↗"), el("span", { textContent: p.about })))));
      print(el("p", { className: "dim" }, "Хочешь так же? Набери ", kbd("order"), "."));
    } },
    { name: "order", load: "Установка модуля заказа", ru: "заказать вёрстку", alias: ["заказ", "заказать", "верстка", "сайт", "buy"], run: startOrder },
    { name: "contacts", load: "Загрузка контактной информации", ru: "контакты", alias: ["contact", "связь"], run() {
      title("КОНТАКТЫ");
      const list = el("ul", { className: "contacts" });
      contactList().forEach(c => list.append(el("li", {}, el("span", { textContent: c.label }), link(c.url, c.text))));
      print(list);
    } },
    { name: "creative", load: "Загрузка вдохновения", ru: "про творчество", alias: ["творить", "творчество", "cat", "кот"], run() {
      title("ТВОРИ");
      print(el("pre", { className: "cat", textContent: " /\\_/\\\n( o.o )\n > ^ <" }));
      line("Хочешь творить — твори! Твоя фантазия безгранична! А если перегорел, то займись делом, которое тебе нравится: например, построй своему пушистому другу картонный замок или котокафешку. Только не мучай пушистика ;)", "note");
    } },
    { name: "snake", services: ["Инициализация графического буфера", "Запущена служба input.service (клавиши и свайпы)", "Запущена служба score.service (счёт и рекорд)", "Запущен процесс ./snake"], ru: "игра «змейка»", alias: ["game", "play", "игра", "играть", "змейка"], run: openGame },
    { name: "music", load: "Загрузка аудиомодуля", instant: true, ru: "музыка on / off", alias: ["музыка"], run(arg) {
      const music = window.SynthMusic;
      if (!music.set) return line("Этот браузер не умеет играть такую музыку.", "error");
      const want = /^(on|вкл)/.test(arg) ? true : /^(off|stop|выкл|стоп)/.test(arg) ? false : !music.isOn();
      music.set(want);
      print(want ? el("p", {}, "♫ играет synthwave… выключить: ", kbd("music off")) : el("p", { textContent: "музыка выключена" }));
    } },
    { name: "theme", load: "Установка темы", ru: "цвет терминала", alias: ["тема", "цвет", "color"], run(arg) {
      const current = document.documentElement.dataset.theme || "green";
      const next = THEMES.includes(arg) ? arg : THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
      setTheme(next);
      line("тема: " + next);
      line("доступные: " + THEMES.join(", ") + " (пример: theme amber)", "dim");
    } },
    { name: "copy", load: "Копирование заявки", instant: true, ru: "скопировать заявку", alias: ["копировать", "скопировать"], run: copyMessage },
    { name: "fullscreen", load: "Настройка режима экрана", instant: true, ru: "полный экран on / off", alias: ["full", "экран", "полныйэкран"], pc: true, run(arg) {
      const active = Boolean(document.fullscreenElement);
      const want = /^(on|вкл)/.test(arg) ? true : /^(off|выкл)/.test(arg) ? false : !active;
      keepFullscreen = want; // выключили командой — сами обратно не включаем
      if (want === active) return line(active ? "полный экран уже включён" : "полный экран уже выключен");
      if (want) {
        enterFullscreen();
        line("включаю полный экран… выйти: Esc");
      } else {
        document.exitFullscreen().catch(() => {});
        line("выхожу из полного экрана");
      }
    } },
    { name: "clear", services: ["Остановлена служба вывода терминала", "Очищен буфер экрана", "Удалена история сеанса на экране", "Запущена служба terminal.service"], ru: "очистить экран", alias: ["cls", "очистить"], run: wipe },
    { name: "help", load: "Загрузка списка команд", ru: "список команд", alias: ["помощь", "команды", "меню", "menu", "?"], run: help }
  ];

  let keepFullscreen = true;
  function restoreFullscreen() {
    if (canFullscreen && keepFullscreen && !isFullscreen()) enterFullscreen();
  }

  // на телефонах и там, где браузер не умеет полный экран, команды fullscreen нет
  const canFullscreen = finePointer && Boolean(document.fullscreenEnabled);
  if (!canFullscreen) COMMANDS.splice(COMMANDS.findIndex(c => c.pc), 1);

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
    if (c.rashod) list.push({ label: "РАСХОД", url: c.rashod, text: "команда-расход.рф — мой профиль" });
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
    line("Три коротких вопроса — и заявку можно отправить прямо отсюда.");
    ask();
  }

  function ask() {
    if (order.step === 0) {
      line("1/3. Что нужно? Введи номер или напиши своими словами:");
      print(table(SITE.services.map((s, i) => [String(i + 1), s]), "options"));
    } else if (order.step === 1) line("2/3. Опиши задачу в паре предложений:");
    else if (order.step === 2) line("3/3. Как тебя зовут и куда тебе ответить (Telegram или почта)?");
    else print(el("p", {}, "Отправить заявку? Напиши ", kbd("да"), " или ", kbd("нет"), "."));
    print(el("p", { className: "exit" }, "Выйти из заказа: ", hl("cancel"), " или ", hl("отмена"),
      finePointer ? el("span", { className: "dim", textContent: "  (Tab допишет)" }) : null));
    setMode();
  }

  function answer(text) {
    if (order.sending) return line("Подожди, заявка ещё отправляется…", "dim");
    if (order.step === 3) return confirmOrder(text);
    if (order.step === 0) order.type = /^\d+$/.test(text) ? SITE.services[Number(text) - 1] : text;
    else if (order.step === 1) order.task = text;
    else order.who = text;
    if (!order.type) return line("Такого номера нет. Выбери из списка или напиши словами.", "error");
    order.step++;
    if (order.step < 3) return ask();

    message = "Привет! Хочу заказать вёрстку.\nЧто нужно: " + order.type + "\nЗадача: " + order.task + "\nОтветить: " + order.who;
    line("Проверь заявку:", "ok");
    print(el("pre", { className: "message", textContent: message }));
    line("Она уйдёт мне через сервис Formspree.", "dim");
    ask();
  }

  function confirmOrder(text) {
    const word = normalize(text);
    const said = list => [word, swap(word, EN, RU), swap(word, RU, EN)].some(v => list.includes(v));
    if (said(["copy", "копировать", "скопировать"])) return copyMessage();
    if (said(["да", "д", "yes", "y", "send", "отправить"])) return send();
    if (said(["нет", "н", "no", "n"])) {
      order = null;
      setMode();
      return print(el("p", {}, "Заявка не отправлена. Текст можно забрать командой ", kbd("copy"), "."));
    }
    ask();
  }

  async function send() {
    const current = order, target = block; // ответ придёт позже, пишем его под этой же командой
    const say = (cls, ...kids) => {
      target.append(el("p", { className: cls }, ...kids));
      screen.scrollTop = screen.scrollHeight;
    };
    current.sending = true;
    line("Отправляю…", "dim");

    const data = { _subject: "Заявка на сайт с avorerx.ru", "Что нужно": current.type, "Задача": current.task, "Как ответить": current.who };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.who)) data.email = current.who; // чтобы можно было ответить письмом
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 15000);
    let sent = false;
    try {
      const response = await fetch(SITE.form, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
        signal: abort.signal
      });
      sent = response.ok;
    } catch (e) { sent = false; }
    clearTimeout(timeout);
    current.sending = false;
    if (order !== current) { // заказ отменили, пока шла отправка
      if (sent) say("ok", "Предыдущая заявка всё же успела отправиться.");
      return;
    }

    if (sent) {
      order = null;
      setMode();
      say("ok", "✓ Заявка отправлена! Я отвечу по указанному контакту.");
    } else {
      say("error", "Не получилось отправить заявку.");
      say("", "Напиши ", kbd("да"), ", чтобы попробовать ещё раз, или ", kbd("нет"), ", чтобы выйти.");
      const tg = SITE.contacts.telegram;
      if (tg) say("dim", "Можно написать напрямую: ", link(tg, tg.replace(/^https?:\/\//, "")));
    }
  }

  /* ---------- очистка: шапка с приветствием остаётся ---------- */
  let intro = 0; // сколько строк занимает шапка

  function wipe() {
    while (out.children.length > intro) out.lastElementChild.remove();
    block = out;
    screen.scrollTop = 0;
  }

  /* ---------- имитация загрузки и запуска служб ---------- */
  let busy = null; // пока идёт «процесс», новые команды не принимаются
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = ms => new Promise(done => setTimeout(done, calm ? 0 : ms));
  const toBottom = () => { screen.scrollTop = screen.scrollHeight; };

  function setBusy(task) {
    busy = task;
    form.classList.toggle("busy", Boolean(task)); // строка ввода прячется, но клавиатура не закрывается
  }

  // полоса загрузки, как при установке модуля в PowerShell
  async function progress(label, target, task) {
    const CELLS = 20;
    const bar = el("span", { className: "bar-cells" }), percent = el("span"), status = el("p", { className: "dim" });
    const box = el("div", { className: "progress" }, el("p", { textContent: label }), el("p", {}, bar, percent), status);
    target.append(box);
    const stages = ["Подключение…", "Получение данных…", "Распаковка…", "Проверка…"];
    let value = 0;
    while (!task.cancelled) {
      const cells = Math.round(value / 100 * CELLS);
      bar.textContent = "[" + "█".repeat(cells) + "░".repeat(CELLS - cells) + "]";
      percent.textContent = " " + String(value).padStart(3, " ") + "%";
      status.textContent = value < 100 ? stages[Math.min(3, Math.floor(value / 26))] : "✓ Готово";
      toBottom();
      if (value === 100) break;
      await wait(60 + Math.random() * 60);
      value = Math.min(100, value + 9 + Math.floor(Math.random() * 14));
    }
    if (!task.cancelled) status.className = "ok";
  }

  // запуск служб по строчке, как при загрузке Linux
  async function services(list, target, task) {
    const box = el("div", { className: "services" });
    target.append(box);
    for (const name of list) {
      const mark = el("span", { className: "dim", textContent: "[ .... ]" });
      box.append(el("p", {}, mark, el("span", { textContent: name })));
      toBottom();
      await wait(110 + Math.random() * 170);
      if (task.cancelled) return;
      mark.className = "ok";
      mark.textContent = "[  OK  ]";
    }
    await wait(300);
  }

  async function launch(command, arg, entry) {
    const task = { cancelled: false };
    setBusy(task);
    let later = null;
    if (command.instant) { // действие выполняем сразу, а ответ показываем после загрузки
      later = el("div");
      block = later;
      command.run(arg);
    }
    if (command.services) await services(command.services, entry, task);
    else await progress(command.load, entry, task);
    if (task.cancelled) return;
    setBusy(null);
    block = entry;
    if (later) entry.append(later);
    else command.run(arg);
    settle(entry);
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
    entry.append(el("p", { className: "echo" }, el("span", { textContent: order ? "заказ >" : prompt() }), " " + text));
    out.append(entry);
    block = entry;
    const word = normalize(text);
    if (order) {
      if (["cancel", "отмена", "exit", "выход", "q"].includes(word) || swap(word, RU, EN) === "cancel") {
        order = null;
        setMode();
        line("Заказ отменён.");
      } else answer(text);
      restoreFullscreen();
    } else {
      const found = parse(text);
      // вызывается прямо из нажатия Enter: только так браузер разрешает полный экран
      if (!(found && found.command.name === "fullscreen")) restoreFullscreen();
      if (found) return launch(found.command, found.arg, entry);
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
    promptEl.textContent = order ? "заказ >" : prompt();
  }

  const history = [];
  let cursor = 0;

  function submit(text) {
    if (!order && text.trim()) { history.push(text.trim()); cursor = history.length; }
    execute(text);
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (busy) return;
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
    if (busy) {
      if (e.ctrlKey && e.code === "KeyC") {
        e.preventDefault();
        busy.cancelled = true;
        setBusy(null);
        out.append(el("p", { className: "dim", textContent: "^C прервано" }));
        toBottom();
      }
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      cursor = Math.max(0, Math.min(history.length, cursor + (e.key === "ArrowUp" ? -1 : 1)));
      setValue(history[cursor] || "");
    } else if (e.ctrlKey && e.code === "KeyL") {
      e.preventDefault();
      wipe();
    } else if (e.ctrlKey && e.code === "KeyC" && input.selectionStart === input.selectionEnd) {
      e.preventDefault();
      out.append(el("p", { className: "echo" }, el("span", { textContent: promptEl.textContent }), " " + input.value + "^C"));
      order = null;
      setMode();
      setValue("");
      screen.scrollTop = screen.scrollHeight;
    } else if (e.key === "Tab" && order && input.value && !e.shiftKey) {
      e.preventDefault(); // курсор остаётся в строке
      const start = input.value.toLowerCase().trimStart();
      const words = ["cancel", "отмена"].concat(order.step === 3 ? ["да", "нет", "copy"] : []);
      const match = words.find(w => w.startsWith(start));
      if (match) setValue(match);
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

  // в полном экране Esc может достаться только браузеру: выход из режима тоже закрывает игру
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && !modal.hidden) closeGame();
  });

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

  /* ---------- полный экран на ПК ----------
     Сразу при открытии браузер этого не разрешает, поэтому включаем
     с первым нажатием клавиши или кликом. Вышел по Esc — вернётся со следующей
     командой. Выключил командой fullscreen off — не навязываем. */
  function isFullscreen() { // своим режимом или клавишей F11
    return Boolean(document.fullscreenElement) || window.innerHeight >= window.screen.height;
  }

  function enterFullscreen() {
    const request = document.documentElement.requestFullscreen();
    if (request) request.catch(() => {});
  }

  if (canFullscreen) {
    const events = ["keydown", "click"];
    const first = e => {
      if (e.type === "keydown") { // служебные клавиши и сочетания не считаются
        if (e.ctrlKey || e.metaKey || e.altKey || !(e.key.length === 1 || e.key === "Enter")) return;
      } else if (e.target.closest("a")) return; // ссылки открываются как обычно
      events.forEach(n => document.removeEventListener(n, first, true));
      if (!isFullscreen()) enterFullscreen();
    };
    events.forEach(n => document.addEventListener(n, first, true));
  }

  /* ---------- IP посетителя в строке приглашения ----------
     Только показывается на его же экране: сайт его не сохраняет и в заявку не добавляет.
     Узнать IP без внешнего сервиса страница не может, поэтому спрашиваем у ipify.
     Если сервис недоступен или заблокирован, остаётся «гость». */
  async function showIp() {
    try {
      const response = await fetch("https://api.ipify.org?format=json", { cache: "no-store", referrerPolicy: "no-referrer" });
      const { ip } = await response.json();
      if (!response.ok || !/^[0-9a-f.:]{3,45}$/i.test(ip)) return;
      user = ip;
      setMode();
    } catch (e) {}
  }

  /* ---------- приветствие ---------- */
  setTheme(THEMES.includes(store.get("theme")) ? store.get("theme") : "green");
  print(banner());
  line("AvorerInc :: портфолио и веб-вёрстка", "sub");
  const now = new Date();
  line("Сеанс открыт: " + now.toLocaleDateString("ru-RU") + " " + now.toLocaleTimeString("ru-RU"), "dim");
  print(el("p", { className: "hello" }, "Добро пожаловать! Набери ", kbd("help"), " (или «помощь») и нажми Enter."));
  if (!finePointer) line("Чтобы открыть клавиатуру, коснись экрана.", "dim");
  intro = out.children.length;
  setMode();
  paint();
  showIp();
  if (finePointer) input.focus({ preventScroll: true });
})();
