from enum import Enum


class TransactionType(Enum):
    INTERNAL_DEPOSIT = "internal_deposit"        # bet closing
    EXTERNAL_DEPOSIT = "external_deposit"        # deposit from external wallet
    INTERNAL_WITHDRAWAL = "internal_withdrawal"  # bet creation
    EXTERNAL_WITHDRAWAL = "external_withdrawal"  # withdraw to external wallet
    REWARD = "reward"                            # reward for being involved in round
