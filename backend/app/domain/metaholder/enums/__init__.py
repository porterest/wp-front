from enum import Enum


class ExternalWithdrawStatus(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PENDING = "pending"
