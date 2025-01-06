from dataclasses import dataclass
from typing import List, Dict


from domain.models.user_reward import UserReward


@dataclass(kw_only=True)
class Rewards:
    total_reward_pool: float
    user_rewards: List[UserReward]

    def to_dict(self) -> Dict[str, any]:
        """
        Конвертирует модель в словарь.
        """
        return {
            "total_reward_pool": self.total_reward_pool,
            "user_rewards": [
                {
                    "user_id": reward.user_id,
                    "reward": reward.reward,
                    "accuracy": reward.accuracy
                } for reward in self.user_rewards
            ]
        }
