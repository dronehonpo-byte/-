from itsdangerous import URLSafeSerializer, BadSignature
from flask import current_app


def _serializer(salt: str) -> URLSafeSerializer:
    return URLSafeSerializer(current_app.config["SECRET_KEY"], salt=salt)


def make_unsubscribe_token(list_id: int, subscriber_id: int) -> str:
    return _serializer("unsubscribe").dumps({"l": list_id, "s": subscriber_id})


def parse_unsubscribe_token(token: str) -> tuple[int, int] | None:
    try:
        data = _serializer("unsubscribe").loads(token)
        return int(data["l"]), int(data["s"])
    except (BadSignature, KeyError, TypeError, ValueError):
        return None


def make_confirm_token(subscriber_id: int) -> str:
    return _serializer("confirm").dumps({"s": subscriber_id})


def parse_confirm_token(token: str) -> int | None:
    try:
        return int(_serializer("confirm").loads(token)["s"])
    except (BadSignature, KeyError, TypeError, ValueError):
        return None
