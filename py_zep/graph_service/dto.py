from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FactResult(BaseModel):
    uuid: str
    name: str
    fact: str
    valid_at: datetime
    invalid_at: Optional[datetime] = None
    created_at: datetime
    expired_at: Optional[datetime] = None
