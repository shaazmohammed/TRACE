"""Domain errors raised by services and mapped to HTTP responses in main.py."""


class NotFoundError(Exception):
    def __init__(self, what: str, identifier: int | str) -> None:
        super().__init__(f"{what} {identifier} not found")
