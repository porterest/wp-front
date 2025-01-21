from abc import ABC, abstractmethod
from abc import ABC
from typing import Annotated

from pytoniq_core import Address, Builder

from domain.models.app_wallet import AppWalletWithPrivateData
from domain.ton import InitialAccountState
from domain.ton.transaction import TonTransaction
from domain.tonconnect.requests import CheckProofRequest, Proof, Domain, CheckProofRequestRaw


class TonClientInterface(ABC):
    @staticmethod
    def get_account_address(
            init_state: InitialAccountState,
            workchain_id: int = 0,
    ) -> Annotated[str, 'Address']:
        builder = Builder()

        if depth := init_state.split_depth:
            builder.store_bit(True)
            builder.store_uint(depth, 5)
        else:
            builder.store_bit(False)

        if special := init_state.special:
            builder.store_bit(True)
            builder.store_bit(special.tick)
            builder.store_bit(special.tock)
        else:
            builder.store_bit(False)

        builder.store_maybe_ref(init_state.code)
        builder.store_maybe_ref(init_state.data)
        builder.store_dict(init_state.libraries)

        cell = builder.end_cell()

        state_hash = cell.hash

        # Combine the workchain_id and the state_hash
        workchain_byte = workchain_id.to_bytes(1, byteorder='big', signed=True)  # Signed byte for workchain
        address = f'{workchain_byte.hex()}:{state_hash.hex()}'

        return address

    @abstractmethod
    async def mint(self, amount: int, token_address: Address, admin_wallet: AppWalletWithPrivateData):
        ...

    @abstractmethod
    async def send_jettons(
            self,
            user_wallet_address: Address,
            amount: int,
            token_address: Address,
            app_wallet: AppWalletWithPrivateData,
    ) -> None:
        ...

    @abstractmethod
    async def get_public_key(self, address: str) -> str:
        ...

    @abstractmethod
    async def get_transactions(self, address: str) -> list[TonTransaction]:
        ...

    @abstractmethod
    async def mint_tokens(self, amount: int):
        ...


    @abstractmethod
    async def get_current_pool_state(self) -> dict[str, float]:
        ...


if __name__ == '__main__':
    proof_init_object = {
        "address": "0:e3bba2dd29d6757d37fa342e5204aa4d3789edfe00d1568d223e397b556ee1c2",
        "network": "-239",
        "public_key": "687235ce9b3bb614ed53fbcda86be0d9181fa89a063e27a5511fee4f72b2a753",
        "proof": {
            "timestamp": 1734030159,
            "domain": {
                "LengthBytes": 39,
                "value": "589a-2a12-5940-76ab-00-2.ngrok-free.app"
            },
            "payload": "f886105227e5418f97a9f1cb8feb4ab600000000675b3596",
            "signature": "jKTZXgsKzA6AgV9C2FVq3vhJmXzweLcYvff/GGzYxwoNuYpsf0ZLtv76sbaYLLgECMuWmjtvIlfBiYZ5E7vaBw==",
            "state_init": "te6cckECFgEAArEAAgE0ARUBFP8A9KQT9LzyyAsCAgEgAw4CAUgEBQLc0CDXScEgkVuPYyDXCx8gghBleHRuvSGCEHNpbnS9sJJfA+CCEGV4dG66jrSAINchAdB01yH6QDD6RPgo+kQwWL2RW+DtRNCBAUHXIfQFgwf0Dm+hMZEw4YBA1yFwf9s84DEg10mBAoC5kTDgcOIREAIBIAYNAgEgBwoCAW4ICQAZrc52omhAIOuQ64X/wAAZrx32omhAEOuQ64WPwAIBSAsMABezJftRNBx1yHXCx+AAEbJi+1E0NcKAIAAZvl8PaiaECAoOuQ+gLAEC8g8BHiDXCx+CEHNpZ2668uCKfxAB5o7w7aLt+yGDCNciAoMI1yMggCDXIdMf0x/TH+1E0NIA0x8g0x/T/9cKAAr5AUDM+RCaKJRfCtsx4fLAh98Cs1AHsPLQhFEluvLghVA2uvLghvgju/LQiCKS+ADeAaR/yMoAyx8BzxbJ7VQgkvgP3nDbPNgRA/btou37AvQEIW6SbCGOTAIh1zkwcJQhxwCzji0B1yggdh5DbCDXScAI8uCTINdKwALy4JMg1x0GxxLCAFIwsPLQiddM1zkwAaTobBKEB7vy4JPXSsAA8uCT7VXi0gABwACRW+Dr1ywIFCCRcJYB1ywIHBLiUhCx4w8g10oSExQAlgH6QAH6RPgo+kQwWLry4JHtRNCBAUHXGPQFBJ1/yMoAQASDB/RT8uCLjhQDgwf0W/LgjCLXCgAhbgGzsPLQkOLIUAPPFhL0AMntVAByMNcsCCSOLSHy4JLSAO1E0NIAURO68tCPVFAwkTGcAYEBQNch1woA8uCO4sjKAFjPFsntVJPywI3iABCTW9sx4ddM0ABRgAAAAD///4i0ORrnTZ3bCnap/ebUNfBsjA/UTQMfE9Koj/cnuVlTqaAxbhqL"
        }
    }

    proof = proof_init_object['proof']
    domain = proof['domain']
    print(domain['LengthBytes'])

    req = CheckProofRequest(
        address=proof_init_object['address'],
        network=proof_init_object['network'],
        public_key=proof_init_object['public_key'],
        proof=Proof(
            timestamp=proof['timestamp'],
            domain=Domain(
                length_bytes=domain['LengthBytes'],
                value=domain['value'],
            ),
            payload=proof['payload'],
            signature=proof['signature'],
            state_init=proof['state_init'],
        )
    )

    raw = CheckProofRequestRaw(request=req)

    client = TonClientInterface()

    res = client.get_account_address(init_state=raw.init_state)
    print(res)
    result_address = Address(res)
    print(result_address.to_str(is_user_friendly=True, is_bounceable=False, is_test_only=False))
    target_address = Address('UQDju6LdKdZ1fTf6NC5SBKpNN4nt_gDRVo0iPjl7VW7hwv4-')
    print(target_address.to_str(is_user_friendly=True, is_bounceable=False))
    print(result_address.to_str() == target_address.to_str())
