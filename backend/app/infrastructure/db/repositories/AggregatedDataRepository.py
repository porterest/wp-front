from domain.dto.aggregated_data import CreateAggregatedDataDTO, UpdateAggregatedDataDTO
from domain.models.aggregated_data import AggregatedData as AggregatedDataModel
from infrastructure.db.entities import AggregatedData
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


class AggregatedDataRepository(
    AbstractSQLAlchemyRepository[AggregatedData, AggregatedDataModel, CreateAggregatedDataDTO, UpdateAggregatedDataDTO]
):
    def create_dto_to_entity(self, dto: CreateAggregatedDataDTO) -> AggregatedData:
        return AggregatedData(
            id=dto.id,
            block_number=dto.block_number,
            aggregated_vector=dto.aggregated_vector,
            ordinal_present=dto.ordinal_present,
            aggregate_bet_amount=dto.aggregate_bet_amount,
        )

    def entity_to_model(self, entity: AggregatedData) -> AggregatedDataModel:
        return AggregatedDataModel(
            id=entity.id,
            block_number=entity.block_number,
            aggregated_vector=entity.aggregated_vector,
            ordinal_present=entity.ordinal_present,
            aggregate_bet_amount=entity.aggregate_bet_amount,
            wallet_address=entity.wallet_address,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
