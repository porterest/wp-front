from abstractions.services.assets_management import AssetsManagementServiceInterface
from services.assets_management import AssetsManagementService


def get_assets_management_service() -> AssetsManagementServiceInterface:
    return AssetsManagementService()