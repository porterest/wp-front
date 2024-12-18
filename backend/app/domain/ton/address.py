from dataclasses import dataclass
from typing import Optional


@dataclass
class TonAddressInfo:
    workchain: str
    bouncable: bool
    testnet_only: bool

    account_id: Optional[bytes] = None
