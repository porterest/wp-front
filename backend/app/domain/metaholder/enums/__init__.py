from enum import Enum


class ExternalWithdrawStatus(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PENDING = "pending"


class BetStatus(Enum):
    PENDING = "pending"
    RESOLVED = "resolved"
    CANCELED = 'canceled'
