from abc import ABC, abstractmethod
from typing import List

from domain.metaholder.responses.pair import PairResponse


class PairServiceInterface(ABC):

    @abstractmethod
    async def get_pairs_list(self) -> List[PairResponse]:
        ...

