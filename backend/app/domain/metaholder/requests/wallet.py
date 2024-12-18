from pydantic import BaseModel


class FundWalletRequest(BaseModel):
    user_id: int


class WithdrawToExternalWalletRequest(BaseModel):
    user_id: int
    wallet_address: str
    amount: float
    token_type: str
