from abstractions.services.chain import ChainServiceInterface
from services.ChainService import ChainService

_service: ChainServiceInterface | None = None


def get_chain_service() -> ChainServiceInterface:
    return ChainServiceInterface
