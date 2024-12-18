from abc import ABC

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.bet import CreateBetDTO, UpdateBetDTO
from domain.models import Bet


class BetRepositoryInterface(
    CRUDRepositoryInterface[
        Bet, CreateBetDTO, UpdateBetDTO
    ],
    ABC,
):
    ...
