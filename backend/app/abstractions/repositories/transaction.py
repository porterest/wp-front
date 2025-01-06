from abc import ABC

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.transaction import CreateTransactionDTO, UpdateTransactionDTO
from domain.models import Transaction


class TransactionRepositoryInterface(
    CRUDRepositoryInterface[
        Transaction, CreateTransactionDTO, UpdateTransactionDTO
    ],
    ABC,
):
    def get_system_reserve(self) -> float:
        """
        Возвращает текущий резерв системы (доступные средства).
        """
        pass

    def get_current_liquidity(self) -> float:
        """
        Возвращает текущую ликвидность пула.
        """
        pass

    def get_total_swap_volume(self) -> float:
        """
        Возвращает общий объем свапов.
        """
        pass

