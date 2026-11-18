// Snake — all game logic lives here. The server only stores high scores.

const GRID = 20;           // cells per side
const CELL = 20;           // px per cell
const BASE_SPEED_MS = 120; // tick interval at the start
const MIN_SPEED_MS = 60;   // fastest tick
const SPEEDUP_PER_FOOD = 3; // ms shaved off per food eaten
const POINTS_PER_FOOD = 10;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayScore = document.getElementById("overlay-score");
const saveForm = document.getElementById("save-form");
const nameInput = document.getElementById("player-name");
const saveStatus = document.getElementById("save-status");
const restartBtn = document.getElementById("restart-btn");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const listEl = document.getElementById("highscores");

const UP = { x: 0, y: -1 };
const DOWN = { x: 0, y: 1 };
const LEFT = { x: -1, y: 0 };
const RIGHT = { x: 1, y: 0 };

let snake, dir, dirQueue, food, score, tickMs, timer;
let started, paused, gameOver;

function reset() {
  const mid = Math.floor(GRID / 2);
  snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  dir = RIGHT;
  dirQueue = [];
  score = 0;
  tickMs = BASE_SPEED_MS;
  started = false;
  paused = false;
  gameOver = false;
  food = placeFood();
  scoreEl.textContent = "0";
  hideOverlay();
  draw();
}

function placeFood() {
  const free = [];
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    }
  }
  return free[Math.floor(Math.random() * free.length)];
}

function queueDir(d) {
  if (!started && !paused && !gameOver) {
    started = true;
  }
  const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
  // Ignore no-ops and 180-degree reversals.
  if (d.x === last.x && d.y === last.y) return;
  if (d.x === -last.x && d.y === -last.y) return;
  if (dirQueue.length < 3) dirQueue.push(d);
}

function step() {
  if (dirQueue.length) dir = dirQueue.shift();

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  const eats = head.x === food.x && head.y === food.y;

  // Walls always kill; the tail cell is safe to enter unless we grow.
  const body = eats ? snake : snake.slice(0, -1);
  if (
    head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID ||
    body.some((s) => s.x === head.x && s.y === head.y)
  ) {
    gameOver = true;
    showGameOver();
    return;
  }

  snake.unshift(head);
  if (eats) {
    score += POINTS_PER_FOOD;
    scoreEl.textContent = String(score);
    tickMs = Math.max(MIN_SPEED_MS, tickMs - SPEEDUP_PER_FOOD);
    food = placeFood();
    if (snake.length === GRID * GRID) {
      gameOver = true;
      showGameOver("You win!");
      return;
    }
  } else {
    snake.pop();
  }
  draw();
}

function scheduleTick() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (started && !paused && !gameOver) step();
    if (!gameOver) scheduleTick();
  }, tickMs);
}

function start() {
  clearTimeout(timer);
  reset();
  scheduleTick();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Faint grid lines.
  ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL + 0.5, 0);
    ctx.lineTo(i * CELL + 0.5, canvas.height);
    ctx.moveTo(0, i * CELL + 0.5);
    ctx.lineTo(canvas.width, i * CELL + 0.5);
    ctx.stroke();
  }

  // Food.
  ctx.fillStyle = "#f87171";
  ctx.beginPath();
  ctx.arc(
    food.x * CELL + CELL / 2,
    food.y * CELL + CELL / 2,
    CELL / 2 - 3,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Snake: head bright, body slightly dimmer.
  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? "#4ade80" : "#22c55e";
    ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
  });
}

function showGameOver(title = "Game over") {
  overlayTitle.textContent = title;
  overlayScore.textContent = `Final score: ${score}`;
  saveForm.classList.toggle("hidden", score < POINTS_PER_FOOD);
  saveStatus.textContent = "";
  overlay.classList.remove("hidden");
  nameInput.focus();
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function togglePause() {
  if (!started || gameOver) return;
  paused = !paused;
  if (paused) {
    overlayTitle.textContent = "Paused";
    overlayScore.textContent = "Press Space to resume";
    saveForm.classList.add("hidden");
    saveStatus.textContent = "";
    overlay.classList.remove("hidden");
  } else {
    hideOverlay();
  }
}

window.addEventListener("keydown", (e) => {
  const keys = {
    ArrowUp: UP, w: UP, W: UP,
    ArrowDown: DOWN, s: DOWN, S: DOWN,
    ArrowLeft: LEFT, a: LEFT, A: LEFT,
    ArrowRight: RIGHT, d: RIGHT, D: RIGHT,
  };
  if (keys[e.key]) {
    e.preventDefault();
    if (gameOver) return;
    queueDir(keys[e.key]);
    if (paused) togglePause();
    return;
  }
  if (e.key === " ") {
    e.preventDefault();
    togglePause();
  } else if (e.key === "Enter" && gameOver) {
    start();
  }
});

restartBtn.addEventListener("click", start);

saveForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  saveStatus.textContent = "Saving…";
  const name = nameInput.value.trim();
  try {
    const res = await fetch("/api/highscores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    localStorage.setItem("snake-name", name);
    saveStatus.textContent = "Saved!";
    saveForm.classList.add("hidden");
    await loadHighscores();
  } catch {
    saveStatus.textContent = "Could not save — is the server running?";
  }
});

async function loadHighscores() {
  try {
    const res = await fetch("/api/highscores");
    const scores = await res.json();
    bestEl.textContent = scores.length ? String(scores[0].score) : "–";
    listEl.innerHTML = "";
    if (!scores.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No scores yet";
      listEl.appendChild(li);
      return;
    }
    for (const s of scores) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = s.name;
      const sc = document.createElement("span");
      sc.className = "score";
      sc.textContent = String(s.score);
      li.append(name, sc);
      listEl.appendChild(li);
    }
  } catch {
    bestEl.textContent = "–";
  }
}

// Restore the player's name from a previous session.
nameInput.value = localStorage.getItem("snake-name") ?? "";

start();
loadHighscores();
