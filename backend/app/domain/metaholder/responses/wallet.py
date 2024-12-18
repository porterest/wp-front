from typing import Optional, List

from pydantic import BaseModel

from domain.metaholder.enums import ExternalWithdrawStatus


class FundWalletResponse(BaseModel):
    wallet_address: str
    tx_tag: str

class WithdrawToExternalWalletResponse(BaseModel):
    user_id: int
    wallet_address: str
    amount: float
    status: ExternalWithdrawStatus
    transaction_id: Optional[str] = None
    error_message: Optional[str] = None


class BetResultResponse(BaseModel):
    bet_id: int
    user_id: int
    reward: Optional[float] = None
    modifier: Optional[float] = None


class WalletBalanceResponse(BaseModel):
    user_id: int
    balance: float
    token_type: str


class TransactionHistoryResponse(BaseModel):
    user_id: int
    transactions: List[dict]  # A list of transaction details represented as dictionaries
