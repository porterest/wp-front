import string
from datetime import datetime

from pydantic import BaseModel


class BlockStateResponse(BaseModel):
    server_time: datetime
    current_block: int
    remaining_time_in_block: int
