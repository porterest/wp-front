from infrastructure.db.repositories.UserRepository import UserRepository

from . import get_session_maker


def get_user_repository() -> UserRepository:
    return UserRepository(
        session_maker=get_session_maker()
    )
