# projectFour

Snake in the browser: a canvas + vanilla-JS game whose high-score board is
backed by FastAPI + SQLite. Continues the app series started in
[projectOne](../projectOne) → [projectTwo](../projectTwo) →
[projectThree](../projectThree).

## Setup

Requires [uv](https://docs.astral.sh/uv/) (or any Python 3.10+ with `pip`).

```sh
uv venv --python 3.12
uv pip install --python .venv/bin/python fastapi "uvicorn[standard]"
```

## Run

The game is a single self-contained page — you can just open
`static/index.html` in a browser (double-click it) and play.

To also use the shared high-score board, run the server:

```sh
.venv/bin/python app.py
```

Then open <http://127.0.0.1:8000> (or keep playing from the opened file —
it will save scores to the local server automatically).

## How it works

- The whole game lives in `static/index.html` (inline CSS + JS): a
  `setTimeout` tick loop, a direction queue (so quick key presses don't
  cause self-reversal), random food placement, and speed that ramps up as
  the snake grows.
- Power-ups: eating a food can spawn a timed power-up on the board.
  **SLOW-MO** halves the tick rate, **GHOST** lets you pass through walls
  and your own body, **2x POINTS** doubles food score, and **SHRINK** cuts
  three segments off the snake. Active effects show a countdown under the
  board and tint the snake.
- Sound: tiny synthesized blips via the Web Audio API (no asset files) for
  eating, power-ups, shrinking, dying, winning, and pausing. The
  `AudioContext` is created lazily on first sound; everything is a no-op
  if audio is unavailable. Mute with **M** or the speaker button; the
  preference persists in `localStorage`.
- Smooth motion: the game logic ticks discretely, but the canvas redraws
  every animation frame, gliding each segment between its previous and
  current cell (jumps like ghost-wraps snap instead of sliding). Eating
  food or a power-up pops a short particle burst at the spot.
- The backend is only the shared high-score board:
  `GET /api/highscores` returns the top 10, `POST /api/highscores` adds an
  entry. Scores persist in `scores.db` (SQLite).
- Walls end the game; the tail cell is safe to move into (the snake grows
  only when eating).

## Controls

- **Arrows / WASD** — steer
- **Space** — pause / resume
- **Enter** — restart after game over
- **M** — mute / unmute sound
