"""
Pydantic Settings — loads from .env file.
"""
import logging
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-key-change-me-in-production"
    DATABASE_URL: str = "sqlite:///./app.db"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    BCRYPT_ROUNDS: int = 12

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()

# Log a warning if the secret key is the default dev value
if settings.SECRET_KEY == "dev-secret-key-change-me-in-production":
    logger.warning(
        "SECRET_KEY is set to the default development value. "
        "Change it in .env for any non-development use."
    )
