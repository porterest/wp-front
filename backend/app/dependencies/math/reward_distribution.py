from abstractions.services.math.reward_distribution import RewardDistributionServiceInterface
from dependencies.repositories.bet import get_bet_repository
from services.math_services.RewardDistributionService import RewardDistributionService


def get_reward_service() -> RewardDistributionServiceInterface:
    return RewardDistributionService(
        bet_repository=get_bet_repository()
    )
