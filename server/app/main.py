from __future__ import annotations

from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .database import initialize_database, insert_photo, read_photos, reset_database, update_match

app = FastAPI(title='Luma API', version='0.1.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)

class FaceMatch(BaseModel):
    personId: str
    confidence: float = Field(ge=0, le=1)
    status: Literal['confirmed', 'review', 'rejected']

class PhotoPayload(BaseModel):
    id: str
    title: str = Field(min_length=1, max_length=120)
    date: str = Field(min_length=1, max_length=80)
    color: str = Field(min_length=1, max_length=20)
    imageUrl: str | None = None
    matches: list[FaceMatch] = []

class MatchUpdate(BaseModel):
    status: Literal['confirmed', 'review', 'rejected']

@app.on_event('startup')
def startup() -> None:
    initialize_database()

@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}

@app.get('/api/photos', response_model=list[PhotoPayload])
def list_photos() -> list[dict]:
    return read_photos()

@app.post('/api/photos', response_model=PhotoPayload, status_code=201)
def create_photo(photo: PhotoPayload) -> dict:
    return insert_photo(photo.model_dump())

@app.patch('/api/photos/{photo_id}/matches/{person_id}', response_model=PhotoPayload)
def change_match(photo_id: str, person_id: str, update: MatchUpdate) -> dict:
    photo = update_match(photo_id, person_id, update.status)
    if photo is None:
        raise HTTPException(status_code=404, detail='Photo not found')
    return photo

@app.delete('/api/photos', status_code=204)
def reset_photos() -> None:
    reset_database()
