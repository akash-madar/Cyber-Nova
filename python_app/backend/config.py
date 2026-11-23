"""Application configuration loaded from environment variables."""
from functools import lru_cache
from urllib.parse import quote_plus
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-4-hydrogen"
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "scholarai_db"
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 168
    fastapi_base_url: str = "http://127.0.0.1:8000"

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }

    @property
    def sqlalchemy_database_url(self) -> str:
        encoded_password = quote_plus(self.mysql_password)
        return (
            f"mysql+pymysql://{self.mysql_user}:{encoded_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}?charset=utf8mb4"
        )

    @property
    def is_gemini_configured(self) -> bool:
        key = self.gemini_api_key.strip()
        return bool(key and key != "YOUR_GEMINI_API_KEY_HERE" and len(key) > 10)

    @property
    def gemini_key_hint(self) -> str | None:
        key = self.gemini_api_key.strip()
        if not self.is_gemini_configured:
            return None
        return f"...{key[-4:]}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
