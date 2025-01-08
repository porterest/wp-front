from abstractions.services.math.reward_distribution import RewardDistributionServiceInterface
from dependencies.repositories.block import get_block_repository
from dependencies.repositories.pair import get_pair_repository
from dependencies.repositories.swap import get_swap_repository
from dependencies.services.app_wallet.service import get_app_wallet_service
from dependencies.services.dex import get_dex_service
from services.math_services.RewardDistributionService import RewardDistributionService


def get_reward_service() -> RewardDistributionServiceInterface:
    return RewardDistributionService(
        swap_repository=get_swap_repository(),
        dex_service=get_dex_service(),
        block_repository=get_block_repository(),
        app_wallets=get_app_wallet_service(),
        pair_repository=get_pair_repository(),
    )
