"""Application settings, read from environment variables or backend/.env."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://trace_user:CHANGE_ME@localhost:5432/trace_db"
    frontend_origin: str = "http://localhost:5173"
    app_env: str = "development"

    failed_login_threshold: int = 3
    failed_login_window_minutes: int = 10
    success_window_minutes: int = 15
    device_window_minutes: int = 30
    endpoint_network_window_minutes: int = 10
    min_device_severity: str = "Medium"


@lru_cache
def get_settings() -> Settings:
    return Settings()
