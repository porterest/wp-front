from dataclasses import dataclass
from enum import Enum
from typing import Optional

from pydantic import SecretStr

from domain.enums import WalletType
from domain.models.base import BaseModel


class AppWalletVersion(Enum):
    V4R2 = 'v4r2'
    V5R1 = 'v5r1'


@dataclass
class AppWallet(BaseModel):
    address: str
    wallet_type: WalletType
    balance: float

    private_key: Optional[SecretStr] = None
