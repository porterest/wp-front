from pydantic import BaseModel


class WithdrawToExternalWalletRequest(BaseModel):
    amount: float
