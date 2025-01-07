from abstractions.services.swap import SwapServiceInterface
from dependencies.math.aggregate_bets import get_aggregate_bets_service
from dependencies.repositories.deposit import get_deposit_repository
from dependencies.repositories.swap import get_swap_repository
from dependencies.repositories.transaction import get_transaction_repository
from dependencies.repositories.user import get_user_repository
from dependencies.services.app_wallet.provider import get_app_wallet_provider
from dependencies.services.block import get_block_service
from dependencies.services.dex import get_dex_service
from services.SwapService import SwapService
from settings import settings


def get_swap_service() -> SwapServiceInterface:
    return SwapService(
        aggregate_bets_service=get_aggregate_bets_service(),
        block_service=get_block_service(),
        deposit_repository=get_deposit_repository(),
        dex_service=get_dex_service(),
        user_repository=get_user_repository(),
        swap_repository=get_swap_repository(),
        transaction_repository=get_transaction_repository(),
        app_wallets=get_app_wallet_provider(),
        inner_token_symbol=settings.inner_token_symbol
    )
