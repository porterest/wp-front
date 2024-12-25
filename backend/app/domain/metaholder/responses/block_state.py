import string

from pydantic import BaseModel


class BlockStateResponse(BaseModel):
    server_time: string
    current_block: int
    remaining_time_in_block: int
