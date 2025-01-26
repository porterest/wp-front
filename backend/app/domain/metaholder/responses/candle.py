from pydantic import BaseModel


class Candle(BaseModel):
    opening_price: float
    closing_price: float
    high_price: float
    low_price: float
    volume: float
    block_number: int
