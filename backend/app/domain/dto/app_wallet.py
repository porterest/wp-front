from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel

from domain.dto import CreateDTO
from domain.enums import WalletType
from domain.models.app_wallet import AppWalletVersion


@dataclass
class CreateAppWalletDTO(CreateDTO):
    address: str
    wallet_version: AppWalletVersion
    wallet_type: WalletType
    balance: float


class UpdateAppWalletDTO(BaseModel):
    wallet_version: Optional[AppWalletVersion] = None
    wallet_type: Optional[WalletType] = None
    balance: Optional[float] = None
