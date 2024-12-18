from abstractions.services.user import UserServiceInterface
from dependencies.repositories.user import get_user_repository
from services.user import UserService


def get_user_service() -> UserServiceInterface:
    return UserService(user_repository=get_user_repository())
