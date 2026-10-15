"""Shared enumerations and constants.

Kept free of third-party imports so the correlation engine can use it
without needing a database or web framework.
"""

from enum import Enum


class Source(str, Enum):
    AUTHENTICATION = "Authentication"
    ENDPOINT = "Endpoint"
    NETWORK = "Network"


class Severity(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class IncidentStatus(str, Enum):
    OPEN = "Open"
    INVESTIGATING = "Investigating"
    RESOLVED = "Resolved"
    FALSE_POSITIVE = "False Positive"


class EvidenceType(str, Enum):
    """Whether a link is directly supported by event data or is only a hypothesis."""

    OBSERVED = "observed"
    HYPOTHESIS = "hypothesis"


class ActionType(str, Enum):
    ISOLATE_DEVICE = "Isolate Device"
    RESET_CREDENTIALS = "Reset Credentials"
    BLOCK_IP = "Block IP"
    MONITOR = "Monitor"
    OTHER = "Other"


class ActionStatus(str, Enum):
    PLANNED = "Planned"
    COMPLETED = "Completed"
    FAILED = "Failed"


class EventTypes:
    """Event type names used by the correlation rules (event types are free text)."""

    LOGIN_FAILED = "LOGIN_FAILED"
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    SCRIPT_EXECUTION = "SCRIPT_EXECUTION"
    NETWORK_CONNECTION = "NETWORK_CONNECTION"


SEVERITY_ORDER: dict[str, int] = {
    Severity.LOW.value: 1,
    Severity.MEDIUM.value: 2,
    Severity.HIGH.value: 3,
    Severity.CRITICAL.value: 4,
}
