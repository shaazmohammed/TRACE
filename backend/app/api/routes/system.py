"""Overview metrics, correlation runs and development-only demo data endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_development
from app.db.session import get_db
from app.schemas.incident import CorrelationRunOut, DemoLoadOut, OverviewOut
from app.services import correlation_service, incident_service, seed_service

router = APIRouter(tags=["system"])


@router.get("/overview", response_model=OverviewOut)
def overview(db: Session = Depends(get_db)) -> OverviewOut:
    return incident_service.get_overview(db)


@router.post("/correlation/run", response_model=CorrelationRunOut)
def run_correlation(db: Session = Depends(get_db)) -> CorrelationRunOut:
    return correlation_service.run_correlation(db)


@router.post("/demo/load", response_model=DemoLoadOut, dependencies=[Depends(require_development)])
def load_demo(db: Session = Depends(get_db)) -> DemoLoadOut:
    """Insert any missing demo events. Existing data is kept."""
    inserted, total = seed_service.load_demo_events(db)
    return DemoLoadOut(events_inserted=inserted, total_events=total)


@router.post("/demo/reset", response_model=DemoLoadOut, dependencies=[Depends(require_development)])
def reset_demo(db: Session = Depends(get_db)) -> DemoLoadOut:
    """Delete ALL data (events, incidents, notes, actions) and reload the demo events."""
    inserted, total = seed_service.reset_demo_data(db)
    return DemoLoadOut(events_inserted=inserted, total_events=total)
