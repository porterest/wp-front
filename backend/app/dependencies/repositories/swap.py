from abstractions.repositories.swap import SwapRepositoryInterface
from dependencies.repositories import get_session_maker
from infrastructure.db.repositories.SwapRepository import SwapRepository


def get_swap_repository() -> SwapRepositoryInterface:
    return SwapRepository(
        session_maker=get_session_maker()
    )