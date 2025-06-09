from fastapi import Depends
from sqlalchemy.orm import Session
from .config import get_db

def get_database() -> Session:
    db = get_db()
    try:
        yield db
    finally:
        db.close()