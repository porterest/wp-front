import logging
from dataclasses import dataclass

from abstractions.services.assets_management import AssetsManagementServiceInterface

logger = logging.getLogger(__name__)


@dataclass
class AssetsManagementService(AssetsManagementServiceInterface):
    async def mint_inner_token(self, amount: float) -> None:
        logger.info(f'Minted {amount} of inner token')  # todo: mock
