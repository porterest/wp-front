from abc import ABC, abstractmethod
from typing import Annotated

from pytoniq_core import Cell


class KnownWalletsProviderInterface(ABC):
    @abstractmethod
    def get_wallet_public_key(self, code: Annotated[str, 'Encoded wallet code'], data: Cell) -> Annotated[
        str, 'Known wallet public key']:
        ...
