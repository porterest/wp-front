from abc import ABC, abstractmethod
from uuid import UUID

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.chain import CreateChainDTO, UpdateChainDTO
from domain.models.chain import Chain


class ChainRepositoryInterface(
    CRUDRepositoryInterface[
        Chain, CreateChainDTO, UpdateChainDTO
    ],
    ABC,
):
    @abstractmethod
    async def get_by_pair_id(self, pair_id: UUID) -> Chain:
        ...
