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

```sh
.venv/bin/python app.py
```

Then open <http://127.0.0.1:8000>.

## How it works

- All game logic lives in `static/game.js`: a `setTimeout` tick loop, a
  direction queue (so quick key presses don't cause self-reversal), random
  food placement, and speed that ramps up as the snake grows.
- The backend is only the shared high-score board:
  `GET /api/highscores` returns the top 10, `POST /api/highscores` adds an
  entry. Scores persist in `scores.db` (SQLite).
- Walls end the game; the tail cell is safe to move into (the snake grows
  only when eating).

## Controls

- **Arrows / WASD** — steer
- **Space** — pause / resume
- **Enter** — restart after game over
