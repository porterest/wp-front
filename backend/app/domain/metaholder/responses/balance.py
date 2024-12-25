from typing import Annotated

from pydantic import BaseModel


# class BalanceResponse(BaseModel):
#     balance: float
#     token_type: str


class BalanceResponse(BaseModel):
    balances: dict[
        Annotated[str, 'Token name'],
        Annotated[float, 'User balance'],
    ]
    at_risk: Annotated[float, 'Total user bets amount']