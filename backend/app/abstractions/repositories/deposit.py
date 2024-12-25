from abc import ABC

from abstractions.repositories import CRUDRepositoryInterface

from domain.models.deposit import DepositEntry
from domain.dto.deposit import DepositEntryCreateDTO, DepositEntryUpdateDTO


class DepositRepositoryInterface(
    CRUDRepositoryInterface[DepositEntry, DepositEntryCreateDTO, DepositEntryUpdateDTO],
    ABC,
):
    ...
