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
    wallet_version: AppWalletVersion
    balance: float

    private_key: Optional[SecretStr] = None


@dataclass
class AppWalletWithPrivateData(AppWallet):
    private_key: SecretStr

    @staticmethod
    def from_app_wallet(app_wallet: AppWallet, private_key: SecretStr) -> 'A':
        return AppWalletWithPrivateData(
            id=app_wallet.id,
            address=app_wallet.address,
            wallet_version=app_wallet.wallet_version,
            wallet_type=app_wallet.wallet_type,
            balance=app_wallet.balance,
            private_key=private_key,
            created_at=app_wallet.created_at,
            updated_at=app_wallet.updated_at,
        )
