from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from api.app.core.config import get_settings

settings = get_settings()

db_url = settings.database_url
# Fix Postgres URL prefix if needed (SQLAlchemy requires postgresql:// instead of postgres://)
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
