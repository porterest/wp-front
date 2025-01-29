from abc import ABC

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.pair import CreatePairDTO, UpdatePairDTO
from domain.models import Pair


class PairRepositoryInterface(
    CRUDRepositoryInterface[
        Pair, CreatePairDTO, UpdatePairDTO
    ],
    ABC,
):
    ...
