from dataclasses import dataclass

from domain.models.base import BaseModel


@dataclass
class AggregatedData(BaseModel):
    block_number: int
    aggregated_vector: dict
    ordinal_present: bool
    aggregate_bet_amount: float
    wallet_address: str
