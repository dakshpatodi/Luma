from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DEFAULT_DATABASE_PATH = Path(__file__).resolve().parents[1] / 'data' / 'luma.db'

SAMPLE_PHOTOS = [
    {'id': 'market', 'title': 'Sunday market', 'date': 'Sep 22', 'color': '#d58a62', 'matches': [{'personId': 'jamie', 'confidence': 0.98, 'status': 'confirmed'}, {'personId': 'priya', 'confidence': 0.96, 'status': 'confirmed'}]},
    {'id': 'dinner', 'title': 'Rooftop dinner', 'date': 'Sep 18', 'color': '#6f968e', 'matches': [{'personId': 'jamie', 'confidence': 0.97, 'status': 'confirmed'}, {'personId': 'alex', 'confidence': 0.95, 'status': 'confirmed'}]},
    {'id': 'meetup', 'title': 'Design meetup', 'date': 'Sep 12', 'color': '#917aa5', 'matches': [{'personId': 'jamie', 'confidence': 0.84, 'status': 'review'}, {'personId': 'alex', 'confidence': 0.93, 'status': 'confirmed'}]},
    {'id': 'picnic', 'title': 'Park picnic', 'date': 'Aug 28', 'color': '#81a96e', 'matches': [{'personId': 'jamie', 'confidence': 0.82, 'status': 'review'}, {'personId': 'priya', 'confidence': 0.92, 'status': 'confirmed'}]},
]

def get_database_path() -> Path:
    return Path(os.getenv('LUMA_DATABASE_PATH', str(DEFAULT_DATABASE_PATH)))

@contextmanager
def connection():
    path = get_database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    database = sqlite3.connect(path)
    database.row_factory = sqlite3.Row
    try:
        yield database
        database.commit()
    except Exception:
        database.rollback()
        raise
    finally:
        database.close()

def initialize_database() -> None:
    with connection() as database:
        database.execute('''
            CREATE TABLE IF NOT EXISTS photos (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              date TEXT NOT NULL,
              color TEXT NOT NULL,
              image_url TEXT,
              matches_json TEXT NOT NULL
            )
        ''')
        photo_count = database.execute('SELECT COUNT(*) FROM photos').fetchone()[0]
        if photo_count == 0:
            for photo in SAMPLE_PHOTOS:
                database.execute(
                    'INSERT INTO photos (id, title, date, color, image_url, matches_json) VALUES (?, ?, ?, ?, ?, ?)',
                    (photo['id'], photo['title'], photo['date'], photo['color'], None, json.dumps(photo['matches'])),
                )

def read_photos() -> list[dict]:
    with connection() as database:
        rows = database.execute('SELECT * FROM photos ORDER BY rowid DESC').fetchall()
    return [row_to_photo(row) for row in rows]

def insert_photo(photo: dict) -> dict:
    with connection() as database:
        database.execute(
            'INSERT INTO photos (id, title, date, color, image_url, matches_json) VALUES (?, ?, ?, ?, ?, ?)',
            (photo['id'], photo['title'], photo['date'], photo['color'], photo.get('imageUrl'), json.dumps(photo['matches'])),
        )
    return photo

def update_match(photo_id: str, person_id: str, status: str) -> dict | None:
    with connection() as database:
        row = database.execute('SELECT * FROM photos WHERE id = ?', (photo_id,)).fetchone()
        if not row:
            return None
        photo = row_to_photo(row)
        found = False
        for match in photo['matches']:
            if match['personId'] == person_id:
                match['status'] = status
                found = True
        if not found:
            photo['matches'].append({'personId': person_id, 'confidence': 0.80, 'status': status})
        database.execute('UPDATE photos SET matches_json = ? WHERE id = ?', (json.dumps(photo['matches']), photo_id))
    return photo

def reset_database() -> None:
    with connection() as database:
        database.execute('DELETE FROM photos')
        for photo in SAMPLE_PHOTOS:
            database.execute(
                'INSERT INTO photos (id, title, date, color, image_url, matches_json) VALUES (?, ?, ?, ?, ?, ?)',
                (photo['id'], photo['title'], photo['date'], photo['color'], None, json.dumps(photo['matches'])),
            )

def row_to_photo(row: sqlite3.Row) -> dict:
    return {
        'id': row['id'], 'title': row['title'], 'date': row['date'], 'color': row['color'],
        'imageUrl': row['image_url'], 'matches': json.loads(row['matches_json']),
    }
