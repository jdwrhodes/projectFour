"""projectFour — Snake, a canvas game with a shared high-score board.

The game itself lives entirely in static/ (vanilla JS + <canvas>). The
backend only persists the high-score list so scores are shared across
devices and sessions: GET /api/highscores returns the top 10, and
POST /api/highscores adds an entry.
"""

from __future__ import annotations

import sqlite3
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "scores.db"
STATIC_DIR = BASE_DIR / "static"

TOP_N = 10


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            score INTEGER NOT NULL,
            created_at REAL NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def row_to_score(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "score": row["score"],
        "created_at": row["created_at"],
    }


class ScoreIn(BaseModel):
    name: str = Field(min_length=1, max_length=20)
    score: int = Field(ge=0)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="projectFour", lifespan=lifespan)

# Allow the game page to talk to the API when it is opened directly as a
# file (file:// origin) instead of being served by this server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/api/highscores")
def list_highscores() -> list[dict]:
    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT * FROM scores ORDER BY score DESC, created_at ASC LIMIT ?",
            (TOP_N,),
        ).fetchall()
    finally:
        conn.close()
    return [row_to_score(row) for row in rows]


@app.post("/api/highscores", status_code=201)
def create_score(score: ScoreIn) -> dict:
    name = score.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="name must not be blank")
    created_at = time.time()
    conn = get_conn()
    try:
        cur = conn.execute(
            "INSERT INTO scores (name, score, created_at) VALUES (?, ?, ?)",
            (name, score.score, created_at),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM scores WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
    finally:
        conn.close()
    return row_to_score(row)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
