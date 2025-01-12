from abc import ABC, abstractmethod


class AssetsManagementServiceInterface(ABC):

    @abstractmethod
    async def mint_inner_token(self, amount: float) -> None:
        ...
