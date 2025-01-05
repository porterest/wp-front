from abstractions.services.math.calculations_token_emission import CalculationsTokenEmissionServiceInterface
from dependencies.services.token_emission import get_token_emission_service
from services.math_services.CalculationsTokenEmissionService import CalculationsTokenEmissionService


def get_pair_service() -> CalculationsTokenEmissionServiceInterface:
    return CalculationsTokenEmissionService(
        emission_service=get_token_emission_service(),
    )
