import string

from pydantic import BaseModel


class TimeResponse(BaseModel):
    server_time: string
    current_block: int
    remaining_time_in_block: int
