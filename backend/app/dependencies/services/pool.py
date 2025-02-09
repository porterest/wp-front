from abstractions.services.math.pool_service import PoolServiceInterface
# from dependencies.services.ton.client import get_ton_client
from services.math_services.PoolService import PoolService


def get_pool_service() -> PoolServiceInterface:
    return PoolService(
        # ton_client=get_ton_client(),
    )
