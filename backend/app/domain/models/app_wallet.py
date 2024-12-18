from dataclasses import dataclass

from domain.enums import WalletType
from domain.models.base import BaseModel


@dataclass
class AppWallet(BaseModel):
    address: str
    wallet_type: WalletType
    balance: float
