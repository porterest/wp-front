from dataclasses import dataclass

from domain.models.base import BaseModel


@dataclass
class Balance(BaseModel):
    balance: float
    token_type: str

    user: 'User'
