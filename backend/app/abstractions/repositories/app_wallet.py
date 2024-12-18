from abc import ABC

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.app_wallet import CreateAppWalletDTO, UpdateAppWalletDTO
from domain.models import AppWallet


class AppWalletRepositoryInterface(
    CRUDRepositoryInterface[
        AppWallet, CreateAppWalletDTO, UpdateAppWalletDTO
    ],
    ABC,
):
    ...
