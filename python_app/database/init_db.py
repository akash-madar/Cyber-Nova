"""Initialize the ScholarAI MySQL database tables via SQLAlchemy."""
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import Base, engine
from backend import models  # noqa: F401


def init_database() -> None:
    print("Creating ScholarAI tables in MySQL...")
    Base.metadata.create_all(bind=engine)
    print("All ScholarAI database tables initialized successfully.")


if __name__ == "__main__":
    init_database()
