from infrastructure.db.repositories.AggregatedDataRepository import AggregatedDataRepository

from . import get_session_maker


def get_aggregated_data_repository() -> AggregatedDataRepository:
    return AggregatedDataRepository(
        session_maker=get_session_maker()
    )
