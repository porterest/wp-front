from abc import ABC, abstractmethod


class AssetsManagementServiceInterface(ABC):

    @abstractmethod
    async def mint_inner_token_if_needed(self):
        ...
