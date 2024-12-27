from enum import Enum


class BetStatus(Enum):
    PENDING = "pending"
    RESOLVED = "resolved"
    CANCELED = 'canceled'
