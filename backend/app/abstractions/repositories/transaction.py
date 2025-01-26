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
    ...
