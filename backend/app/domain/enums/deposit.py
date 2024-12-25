from enum import Enum


class DepositEntryStatus(Enum):
    PENDING = 'pending'
    TIMED_OUT = 'timed_out'
    FUNDED = 'funded'
