import logging
from typing import Annotated, Callable

from pytoniq_core import Cell

from abstractions.services.known_wallets import KnownWalletsProviderInterface
from domain.ton.known_wallets import *
from services.ton.tonconnect.exceptions import KeyCannotBeParsedException

logger = logging.getLogger(__name__)


class KnownWalletsProvider(KnownWalletsProviderInterface):
    mapping: dict[str, Callable[[Cell], str]] = {
        WalletContractV1R1.base64_code: WalletContractV1R1.get_public_key,
        WalletContractV1R2.base64_code: WalletContractV1R2.get_public_key,
        WalletContractV1R3.base64_code: WalletContractV1R3.get_public_key,
        WalletContractV2R1.base64_code: WalletContractV2R1.get_public_key,
        WalletContractV2R2.base64_code: WalletContractV2R2.get_public_key,
        WalletContractV3R1.base64_code: WalletContractV3R1.get_public_key,
        WalletContractV3R2.base64_code: WalletContractV3R2.get_public_key,
        WalletContractV4R2.base64_code: WalletContractV4R2.get_public_key,
    }

    def get_wallet_public_key(
            self,
            code: Annotated[str, 'Encoded wallet code'],
            data: Cell
    ) -> Annotated[str, 'Known wallet public key']:
        contract = self.mapping.get(code, None)
        if not contract:
            logger.error(f"Failed to parse wallet publicKey for unknown code: {code}")
            raise KeyCannotBeParsedException("Unknown wallet code")

        return contract(data)
