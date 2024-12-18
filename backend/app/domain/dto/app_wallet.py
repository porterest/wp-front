from dataclasses import dataclass
from typing import Optional

from domain.dto import CreateDTO
from domain.enums import WalletType


@dataclass
class CreateAppWalletDTO(CreateDTO):
    address: str
    wallet_type: WalletType
    balance: float


@dataclass
class UpdateAppWalletDTO:
    wallet_type: Optional[WalletType] = None
    balance: Optional[float] = None
