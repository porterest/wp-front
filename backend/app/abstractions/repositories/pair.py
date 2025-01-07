from abc import ABC, abstractmethod
from uuid import UUID

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.pair import CreatePairDTO, UpdatePairDTO
from domain.models import Pair


class PairRepositoryInterface(
    CRUDRepositoryInterface[
        Pair, CreatePairDTO, UpdatePairDTO
    ],
    ABC,
):
    @abstractmethod
    async def get_block_pair(self, block_id: UUID):
        ...
