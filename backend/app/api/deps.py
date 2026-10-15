from fastapi import HTTPException, status

from app.core.config import get_settings


def require_development() -> None:
    """Guard for endpoints that wipe or load data."""
    if get_settings().app_env != "development":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo data endpoints are only available when APP_ENV=development.",
        )
