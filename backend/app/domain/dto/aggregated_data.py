from dataclasses import dataclass, Field
from typing import Optional

from domain.dto import CreateDTO


@dataclass(kw_only=True)
class CreateAggregatedDataDTO(CreateDTO):
    block_number: int
    aggregated_vector: dict
    ordinal_present: bool = Field(default=False)
    aggregate_bet_amount: float


@dataclass
class UpdateAggregatedDataDTO:
    aggregated_vector: Optional[dict] = None
    ordinal_present: Optional[bool] = None
    transaction_count: Optional[int] = None
    aggregate_bet_amount: Optional[float] = None
