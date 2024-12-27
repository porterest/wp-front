from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class BlockStateResponse(BaseModel):
    block_id: UUID
    server_time: datetime
    current_block: int
    remaining_time_in_block: Optional[int] = None
