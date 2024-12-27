from dataclasses import dataclass
from typing import List

from abstractions.repositories.pair import PairRepositoryInterface
from abstractions.services.pair import PairServiceInterface
from domain.metaholder.responses.pair import PairResponse


@dataclass
class PairService(
    PairServiceInterface,
):
    pair_repository: PairRepositoryInterface

    async def get_pairs_list(self) -> List[PairResponse]:
        return [PairResponse(name=x.name, pair_id=x.id)
                for x in await self.pair_repository.get_all()]
