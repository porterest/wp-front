from abc import ABC
from typing import Annotated

from pytoniq_core import Builder

from abstractions.services.tonclient import TonClientInterface
from domain.ton import InitialAccountState


class AbstractBaseTonClient(TonClientInterface, ABC):
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

        workchain_byte = workchain_id.to_bytes(1, byteorder='big', signed=True)  # Signed byte for workchain
        address = f'{workchain_byte.hex()}:{state_hash.hex()}'

    @staticmethod
    def to_nano(amount: float):
        return int(amount * 1e9)
