from domain.models.base import BaseModel


class DepositResponse(BaseModel):
    wallet_address: str
    amount: float
