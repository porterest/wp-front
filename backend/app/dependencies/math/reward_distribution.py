from abstractions.services.math.reward_distribution import RewardDistributionServiceInterface
from services.math_services.RewardDistributionService import RewardDistributionService


def get_reward_service() -> RewardDistributionServiceInterface:
    return RewardDistributionService(
    )
