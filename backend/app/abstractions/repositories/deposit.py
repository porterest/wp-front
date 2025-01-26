from abc import ABC

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.deposit import DepositEntryCreateDTO, DepositEntryUpdateDTO
from domain.models.deposit import DepositEntry


class DepositRepositoryInterface(
    CRUDRepositoryInterface[DepositEntry, DepositEntryCreateDTO, DepositEntryUpdateDTO],
    ABC,
):
    ...
