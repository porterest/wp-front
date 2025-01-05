from abc import ABC, abstractmethod
from uuid import UUID

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.swap import CreateSwapDTO, UpdateSwapDTO
from domain.models.swap import Swap


class SwapRepositoryInterface(
    CRUDRepositoryInterface[
        Swap, CreateSwapDTO, UpdateSwapDTO,
    ],
    ABC,
):
    @abstractmethod
    async def get_last_swaps_for_chain(self, chain_id: UUID, amount: int = 10) -> list[Swap]:
        ...
