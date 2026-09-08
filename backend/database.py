import sqlite3
import json
from datetime import datetime
from config import Config


def get_connection():
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS evaluations (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            question    TEXT NOT NULL,
            answer      TEXT NOT NULL,
            role        TEXT,
            difficulty  TEXT,
            score       INTEGER,
            result_json TEXT,
            created_at  TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()
    print("Database initialised.")


def save_evaluation(question, answer, role, difficulty, score, result_json):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO evaluations (question, answer, role, difficulty, score, result_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            question,
            answer,
            role or "",
            difficulty or "",
            score,
            json.dumps(result_json),
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def get_history(limit=20):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, question, answer, role, difficulty, score, result_json, created_at
        FROM evaluations
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    )
    rows = cursor.fetchall()
    conn.close()

    history = []
    for row in rows:
        item = dict(row)
        try:
            item["result"] = json.loads(item["result_json"])
        except Exception:
            item["result"] = {}
        del item["result_json"]
        history.append(item)
    return history
