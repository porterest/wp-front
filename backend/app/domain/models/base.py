from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(kw_only=True)
class BaseModel:
    id: UUID
    created_at: datetime
    updated_at: datetime
