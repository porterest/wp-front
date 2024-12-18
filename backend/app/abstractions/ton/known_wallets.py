from abc import ABC, abstractmethod
from typing import Annotated

from tonsdk.boc import Cell


class WalletContractInterface(ABC):
    @abstractmethod
    def load_public_key(self, data: Cell) -> Annotated[str, 'Wallet public key']:
        ...

    @classmethod
    def get_public_key(cls, data: Cell) -> str:
        return cls().load_public_key(data)
