from abstractions.services.orchestrator import OrchestratorServiceInterface
from dependencies.math.aggregate_bets import get_aggregate_bets_service
from dependencies.math.liquidity_management import get_liquidity_manager_service
from dependencies.math.reward_distribution import get_reward_service
from dependencies.repositories.chain import get_chain_repository
from dependencies.services.app_wallet.service import get_app_wallet_service
from dependencies.services.assets_management import get_assets_management_service
from dependencies.services.block import get_block_service
from dependencies.services.dex import get_dex_service
from dependencies.services.inner_token import get_inner_token_service
from dependencies.services.pool import get_pool_service
from dependencies.services.swap import get_swap_service
from dependencies.services.user import get_user_service
from services.OrchestratorService import OrchestratorService
from settings import settings


def get_orchestrator_service() -> OrchestratorServiceInterface:
    return OrchestratorService(
        aggregate_bets_service=get_aggregate_bets_service(),
        liquidity_manager=get_liquidity_manager_service(),
        assets_management_service=get_assets_management_service(),
        dex_service=get_dex_service(),
        reward_service=get_reward_service(),
        user_service=get_user_service(),
        swap_service=get_swap_service(),
        block_service=get_block_service(),
        app_wallet_service=get_app_wallet_service(),
        chain_repository=get_chain_repository(),
        pool_service=get_pool_service(),
        inner_token_symbol=settings.inner_token_symbol,
        inner_token_service=get_inner_token_service()
    )
