from abc import ABC

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.balance import CreateBalanceDTO, UpdateBalanceDTO
from domain.models import Balance


class BalanceRepositoryInterface(
    CRUDRepositoryInterface[
        Balance, CreateBalanceDTO, UpdateBalanceDTO
    ],
    ABC,
):
    ...
