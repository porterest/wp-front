from abc import ABC

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.aggregated_data import CreateAggregatedDataDTO, UpdateAggregatedDataDTO
from domain.models import AggregatedData


class AggregatedDataRepositoryInterface(
    CRUDRepositoryInterface[
        AggregatedData, CreateAggregatedDataDTO, UpdateAggregatedDataDTO
    ],
    ABC,
):
    ...
