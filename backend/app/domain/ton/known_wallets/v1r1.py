from typing import Annotated

from tonsdk.boc import Cell

from abstractions.ton.known_wallets import WalletContractInterface


class WalletContractV1R1(WalletContractInterface):
    base64_code: str = 'te6cckEBAQEARAAAhP8AIN2k8mCBAgDXGCDXCx/tRNDTH9P/0VESuvKhIvkBVBBE+RDyovgAAdMfMSDXSpbTB9QC+wDe0aTIyx/L/8ntVEH98Ik='

    def load_public_key(self, data: Cell) -> Annotated[str, 'Wallet public key']:
        slice = data.begin_parse()
        slice.skip_bits(32)
        return slice.read_bytes(32).hex()


# done
