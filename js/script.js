(() => {
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (isTouch) {
    document.documentElement.classList.add("touch");
  }

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const overlayText = document.getElementById("overlay-text");

  const CELLS = 20;
  const SIZE = canvas.width / CELLS;
  const SPEED = 120;

  let snake, dir, nextDir, food, score, best = 0, timer = null, state = "idle";

  const DIRS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
  };

  function reset() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = nextDir = DIRS.right;
    score = 0;
    scoreEl.textContent = score;
    placeFood();
    draw();
  }

  function placeFood() {
    do {
      food = { x: Math.floor(Math.random() * CELLS), y: Math.floor(Math.random() * CELLS) };
    } while (snake.some(s => s.x === food.x && s.y === food.y));
  }

  function setDir(name) {
    const d = DIRS[name];
    if (!d) return;
    if (d.x === -dir.x && d.y === -dir.y) return; // нельзя развернуться на 180°
    nextDir = d;
  }

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    const hitWall = head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS;
    const hitSelf = snake.some(s => s.x === head.x && s.y === head.y);
    if (hitWall || hitSelf) return gameOver();

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = score;
      placeFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function draw() {
    ctx.fillStyle = "#050806";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // сетка
    ctx.strokeStyle = "rgba(76, 240, 138, .09)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= CELLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * SIZE, 0); ctx.lineTo(i * SIZE, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * SIZE); ctx.lineTo(canvas.width, i * SIZE); ctx.stroke();
    }

    // еда
    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(food.x * SIZE + 4, food.y * SIZE + 4, SIZE - 8, SIZE - 8);

    // змейка
    snake.forEach((s, i) => {
      ctx.shadowColor = "#35c870";
      ctx.shadowBlur = i === 0 ? 14 : 6;
      ctx.fillStyle = i === 0 ? "#8dffb8" : "#35c870";
      ctx.fillRect(s.x * SIZE + 1, s.y * SIZE + 1, SIZE - 2, SIZE - 2);
    });
    ctx.shadowBlur = 0;
  }

  function showOverlay(text) {
    overlayText.innerHTML = text;
    overlay.classList.remove("hidden");
  }

  function start() {
    if (state === "over" || state === "idle") reset();
    state = "play";
    overlay.classList.add("hidden");
    clearInterval(timer);
    timer = setInterval(step, SPEED);
  }

  function pause() {
    state = "pause";
    clearInterval(timer);
    showOverlay("ПАУЗА");
  }

  function gameOver() {
    state = "over";
    clearInterval(timer);
    if (score > best) { best = score; bestEl.textContent = best; }
    showOverlay("GAME OVER<br><small>" + (isTouch ? "ТАПНИ — ЕЩЁ РАЗ" : "ПРОБЕЛ — ЕЩЁ РАЗ") + "</small>");
  }

  function toggle() {
    if (state === "play") pause(); else start();
  }

  document.addEventListener("keydown", e => {
    if (!document.body.classList.contains("game-open")) return; // иначе клавиши нужны терминалу
    if (e.ctrlKey || e.metaKey || e.altKey) return; // не мешаем горячим клавишам браузера
    // e.code означает саму клавишу, поэтому WASD работает и в русской раскладке
    const map = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right"
    };
    if (e.code === "Space") { e.preventDefault(); toggle(); return; }
    if (map[e.code]) {
      e.preventDefault();
      if (state === "idle") start(); // сначала старт (он сбрасывает направление)
      setDir(map[e.code]);
    }
  });

  // экранные кнопки: pointerdown реагирует быстрее, чем click
  document.querySelectorAll(".pad button").forEach(btn => {
    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      if (state !== "play") start();
      setDir(btn.dataset.dir);
    });
  });

  overlay.addEventListener("click", toggle);

  // свайпы по полю
  const screenEl = document.querySelector(".field");
  let touchStart = null;
  screenEl.addEventListener("touchstart", e => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  screenEl.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
  screenEl.addEventListener("touchend", e => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; // это тап, его обработает overlay
    if (state !== "play") start();
    setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });

  // ставим на паузу, если вкладку свернули
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "play") pause();
  });

  // окно игры закрыли — ставим на паузу
  document.addEventListener("game:close", () => { if (state === "play") pause(); });

  reset();
  showOverlay(isTouch ? "ТАПНИ,<br>ЧТОБЫ ИГРАТЬ" : "НАЖМИ ПРОБЕЛ");
})();
