from abstractions.services.token_emission import TokenEmissionServiceInterface
from dependencies.services.ton.client import get_ton_client
from services.TokenEmissionService import TokenEmissionService


def get_token_emission_service() -> TokenEmissionServiceInterface:
    return TokenEmissionService(ton_client=get_ton_client())