from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import events, health, incidents, system
from app.core.config import get_settings
from app.core.errors import NotFoundError

settings = get_settings()

app = FastAPI(
    title="TRACE - Threat Reconstruction and Analysis Console",
    description="Rule-based correlation of synthetic security events into potential incidents.",
    version="0.1.0",
)

# Only the configured frontend origin may call the API from a browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(NotFoundError)
async def not_found_handler(_: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


api = APIRouter(prefix="/api")
api.include_router(health.router)
api.include_router(events.router)
api.include_router(incidents.router)
api.include_router(system.router)
app.include_router(api)
