from bson import ObjectId
from datetime import datetime, timezone
from typing import Any
import re
from slugify import slugify as _slugify


def serialize_doc(doc: Any) -> Any:
    """Recursively serialize MongoDB documents"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for k, v in doc.items():
            if k == '_id':
                result['id'] = str(v)
            elif isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, datetime):
                result[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                result[k] = serialize_doc(v)
            else:
                result[k] = v
        return result
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc


def make_slug(text: str) -> str:
    return _slugify(text, allow_unicode=False)


def now() -> datetime:
    return datetime.now(timezone.utc)


def paginate(page: int, limit: int):
    skip = (page - 1) * limit
    return skip, limit
