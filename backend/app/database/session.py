import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Ensure sqlite parent directory exists if using relative sqlite path
if settings.DATABASE_URL.startswith("sqlite:///"):
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

# Configure SQLite engine with check_same_thread=False for multi-threaded FastAPI handlers
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()


def init_db() -> None:
    """Initializes all database tables registered with Base."""
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
