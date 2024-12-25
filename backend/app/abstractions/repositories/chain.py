from abc import ABC

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.chain import CreateChainDTO, UpdateChainDTO
from domain.models.chain import Chain


class ChainRepositoryInterface(
    CRUDRepositoryInterface[
        Chain, CreateChainDTO, UpdateChainDTO
    ],
    ABC,
):
    ...
