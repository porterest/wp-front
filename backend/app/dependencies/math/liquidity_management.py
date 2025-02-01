from abstractions.services.liquidity_management import LiquidityManagerInterface
from services.math_services.LiquidityManager import LiquidityManager
from settings import settings


def get_liquidity_manager_service() -> LiquidityManagerInterface:
    return LiquidityManager(
        inner_token_symbol=settings.inner_token.symbol,
    )
