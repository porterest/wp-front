from abstractions.services.liquidity_management import LiquidityManagerInterface
from dependencies.services.dex import get_dex_service
from services.math_services.LiquidityManager import LiquidityManager
from settings import settings


def get_liquidity_manager_service() -> LiquidityManagerInterface:
    return LiquidityManager(
        dex_service=get_dex_service(),
        inner_token_symbol=settings.inner_token_symbol,
    )