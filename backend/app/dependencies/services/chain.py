from abstractions.services.chain import ChainServiceInterface
from dependencies import get_scheduler
from dependencies.math.liquidity_management import get_liquidity_manager_service
from dependencies.repositories.chain import get_chain_repository
from dependencies.repositories.pair import get_pair_repository
from dependencies.services.app_wallet.service import get_app_wallet_service
from dependencies.services.block import get_block_service
from dependencies.services.deposit import get_deposit_service
from dependencies.services.inner_token import get_inner_token_service
from dependencies.services.orchestrator import get_orchestrator_service
from dependencies.services.pool import get_pool_service
from dependencies.services.ton.client import get_ton_client
from services.ChainService import ChainService
from settings import settings


def get_chain_service() -> ChainServiceInterface:
    return ChainService(
        block_service=get_block_service(),
        scheduler=get_scheduler(),
        chain_repository=get_chain_repository(),
        pair_repository=get_pair_repository(),
        orchestrator_service=get_orchestrator_service(),
        deposit_service=get_deposit_service(),
        liquidity_manager=get_liquidity_manager_service(),
        ton_client=get_ton_client(),
        app_wallet_service=get_app_wallet_service(),
        pool_service=get_pool_service(),
        inner_token_symbol=settings.inner_token.symbol,
        inner_token=settings.inner_token,
        inner_token_service=get_inner_token_service()
    )
