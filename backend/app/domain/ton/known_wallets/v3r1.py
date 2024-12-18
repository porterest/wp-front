from typing import Annotated

from tonsdk.boc import Cell

from abstractions.ton.known_wallets import WalletContractInterface


class WalletContractV3R1(WalletContractInterface):
    base64_code: str = 'te6cckEBAQEAYgAAwP8AIN0gggFMl7qXMO1E0NcLH+Ck8mCDCNcYINMf0x/TH/gjE7vyY+1E0NMf0x/T/9FRMrryoVFEuvKiBPkBVBBV+RDyo/gAkyDXSpbTB9QC+wDo0QGkyMsfyx/L/8ntVD++buA='

    def load_public_key(self, data: Cell) -> Annotated[str, 'Wallet public key']:
        slice = data.begin_parse()
        slice.skip_bits(32)
        slice.skip_bits(32)
        return slice.read_bytes(32).hex()


# done
